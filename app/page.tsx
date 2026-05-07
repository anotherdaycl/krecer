"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Sparkles, ArrowRight, Zap, Image, Type } from "lucide-react";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("ropa");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Si ya está logueado, redirigir al dashboard
  useEffect(() => {
    import("@/lib/supabase-browser").then(async ({ createClient }) => {
      const { data } = await createClient().auth.getUser();
      if (data.user) window.location.href = "/dashboard";
    });
  }, []);

  const LOADING_MESSAGES = [
    "Analizando tu producto...",
    "Preparando la imagen...",
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

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleGenerate = async () => {
    if (!file || !productName.trim()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("productName", productName);
    formData.append("category", category);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Generation failed");
      }

      const data = await res.json();

      if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        throw new Error("Respuesta inválida del servidor");
      }

      // Store result in sessionStorage and redirect
      sessionStorage.setItem("generationResult", JSON.stringify(data));
      window.location.href = "/result";
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`Error generando imágenes: ${msg}. Intenta de nuevo.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="Kreati" className="h-8 w-auto" />
          </div>
          <a href="/login" className="text-sm font-medium text-surface-800 hover:text-brand-600 transition">
            Iniciar sesión
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-8">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight leading-tight">
            Posts profesionales{" "}
            <span className="gradient-text">en segundos</span>
          </h1>
          <p className="mt-4 text-lg text-stone-500 leading-relaxed">
            Sube la foto de tu producto. Recibe 3 imágenes editadas + copy listo
            para Instagram. Sin registro.
          </p>
        </div>

        {/* Features pills */}
        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          {[
            { icon: Image, text: "3 fotos profesionales" },
            { icon: Type, text: "Copy + hashtags" },
            { icon: Zap, text: "Listo en 10 segundos" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-surface-200 text-sm text-stone-600"
            >
              <Icon className="w-4 h-4 text-brand-500" />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* Generator */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="card p-8">
          {/* Upload zone */}
          <div
            className={`upload-zone p-8 text-center ${dragOver ? "drag-over" : ""} ${preview ? "has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
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
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-xl object-cover"
                />
                <p className="mt-3 text-sm text-stone-400">
                  Click para cambiar foto
                </p>
              </div>
            ) : (
              <div className="py-8">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-brand-500" />
                </div>
                <p className="font-medium text-stone-700">
                  Arrastra tu foto aquí
                </p>
                <p className="text-sm text-stone-400 mt-1">
                  o haz click para seleccionar — JPG, PNG, HEIC
                </p>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Nombre del producto
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder='Ej: "Polera verde premium"'
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-stone-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition appearance-none"
              >
                <option value="ropa">Ropa</option>
                <option value="cosmetica">Cosmética</option>
                <option value="accesorios">Accesorios</option>
                <option value="comida">Comida</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
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
            <>
              <button
                onClick={handleGenerate}
                disabled={!file || !productName.trim()}
                className="mt-6 w-full py-4 bg-surface-900 hover:bg-black disabled:bg-surface-200 disabled:text-stone-400 text-white font-display font-semibold text-lg rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Generar post profesional
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-center text-xs text-stone-400 mt-3">
                Gratis — sin registro — ve el resultado antes de pagar
              </p>
            </>
          )}
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-surface-200 bg-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-stone-400 uppercase tracking-wider">
            Cómo funciona
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Sube tu foto",
                desc: "Cualquier foto de tu producto, desde el celular",
              },
              {
                step: "02",
                title: "IA genera",
                desc: "3 fotos profesionales + copy + hashtags en 10 segundos",
              },
              {
                step: "03",
                title: "Descarga y publica",
                desc: "Posts listos para Instagram, sin editar nada más",
              },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-display font-bold text-sm flex items-center justify-center mx-auto">
                  {step}
                </div>
                <h3 className="font-display font-semibold mt-3">{title}</h3>
                <p className="text-sm text-stone-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6">
        <div className="max-w-md mx-auto card p-8 text-center">
          <p className="text-sm font-medium text-brand-600">Plan único</p>
          <div className="mt-2 font-display">
            <span className="text-5xl font-bold">$10</span>
            <span className="text-stone-400 text-lg">/mes</span>
          </div>
          <p className="text-stone-500 mt-2">10 posts profesionales al mes</p>
          <ul className="mt-6 space-y-3 text-left text-sm text-stone-600">
            {[
              "3 fotos editadas por post",
              "Copy + hashtags generados",
              "Descarga sin watermark",
              "Historial de posts",
              "Cancela cuando quieras",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
          <a href="/login" className="btn-primary mt-6 block w-full text-center">
            Comenzar ahora
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 py-8 text-center text-sm text-stone-400">
        <p>Kreati — Posts profesionales con IA para emprendedoras</p>
      </footer>
    </main>
  );
}
