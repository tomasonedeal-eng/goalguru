import type { Odds } from "@/lib/types";
import { teamMap } from "@/data/teams";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateFixedOdds(homeTeamId: string, awayTeamId: string): Odds {
  const home = teamMap[homeTeamId];
  const away = teamMap[awayTeamId];
  const homeStrength = 1 / home.fifaRank;
  const awayStrength = 1 / away.fifaRank;
  const total = homeStrength + awayStrength + 0.35;

  const homeProb = homeStrength / total;
  const awayProb = awayStrength / total;
  const drawProb = 0.35 / total;

  const margin = 1.08;
  return {
    home: clamp(Number((margin / homeProb).toFixed(2)), 1.1, 15),
    draw: clamp(Number((margin / drawProb).toFixed(2)), 2.5, 6),
    away: clamp(Number((margin / awayProb).toFixed(2)), 1.1, 25),
  };
}

export function estimatePoolOdds(
  fixed: Odds,
  distribution: { home: number; draw: number; away: number },
): Odds {
  const total = distribution.home + distribution.draw + distribution.away || 1;
  const adjust = (share: number, base: number) => {
    const popularity = share / total || 0.33;
    return clamp(Number((base / popularity / 3).toFixed(2)), 1.05, 25);
  };

  return {
    home: adjust(distribution.home, fixed.home),
    draw: adjust(distribution.draw, fixed.draw),
    away: adjust(distribution.away, fixed.away),
  };
}
