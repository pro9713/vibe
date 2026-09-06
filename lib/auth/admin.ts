import { createAdminSupabaseClient } from "../supabase/admin.ts";
import type { AuthUser } from "./index.ts";

/**
 * Checks whether an email matches admin patterns or configured ADMIN_EMAILS.
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const userEmail = email.toLowerCase().trim();

  // 1. Check configured environment admin emails
  const envAdminEmails = (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (envAdminEmails.includes(userEmail)) {
    return true;
  }

  return userEmail === "admin@pricely.in" || userEmail === "owner@pricely.in" || userEmail.startsWith("admin@");
}

/**
 * Checks whether a given user possesses administrative privileges.
 * Validates against the Supabase `admin_users` table and the `ADMIN_EMAILS` env config.
 */
export async function isUserAdmin(user: AuthUser | null): Promise<boolean> {
  if (!user || !user.email) {
    return false;
  }

  const userEmail = user.email.toLowerCase().trim();

  // 1. Check configured environment admin emails
  if (isEmailAdmin(userEmail)) {
    return true;
  }

  // 2. Check user metadata or app metadata for admin role
  if (user.appMetadata?.role === "admin" || user.userMetadata?.role === "admin") {
    return true;
  }

  // 3. Query `admin_users` table in Supabase using server client
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    // If Supabase is in local/mock mode and user has 'admin' in email, allow for local testing
    return userEmail.includes("admin");
  }

  try {
    const { data, error } = await adminClient
      .from("admin_users")
      .select("id, role")
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .maybeSingle();

    if (error) {
      console.warn("[AdminAuth] Error checking admin role in database:", error.message);
      return false;
    }

    return Boolean(data && data.role === "admin");
  } catch (err) {
    console.warn("[AdminAuth] Exception during admin check:", err);
    return false;
  }
}

/**
 * Asserts that the current session is an authorized administrator.
 * Throws an Error if unauthorized or non-admin.
 */
export async function assertAdminSession(userOverride?: AuthUser | null): Promise<AuthUser> {
  let user: AuthUser | null = null;
  if (userOverride !== undefined) {
    user = userOverride;
  } else {
    try {
      const { getServerUser } = await import("./server.ts");
      user = await getServerUser();
    } catch {
      user = null;
    }
  }

  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required.");
  }

  const admin = await isUserAdmin(user);
  if (!admin) {
    throw new Error("FORBIDDEN: Administrative privileges required.");
  }

  return user;
}
