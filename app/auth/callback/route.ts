import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/account";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const origin = forwardedHost && !isLocalEnv ? `https://${forwardedHost}` : requestUrl.origin;

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[AuthCallback] exchangeCodeForSession error:", error.message);
    } catch (err) {
      console.error("[AuthCallback] Unexpected error:", err);
    }
  }

  // Redirect to login with error indicator on failure
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
