"use client";

import { useState } from "react";
import { teamMap } from "@/data/teams";
import { isMatchLocked } from "@/lib/scoring";
import type { Match } from "@/lib/types";
import { useApp } from "@/context/app-context";
import { BetSheet } from "@/components/bet-sheet";
import { TeamFlag } from "@/components/team-flag";

export function MatchCard({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const { getUserBet } = useApp();
  const bet = getUserBet(match.id);
  const locked = isMatchLocked(match);
  const home = teamMap[match.homeTeamId];
  const away = teamMap[match.awayTeamId];
  const kickoff = new Date(match.kickoff);

  return (
    <>
      <article className="card group">
        <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
          <span>Grupė {match.group} · {match.venue}</span>
          <span>
            {kickoff.toLocaleDateString("lt-LT", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <TeamBlock teamId={match.homeTeamId} align="left" />
          <div className="text-center">
            {match.status === "finished" && match.homeScore !== null ? (
              <p className="text-2xl font-bold text-white">
                {match.homeScore} : {match.awayScore}
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-500">vs</p>
            )}
            <div className="mt-2 flex gap-1 text-[10px] text-amber-300/90">
              <span>1 {match.odds.home}</span>
              <span>·</span>
              <span>X {match.odds.draw}</span>
              <span>·</span>
              <span>2 {match.odds.away}</span>
            </div>
          </div>
          <TeamBlock teamId={match.awayTeamId} align="right" />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {bet ? (
            <p className="text-sm text-emerald-300">
              Tavo statymas: {bet.outcome === "home" ? "1" : bet.outcome === "draw" ? "X" : "2"} ·{" "}
              {bet.stake} monetų · {bet.coefficient}x
              {bet.settled && (
                <span className={bet.pointsWon > 0 ? " text-emerald-400" : " text-slate-500"}>
                  {" "}
                  → {bet.pointsWon > 0 ? `+${bet.pointsWon} tšk.` : "0 tšk."}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              {locked ? "Statymai užrakinti" : "Dar nestatyta"}
            </p>
          )}

          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {bet ? "Peržiūrėti" : locked ? "Rezultatas" : "Statyti"}
          </button>
        </div>
      </article>

      {open && <BetSheet match={match} onClose={() => setOpen(false)} />}
    </>
  );
}

function TeamBlock({
  teamId,
  align,
}: {
  teamId: string;
  align: "left" | "right";
}) {
  const team = teamMap[teamId];
  return (
    <div
      className={`flex flex-1 flex-col gap-2 ${
        align === "right" ? "items-end text-right" : "items-start"
      }`}
    >
      <TeamFlag teamId={teamId} size={40} />
      <p className="font-semibold text-white">{team.nameLt}</p>
    </div>
  );
}
