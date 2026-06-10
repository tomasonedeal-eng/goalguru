"use client";

import { useApp } from "@/context/app-context";

export default function LeaderboardPage() {
  const { leaderboard } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Reitingas</h1>
        <p className="mt-2 text-slate-400">
          Bendri taškai iš visų statymų. Demo žaidėjai + tavo rezultatas.
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          <span>#</span>
          <span>Žaidėjas</span>
          <span className="text-right">Statymai</span>
          <span className="text-right">Taškai</span>
        </div>

        {leaderboard.map((entry, index) => (
          <div
            key={entry.id}
            className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0 ${
              entry.isCurrentUser ? "bg-emerald-500/5" : ""
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                index === 0
                  ? "bg-amber-400/20 text-amber-300"
                  : index === 1
                    ? "bg-slate-400/20 text-slate-300"
                    : index === 2
                      ? "bg-orange-400/20 text-orange-300"
                      : "bg-white/5 text-slate-400"
              }`}
            >
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-white">
                {entry.displayName}
                {entry.isCurrentUser && (
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                    Tu
                  </span>
                )}
              </p>
            </div>
            <span className="text-right text-slate-400">{entry.betsCount}</span>
            <span className="text-right text-lg font-bold text-amber-300">
              {entry.totalPoints}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
