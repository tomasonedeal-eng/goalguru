import type { Match } from "@/lib/types";
import { calculateFixedOdds } from "@/lib/odds";

interface MatchData {
  homeTeamId: string;
  awayTeamId: string;
  group: string;
  matchday: number;
  kickoff: string; // UTC
  venue: string;
}

// All times converted from EEST (UTC+3) to UTC
const matchesData: MatchData[] = [
  // ── GROUP A ──────────────────────────────────────────────────────────────
  { homeTeamId: "mexico",       awayTeamId: "south-africa", group: "A", matchday: 1, kickoff: "2026-06-11T19:00:00Z", venue: "Mexico City" },
  { homeTeamId: "korea",        awayTeamId: "czechia",      group: "A", matchday: 1, kickoff: "2026-06-12T02:00:00Z", venue: "Guadalajara" },
  { homeTeamId: "czechia",      awayTeamId: "south-africa", group: "A", matchday: 2, kickoff: "2026-06-18T16:00:00Z", venue: "Atlanta" },
  { homeTeamId: "mexico",       awayTeamId: "korea",        group: "A", matchday: 2, kickoff: "2026-06-19T01:00:00Z", venue: "Guadalajara" },
  { homeTeamId: "czechia",      awayTeamId: "mexico",       group: "A", matchday: 3, kickoff: "2026-06-25T01:00:00Z", venue: "Mexico City" },
  { homeTeamId: "south-africa", awayTeamId: "korea",        group: "A", matchday: 3, kickoff: "2026-06-25T01:00:00Z", venue: "Monterrey" },

  // ── GROUP B ──────────────────────────────────────────────────────────────
  { homeTeamId: "canada",       awayTeamId: "bosnia",       group: "B", matchday: 1, kickoff: "2026-06-12T19:00:00Z", venue: "Toronto" },
  { homeTeamId: "qatar",        awayTeamId: "switzerland",  group: "B", matchday: 1, kickoff: "2026-06-13T19:00:00Z", venue: "San Francisco" },
  { homeTeamId: "switzerland",  awayTeamId: "bosnia",       group: "B", matchday: 2, kickoff: "2026-06-18T19:00:00Z", venue: "Los Angeles" },
  { homeTeamId: "canada",       awayTeamId: "qatar",        group: "B", matchday: 2, kickoff: "2026-06-18T22:00:00Z", venue: "Vancouver" },
  { homeTeamId: "switzerland",  awayTeamId: "canada",       group: "B", matchday: 3, kickoff: "2026-06-24T19:00:00Z", venue: "Vancouver" },
  { homeTeamId: "bosnia",       awayTeamId: "qatar",        group: "B", matchday: 3, kickoff: "2026-06-24T19:00:00Z", venue: "Seattle" },

  // ── GROUP C ──────────────────────────────────────────────────────────────
  { homeTeamId: "brazil",       awayTeamId: "morocco",      group: "C", matchday: 1, kickoff: "2026-06-13T22:00:00Z", venue: "New York/New Jersey" },
  { homeTeamId: "haiti",        awayTeamId: "scotland",     group: "C", matchday: 1, kickoff: "2026-06-14T01:00:00Z", venue: "Boston" },
  { homeTeamId: "scotland",     awayTeamId: "morocco",      group: "C", matchday: 2, kickoff: "2026-06-19T22:00:00Z", venue: "Boston" },
  { homeTeamId: "brazil",       awayTeamId: "haiti",        group: "C", matchday: 2, kickoff: "2026-06-20T00:30:00Z", venue: "Philadelphia" },
  { homeTeamId: "scotland",     awayTeamId: "brazil",       group: "C", matchday: 3, kickoff: "2026-06-24T22:00:00Z", venue: "Miami" },
  { homeTeamId: "morocco",      awayTeamId: "haiti",        group: "C", matchday: 3, kickoff: "2026-06-24T22:00:00Z", venue: "Atlanta" },

  // ── GROUP D ──────────────────────────────────────────────────────────────
  { homeTeamId: "usa",          awayTeamId: "paraguay",     group: "D", matchday: 1, kickoff: "2026-06-13T01:00:00Z", venue: "Los Angeles" },
  { homeTeamId: "australia",    awayTeamId: "turkey",       group: "D", matchday: 1, kickoff: "2026-06-14T04:00:00Z", venue: "Vancouver" },
  { homeTeamId: "usa",          awayTeamId: "australia",    group: "D", matchday: 2, kickoff: "2026-06-19T19:00:00Z", venue: "Seattle" },
  { homeTeamId: "turkey",       awayTeamId: "paraguay",     group: "D", matchday: 2, kickoff: "2026-06-20T03:00:00Z", venue: "San Francisco" },
  { homeTeamId: "turkey",       awayTeamId: "usa",          group: "D", matchday: 3, kickoff: "2026-06-26T02:00:00Z", venue: "Los Angeles" },
  { homeTeamId: "paraguay",     awayTeamId: "australia",    group: "D", matchday: 3, kickoff: "2026-06-26T02:00:00Z", venue: "San Francisco" },

  // ── GROUP E ──────────────────────────────────────────────────────────────
  { homeTeamId: "germany",      awayTeamId: "curacao",      group: "E", matchday: 1, kickoff: "2026-06-14T17:00:00Z", venue: "Houston" },
  { homeTeamId: "ivory-coast",  awayTeamId: "ecuador",      group: "E", matchday: 1, kickoff: "2026-06-14T23:00:00Z", venue: "Philadelphia" },
  { homeTeamId: "germany",      awayTeamId: "ivory-coast",  group: "E", matchday: 2, kickoff: "2026-06-20T20:00:00Z", venue: "Toronto" },
  { homeTeamId: "ecuador",      awayTeamId: "curacao",      group: "E", matchday: 2, kickoff: "2026-06-21T00:00:00Z", venue: "Kansas City" },
  { homeTeamId: "curacao",      awayTeamId: "ivory-coast",  group: "E", matchday: 3, kickoff: "2026-06-25T20:00:00Z", venue: "Philadelphia" },
  { homeTeamId: "ecuador",      awayTeamId: "germany",      group: "E", matchday: 3, kickoff: "2026-06-25T20:00:00Z", venue: "New York/New Jersey" },

  // ── GROUP F ──────────────────────────────────────────────────────────────
  { homeTeamId: "netherlands",  awayTeamId: "japan",        group: "F", matchday: 1, kickoff: "2026-06-14T20:00:00Z", venue: "Dallas" },
  { homeTeamId: "sweden",       awayTeamId: "tunisia",      group: "F", matchday: 1, kickoff: "2026-06-15T02:00:00Z", venue: "Monterrey" },
  { homeTeamId: "netherlands",  awayTeamId: "sweden",       group: "F", matchday: 2, kickoff: "2026-06-20T17:00:00Z", venue: "Houston" },
  { homeTeamId: "tunisia",      awayTeamId: "japan",        group: "F", matchday: 2, kickoff: "2026-06-21T04:00:00Z", venue: "Monterrey" },
  { homeTeamId: "japan",        awayTeamId: "sweden",       group: "F", matchday: 3, kickoff: "2026-06-25T23:00:00Z", venue: "Dallas" },
  { homeTeamId: "tunisia",      awayTeamId: "netherlands",  group: "F", matchday: 3, kickoff: "2026-06-25T23:00:00Z", venue: "Kansas City" },

  // ── GROUP G ──────────────────────────────────────────────────────────────
  { homeTeamId: "belgium",      awayTeamId: "egypt",        group: "G", matchday: 1, kickoff: "2026-06-15T19:00:00Z", venue: "Seattle" },
  { homeTeamId: "iran",         awayTeamId: "new-zealand",  group: "G", matchday: 1, kickoff: "2026-06-16T01:00:00Z", venue: "Los Angeles" },
  { homeTeamId: "belgium",      awayTeamId: "iran",         group: "G", matchday: 2, kickoff: "2026-06-21T19:00:00Z", venue: "Los Angeles" },
  { homeTeamId: "new-zealand",  awayTeamId: "egypt",        group: "G", matchday: 2, kickoff: "2026-06-22T01:00:00Z", venue: "Vancouver" },
  { homeTeamId: "egypt",        awayTeamId: "iran",         group: "G", matchday: 3, kickoff: "2026-06-27T03:00:00Z", venue: "Seattle" },
  { homeTeamId: "new-zealand",  awayTeamId: "belgium",      group: "G", matchday: 3, kickoff: "2026-06-27T03:00:00Z", venue: "Vancouver" },

  // ── GROUP H ──────────────────────────────────────────────────────────────
  { homeTeamId: "spain",        awayTeamId: "cape-verde",   group: "H", matchday: 1, kickoff: "2026-06-15T16:00:00Z", venue: "Atlanta" },
  { homeTeamId: "saudi-arabia", awayTeamId: "uruguay",      group: "H", matchday: 1, kickoff: "2026-06-15T22:00:00Z", venue: "Miami" },
  { homeTeamId: "spain",        awayTeamId: "saudi-arabia", group: "H", matchday: 2, kickoff: "2026-06-21T16:00:00Z", venue: "Atlanta" },
  { homeTeamId: "uruguay",      awayTeamId: "cape-verde",   group: "H", matchday: 2, kickoff: "2026-06-21T22:00:00Z", venue: "Miami" },
  { homeTeamId: "cape-verde",   awayTeamId: "saudi-arabia", group: "H", matchday: 3, kickoff: "2026-06-27T00:00:00Z", venue: "Houston" },
  { homeTeamId: "uruguay",      awayTeamId: "spain",        group: "H", matchday: 3, kickoff: "2026-06-27T00:00:00Z", venue: "Guadalajara" },

  // ── GROUP I ──────────────────────────────────────────────────────────────
  { homeTeamId: "france",       awayTeamId: "senegal",      group: "I", matchday: 1, kickoff: "2026-06-16T19:00:00Z", venue: "New York/New Jersey" },
  { homeTeamId: "iraq",         awayTeamId: "norway",       group: "I", matchday: 1, kickoff: "2026-06-16T22:00:00Z", venue: "Boston" },
  { homeTeamId: "france",       awayTeamId: "iraq",         group: "I", matchday: 2, kickoff: "2026-06-22T21:00:00Z", venue: "Philadelphia" },
  { homeTeamId: "norway",       awayTeamId: "senegal",      group: "I", matchday: 2, kickoff: "2026-06-23T00:00:00Z", venue: "New York/New Jersey" },
  { homeTeamId: "norway",       awayTeamId: "france",       group: "I", matchday: 3, kickoff: "2026-06-26T19:00:00Z", venue: "Boston" },
  { homeTeamId: "senegal",      awayTeamId: "iraq",         group: "I", matchday: 3, kickoff: "2026-06-26T19:00:00Z", venue: "Toronto" },

  // ── GROUP J ──────────────────────────────────────────────────────────────
  { homeTeamId: "argentina",    awayTeamId: "algeria",      group: "J", matchday: 1, kickoff: "2026-06-17T01:00:00Z", venue: "Kansas City" },
  { homeTeamId: "austria",      awayTeamId: "jordan",       group: "J", matchday: 1, kickoff: "2026-06-17T04:00:00Z", venue: "San Francisco" },
  { homeTeamId: "argentina",    awayTeamId: "austria",      group: "J", matchday: 2, kickoff: "2026-06-22T17:00:00Z", venue: "Dallas" },
  { homeTeamId: "jordan",       awayTeamId: "algeria",      group: "J", matchday: 2, kickoff: "2026-06-23T03:00:00Z", venue: "San Francisco" },
  { homeTeamId: "algeria",      awayTeamId: "austria",      group: "J", matchday: 3, kickoff: "2026-06-28T02:00:00Z", venue: "Kansas City" },
  { homeTeamId: "jordan",       awayTeamId: "argentina",    group: "J", matchday: 3, kickoff: "2026-06-28T02:00:00Z", venue: "Dallas" },

  // ── GROUP K ──────────────────────────────────────────────────────────────
  { homeTeamId: "portugal",     awayTeamId: "congo-dr",     group: "K", matchday: 1, kickoff: "2026-06-17T17:00:00Z", venue: "Houston" },
  { homeTeamId: "uzbekistan",   awayTeamId: "colombia",     group: "K", matchday: 1, kickoff: "2026-06-18T02:00:00Z", venue: "Mexico City" },
  { homeTeamId: "portugal",     awayTeamId: "uzbekistan",   group: "K", matchday: 2, kickoff: "2026-06-23T17:00:00Z", venue: "Houston" },
  { homeTeamId: "colombia",     awayTeamId: "congo-dr",     group: "K", matchday: 2, kickoff: "2026-06-24T02:00:00Z", venue: "Guadalajara" },
  { homeTeamId: "colombia",     awayTeamId: "portugal",     group: "K", matchday: 3, kickoff: "2026-06-27T23:30:00Z", venue: "Miami" },
  { homeTeamId: "congo-dr",     awayTeamId: "uzbekistan",   group: "K", matchday: 3, kickoff: "2026-06-27T23:30:00Z", venue: "Atlanta" },

  // ── GROUP L ──────────────────────────────────────────────────────────────
  { homeTeamId: "england",      awayTeamId: "croatia",      group: "L", matchday: 1, kickoff: "2026-06-17T20:00:00Z", venue: "Dallas" },
  { homeTeamId: "ghana",        awayTeamId: "panama",       group: "L", matchday: 1, kickoff: "2026-06-17T23:00:00Z", venue: "Toronto" },
  { homeTeamId: "england",      awayTeamId: "ghana",        group: "L", matchday: 2, kickoff: "2026-06-23T20:00:00Z", venue: "Boston" },
  { homeTeamId: "panama",       awayTeamId: "croatia",      group: "L", matchday: 2, kickoff: "2026-06-23T23:00:00Z", venue: "Toronto" },
  { homeTeamId: "panama",       awayTeamId: "england",      group: "L", matchday: 3, kickoff: "2026-06-27T21:00:00Z", venue: "New York/New Jersey" },
  { homeTeamId: "croatia",      awayTeamId: "ghana",        group: "L", matchday: 3, kickoff: "2026-06-27T21:00:00Z", venue: "Philadelphia" },
];

export const matches: Match[] = matchesData
  .map((data) => {
    const odds = calculateFixedOdds(data.homeTeamId, data.awayTeamId);
    return {
      id: `wc26-${data.group.toLowerCase()}-md${data.matchday}-${data.homeTeamId}-${data.awayTeamId}`,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      group: data.group,
      matchday: data.matchday,
      kickoff: data.kickoff,
      venue: data.venue,
      status: "scheduled" as const,
      homeScore: null,
      awayScore: null,
      odds,
    };
  })
  .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

export const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]));
