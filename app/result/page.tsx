"use client";

import { useState, useEffect } from "react";
import { Download, Copy, Check, Sparkles, ArrowLeft, Image, CreditCard, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface GenerationResult {
  images: string[];
  isPreview?: boolean;
  copy: { title: string; description: string; hashtags: string; cta: string; fullPost: string };
}

export default function ResultPage() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [checked, setChecked] = useState(false);
  const [buying, setBuying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("generationResult");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (!data.images || !data.copy) throw new Error();
        setResult(data);
      } catch {
        window.location.href = "/";
        return;
      }
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: authData }: { data: { user: User | null } }) => {
      setUser(authData.user);
      if (!authData.user) { setChecked(true); return; }

      supabase.from("subscriptions").select("credits, status")
        .eq("user_id", authData.user.id).maybeSingle()
        .then(({ data: sub }: { data: { credits: number; status: string } | null }) => {
          if (sub && sub.status === "active") setCredits(sub.credits ?? 0);
          setChecked(true);
        });
    });

    // Polling si viene de pago exitoso
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      window.history.replaceState({}, "", "/result");
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const s = createClient();
        const { data: auth } = await s.auth.getUser();
        if (!auth.user) { clearInterval(poll); return; }
        const { data: sub } = await s.from("subscriptions").select("credits, status")
          .eq("user_id", auth.user.id).maybeSingle();
        if (sub && sub.status === "active" && sub.credits > 0) {
          setCredits(sub.credits);
          setPaymentSuccess(true);
          clearInterval(poll);
        } else if (attempts >= 10) clearInterval(poll);
      }, 2000);
    }
  }, []);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.copy.fullPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuyCredits = async () => {
    if (!user) { window.location.href = "/login"; return; }
    setBuying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email, returnTo: "result" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Intenta de nuevo"}`);
    } finally {
      setBuying(false);
    }
  };

  const isPreview = result?.isPreview ?? false;
  const hasAccess = !isPreview || (!!user && credits > 0);

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">No hay resultado todavía</p>
          <a href="/" className="mt-4 inline-flex items-center gap-2 text-brand-600 font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/"><img src="/logo.png" alt="Kreati" className="h-8 w-auto" /></a>
          <a href={user ? "/dashboard" : "/"} className="text-sm font-medium text-stone-500 hover:text-stone-800 transition flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />{user ? "Dashboard" : "Volver"}
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {paymentSuccess && (
          <div className="mb-6 flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-2xl px-5 py-4">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-brand-800">¡Pago exitoso! Ya puedes descargar tus imágenes.</p>
              <p className="text-sm text-brand-600 mt-0.5">Tienes {credits} créditos disponibles.</p>
            </div>
          </div>
        )}

        <h1 className="font-display font-bold text-2xl">Tu post está listo</h1>
        <p className="text-stone-500 mt-1">3 imágenes profesionales + copy generado</p>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Imágenes */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {result.images.map((url, idx) => (
                <div key={idx} className="relative card overflow-hidden">
                  <img
                    src={url}
                    alt={`Variante ${idx + 1}`}
                    className="w-full aspect-[3/4] object-cover"
                  />

                  {!hasAccess && checked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow">
                        <Lock className="w-3.5 h-3.5 text-stone-500" />
                        <span className="text-xs font-semibold text-stone-600">Preview</span>
                      </div>
                    </div>
                  )}

                  {hasAccess && (
                    <a
                      href={url}
                      download={`kreati-imagen-${idx + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center shadow transition-colors"
                    >
                      <Download className="w-4 h-4 text-stone-700" />
                    </a>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-white text-xs font-medium">
                      {idx === 0 ? "Producto" : idx === 1 ? "Producto 2" : "Try-on"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA según estado */}
            {!hasAccess && checked && (
              <div className="mt-4 card p-6 text-center">
                <CreditCard className="w-8 h-8 text-brand-500 mx-auto mb-3" />
                {!user ? (
                  <>
                    <p className="font-semibold text-stone-800">Inicia sesión para descargar en HD</p>
                    <p className="text-sm text-stone-500 mt-1">Sin watermark · 10 posts por $9.990 CLP</p>
                    <a href="/login" className="btn-primary mt-4 inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />Iniciar sesión
                    </a>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-stone-800">Compra créditos para descargar en HD</p>
                    <p className="text-sm text-stone-500 mt-1">10 posts profesionales por $9.990 CLP</p>
                    <button onClick={handleBuyCredits} disabled={buying} className="btn-primary mt-4 inline-flex items-center gap-2">
                      {buying ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      {buying ? "Redirigiendo..." : "Comprar 10 créditos — $9.990"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="xl:col-span-2">
            <div className="card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Copy generado</h2>
                <button onClick={handleCopy} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition">
                  {copied ? <><Check className="w-4 h-4" />Copiado</> : <><Copy className="w-4 h-4" />Copiar</>}
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Título</p>
                  <p className="font-semibold text-stone-800">{result.copy.title}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{result.copy.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">CTA</p>
                  <p className="text-stone-600 text-sm">{result.copy.cta}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Hashtags</p>
                  <p className="text-brand-600 text-sm">{result.copy.hashtags}</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-surface-50 rounded-xl border border-surface-200">
                <p className="text-xs font-medium text-stone-400 mb-2">Post completo (copiable)</p>
                <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{result.copy.fullPost}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
