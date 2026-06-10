"use client";

import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { useApp } from "@/context/app-context";

export default function HomePage() {
  const { matches, user, leaderboard } = useApp();
  const upcoming = matches
    .filter((m) => m.status === "scheduled")
    .slice(0, 4);
  const top3 = leaderboard.slice(0, 3);

  const tournamentStart = new Date("2026-06-11T16:00:00Z");
  const daysLeft = Math.max(
    0,
    Math.ceil((tournamentStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="space-y-10">
      <section className="hero-glow relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1628]/80 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl space-y-5">
          <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-emerald-300">
            FIFA World Cup 2026
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
            Spėk. Statyk monetas. Kilk reitinge.
          </h1>
          <p className="text-lg text-slate-400">
            Viešas totalizatorius su fiksuotais ir dinaminiais koeficientais.
            Renkiesi rungtynes ir statymo sumą — tik virtualūs taškai, jokių pinigų.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/fixtures" className="btn-primary">
              Statyti dabar
            </Link>
            <Link href="/leaderboard" className="btn-secondary">
              Reitingas
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Iki turnyro" value={`${daysLeft} d.`} />
          <StatCard label="Rungtynių" value={`${matches.length}`} />
          <StatCard
            label="Tavo monetos"
            value={user ? String(user.coinBalance) : "—"}
            accent
          />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Artimiausios rungtynės</h2>
            <Link href="/fixtures" className="text-sm text-emerald-400 hover:underline">
              Visos →
            </Link>
          </div>
          <div className="grid gap-4">
            {upcoming.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Top 3 reitinge</h2>
          <div className="card space-y-3">
            {top3.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  entry.isCurrentUser ? "bg-emerald-500/10" : "bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-sm font-bold text-amber-300">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">
                      {entry.displayName}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-emerald-400">(tu)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{entry.betsCount} statymai</p>
                  </div>
                </div>
                <p className="font-bold text-amber-300">{entry.totalPoints}</p>
              </div>
            ))}
          </div>

          {!user && (
            <div className="card border-dashed border-emerald-400/30 text-center">
              <p className="mb-3 text-sm text-slate-400">
                Prisijunk ir gauk 1000 monetų turnyrui
              </p>
              <Link href="/login" className="btn-primary inline-block">
                Prisijungti
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-amber-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
