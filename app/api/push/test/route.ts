import { NextRequest, NextResponse } from "next/server";
import { sendAlertPushNotification, isPushConfigured } from "@/lib/push";
import type { PriceAlert } from "@/lib/price-alerts";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/test
 * Test sending a push notification to active subscribers.
 * Requires: Authorization: Bearer <PRICELY_CRON_SECRET> or development mode.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.PRICELY_CRON_SECRET || process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  const isAuth =
    (cronSecret && authHeader === `Bearer ${cronSecret.trim()}`) ||
    process.env.NODE_ENV === "development";

  if (!isAuth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "VAPID keys are not configured on this server.",
      },
      { status: 503 }
    );
  }

  try {
    const testAlert: PriceAlert = {
      id: `test_${Date.now()}`,
      productId: "air-max-270",
      productName: "Nike Air Max 270",
      store: "Myntra",
      currentPrice: 2199,
      targetPrice: 2200,
      type: "TARGET_REACHED",
      timestamp: new Date().toISOString(),
      read: false,
    };

    const result = await sendAlertPushNotification(testAlert);

    return NextResponse.json({
      success: true,
      message: "Test push dispatch completed.",
      result,
    });
  } catch (err: unknown) {
    console.error("[Test Push Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send test push.",
      },
      { status: 500 }
    );
  }
}
