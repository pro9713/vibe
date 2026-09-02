import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/lib/push-subscriptions";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe
 * Registers a new browser PushSubscription.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription payload: 'endpoint' and 'keys' (p256dh, auth) are required.",
        },
        { status: 400 }
      );
    }

    const saved = await addSubscription({
      endpoint: body.endpoint,
      expirationTime: body.expirationTime,
      keys: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      userId: body.userId,
      anonymousClientId: body.anonymousClientId,
      userAgent: request.headers.get("user-agent") || body.userAgent,
      deviceLabel: body.deviceLabel,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Push subscription successfully registered.",
        id: saved.id,
        createdAt: saved.createdAt,
        deviceLabel: saved.deviceLabel,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[Push Subscribe Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to register push subscription.",
      },
      { status: 500 }
    );
  }
}
