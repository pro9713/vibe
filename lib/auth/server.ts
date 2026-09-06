import { createServerSupabaseClient } from "../supabase/server.ts";
import { type AuthUser } from "./index.ts";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("placeholder"));
}

/**
 * Gets the current authenticated user on the server (Server Components / Route Handlers).
 */
export async function getServerUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
      createdAt: user.created_at,
      appMetadata: user.app_metadata,
      userMetadata: user.user_metadata,
    };
  } catch (err) {
    console.warn("[Auth] Error getting server user:", err);
    return null;
  }
}
