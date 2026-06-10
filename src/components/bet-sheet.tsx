"use client";

import { useState } from "react";
import { useApp } from "@/context/app-context";
import { teamMap } from "@/data/teams";
import { isMatchLocked } from "@/lib/scoring";
import type { Match, OddsMode, Outcome } from "@/lib/types";
import { TeamFlag } from "@/components/team-flag";

const outcomeLabels: Record<Outcome, string> = {
  home: "1",
  draw: "X",
  away: "2",
};

export function BetSheet({ match, onClose }: { match: Match; onClose: () => void }) {
  const { user, placeBet, getUserBet, getPoolOdds } = useApp();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [stake, setStake] = useState(10);
  const [oddsMode, setOddsMode] = useState<OddsMode>(user?.defaultOddsMode ?? "fixed");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const existingBet = getUserBet(match.id);
  const locked = isMatchLocked(match);
  const poolOdds = getPoolOdds(match);
  const home = teamMap[match.homeTeamId];
  const away = teamMap[match.awayTeamId];

  const handleSubmit = () => {
    if (!outcome) {
      setError("Pasirinkite rezultatą.");
      return;
    }
    const err = placeBet(match.id, outcome, stake, oddsMode);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 900);
  };

  if (existingBet) {
    return (
      <Overlay onClose={onClose}>
        <div className="space-y-4 text-center">
          <p className="text-lg font-semibold text-white">Jau statei</p>
          <p className="text-slate-400">
            {outcomeLabels[existingBet.outcome]} · {existingBet.stake} monetų ·{" "}
            {existingBet.coefficient}x · {existingBet.oddsMode === "fixed" ? "Fiksuoti" : "Dinaminiai"}
          </p>
          <button onClick={onClose} className="btn-secondary w-full">
            Uždaryti
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TeamFlag teamId={match.homeTeamId} size={28} />
            <span className="font-semibold text-white">{home.nameLt}</span>
            <span className="text-slate-500">vs</span>
            <span className="font-semibold text-white">{away.nameLt}</span>
            <TeamFlag teamId={match.awayTeamId} size={28} />
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
            Gr. {match.group}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={oddsMode === "fixed"}
            onClick={() => setOddsMode("fixed")}
            label="Fiksuoti"
            hint="Koef. fiksuotas"
          />
          <ModeButton
            active={oddsMode === "pool"}
            onClick={() => setOddsMode("pool")}
            label="Dinaminiai"
            hint="Pagal pool"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as Outcome[]).map((key) => {
            const fixed = match.odds[key];
            const pool = poolOdds[key];
            const coeff = oddsMode === "fixed" ? fixed : pool;
            const label =
              key === "home" ? "1" : key === "draw" ? "X" : "2";
            const teamLabel =
              key === "home" ? home.nameLt : key === "away" ? away.nameLt : "Lygiosios";

            return (
              <button
                key={key}
                disabled={locked}
                onClick={() => setOutcome(key)}
                className={`rounded-2xl border p-3 text-left transition ${
                  outcome === key
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <p className="text-xs text-slate-400">{label} · {teamLabel}</p>
                <p className="mt-1 text-xl font-bold text-amber-300">{coeff}x</p>
                {oddsMode === "pool" && (
                  <p className="text-[10px] text-slate-500">fiksuoti: {fixed}x</p>
                )}
              </button>
            );
          })}
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Statymas (monetos) — likutis: {user?.coinBalance ?? 0}
          </label>
          <div className="flex gap-2">
            {[5, 10, 25, 50].map((amount) => (
              <button
                key={amount}
                onClick={() => setStake(amount)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                  stake === amount
                    ? "bg-amber-400 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={user?.coinBalance ?? 1000}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
          />
        </div>

        {outcome && (
          <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300">
            Galimas laimėjimas:{" "}
            <span className="font-bold text-emerald-300">
              {Math.round(
                stake *
                  (oddsMode === "fixed" ? match.odds[outcome] : poolOdds[outcome]),
              )}{" "}
              taškų
            </span>
          </p>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">Statymas priimtas!</p>}

        <button
          disabled={locked || !user}
          onClick={handleSubmit}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!user ? "Prisijunkite" : locked ? "Užrakinta" : "Statyti"}
        </button>

        <p className="text-center text-[11px] text-slate-500">
          Tik žaidimo taškai — jokių pinigų
        </p>
      </div>
    </Overlay>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left ${
        active
          ? "border-cyan-400 bg-cyan-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="font-semibold text-white">{label}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </button>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1628] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
