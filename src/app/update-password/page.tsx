"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }
    if (password.length < 6) {
      setError("Slaptažodis turi būti bent 6 simboliai.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-2xl text-emerald-400 font-semibold">Slaptažodis pakeistas!</p>
          <p className="text-slate-400">Nukreipiama į pradžią...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Naujas slaptažodis</h1>
          <p className="mt-1 text-sm text-slate-400">Įveskite naują slaptažodį</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Naujas slaptažodis</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 6 simboliai"
              minLength={6}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Pakartokite slaptažodį</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="min. 6 simboliai"
              minLength={6}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? "Keičiama..." : "Pakeisti slaptažodį"}
          </button>
        </form>
      </div>
    </main>
  );
}
