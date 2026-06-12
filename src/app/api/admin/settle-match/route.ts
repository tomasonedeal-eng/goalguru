import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function matchOutcome(homeScore: number, awayScore: number): "home" | "draw" | "away" {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

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

  const { matchId, homeScore, awayScore } = await request.json();

  if (!matchId || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const outcome = matchOutcome(homeScore, awayScore);

  const { data: bets, error: fetchError } = await supabase
    .from("bets")
    .select("id, player_id, outcome, stake, coefficient")
    .eq("match_id", matchId)
    .eq("settled", false);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!bets || bets.length === 0) return NextResponse.json({ settledCount: 0, playersUpdated: 0 });

  // Settle each bet and accumulate points per player
  const playerPoints: Record<string, number> = {};

  for (const bet of bets) {
    const won = bet.outcome === outcome;
    const pointsWon = won ? Math.round(bet.stake * Number(bet.coefficient)) : 0;

    await supabase
      .from("bets")
      .update({ settled: true, points_won: pointsWon })
      .eq("id", bet.id);

    if (pointsWon > 0) {
      playerPoints[bet.player_id] = (playerPoints[bet.player_id] ?? 0) + pointsWon;
    }
  }

  // Update total_points for each winner
  for (const [playerId, points] of Object.entries(playerPoints)) {
    const { data: p } = await supabase
      .from("profiles")
      .select("total_points")
      .eq("id", playerId)
      .single();

    if (p) {
      await supabase
        .from("profiles")
        .update({ total_points: p.total_points + points })
        .eq("id", playerId);
    }
  }

  return NextResponse.json({
    settledCount: bets.length,
    playersUpdated: Object.keys(playerPoints).length,
  });
}
