"use client";

import { useState } from "react";
import { teamMap } from "@/data/teams";
import { useApp } from "@/context/app-context";

export default function AdminPage() {
  const { matches, updateMatchResult } = useApp();
  const [selectedId, setSelectedId] = useState(matches[0]?.id ?? "");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const selected = matches.find((m) => m.id === selectedId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    updateMatchResult(selectedId, homeScore, awayScore);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin</h1>
        <p className="mt-2 text-slate-400">
          Įvesk rungtynių rezultatus — taškai perskaičiuojami automatiškai.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Rungtynės</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          >
            {matches.map((match) => (
              <option key={match.id} value={match.id} className="bg-slate-900">
                {teamMap[match.homeTeamId].nameLt} vs {teamMap[match.awayTeamId].nameLt}
                {match.status === "finished" &&
                  ` (${match.homeScore}:${match.awayScore})`}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <p className="text-sm text-slate-500">
            Grupė {selected.group} · {selected.venue}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Namų įvarčiai</label>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Svečių įvarčiai</label>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Išsaugoti rezultatą
        </button>
      </form>
    </div>
  );
}
