import type { Bet, Match } from "@/lib/types";
import { matches as defaultMatches } from "@/data/matches";

const KEYS = {
  bets: (userId: string) => `goalguru_bets_${userId}`,
  matches: "goalguru_matches",
} as const;

export const STARTING_COINS = 1000;

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
