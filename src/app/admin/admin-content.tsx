"use client";

import React, { useEffect, useState } from "react";
import { teamMap } from "@/data/teams";
import { useApp } from "@/context/app-context";
import type { Outcome } from "@/lib/types";
import { PasswordInput } from "@/components/password-input";
import { displayTeamName } from "@/lib/team-resolve";
import { TeamFlag } from "@/components/team-flag";

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

interface QrLoginResult {
  playerId: string;
  displayName: string;
  loginUrl: string;
}

function resolveTeamsFromMatchId(matchId: string): { homeTeamId: string; awayTeamId: string } | null {
  const prefixMatch = matchId.match(/^wc26-[^-]+-md\d+-(.+)$/);
  if (!prefixMatch) return null;
  const tail = prefixMatch[1];
  const teamIds = Object.keys(teamMap).sort((a, b) => b.length - a.length);
  for (const homeId of teamIds) {
    const marker = `${homeId}-`;
    if (!tail.startsWith(marker)) continue;
    const awayId = tail.slice(marker.length);
    if (teamMap[awayId]) {
      return { homeTeamId: homeId, awayTeamId: awayId };
    }
  }
  return null;
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
  const [qrLoadingPlayerId, setQrLoadingPlayerId] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<QrLoginResult | null>(null);

  // --- Place bet for player ---
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [betPlayerId, setBetPlayerId] = useState("");
  const [betMatchId, setBetMatchId] = useState("");
  const [betOutcome, setBetOutcome] = useState<Outcome | null>(null);
  const [betHomeGuess, setBetHomeGuess] = useState("");
  const [betAwayGuess, setBetAwayGuess] = useState("");
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

    const hasCustomScore = betHomeGuess !== "" || betAwayGuess !== "";
    if (hasCustomScore && (betHomeGuess === "" || betAwayGuess === "")) {
      setBetError("Įveskite abu rezultatus (pvz. 1:1).");
      setBetLoading(false);
      return;
    }

    if (!hasCustomScore && !betOutcome) {
      setBetError("Pasirink spėjimą: 1, X arba 2.");
      setBetLoading(false);
      return;
    }

    const inferredOutcome: Outcome = hasCustomScore
      ? Number(betHomeGuess) > Number(betAwayGuess)
        ? "home"
        : Number(betHomeGuess) < Number(betAwayGuess)
          ? "away"
          : "draw"
      : (betOutcome as Outcome);

    const coefficient = betMatch.odds[inferredOutcome];

    try {
      const res = await fetch("/api/admin/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: betPlayerId,
          matchId: betMatchId,
          outcome: inferredOutcome,
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
      setBetSuccess("Atlikta");
      setBetHomeGuess("");
      setBetAwayGuess("");
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

  const handleGenerateQrLogin = async (playerId: string) => {
    setQrLoadingPlayerId(playerId);
    setQrResult(null);
    const res = await fetch("/api/admin/login-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setQrResult({
        playerId,
        displayName: "Klaida",
        loginUrl: "",
      });
      setResetResult({
        playerId,
        msg: data.error || "Nepavyko sugeneruoti QR prisijungimo.",
        error: true,
      });
      setQrLoadingPlayerId(null);
      return;
    }
    setResetResult(null);
    setQrResult({
      playerId,
      displayName: data.displayName,
      loginUrl: data.loginUrl,
    });
    setQrLoadingPlayerId(null);
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
            <form onSubmit={handlePlaceBet} className="card flex h-[70vh] min-h-[560px] flex-col space-y-4">
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

              <div className="flex min-h-0 flex-1 flex-col space-y-2">
                <label className="block text-sm text-slate-400">Rungtynės ir koeficientai</label>
                <div className="custom-scroll h-full space-y-2 overflow-y-auto pr-1">
                  {scheduledMatches.map((m) => {
                    const isSelected = m.id === betMatchId;
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setBetMatchId(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setBetMatchId(m.id);
                          }
                        }}
                        className={`rounded-xl border p-2 transition-all duration-150 ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-500/20 ring-2 ring-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_8px_24px_rgba(16,185,129,0.18)]"
                            : "border-white/10 bg-white/5 hover:border-emerald-400/40 hover:bg-white/10 active:scale-[0.99] active:border-emerald-300/60"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-300">
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamFlag teamId={m.homeTeamId} size={20} />
                            <span className="truncate">{displayTeamName(m.homeTeamId, teamMap)}</span>
                          </div>
                          <span className="text-slate-500">vs</span>
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamFlag teamId={m.awayTeamId} size={20} />
                            <span className="truncate">{displayTeamName(m.awayTeamId, teamMap)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { key: "home", label: `1 ×${m.odds.home}` },
                            { key: "draw", label: `X ×${m.odds.draw}` },
                            { key: "away", label: `2 ×${m.odds.away}` },
                          ] as { key: Outcome; label: string }[]).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                setBetMatchId(m.id);
                                setBetOutcome(item.key);
                              }}
                              className={`rounded-lg py-2 text-xs font-medium transition-all ${
                                isSelected && betOutcome === item.key
                                  ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                                  : "bg-white/10 text-slate-200 hover:bg-white/20"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={betHomeGuess}
                    onChange={(e) => setBetHomeGuess(e.target.value)}
                    placeholder="Namų"
                    className="no-spin rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400"
                  />
                  <div className="flex items-center justify-center text-slate-400">:</div>
                  <input
                    type="number"
                    min={0}
                    value={betAwayGuess}
                    onChange={(e) => setBetAwayGuess(e.target.value)}
                    placeholder="Svečių"
                    className="no-spin rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

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
                                setQrResult(null);
                              }}
                              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                            >
                              {isOpen ? "Uždaryti" : "Statyti"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGenerateQrLogin(p.id)}
                              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300"
                            >
                              {qrLoadingPlayerId === p.id ? "..." : "QR login"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {qrResult?.playerId === p.id && qrResult.loginUrl && (
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="space-y-3">
                              <p className="text-xs text-slate-400">
                                QR prisijungimas — <span className="text-white">{qrResult.displayName}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-4">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResult.loginUrl)}`}
                                  alt={`QR login ${qrResult.displayName}`}
                                  width={140}
                                  height={140}
                                  className="rounded-xl border border-white/10 bg-white p-2"
                                />
                                <div className="space-y-2">
                                  <a
                                    href={qrResult.loginUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/30"
                                  >
                                    Atidaryti prisijungimo nuorodą
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(qrResult.loginUrl)}
                                    className="block rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                                  >
                                    Kopijuoti nuorodą
                                  </button>
                                  <p className="max-w-xs text-[11px] text-slate-500">
                                    Saugumo pastaba: kas nuskenuoja šį QR, tas prisijungia kaip šis žaidėjas.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
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
                                      {displayTeamName(m.homeTeamId, teamMap)} vs {displayTeamName(m.awayTeamId, teamMap)}
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
                                {resetLoading ? "..." : "Tvirtinti"}
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
                                    const parsedTeams = !m ? resolveTeamsFromMatchId(b.matchId) : null;
                                    const homeName = m
                                      ? displayTeamName(m.homeTeamId, teamMap)
                                      : parsedTeams
                                        ? displayTeamName(parsedTeams.homeTeamId, teamMap)
                                        : "Namai";
                                    const awayName = m
                                      ? displayTeamName(m.awayTeamId, teamMap)
                                      : parsedTeams
                                        ? displayTeamName(parsedTeams.awayTeamId, teamMap)
                                        : "Svečiai";
                                    const outcomeLabel = m
                                      ? b.outcome === "home"
                                        ? `${displayTeamName(m.homeTeamId, teamMap)} laimės`
                                        : b.outcome === "away"
                                          ? `${displayTeamName(m.awayTeamId, teamMap)} laimės`
                                          : `${displayTeamName(m.homeTeamId, teamMap)} ir ${displayTeamName(m.awayTeamId, teamMap)} lygios`
                                      : b.outcome === "home"
                                        ? `${homeName} laimės`
                                        : b.outcome === "away"
                                          ? `${awayName} laimės`
                                          : `${homeName} ir ${awayName} lygios`;
                                    return (
                                      <tr key={b.id} className="border-t border-white/5">
                                        <td className="py-1 pr-4 text-slate-300">
                                          {m
                                            ? `${displayTeamName(m.homeTeamId, teamMap)} vs ${displayTeamName(m.awayTeamId, teamMap)}`
                                            : b.matchId}
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
                  {displayTeamName(match.homeTeamId, teamMap)} vs {displayTeamName(match.awayTeamId, teamMap)}
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
