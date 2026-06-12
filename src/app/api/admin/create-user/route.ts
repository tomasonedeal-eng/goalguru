import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 20);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    const serverClient = await createServerClient();
    const {
      data: { user: currentUser },
    } = await serverClient.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await serverClient
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const tempPassword = generateTempPassword();
    const slugName = slugifyName(displayName.trim());
    const randomSuffix = Math.random().toString(36).slice(2, 7);
    const generatedEmail = `player-${slugName}-${randomSuffix}@goalguru.local`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    let newUserId: string;

    if (serviceRoleKey) {
      // Preferred: service role key allows creating users without email confirmation
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error } = await adminClient.auth.admin.createUser({
        email: generatedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: displayName.trim() },
      });

      if (error || !data.user) {
        console.error("Admin createUser error:", error);
        return NextResponse.json({ error: error?.message || "Failed to create user" }, { status: 500 });
      }

      newUserId = data.user.id;

      await adminClient
        .from("profiles")
        .upsert({ id: newUserId, display_name: displayName.trim(), email: generatedEmail });
    } else {
      // Fallback: anon signUp (requires email confirmation to be OFF in Supabase)
      const anonClient = createClient(supabaseUrl, anonKey!);

      const { data, error } = await anonClient.auth.signUp({
        email: generatedEmail,
        password: tempPassword,
        options: { data: { display_name: displayName.trim() } },
      });

      if (error || !data.user) {
        console.error("Supabase signUp error:", error);
        return NextResponse.json({ error: error?.message || "Failed to create user" }, { status: 500 });
      }

      newUserId = data.user.id;

      await serverClient
        .from("profiles")
        .update({ display_name: displayName.trim(), email: generatedEmail })
        .eq("id", newUserId);
    }

    return NextResponse.json({
      userId: newUserId,
      displayName: displayName.trim(),
      tempPassword,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
