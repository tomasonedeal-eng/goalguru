"use client";

import React, { useEffect, useState } from "react";
import { teamMap } from "@/data/teams";
import { useApp } from "@/context/app-context";
import type { Outcome } from "@/lib/types";
import { PasswordInput } from "@/components/password-input";

interface CreatedUser {
  userId: string;
  displayName: string;
  tempPassword: string;
}

interface PlayerOption {
  id: string;
  displayName: string;
  coinBalance?: number;
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  home: "1 — Namai",
  draw: "X — Lygios",
  away: "2 — Svečiai",
};

export default function AdminContent() {
  const { matches, updateMatchResult } = useApp();

  // --- Register player ---
  const [displayName, setDisplayName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Reset player password ---
  const [resetPlayerId, setResetPlayerId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ playerId: string; msg: string; error: boolean } | null>(null);

  // --- Place bet for player ---
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [betPlayerId, setBetPlayerId] = useState("");
  const [betMatchId, setBetMatchId] = useState(matches[0]?.id ?? "");
  const [betOutcome, setBetOutcome] = useState<Outcome>("home");
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betSuccess, setBetSuccess] = useState<string | null>(null);

  // --- View bets per player ---
  const [betsPlayerId, setBetsPlayerId] = useState<string | null>(null);
  const [playerBets, setPlayerBets] = useState<{ id: string; matchId: string; outcome: string; coefficient: number; settled: boolean; pointsWon: number | null }[]>([]);
  const [betsLoading, setBetsLoading] = useState(false);

  const fetchPlayerBets = async (playerId: string) => {
    setBetsLoading(true);
    try {
      const res = await fetch(`/api/admin/player-bets?playerId=${playerId}`);
      if (res.ok) setPlayerBets(await res.json());
    } finally {
      setBetsLoading(false);
    }
  };

  // --- Inline bet per player ---
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [inlineMatchId, setInlineMatchId] = useState(matches[0]?.id ?? "");
  const [inlineOutcome, setInlineOutcome] = useState<Outcome>("home");
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineResult, setInlineResult] = useState<{ playerId: string; msg: string; error: boolean } | null>(null);

  // --- Match results ---
  const [selectedId, setSelectedId] = useState(matches[0]?.id ?? "");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const selected = matches.find((m) => m.id === selectedId);
  const betMatch = matches.find((m) => m.id === betMatchId);
  const scheduledMatches = matches.filter((m) => m.status === "scheduled");

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/admin/players");
      if (!res.ok) return;
      const data: PlayerOption[] = await res.json();
      setPlayers(data);
      if (data.length > 0 && !betPlayerId) setBetPlayerId(data[0].id);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    void fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep betMatchId valid when matches list loads
  useEffect(() => {
    if (!betMatchId && scheduledMatches.length > 0) {
      setBetMatchId(scheduledMatches[0].id);
    }
  }, [betMatchId, scheduledMatches]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, password: newUserPassword || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to create user");
        return;
      }
      const user = await res.json();
      setCreatedUser(user);
      setDisplayName("");
      setNewUserPassword("");
      // Refresh players list so new player appears in bet form
      void fetchPlayers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreateLoading(false);
    }
  };

  const copyPassword = () => {
    if (createdUser) {
      navigator.clipboard.writeText(createdUser.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetError(null);
    setBetSuccess(null);
    setBetLoading(true);

    if (!betMatch) {
      setBetError("Rungtynės nerastos.");
      setBetLoading(false);
      return;
    }

    const coefficient = betMatch.odds[betOutcome];

    try {
      const res = await fetch("/api/admin/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: betPlayerId,
          matchId: betMatchId,
          outcome: betOutcome,
          stake: 1,
          oddsMode: "fixed",
          coefficient,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBetError(data.error || "Nepavyko.");
        return;
      }
      setBetSuccess(
        `✓ ${data.displayName}: ${OUTCOME_LABELS[betOutcome as Outcome]} (×${coefficient})`,
      );
      void fetchPlayers();
    } catch (err) {
      setBetError(err instanceof Error ? err.message : "Klaida");
    } finally {
      setBetLoading(false);
    }
  };

  const handleResetPassword = async (playerId: string) => {
    setResetLoading(true);
    setResetResult(null);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, password: resetPassword }),
    });
    const data = await res.json();
    setResetResult({ playerId, msg: res.ok ? "✓ Slaptažodis pakeistas" : data.error || "Klaida", error: !res.ok });
    setResetLoading(false);
    if (res.ok) { setResetPlayerId(null); setResetPassword(""); }
  };

  const handleInlineBet = async (playerId: string) => {
    setInlineLoading(true);
    setInlineResult(null);
    const match = matches.find((m) => m.id === inlineMatchId);
    if (!match) { setInlineLoading(false); return; }

    const res = await fetch("/api/admin/place-bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        matchId: inlineMatchId,
        outcome: inlineOutcome,
        stake: 1,
        oddsMode: "fixed",
        coefficient: match.odds[inlineOutcome],
      }),
    });
    const data = await res.json();
    setInlineResult({
      playerId,
      msg: res.ok
        ? `✓ ${OUTCOME_LABELS[inlineOutcome]} (×${match.odds[inlineOutcome]})`
        : data.error || "Klaida",
      error: !res.ok,
    });
    setInlineLoading(false);
    if (res.ok) setExpandedPlayerId(null);
  };

  const handleResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    updateMatchResult(selectedId, homeScore, awayScore);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin</h1>
        <p className="mt-2 text-slate-400">Valdyk žaidimo išteklių, žaidėjus ir rezultatus.</p>
      </div>

      {/* Row 1: Register + Place bet */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Register player */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">Registruoti žaidėją</h2>
          <form onSubmit={handleCreateUser} className="card space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Žaidėjo vardas</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tavo vardas reitinge"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Slaptažodis</label>
              <PasswordInput
                value={newUserPassword}
                onChange={setNewUserPassword}
                placeholder="Palikite tuščią — sugeneruos automatiškai"
                showStrength
                showGenerator
              />
            </div>
            <button
              type="submit"
              disabled={createLoading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {createLoading ? "Kuriama..." : "Sukurti žaidėją"}
            </button>
            {createError && (
              <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {createError}
              </p>
            )}
          </form>

          {createdUser && (
            <div className="mt-4 rounded-xl bg-emerald-500/10 p-4 space-y-3">
              <p className="text-sm text-emerald-300">Žaidėjas sukurtas!</p>
              <div>
                <p className="text-xs text-slate-400">Žaidėjo vardas</p>
                <p className="text-white">{createdUser.displayName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Laikinas slaptažodis</p>
                <div className="flex gap-2">
                  <code className="flex-1 rounded bg-slate-800 px-3 py-2 font-mono text-white">
                    {createdUser.tempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-600"
                  >
                    {copied ? "Nukopijuota!" : "Kopijuoti"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Žaidėjas gali prisijungti savo vardu ir šiuo slaptažodžiu.
              </p>
            </div>
          )}
        </div>

        {/* Place bet for player */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">Statyti žaidėjo vardu</h2>
          {players.length === 0 ? (
            <div className="card text-sm text-slate-400">
              Nėra registruotų žaidėjų.
            </div>
          ) : (
            <form onSubmit={handlePlaceBet} className="card space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Žaidėjas</label>
                <select
                  value={betPlayerId}
                  onChange={(e) => setBetPlayerId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  required
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Rungtynės</label>
                <select
                  value={betMatchId}
                  onChange={(e) => setBetMatchId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  required
                >
                  {scheduledMatches.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900">
                      {teamMap[m.homeTeamId].nameLt} vs {teamMap[m.awayTeamId].nameLt}
                    </option>
                  ))}
                </select>
              </div>

              {betMatch && (
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">Rezultatas</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["home", "draw", "away"] as Outcome[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setBetOutcome(o)}
                        className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                          betOutcome === o
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {o === "home" && `1 ×${betMatch.odds.home}`}
                        {o === "draw" && `X ×${betMatch.odds.draw}`}
                        {o === "away" && `2 ×${betMatch.odds.away}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={betLoading || !betPlayerId || !betMatchId || scheduledMatches.length === 0}
                className="btn-primary w-full disabled:opacity-60"
              >
                {betLoading ? "Statoma..." : "Statyti"}
              </button>

              {betError && (
                <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {betError}
                </p>
              )}
              {betSuccess && (
                <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {betSuccess}
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Row 2: Player list */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Žaidėjai</h2>
        {players.length === 0 ? (
          <div className="card text-sm text-slate-400">Nėra registruotų žaidėjų.</div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Vardas</th>
                  <th className="px-4 py-3 text-right">Monetų</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const isOpen = expandedPlayerId === p.id;
                  const inlineMatch = matches.find((m) => m.id === inlineMatchId);
                  const lastResult = inlineResult?.playerId === p.id ? inlineResult : null;
                  return (
                    <React.Fragment key={p.id}>
                    <tr className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-white">{p.displayName}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{p.coinBalance ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (betsPlayerId === p.id) {
                                  setBetsPlayerId(null);
                                } else {
                                  setBetsPlayerId(p.id);
                                  setExpandedPlayerId(null);
                                  setResetPlayerId(null);
                                  void fetchPlayerBets(p.id);
                                }
                              }}
                              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-blue-500/20 hover:text-blue-300"
                            >
                              {betsPlayerId === p.id ? "Uždaryti" : "Statymų"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = resetPlayerId === p.id ? null : p.id;
                                setResetPlayerId(next);
                                setResetPassword("");
                                setResetResult(null);
                                if (next) { setExpandedPlayerId(null); setBetsPlayerId(null); }
                              }}
                              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-amber-500/20 hover:text-amber-300"
                            >
                              {resetPlayerId === p.id ? "Uždaryti" : "Slaptažodis"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedPlayerId(isOpen ? null : p.id);
                                setBetsPlayerId(null);
                                setResetPlayerId(null);
                                setInlineResult(null);
                              }}
                              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                            >
                              {isOpen ? "Uždaryti" : "Statyti"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-white/5 bg-white/[0.03]">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="flex-1 min-w-48">
                                <label className="mb-1 block text-xs text-slate-400">Rungtynės</label>
                                <select
                                  value={inlineMatchId}
                                  onChange={(e) => setInlineMatchId(e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                                >
                                  {scheduledMatches.map((m) => (
                                    <option key={m.id} value={m.id} className="bg-slate-900">
                                      {teamMap[m.homeTeamId].nameLt} vs {teamMap[m.awayTeamId].nameLt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {inlineMatch && (
                                <div className="flex gap-2">
                                  {(["home", "draw", "away"] as Outcome[]).map((o) => (
                                    <button
                                      key={o}
                                      type="button"
                                      onClick={() => setInlineOutcome(o)}
                                      className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                                        inlineOutcome === o
                                          ? "bg-emerald-500 text-slate-950"
                                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                                      }`}
                                    >
                                      {o === "home" && `1 ×${inlineMatch.odds.home}`}
                                      {o === "draw" && `X ×${inlineMatch.odds.draw}`}
                                      {o === "away" && `2 ×${inlineMatch.odds.away}`}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={inlineLoading || scheduledMatches.length === 0}
                                onClick={() => handleInlineBet(p.id)}
                                className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
                              >
                                {inlineLoading ? "..." : "Statyti"}
                              </button>
                            </div>
                            {lastResult && (
                              <p className={`mt-2 text-xs ${lastResult.error ? "text-rose-400" : "text-emerald-400"}`}>
                                {lastResult.msg}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                      {resetPlayerId === p.id && (
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="max-w-sm space-y-3">
                              <p className="text-xs text-slate-400">Naujas slaptažodis — <span className="text-white">{p.displayName}</span></p>
                              <PasswordInput
                                value={resetPassword}
                                onChange={setResetPassword}
                                showStrength
                                showGenerator
                              />
                              <button
                                type="button"
                                disabled={resetLoading || resetPassword.length < 8}
                                onClick={() => handleResetPassword(p.id)}
                                className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
                              >
                                {resetLoading ? "..." : "Pakeisti"}
                              </button>
                              {resetResult?.playerId === p.id && (
                                <p className={`text-xs ${resetResult.error ? "text-rose-400" : "text-emerald-400"}`}>
                                  {resetResult.msg}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {betsPlayerId === p.id && (
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <td colSpan={4} className="px-4 py-3">
                            {betsLoading ? (
                              <p className="text-xs text-slate-400">Kraunama...</p>
                            ) : playerBets.length === 0 ? (
                              <p className="text-xs text-slate-500">Nėra statymų.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-slate-500">
                                    <th className="pb-1 pr-4">Rungtynės</th>
                                    <th className="pb-1 pr-4">Spėjimas</th>
                                    <th className="pb-1 pr-4">Kof.</th>
                                    <th className="pb-1 text-right">Taškai</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {playerBets.map((b) => {
                                    const m = matches.find((x) => x.id === b.matchId);
                                    const outcomeLabel = b.outcome === "home" ? "1" : b.outcome === "draw" ? "X" : "2";
                                    return (
                                      <tr key={b.id} className="border-t border-white/5">
                                        <td className="py-1 pr-4 text-slate-300">
                                          {m ? `${teamMap[m.homeTeamId].nameLt} vs ${teamMap[m.awayTeamId].nameLt}` : b.matchId}
                                        </td>
                                        <td className="py-1 pr-4 text-white">{outcomeLabel}</td>
                                        <td className="py-1 pr-4 text-slate-400">×{b.coefficient}</td>
                                        <td className="py-1 text-right">
                                          {b.settled
                                            ? <span className={b.pointsWon ? "text-emerald-400" : "text-slate-500"}>{b.pointsWon ?? 0} t.</span>
                                            : <span className="text-slate-500">—</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Match results */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Rezultatai</h2>
        <form onSubmit={handleResultSubmit} className="card max-w-md space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Rungtynės</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              {matches.map((match) => (
                <option key={match.id} value={match.id} className="bg-slate-900">
                  {teamMap[match.homeTeamId].nameLt} vs {teamMap[match.awayTeamId].nameLt}
                  {match.status === "finished" && ` (${match.homeScore}:${match.awayScore})`}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <p className="text-sm text-slate-500">
              Grupė {selected.group} · {selected.venue}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Namų įvarčiai</label>
              <input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Svečių įvarčiai</label>
              <input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Išsaugoti rezultatą
          </button>
        </form>
      </div>
    </div>
  );
}
