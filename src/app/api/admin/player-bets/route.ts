import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("bets")
    .select("id, match_id, outcome, stake, coefficient, settled, points_won, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data.map((b) => ({
    id: b.id,
    matchId: b.match_id,
    outcome: b.outcome,
    stake: b.stake,
    coefficient: b.coefficient,
    settled: b.settled,
    pointsWon: b.points_won,
  })));
}
