import type { Bet, Match, Outcome } from "@/lib/types";

export function getMatchOutcome(match: Match): Outcome | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.homeScore < match.awayScore) return "away";
  return "draw";
}

export function settleBet(bet: Bet, match: Match): Bet {
  const result = getMatchOutcome(match);
  if (!result) return bet;

  const won = bet.outcome === result;
  return {
    ...bet,
    settled: true,
    pointsWon: won ? Math.round(bet.stake * bet.coefficient) : 0,
  };
}

export function isMatchLocked(match: Match) {
  if (match.status === "finished" || match.status === "live") return true;
  return new Date(match.kickoff) <= new Date();
}
