"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { matches as seedMatches } from "@/data/matches";
import { generateId } from "@/lib/id";
import { estimatePoolOdds } from "@/lib/odds";
import { fetchProfile, updateProfile } from "@/lib/profiles";
import { isMatchLocked, settleBet } from "@/lib/scoring";
import { loadBets, loadMatches, saveBets, saveMatches } from "@/lib/storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Bet, LeaderboardEntry, Match, OddsMode, Outcome, User } from "@/lib/types";

interface AppContextValue {
  user: User | null;
  matches: Match[];
  bets: Bet[];
  ready: boolean;
  authConfigured: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  placeBet: (matchId: string, outcome: Outcome, stake: number, oddsMode: OddsMode) => string | null;
  updateMatchResult: (matchId: string, homeScore: number, awayScore: number) => void;
  getUserBet: (matchId: string) => Bet | undefined;
  getPoolDistribution: (matchId: string) => { home: number; draw: number; away: number };
  getPoolOdds: (match: Match) => Match["odds"];
  leaderboard: LeaderboardEntry[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [matches, setMatches] = useState<Match[]>(seedMatches);
  const [ready, setReady] = useState(false);
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<LeaderboardEntry[]>([]);
  const authConfigured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (authConfigured ? createClient() : null),
    [authConfigured],
  );

  const loadLeaderboard = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, total_points, coin_balance")
      .order("total_points", { ascending: false })
      .limit(50);

    if (!data) return;

    setRemoteLeaderboard(
      data.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        totalPoints: row.total_points,
        betsCount: 0,
      })),
    );
  }, [supabase]);

  const syncSession = useCallback(async () => {
    if (!supabase) {
      setReady(true);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setBets([]);
      setReady(true);
      return;
    }

    const profile = await fetchProfile(
      supabase,
      session.user.id,
      session.user.email ?? "",
      session.user.user_metadata,
    );

    if (profile) {
      setUser(profile);
      setBets(loadBets(profile.id));
    }

    await loadLeaderboard();
    setReady(true);
  }, [supabase, loadLeaderboard]);

  useEffect(() => {
    setMatches(loadMatches());
    syncSession();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });

    return () => subscription.unsubscribe();
  }, [supabase, syncSession]);

  useEffect(() => {
    if (!ready) return;
    saveMatches(matches);
  }, [matches, ready]);

  useEffect(() => {
    if (!ready || !user) return;
    saveBets(user.id, bets);
  }, [bets, user, ready]);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const profile = await fetchProfile(
      supabase,
      session.user.id,
      session.user.email ?? "",
      session.user.user_metadata,
    );
    if (profile) setUser(profile);
    await loadLeaderboard();
  }, [supabase, loadLeaderboard]);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setBets([]);
  }, [supabase]);

  const getUserBet = useCallback(
    (matchId: string) => bets.find((b) => b.userId === user?.id && b.matchId === matchId),
    [bets, user?.id],
  );

  const getPoolDistribution = useCallback(
    (matchId: string) => {
      const poolBets = bets.filter((b) => b.matchId === matchId && b.oddsMode === "pool");
      return poolBets.reduce(
        (acc, bet) => {
          acc[bet.outcome] += bet.stake;
          return acc;
        },
        { home: 0, draw: 0, away: 0 },
      );
    },
    [bets],
  );

  const getPoolOdds = useCallback(
    (match: Match) => {
      const distribution = getPoolDistribution(match.id);
      const hasPool = distribution.home + distribution.draw + distribution.away > 0;
      if (!hasPool) {
        return {
          home: Number((match.odds.home * 0.95).toFixed(2)),
          draw: Number((match.odds.draw * 0.95).toFixed(2)),
          away: Number((match.odds.away * 0.95).toFixed(2)),
        };
      }
      return estimatePoolOdds(match.odds, distribution);
    },
    [getPoolDistribution],
  );

  const placeBet = useCallback(
    (matchId: string, outcome: Outcome, stake: number, oddsMode: OddsMode) => {
      if (!user) return "Prisijunkite, kad galėtumėte statyti.";
      const match = matches.find((m) => m.id === matchId);
      if (!match) return "Rungtynės nerastos.";
      if (isMatchLocked(match)) return "Statymai užrakinti — rungtynės jau prasidėjo.";
      if (getUserBet(matchId)) return "Jau statei ant šių rungtynių.";
      if (stake < 1) return "Minimalus statymas — 1 moneta.";
      if (stake > user.coinBalance) return "Nepakanka monetų.";

      const coefficient =
        oddsMode === "fixed" ? match.odds[outcome] : getPoolOdds(match)[outcome];

      const bet: Bet = {
        id: generateId(),
        matchId,
        userId: user.id,
        outcome,
        stake,
        oddsMode,
        coefficient,
        createdAt: new Date().toISOString(),
        settled: false,
        pointsWon: 0,
      };

      const newBalance = user.coinBalance - stake;

      setBets((prev) => [...prev, bet]);
      setUser((prev) => (prev ? { ...prev, coinBalance: newBalance } : prev));

      if (supabase) {
        void updateProfile(supabase, user.id, { coin_balance: newBalance });
      }

      return null;
    },
    [getPoolOdds, getUserBet, matches, supabase, user],
  );

  const updateMatchResult = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? { ...match, homeScore, awayScore, status: "finished" as const }
            : match,
        ),
      );

      setBets((prev) => {
        const updated = prev.map((bet) => {
          if (bet.matchId !== matchId || bet.settled) return bet;
          const match = matches.find((m) => m.id === matchId);
          if (!match) return bet;
          const finished = {
            ...match,
            homeScore,
            awayScore,
            status: "finished" as const,
          };
          return settleBet(bet, finished);
        });

        const pointsDelta = updated
          .filter((bet) => bet.matchId === matchId && bet.settled)
          .reduce((sum, bet) => {
            const old = prev.find((b) => b.id === bet.id);
            return sum + (bet.pointsWon - (old?.pointsWon ?? 0));
          }, 0);

        if (pointsDelta > 0 && user) {
          const newPoints = user.totalPoints + pointsDelta;
          setUser((current) =>
            current ? { ...current, totalPoints: newPoints } : current,
          );
          if (supabase) {
            void updateProfile(supabase, user.id, { total_points: newPoints });
            void loadLeaderboard();
          }
        }

        return updated;
      });
    },
    [loadLeaderboard, matches, supabase, user],
  );

  const leaderboard = useMemo(() => {
    const entries = remoteLeaderboard.map((entry) => ({
      ...entry,
      isCurrentUser: entry.id === user?.id,
    }));

    if (user && !entries.find((e) => e.id === user.id)) {
      entries.push({
        id: user.id,
        displayName: user.displayName,
        totalPoints: user.totalPoints,
        betsCount: bets.filter((b) => b.userId === user.id).length,
        isCurrentUser: true,
      });
    }

    return entries.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [bets, remoteLeaderboard, user]);

  const value: AppContextValue = {
    user,
    matches,
    bets,
    ready,
    authConfigured,
    logout,
    refreshProfile,
    placeBet,
    updateMatchResult,
    getUserBet,
    getPoolDistribution,
    getPoolOdds,
    leaderboard,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
