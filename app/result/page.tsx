"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Copy,
  Check,
  Sparkles,
  Lock,
  ArrowLeft,
  Image,
} from "lucide-react";

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
  const [isSubscribed, setIsSubscribed] = useState(false);

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
  }, []);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.copy.fullPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!isSubscribed) {
      window.location.href = "/login";
      return;
    }

    if (!result) return;

    // Dynamic import JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Download images and add to zip
    let failedCount = 0;
    for (let i = 0; i < result.images.length; i++) {
      try {
        const response = await fetch(result.images[i]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        zip.file(`post-imagen-${i + 1}.jpg`, blob);
      } catch (e) {
        console.error(`Failed to download image ${i}`, e);
        failedCount++;
      }
    }
    if (failedCount > 0) {
      alert(`No se pudieron descargar ${failedCount} imagen(es). El resto se incluirá en el ZIP.`);
    }

    // Add copy as text file
    zip.file("copy-instagram.txt", result.copy.fullPost);

    // Generate and download zip
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "post-profesional.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Image className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">No hay resultado todavía</p>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-brand-600 font-medium hover:underline"
          >
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
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-lg">PostPro</span>
          </a>
          <a
            href="/"
            className="text-sm font-medium text-stone-500 hover:text-stone-800 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Nuevo post
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl">Tu post está listo</h1>
        <p className="text-stone-500 mt-1">
          3 imágenes profesionales + copy generado
        </p>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Images */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {result.images.map((url, idx) => (
                <div key={idx} className="relative card overflow-hidden group">
                  <img
                    src={url}
                    alt={`Variante ${idx + 1}`}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  {/* Watermark overlay for free users */}
                  {!isSubscribed && <div className="watermark" />}

                  {/* Label */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-white text-xs font-medium">
                      {idx === 0
                        ? "Producto"
                        : idx === 1
                          ? "Lifestyle"
                          : "Detalle"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="mt-4 w-full py-4 rounded-xl font-display font-semibold text-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 bg-surface-900 hover:bg-black text-white"
            >
              {isSubscribed ? (
                <>
                  <Download className="w-5 h-5" />
                  Descargar ZIP sin watermark
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Suscríbete para descargar sin watermark — $10/mes
                </>
              )}
            </button>
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
                    <>
                      <Check className="w-4 h-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    Título
                  </p>
                  <p className="font-semibold text-stone-800">
                    {result.copy.title}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    Descripción
                  </p>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {result.copy.description}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    CTA
                  </p>
                  <p className="text-stone-600 text-sm">{result.copy.cta}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                    Hashtags
                  </p>
                  <p className="text-brand-600 text-sm">
                    {result.copy.hashtags}
                  </p>
                </div>
              </div>

              {/* Full post preview */}
              <div className="mt-6 p-4 bg-surface-50 rounded-xl border border-surface-200">
                <p className="text-xs font-medium text-stone-400 mb-2">
                  Post completo (copiable)
                </p>
                <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
                  {result.copy.fullPost}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
