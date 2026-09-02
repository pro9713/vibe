import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import {
  getCloudPriceAlerts,
  createCloudPriceAlert,
  markCloudPriceAlertRead,
  markAllCloudPriceAlertsRead,
  deleteCloudPriceAlert,
  clearCloudPriceAlerts,
  mergeAnonymousAlerts,
} from "@/lib/cloud/price-alerts";

export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_USER_REGEX = /^usr_[a-z0-9_-]+$/i;

async function getUserIdFromRequest(request: NextRequest, serverUserId?: string): Promise<string | null> {
  if (serverUserId) return serverUserId;

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  // 1. Accept standard Supabase UUIDs
  if (UUID_REGEX.test(token)) {
    return token;
  }

  // 2. Accept legacy mock user identifiers (e.g. usr_...)
  if (LEGACY_USER_REGEX.test(token)) {
    return token;
  }

  // 3. If token is a JWT, verify with Supabase server client
  if (token.split(".").length === 3) {
    try {
      const serverClient = await createServerSupabaseClient();
      const { data: { user }, error } = await serverClient.auth.getUser(token);
      if (!error && user?.id) {
        return user.id;
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

/**
 * GET /api/cloud/alerts
 * Retrieves the authenticated user's price alerts and unread count.
 */
export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser();
    const userId = await getUserIdFromRequest(request, serverUser?.id);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const alerts = await getCloudPriceAlerts(userId);
    const unreadCount = alerts.filter((a) => !a.read).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          alerts,
          unreadCount,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error retrieving price alerts",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cloud/alerts
 * Mutates price alert records (create, mark-read, mark-all-read, delete, clear, merge).
 */
export async function POST(request: NextRequest) {
  try {
    const serverUser = await getServerUser();
    const userId = await getUserIdFromRequest(request, serverUser?.id);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, alertId, alertParams, localAlerts } = body;

    if (action === "create") {
      if (!alertParams) {
        return NextResponse.json({ success: false, error: "Missing alertParams" }, { status: 400 });
      }
      const newAlert = await createCloudPriceAlert(userId, alertParams);
      return NextResponse.json({ success: true, alert: newAlert });
    }

    if (action === "mark-read") {
      if (!alertId) {
        return NextResponse.json({ success: false, error: "Missing alertId" }, { status: 400 });
      }
      await markCloudPriceAlertRead(userId, alertId);
      return NextResponse.json({ success: true });
    }

    if (action === "mark-all-read") {
      await markAllCloudPriceAlertsRead(userId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      if (!alertId) {
        return NextResponse.json({ success: false, error: "Missing alertId" }, { status: 400 });
      }
      await deleteCloudPriceAlert(userId, alertId);
      return NextResponse.json({ success: true });
    }

    if (action === "clear") {
      await clearCloudPriceAlerts(userId);
      return NextResponse.json({ success: true, alerts: [] });
    }

    if (action === "merge") {
      const merged = await mergeAnonymousAlerts(userId, localAlerts || []);
      return NextResponse.json({ success: true, alerts: merged });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error executing alert action",
      },
      { status: 500 }
    );
  }
}
