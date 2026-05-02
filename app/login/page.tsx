"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (authError) throw authError;
    } catch (err) {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-50 px-6">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        <h1 className="font-display font-bold text-2xl">Bienvenido a PostPro</h1>
        <p className="text-stone-500 text-sm mt-2">
          Inicia sesión o crea tu cuenta para acceder a tus posts
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-8 w-full py-3 px-4 bg-white border border-surface-200 hover:border-surface-800 disabled:opacity-60 rounded-xl font-medium text-stone-800 transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {loading ? "Redirigiendo..." : "Continuar con Google"}
        </button>

        <div className="mt-6 pt-6 border-t border-surface-100 space-y-1">
          <p className="text-xs text-stone-400">
            ¿Primera vez? Tu cuenta se crea automáticamente.
          </p>
          <p className="text-xs text-stone-400">
            Al continuar aceptas nuestros términos de servicio.
          </p>
        </div>

        <a href="/" className="mt-4 inline-block text-sm text-stone-500 hover:text-brand-600 transition">
          ← Volver al inicio
        </a>
      </div>
    </main>
  );
}
