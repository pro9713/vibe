import { NextRequest, NextResponse } from "next/server";
import { runPriceMonitoringJob } from "@/lib/price-monitor";
import { validateCronAuthorization } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

/**
 * Validates the Authorization header against configured server-side cron secrets.
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return validateCronAuthorization(authHeader);
}

/**
 * GET /api/cron/price-monitor
 *
 * Scheduled background price monitor endpoint.
 * Requires: Authorization: Bearer <PRICELY_CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing authorization token.",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceAll = searchParams.get("force") === "true";

    const result = await runPriceMonitoringJob({ forceAll });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("[Cron Price Monitor Error]:", error);
    const message = error instanceof Error ? error.message : "Internal error running price monitor.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/price-monitor (Alternative trigger support for webhook schedulers)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
