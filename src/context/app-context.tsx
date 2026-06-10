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
import {
  localGoogleSignIn,
  localSignIn,
  localSignUp,
  loadLocalUser,
  saveLocalUser,
} from "@/lib/local-auth";
import { demoLeaderboard, loadBets, loadMatches, saveBets, saveMatches } from "@/lib/storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Bet, LeaderboardEntry, Match, OddsMode, Outcome, User } from "@/lib/types";

interface AppContextValue {
  user: User | null;
  matches: Match[];
  bets: Bet[];
  ready: boolean;
  authConfigured: boolean;
  logout: () => Promise<void>;
  loginLocalGoogle: (displayName: string, email?: string) => void;
  loginLocalEmail: (email: string, password: string) => string | null;
  signupLocal: (displayName: string, email: string, password: string) => string | null;
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
      const localUser = loadLocalUser();
      if (localUser) {
        setUser(localUser);
        setBets(loadBets(localUser.id));
      }
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
    } else {
      saveLocalUser(null);
    }
    setUser(null);
    setBets([]);
  }, [supabase]);

  const loginLocalGoogle = useCallback((displayName: string, email?: string) => {
    const loggedIn = localGoogleSignIn(displayName, email);
    setUser(loggedIn);
    setBets(loadBets(loggedIn.id));
  }, []);

  const loginLocalEmail = useCallback((email: string, password: string) => {
    const result = localSignIn(email, password);
    if (result.error) return result.error;
    if (result.user) {
      setUser(result.user);
      setBets(loadBets(result.user.id));
    }
    return null;
  }, []);

  const signupLocal = useCallback(
    (displayName: string, email: string, password: string) => {
      const result = localSignUp(displayName, email, password);
      if (result.error) return result.error;
      if (result.user) {
        setUser(result.user);
        setBets([]);
      }
      return null;
    },
    [],
  );

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
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, coinBalance: newBalance };
        if (!supabase) saveLocalUser(updated);
        return updated;
      });

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
          setUser((current) => {
            if (!current) return current;
            const updated = { ...current, totalPoints: newPoints };
            if (!supabase) saveLocalUser(updated);
            return updated;
          });
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
    const base: LeaderboardEntry[] = authConfigured
      ? remoteLeaderboard.map((entry) => ({
          ...entry,
          isCurrentUser: entry.id === user?.id,
        }))
      : demoLeaderboard.map((entry) => ({ ...entry }));

    if (user && !base.find((e) => e.id === user.id)) {
      base.push({
        id: user.id,
        displayName: user.displayName,
        totalPoints: user.totalPoints,
        betsCount: bets.filter((b) => b.userId === user.id).length,
        isCurrentUser: true,
      });
    } else if (user) {
      const entry = base.find((e) => e.id === user.id);
      if (entry) {
        entry.totalPoints = user.totalPoints;
        entry.betsCount = bets.filter((b) => b.userId === user.id).length;
        entry.isCurrentUser = true;
      }
    }

    return base.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [authConfigured, bets, remoteLeaderboard, user]);

  const value: AppContextValue = {
    user,
    matches,
    bets,
    ready,
    authConfigured,
    logout,
    loginLocalGoogle,
    loginLocalEmail,
    signupLocal,
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
