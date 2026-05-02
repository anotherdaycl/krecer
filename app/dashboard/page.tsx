"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  Sparkles,
  ArrowRight,
  LogOut,
  CreditCard,
  Image,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("ropa");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const LOADING_MESSAGES = [
    "Analizando tu producto...",
    "Preparando la IA...",
    "Generando imagen con fondo profesional...",
    "Creando segunda variante...",
    "Generando virtual try-on con modelo...",
    "Ajustando detalles finales...",
    "Casi listo...",
  ];

  useEffect(() => {
    if (!loading) { setProgress(0); return; }
    let p = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      p = Math.min(p + 1.4, 90);
      setProgress(p);
      const idx = Math.min(Math.floor((p / 90) * (LOADING_MESSAGES.length - 1)), LOADING_MESSAGES.length - 1);
      setLoadingMessage(LOADING_MESSAGES[idx]);
    }, 800);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);

      supabase
        .from("subscriptions")
        .select("credits, status, current_period_end")
        .eq("user_id", data.user.id)
        .single()
        .then(({ data: sub, error }: { data: { credits: number; status: string; current_period_end: string } | null; error: { code: string; message: string } | null }) => {
          if (error && error.code !== "PGRST116") {
            console.error("Error cargando créditos:", error);
            return;
          }
          if (sub && sub.status === "active") {
            setCredits(sub.credits);
            if (sub.current_period_end) {
              setRenewalDate(new Date(sub.current_period_end).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }));
            }
          }
        });
    });

    // Poll for credits after successful payment instead of arbitrary timeout
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(async () => {
        attempts++;
        const supabaseInner = createClient();
        const { data: authData } = await supabaseInner.auth.getUser();
        if (!authData.user) {
          clearInterval(pollInterval);
          return;
        }
        const { data: sub } = await supabaseInner
          .from("subscriptions")
          .select("credits, status")
          .eq("user_id", authData.user.id)
          .single();

        if (sub && sub.status === "active" && sub.credits > 0) {
          setCredits(sub.credits);
          setPaymentSuccess(true);
          clearInterval(pollInterval);
          window.history.replaceState({}, "", "/dashboard");
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }, 2000);
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleGenerate = async () => {
    if (!file || !productName.trim() || credits <= 0 || !user) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("productName", productName.trim());
    formData.append("category", category);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      const data = await res.json();

      if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        throw new Error("Respuesta inválida del servidor");
      }

      // Deduct credit
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ credits: credits - 1 })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error actualizando créditos:", updateError);
      }

      setCredits((c: number) => c - 1);

      sessionStorage.setItem("generationResult", JSON.stringify(data));
      window.location.href = "/result";
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`Error generando: ${msg}. Intenta de nuevo.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setSubscribing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Checkout failed");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`Error al crear el pago: ${msg}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-lg">PostPro</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-full">
              <Image className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-700">
                {credits} créditos
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-stone-400 hover:text-stone-600 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Banner pago exitoso */}
        {paymentSuccess && (
          <div className="mb-6 flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-5 py-4">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-brand-800">¡Pago exitoso! Tu suscripción está activa.</p>
              <p className="text-sm text-brand-600 mt-0.5">Ya puedes generar tus posts profesionales.</p>
            </div>
          </div>
        )}

        <h1 className="font-display font-bold text-2xl">
          Hola, {user.user_metadata?.full_name?.split(" ")[0] || "Usuario"}
        </h1>
        <p className="text-stone-500 mt-1">
          {credits > 0
            ? `Tienes ${credits} posts disponibles este mes${renewalDate ? ` · Renueva el ${renewalDate}` : ""}`
            : "Activa tu plan para generar posts profesionales"}
        </p>

        {credits <= 0 ? (
          <div className="mt-8 card p-8 text-center">
            <CreditCard className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h2 className="font-display font-semibold text-xl">Activa tu plan</h2>
            <p className="text-stone-500 mt-2">
              10 posts profesionales al mes por solo $8.000 CLP
            </p>
            <div className="mt-4 p-4 bg-surface-50 rounded-xl text-left text-sm text-stone-600 space-y-2">
              <p>✓ 3 fotos con IA + fondo profesional</p>
              <p>✓ Virtual try-on con modelo</p>
              <p>✓ Copy + hashtags generados</p>
              <p>✓ Descarga sin watermark</p>
              <p>✓ Pago seguro con Webpay / tarjeta</p>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="btn-primary mt-6 w-full flex items-center justify-center gap-2"
            >
              {subscribing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirigiendo a Flow...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Suscribirme — $8.000/mes
                </>
              )}
            </button>
            <p className="text-xs text-stone-400 mt-3">
              Pago procesado por Flow.cl — Webpay, tarjeta de crédito/débito
            </p>
          </div>
        ) : (
          <div className="mt-8 card p-8">
            {/* Upload */}
            <div
              className={`upload-zone p-6 text-center ${dragOver ? "drag-over" : ""} ${preview ? "has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />

              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-xl object-cover"
                  />
                  <p className="mt-2 text-xs text-stone-400">
                    Click para cambiar
                  </p>
                </div>
              ) : (
                <div className="py-6">
                  <Upload className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                  <p className="font-medium text-stone-700">Sube tu foto</p>
                  <p className="text-sm text-stone-400 mt-1">JPG, PNG, HEIC</p>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Nombre del producto"
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-3 bg-surface-50 border border-surface-200 rounded-xl text-stone-800 focus:outline-none focus:border-brand-500 transition appearance-none text-sm"
              >
                <option value="ropa">Ropa</option>
                <option value="cosmetica">Cosmética</option>
                <option value="accesorios">Accesorios</option>
                <option value="comida">Comida</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Generate */}
            {loading ? (
              <div className="mt-5 space-y-3">
                <p className="text-center text-sm font-semibold text-stone-700 min-h-[20px]">
                  {loadingMessage}
                </p>
                <div className="w-full bg-surface-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-brand-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-stone-400">{Math.round(progress)}%</p>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!file || !productName.trim()}
                className="mt-5 w-full py-4 bg-surface-900 hover:bg-black disabled:bg-surface-200 disabled:text-stone-400 text-white font-display font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Generar post ({credits} restantes)
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
