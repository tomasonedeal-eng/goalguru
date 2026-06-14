"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/app-context";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot";

export function LoginForm() {
  const {
    user,
    ready,
    authConfigured,
    loginLocalGoogle,
    loginLocalEmail,
    signupLocal,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "auth_callback_failed") {
      setError("Google prisijungimas nepavyko. Bandykite dar kartą.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [user, ready, router]);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);

    if (authConfigured) {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      return;
    }

    const name =
      displayName.trim() ||
      window.prompt("Tavo vardas lyderių lentelėje:", "Google žaidėjas")?.trim() ||
      "Google žaidėjas";

    loginLocalGoogle(name, email.trim() || undefined);
    router.push("/");
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (authConfigured) {
      const supabase = createClient();

      if (mode === "signup") {
        if (!displayName.trim()) {
          setError("Įveskite slapyvardį.");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        setMessage("Patikrinkite el. paštą — išsiuntėme patvirtinimo nuorodą.");
        setLoading(false);
        return;
      }

      try {
        const emailLookupRes = await fetch(
          `/api/auth/lookup-email?name=${encodeURIComponent(displayName.trim())}`
        );

        if (!emailLookupRes.ok) {
          setError("Žaidėjas nerastas. Patikrinkite slapyvardį.");
          setLoading(false);
          return;
        }

        const { email: foundEmail } = await emailLookupRes.json();

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: foundEmail,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        router.push("/");
        router.refresh();
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Prisijungimas nepavyko.");
        setLoading(false);
        return;
      }
    }

    if (mode === "signup") {
      const err = signupLocal(displayName, email, password);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
    } else {
      const err = loginLocalEmail(email, password);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
    }

    router.push("/");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/auth/lookup-email?name=${encodeURIComponent(displayName.trim())}`
      );
      if (!res.ok) {
        setError("Žaidėjas nerastas. Patikrinkite vardą.");
        setLoading(false);
        return;
      }
      const { email: foundEmail } = await res.json();

      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(foundEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setMessage("Slaptažodžio keitimo nuoroda išsiųsta el. paštu.");
    } catch {
      setError("Klaida siunčiant nuorodą.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-md py-20 text-center text-slate-400">
        Kraunama...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">
          {mode === "forgot" ? "Atkurti slaptažodį" : mode === "login" ? "Prisijungti" : "Registruotis"}
        </h1>
        <p className="mt-2 text-slate-400">
          Gauk 1000 virtualių monetų ir pradėk statyti
        </p>
      </div>

      <div className="card space-y-4">
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white py-3 font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? "Jungiamasi..." : "Prisijungti su Google"}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" />
          arba
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); setMessage(null); }}
            className={`rounded-xl py-2 text-sm font-medium ${
              mode === "login" || mode === "forgot" ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-400"
            }`}
          >
            Prisijungti
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
            className={`rounded-xl py-2 text-sm font-medium ${
              mode === "signup" ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-400"
            }`}
          >
            Registruotis
          </button>
        </div>

        {mode === "forgot" ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Tavo vardas</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Vardas iš registracijos"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Siunčiama..." : "Siųsti nuorodą"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              className="w-full text-sm text-slate-400 hover:text-white"
            >
              ← Grįžti
            </button>
          </form>
        ) : (
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              {mode === "login" ? "Tavo vardas" : "Slapyvardis"}
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={mode === "login" ? "Vardas iš registracijos" : "Tavo vardas reitinge"}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
              required
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">El. paštas</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tavo@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Slaptažodis</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 6 simboliai"
              minLength={6}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading
              ? "Jungiamasi..."
              : mode === "login"
                ? "Prisijungti"
                : "Sukurti paskyrą"}
          </button>
          {mode === "login" && authConfigured && (
            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(null); setMessage(null); }}
              className="w-full text-sm text-slate-400 hover:text-white text-center"
            >
              Pamiršote slaptažodį?
            </button>
          )}
        </form>
        )}

        {error && (
          <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>
        )}
        {message && (
          <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-slate-500">
        Tik žaidimo taškai — jokių pinigų.
        {!authConfigured && (
          <>
            <br />
            Vietinis režimas — pridėk .env.local Supabase tikram Google OAuth.
          </>
        )}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.8.53-1.82.9-3.12.9-2.38 0-4.4-1.6-5.12-3.74H.96v2.26C2.44 15.98 5.48 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.88 10.78A5.41 5.41 0 0 1 3.58 9c0-.62.11-1.22.3-1.78V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.22.57 2.73 1.05l2.02-1.97C13.47 1.09 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96L3.88 7.22C4.6 5.08 6.62 3.48 9 3.48z"
      />
    </svg>
  );
}
