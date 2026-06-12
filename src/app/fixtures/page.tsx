"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/match-card";
import { useApp } from "@/context/app-context";

const groups = ["Visos", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function FixturesPage() {
  const { matches } = useApp();
  const [group, setGroup] = useState("Visos");

  const filtered = useMemo(() => {
    if (group === "Visos") return matches;
    return matches.filter((m) => m.group === group);
  }, [group, matches]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Rungtynės</h1>
        <p className="mt-2 text-slate-400">
          Pasirink rungtynes ir spėk rezultatą pagal koeficientus.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              group === g
                ? "bg-emerald-500 text-slate-950"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {g === "Visos" ? "Visos" : `Gr. ${g}`}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">{filtered.length} rungtynės</p>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
