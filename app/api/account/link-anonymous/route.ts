import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import { linkAnonymousSubscriptionsToUser } from "@/lib/push-subscriptions";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/link-anonymous
 * Links anonymous client ID records to the authenticated user's account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { anonymousClientId } = body;

    if (!anonymousClientId || typeof anonymousClientId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter 'anonymousClientId'.",
        },
        { status: 400 }
      );
    }

    // Attempt to read server-authenticated session
    const serverUser = await getServerUser();

    // In local development or fallback mode, accept authorization header or authenticated session
    let userId = serverUser?.id;

    if (!userId) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer usr_")) {
        userId = authHeader.replace("Bearer ", "").trim();
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Active authenticated session is required to link accounts.",
        },
        { status: 401 }
      );
    }

    const linkedCount = await linkAnonymousSubscriptionsToUser(anonymousClientId, userId);

    return NextResponse.json(
      {
        success: true,
        linked: {
          pushSubscriptions: linkedCount,
        },
        message: `Successfully linked ${linkedCount} push subscriptions to your account.`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[Link Anonymous Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal error linking anonymous records.",
      },
      { status: 500 }
    );
  }
}
