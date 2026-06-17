import { NextResponse } from "next/server";
import { matches } from "@/data/matches";
import { teamMap } from "@/data/teams";

type OddsTriple = { home: number; draw: number; away: number };

type OddsEvent = {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: Array<{
    key: string;
    markets?: Array<{
      key: string;
      outcomes?: Array<{ name: string; price: number }>;
    }>;
  }>;
};

function normalizeName(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamNameVariants(teamId: string): string[] {
  const base = teamMap[teamId]?.name ?? teamId;
  const variants = new Set<string>([normalizeName(base)]);
  const extra: Record<string, string[]> = {
    usa: ["USA", "United States", "United States of America"],
    korea: ["Korea Republic", "South Korea", "Republic of Korea"],
    turkey: ["Türkiye", "Turkey"],
    iran: ["IR Iran", "Iran"],
    "ivory-coast": ["Côte d'Ivoire", "Ivory Coast", "Cote d'Ivoire"],
    "cape-verde": ["Cabo Verde", "Cape Verde"],
    "congo-dr": ["Congo DR", "DR Congo"],
    bosnia: ["Bosnia and Herzegovina"],
    "new-zealand": ["New Zealand"],
    "south-africa": ["South Africa"],
    switzerland: ["Switzerland"],
  };
  for (const name of extra[teamId] ?? []) variants.add(normalizeName(name));
  return [...variants];
}

function eventMatchesFixture(event: OddsEvent, homeId: string, awayId: string, kickoffIso: string) {
  const homeEvent = normalizeName(event.home_team);
  const awayEvent = normalizeName(event.away_team);
  const homeVariants = teamNameVariants(homeId);
  const awayVariants = teamNameVariants(awayId);

  const sameOrder = homeVariants.includes(homeEvent) && awayVariants.includes(awayEvent);
  const swapped = homeVariants.includes(awayEvent) && awayVariants.includes(homeEvent);
  if (!sameOrder && !swapped) return { match: false as const, swapped: false };

  // Allow time drift up to 8h between fixture and feed.
  const feedTs = Date.parse(event.commence_time);
  const fixtureTs = Date.parse(kickoffIso);
  const diffMs = Math.abs(feedTs - fixtureTs);
  if (Number.isNaN(feedTs) || Number.isNaN(fixtureTs) || diffMs > 8 * 60 * 60 * 1000) {
    return { match: false as const, swapped: false };
  }

  return { match: true as const, swapped };
}

function pickBookmaker(event: OddsEvent) {
  const preferred = ["bet365", "pinnacle", "williamhill", "unibet"];
  const all = event.bookmakers ?? [];
  for (const key of preferred) {
    const b = all.find((x) => x.key === key);
    if (b) return b;
  }
  return all[0];
}

function parseOddsFromEvent(event: OddsEvent, swapped: boolean): OddsTriple | null {
  const bookmaker = pickBookmaker(event);
  const market = bookmaker?.markets?.find((m) => m.key === "h2h");
  const outcomes = market?.outcomes;
  if (!outcomes || outcomes.length < 2) return null;

  const draw = outcomes.find((o) => normalizeName(o.name) === "draw")?.price;
  if (!draw) return null;

  const homeRaw = outcomes.find((o) => normalizeName(o.name) === normalizeName(event.home_team))?.price;
  const awayRaw = outcomes.find((o) => normalizeName(o.name) === normalizeName(event.away_team))?.price;
  if (!homeRaw || !awayRaw) return null;

  const home = swapped ? awayRaw : homeRaw;
  const away = swapped ? homeRaw : awayRaw;
  return {
    home: Number(home.toFixed(2)),
    draw: Number(draw.toFixed(2)),
    away: Number(away.toFixed(2)),
  };
}

export async function GET() {
  const apiKey = process.env.THEODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ odds: {}, source: "fallback", reason: "THEODDS_API_KEY missing" });
  }

  const url =
    `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds` +
    `?apiKey=${encodeURIComponent(apiKey)}` +
    `&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { odds: {}, source: "fallback", reason: `odds-api ${response.status}` },
        { status: 200 },
      );
    }

    const events = (await response.json()) as OddsEvent[];
    const oddsByMatchId: Record<string, OddsTriple> = {};

    for (const match of matches) {
      // For now, we sync only group-stage fixed teams. TBD knockout slots keep fallback odds.
      if (!teamMap[match.homeTeamId] || !teamMap[match.awayTeamId]) continue;

      const candidate = events.find((event) =>
        eventMatchesFixture(event, match.homeTeamId, match.awayTeamId, match.kickoff).match,
      );
      if (!candidate) continue;

      const check = eventMatchesFixture(candidate, match.homeTeamId, match.awayTeamId, match.kickoff);
      const parsed = parseOddsFromEvent(candidate, check.swapped);
      if (!parsed) continue;
      oddsByMatchId[match.id] = parsed;
    }

    return NextResponse.json({
      source: "theoddsapi",
      syncedAt: new Date().toISOString(),
      odds: oddsByMatchId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        odds: {},
        source: "fallback",
        reason: error instanceof Error ? error.message : "unknown fetch error",
      },
      { status: 200 },
    );
  }
}
