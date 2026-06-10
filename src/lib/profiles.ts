import type { SupabaseClient } from "@supabase/supabase-js";
import type { OddsMode, User } from "@/lib/types";
import { STARTING_COINS } from "@/lib/storage";

export interface ProfileRow {
  id: string;
  display_name: string;
  coin_balance: number;
  total_points: number;
  default_odds_mode: OddsMode;
}

export function profileToUser(profile: ProfileRow, email: string): User {
  return {
    id: profile.id,
    displayName: profile.display_name,
    email,
    coinBalance: profile.coin_balance,
    totalPoints: profile.total_points,
    defaultOddsMode: profile.default_odds_mode,
  };
}

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  metadata?: Record<string, unknown>,
): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return profileToUser(data as ProfileRow, email);
  }

  if (error) {
    console.error("fetchProfile error:", error.message);
  }

  const displayName =
    (metadata?.display_name as string) ||
    (metadata?.full_name as string) ||
    (metadata?.name as string) ||
    email.split("@")[0] ||
    "Žaidėjas";

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      display_name: displayName,
      coin_balance: STARTING_COINS,
      total_points: 0,
      default_odds_mode: "fixed",
    })
    .select()
    .single();

  if (insertError) {
    console.error("createProfile error:", insertError.message);
    return null;
  }

  return profileToUser(created as ProfileRow, email);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Pick<ProfileRow, "coin_balance" | "total_points" | "display_name">>,
) {
  return supabase.from("profiles").update(updates).eq("id", userId);
}
