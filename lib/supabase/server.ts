import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function formatSupabaseUrl(url: string | undefined): string {
  if (!url || url.includes("placeholder")) {
    return "https://placeholder-project.supabase.co";
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}.supabase.co`;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = formatSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Can be ignored if called from a Server Component
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Can be ignored if called from a Server Component
        }
      },
    },
  });
}
