import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/push-subscriptions";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/unsubscribe
 * Unregisters an existing browser PushSubscription.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || !body.endpoint) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter 'endpoint'.",
        },
        { status: 400 }
      );
    }

    const removed = await removeSubscription(body.endpoint, body.anonymousClientId);

    return NextResponse.json(
      {
        success: true,
        removed,
        message: removed ? "Subscription removed." : "Subscription was not found.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[Push Unsubscribe Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to unsubscribe.",
      },
      { status: 500 }
    );
  }
}
