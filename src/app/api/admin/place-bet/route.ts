import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { playerId, matchId, outcome, stake, oddsMode, coefficient } = body;

  if (!playerId || !matchId || !outcome || !stake || coefficient === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["home", "draw", "away"].includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const { data: playerProfile, error: playerError } = await supabase
    .from("profiles")
    .select("coin_balance, display_name")
    .eq("id", playerId)
    .single();

  if (playerError || !playerProfile) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (playerProfile.coin_balance < stake) {
    return NextResponse.json(
      { error: `Žaidėjas turi tik ${playerProfile.coin_balance} monetų` },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("bets")
    .select("id")
    .eq("player_id", playerId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Šis žaidėjas jau statė ant šių rungtynių" },
      { status: 400 },
    );
  }

  const { error: betError } = await supabase.from("bets").insert({
    player_id: playerId,
    match_id: matchId,
    outcome,
    stake,
    odds_mode: oddsMode ?? "fixed",
    coefficient,
    placed_by_admin: true,
  });

  if (betError) {
    return NextResponse.json({ error: betError.message }, { status: 500 });
  }

  await supabase
    .from("profiles")
    .update({ coin_balance: playerProfile.coin_balance - stake })
    .eq("id", playerId);

  return NextResponse.json({
    success: true,
    displayName: playerProfile.display_name,
    stake,
    outcome,
    remaining: playerProfile.coin_balance - stake,
  });
}
