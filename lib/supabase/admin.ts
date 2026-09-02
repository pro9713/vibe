import { createClient } from "@supabase/supabase-js";

function formatSupabaseUrl(url: string | undefined): string | null {
  if (!url || url.includes("placeholder")) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}.supabase.co`;
}

/**
 * Creates a server-only Supabase client with the service role key.
 * Used exclusively for background jobs, push dispatch, and system migrations.
 */
export function createAdminSupabaseClient() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseUrl = formatSupabaseUrl(rawUrl);

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    serviceRoleKey.includes("placeholder")
  ) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

