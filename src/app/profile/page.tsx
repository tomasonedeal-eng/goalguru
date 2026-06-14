"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/app-context";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { checkPasswordStrength } from "@/lib/password";

export default function ProfilePage() {
  const { user, ready } = useApp();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!ready) return <div className="py-20 text-center text-slate-400">Kraunama...</div>;
  if (!user) { router.replace("/login"); return null; }

  const strength = newPassword ? checkPasswordStrength(newPassword) : null;
  const isWeak = strength && strength.label === "weak";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirm) { setError("Slaptažodžiai nesutampa."); return; }
    if (newPassword.length < 8) { setError("Slaptažodis turi būti bent 8 simboliai."); return; }
    if (isWeak) { setError("Slaptažodis per silpnas. Pridėkite didžiąsias raides, skaičius ir simbolius."); return; }

    setLoading(true);
    const supabase = createClient();

    // Re-authenticate first to verify current password
    const { data: { user: me } } = await supabase.auth.getUser();
    if (!me?.email) { setError("Nepavyko nustatyti vartotojo."); setLoading(false); return; }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: me.email,
      password: currentPassword,
    });
    if (signInErr) { setError("Neteisingas dabartinis slaptažodis."); setLoading(false); return; }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Mano paskyra</h1>
        <p className="mt-1 text-slate-400">{(user as { displayName?: string }).displayName ?? user.email}</p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Keisti slaptažodį</h2>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Dabartinis slaptažodis</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Įveskite dabartinį slaptažodį"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Naujas slaptažodis</label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="min. 8 simboliai"
              showStrength
              showGenerator
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Pakartokite naują slaptažodį</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Pakartokite slaptažodį"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
            />
          </div>

          {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
          {success && <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">✓ Slaptažodis sėkmingai pakeistas!</p>}

          <button
            type="submit"
            disabled={loading || !newPassword || !currentPassword || !confirm}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? "Keičiama..." : "Pakeisti slaptažodį"}
          </button>
        </form>
      </div>
    </div>
  );
}
