import type { Match } from "@/lib/types";
import { groups } from "@/data/teams";
import { calculateFixedOdds } from "@/lib/odds";

const venues = [
  "Mexico City",
  "Los Angeles",
  "New York",
  "Miami",
  "Dallas",
  "Atlanta",
  "Toronto",
  "Vancouver",
  "Guadalajara",
  "Houston",
  "Seattle",
  "Boston",
];

const groupRoundPairs = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
] as const;

const baseDate = new Date("2026-06-11T16:00:00Z");
let matchIndex = 0;

function addDays(date: Date, days: number, hours = 0) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  next.setUTCHours(next.getUTCHours() + hours);
  return next.toISOString();
}

function createMatch(
  group: string,
  homeTeamId: string,
  awayTeamId: string,
  matchday: number,
  kickoff: string,
): Match {
  matchIndex += 1;
  const odds = calculateFixedOdds(homeTeamId, awayTeamId);
  return {
    id: `wc26-${group.toLowerCase()}${matchday}-${homeTeamId}-${awayTeamId}`,
    homeTeamId,
    awayTeamId,
    group,
    matchday,
    kickoff,
    venue: venues[matchIndex % venues.length],
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    odds,
  };
}

export const matches: Match[] = [];

Object.entries(groups).forEach(([group, teamIds], groupIndex) => {
  groupRoundPairs.forEach(([homeIdx, awayIdx], roundIndex) => {
    const matchday = roundIndex < 2 ? 1 : roundIndex < 4 ? 2 : 3;
    const dayOffset = groupIndex % 6 + Math.floor(roundIndex / 2) * 4;
    const kickoff = addDays(baseDate, dayOffset, (roundIndex % 2) * 3 + (groupIndex % 3));
    matches.push(
      createMatch(group, teamIds[homeIdx], teamIds[awayIdx], matchday, kickoff),
    );
  });
});

matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

export const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]));
