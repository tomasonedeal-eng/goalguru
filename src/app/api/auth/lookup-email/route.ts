import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("display_name", name.trim())
      .single();

    if (error || !data) {
      console.error("Lookup error:", error?.code, error?.message);
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
