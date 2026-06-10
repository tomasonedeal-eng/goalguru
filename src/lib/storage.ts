import type { Bet, Match } from "@/lib/types";
import { matches as defaultMatches } from "@/data/matches";

const KEYS = {
  bets: (userId: string) => `goalguru_bets_${userId}`,
  matches: "goalguru_matches",
} as const;

export const STARTING_COINS = 1000;

export const demoLeaderboard = [
  { id: "demo-1", displayName: "FutboloKaralius", totalPoints: 420, betsCount: 12 },
  { id: "demo-2", displayName: "Spėjikas99", totalPoints: 385, betsCount: 8 },
  { id: "demo-3", displayName: "Ofsidas", totalPoints: 310, betsCount: 15 },
  { id: "demo-4", displayName: "VAR_Master", totalPoints: 275, betsCount: 6 },
  { id: "demo-5", displayName: "Golass", totalPoints: 240, betsCount: 10 },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadBets(userId: string): Bet[] {
  return readJson<Bet[]>(KEYS.bets(userId), []);
}

export function saveBets(userId: string, bets: Bet[]) {
  writeJson(KEYS.bets(userId), bets);
}

export function loadMatches(): Match[] {
  return readJson<Match[]>(KEYS.matches, defaultMatches);
}

export function saveMatches(matches: Match[]) {
  writeJson(KEYS.matches, matches);
}
