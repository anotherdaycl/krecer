"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Image,
  CreditCard,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface GenerationResult {
  images: string[];
  copy: {
    title: string;
    description: string;
    hashtags: string;
    cta: string;
    fullPost: string;
  };
}

export default function ResultPage() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("generationResult");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (!data.images || !data.copy) throw new Error("Datos incompletos");
        setResult(data);
      } catch (err) {
        console.error("Error al leer resultado:", err);
        window.location.href = "/";
      }
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: authData }: { data: { user: { id: string } | null } }) => {
      if (!authData.user) {
        setIsLoggedIn(false);
        setChecked(true);
        return;
      }
      setIsLoggedIn(true);
      supabase
        .from("subscriptions")
        .select("status, credits")
        .eq("user_id", authData.user.id)
        .maybeSingle()
        .then(({ data: sub }: { data: { status: string; credits: number } | null }) => {
          if (sub && sub.status === "active" && sub.credits >= 0) {
            setHasAccess(true);
          }
          setChecked(true);
        });
    });
  }, []);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.copy.fullPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">No hay resultado todavía</p>
          <a href="/" className="mt-4 inline-flex items-center gap-2 text-brand-600 font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Volver a generar
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/">
            <img src="/logo.png" alt="Kreati" className="h-8 w-auto" />
          </a>
          <a href="/dashboard" className="text-sm font-medium text-stone-500 hover:text-stone-800 transition flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Nuevo post
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl">Tu post está listo</h1>
        <p className="text-stone-500 mt-1">3 imágenes profesionales + copy generado</p>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Images */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {result.images.map((url, idx) => (
                <div key={idx} className="relative card overflow-hidden">
                  <img
                    src={url}
                    alt={`Variante ${idx + 1}`}
                    className={`w-full aspect-[3/4] object-cover ${!hasAccess && checked ? "blur-sm scale-105" : ""}`}
                  />

                  {/* Watermark para no suscritos */}
                  {!hasAccess && checked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1">
                        <Lock className="w-4 h-4 text-stone-500 inline mr-1" />
                        <span className="text-xs font-semibold text-stone-600">Preview</span>
                      </div>
                    </div>
                  )}

                  {/* Botón descarga solo con acceso */}
                  {hasAccess && (
                    <a
                      href={url}
                      download={`post-imagen-${idx + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center shadow transition-colors"
                    >
                      <Download className="w-4 h-4 text-stone-700" />
                    </a>
                  )}

                  {/* Label */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-white text-xs font-medium">
                      {idx === 0 ? "Producto" : idx === 1 ? "Producto 2" : "Try-on"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA para no suscritos */}
            {!hasAccess && checked && (
              <div className="mt-4 card p-6 text-center">
                <CreditCard className="w-8 h-8 text-brand-500 mx-auto mb-3" />
                <p className="font-semibold text-stone-800">
                  {isLoggedIn ? "Compra créditos para descargar en HD" : "Inicia sesión para descargar en HD"}
                </p>
                <p className="text-sm text-stone-500 mt-1">10 posts profesionales por $9.990 CLP</p>
                <a
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="btn-primary mt-4 inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isLoggedIn ? "Comprar créditos" : "Iniciar sesión"}
                </a>
              </div>
            )}
          </div>

          {/* Copy panel */}
          <div className="xl:col-span-2">
            <div className="card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Copy generado</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" />Copiado</>
                  ) : (
                    <><Copy className="w-4 h-4" />Copiar</>
                  )}
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
