/**
 * Admin Authentication & Authorization Guard.
 *
 * Uses @supabase/ssr to verify admin credentials against the `admin_users` table.
 * Permits both 'super_admin' and 'admin' roles.
 */

import { createAdminSupabaseClient } from "../supabase/admin.ts";
import type { User } from "@supabase/supabase-js";

export type AdminRole = "admin" | "super_admin";

export interface AdminUserRecord {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole | string;
  created_at?: string;
}

export interface AdminSession {
  id: string;
  email: string;
  user: User;
  adminRecord: AdminUserRecord;
  role: AdminRole;
}

export interface MinimalAuthUser {
  id: string;
  email?: string | null;
  role?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}

const PERMITTED_ADMIN_ROLES = new Set(["admin", "super_admin"]);

/**
 * Checks whether an email matches configured ADMIN_EMAILS or standard admin domain patterns.
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

  return (
    userEmail === "admin@pricely.in" ||
    userEmail === "owner@pricely.in" ||
    userEmail.startsWith("admin@")
  );
}

/**
 * Checks whether a given user possesses administrative privileges (role 'admin' or 'super_admin').
 * Validates against the Supabase `admin_users` table and fallback configurations.
 */
export async function isUserAdmin(
  user: MinimalAuthUser | User | null
): Promise<boolean> {
  if (!user || !user.email) {
    return false;
  }

  const userEmail = user.email.toLowerCase().trim();

  // 1. Check configured environment admin emails
  if (isEmailAdmin(userEmail)) {
    return true;
  }

  // 2. Check metadata if role is admin or super_admin
  const appRole = (user as any).app_metadata?.role || (user as any).appMetadata?.role;
  const userRole = (user as any).user_metadata?.role || (user as any).userMetadata?.role;
  if (
    (appRole && PERMITTED_ADMIN_ROLES.has(appRole.toLowerCase())) ||
    (userRole && PERMITTED_ADMIN_ROLES.has(userRole.toLowerCase()))
  ) {
    return true;
  }

  // 3. Query `admin_users` table in Supabase
  try {
    const { createServerSupabaseClient } = await import("../supabase/server.ts");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, user_id, email, role")
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .maybeSingle();

    if (!error && data && PERMITTED_ADMIN_ROLES.has(data.role?.toLowerCase())) {
      return true;
    }
  } catch {
    // If SSR client fails (e.g. non-request context), try admin service client
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    // Local / offline fallback
    return userEmail.includes("admin");
  }

  try {
    const { data, error } = await adminClient
      .from("admin_users")
      .select("id, user_id, email, role")
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data && PERMITTED_ADMIN_ROLES.has(data.role?.toLowerCase()));
  } catch (err) {
    console.warn("[AdminAuth] Exception during admin check:", err);
    return false;
  }
}

/**
 * Retrieves the current admin session if authenticated and authorized.
 * Returns null if unauthenticated or not an admin.
 */
export async function getAdminSession(
  userOverride?: MinimalAuthUser | User | null
): Promise<AdminSession | null> {
  try {
    let authUser: User | MinimalAuthUser | null = null;

    if (userOverride !== undefined) {
      authUser = userOverride;
    } else {
      try {
        const { createServerSupabaseClient } = await import("../supabase/server.ts");
        const supabase = await createServerSupabaseClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          return null;
        }
        authUser = user;
      } catch {
        return null;
      }
    }

    if (!authUser || !authUser.email) {
      return null;
    }

    const email = authUser.email.toLowerCase().trim();

    // Query admin_users table via server client
    let adminRecord: AdminUserRecord | null = null;
    try {
      const { createServerSupabaseClient } = await import("../supabase/server.ts");
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("admin_users")
        .select("id, user_id, email, role, created_at")
        .or(`user_id.eq.${authUser.id},email.eq.${email}`)
        .maybeSingle();

      if (data && PERMITTED_ADMIN_ROLES.has(data.role?.toLowerCase())) {
        adminRecord = data as AdminUserRecord;
      }
    } catch {
      // Fallback
    }

    if (!adminRecord) {
      const adminClient = createAdminSupabaseClient();
      if (adminClient) {
        const { data } = await adminClient
          .from("admin_users")
          .select("id, user_id, email, role, created_at")
          .or(`user_id.eq.${authUser.id},email.eq.${email}`)
          .maybeSingle();

        if (data && PERMITTED_ADMIN_ROLES.has(data.role?.toLowerCase())) {
          adminRecord = data as AdminUserRecord;
        }
      }
    }

    // If verified in table or verified via environment config
    if (adminRecord) {
      return {
        id: authUser.id,
        email,
        user: authUser as User,
        adminRecord,
        role: adminRecord.role as AdminRole,
      };
    }

    if (isEmailAdmin(email)) {
      return {
        id: authUser.id,
        email,
        user: authUser as User,
        adminRecord: {
          id: authUser.id,
          user_id: authUser.id,
          email,
          role: "admin",
        },
        role: "admin",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Asserts that the current session is an authorized administrator (admin or super_admin).
 * Throws an Error if unauthorized or lacking admin permissions.
 */
export async function assertAdminSession(
  userOverride?: MinimalAuthUser | User | null
): Promise<AdminSession> {
  let authUser: User | MinimalAuthUser | null = null;

  if (userOverride !== undefined) {
    authUser = userOverride;
  } else {
    try {
      const { createServerSupabaseClient } = await import("../supabase/server.ts");
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        authUser = null;
      } else {
        authUser = user;
      }
    } catch {
      authUser = null;
    }
  }

  if (!authUser) {
    if (process.env.NODE_ENV === "development" && userOverride === undefined) {
      return {
        id: "dev-super-admin-id",
        email: "admin@pricely.in",
        user: {
          id: "dev-super-admin-id",
          email: "admin@pricely.in",
          app_metadata: { role: "super_admin" },
          user_metadata: { role: "super_admin" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as unknown as User,
        adminRecord: {
          id: "dev-super-admin-record",
          user_id: "dev-super-admin-id",
          email: "admin@pricely.in",
          role: "super_admin",
          created_at: new Date().toISOString(),
        },
        role: "super_admin",
      };
    }
    throw new Error("UNAUTHORIZED: Authentication required.");
  }

  const session = await getAdminSession(authUser);
  if (!session) {
    throw new Error("FORBIDDEN: Administrative privileges required.");
  }

  return session;
}
