"use client";

import { useState } from "react";
import { useApp } from "@/context/app-context";
import { teamMap } from "@/data/teams";
import { isMatchLocked } from "@/lib/scoring";
import type { Match, Outcome } from "@/lib/types";
import { TeamFlag } from "@/components/team-flag";

const outcomeLabels: Record<Outcome, string> = {
  home: "1",
  draw: "X",
  away: "2",
};

export function BetSheet({ match, onClose }: { match: Match; onClose: () => void }) {
  const { user, placeBet, getUserBet } = useApp();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const existingBet = getUserBet(match.id);
  const locked = isMatchLocked(match);
  const home = teamMap[match.homeTeamId];
  const away = teamMap[match.awayTeamId];

  const handleSubmit = () => {
    if (!outcome) {
      setError("Pasirinkite rezultatą.");
      return;
    }
    const err = placeBet(match.id, outcome, 1, "fixed");
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
          <p className="text-lg font-semibold text-white">Tavo spėjimas</p>
          <p className="text-4xl font-bold text-amber-300">
            {outcomeLabels[existingBet.outcome]}
          </p>
          <p className="text-slate-400">
            koeficientas ×{existingBet.coefficient}
            {existingBet.settled && (
              <span className={existingBet.pointsWon > 0 ? " text-emerald-400" : " text-slate-500"}>
                {" "}· {existingBet.pointsWon > 0 ? `+${existingBet.pointsWon} tšk.` : "Nepasisekė"}
              </span>
            )}
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

        <p className="text-sm text-slate-400">Pasirinkite rezultatą:</p>

        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as Outcome[]).map((key) => {
            const label = key === "home" ? "1" : key === "draw" ? "X" : "2";
            const teamLabel =
              key === "home" ? home.nameLt : key === "away" ? away.nameLt : "Lygiosios";

            return (
              <button
                key={key}
                disabled={locked}
                onClick={() => setOutcome(key)}
                className={`rounded-2xl border p-4 text-center transition ${
                  outcome === key
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <p className="text-2xl font-bold text-white">{label}</p>
                <p className="mt-1 text-lg font-semibold text-amber-300">×{match.odds[key]}</p>
                <p className="mt-1 text-[11px] text-slate-400">{teamLabel}</p>
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">Spėjimas priimtas!</p>}

        <button
          disabled={locked || !user}
          onClick={handleSubmit}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!user ? "Prisijunkite" : locked ? "Užrakinta" : "Patvirtinti spėjimą"}
        </button>

        <p className="text-center text-[11px] text-slate-500">
          Tik žaidimo taškai — jokių pinigų
        </p>
      </div>
    </Overlay>
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
