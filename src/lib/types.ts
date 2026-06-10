export type Outcome = "home" | "draw" | "away";
export type OddsMode = "fixed" | "pool";
export type MatchStatus = "scheduled" | "live" | "finished";

export interface Team {
  id: string;
  name: string;
  nameLt: string;
  flagCode: string;
  fifaRank: number;
}

export interface Odds {
  home: number;
  draw: number;
  away: number;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  group: string;
  matchday: number;
  kickoff: string;
  venue: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  odds: Odds;
}

export interface Bet {
  id: string;
  matchId: string;
  userId: string;
  outcome: Outcome;
  stake: number;
  oddsMode: OddsMode;
  coefficient: number;
  createdAt: string;
  settled: boolean;
  pointsWon: number;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  coinBalance: number;
  totalPoints: number;
  defaultOddsMode: OddsMode;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  totalPoints: number;
  betsCount: number;
  isCurrentUser?: boolean;
}
