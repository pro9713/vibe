import { NextRequest, NextResponse } from "next/server";
import { getMonitoringHealth, getExecutionHistory } from "@/lib/monitoring/logger";
import { getJobLockStatus } from "@/lib/monitoring/lock";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.PRICELY_CRON_SECRET || process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.trim().length === 0) {
    if (process.env.NODE_ENV === "development") {
      const authHeader = request.headers.get("authorization");
      return authHeader === "Bearer dev_secret" || authHeader === "Bearer local_test";
    }
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  return authHeader.trim() === `Bearer ${cronSecret.trim()}`;
}

/**
 * GET /api/cron/status
 * Protected admin/monitoring health status endpoint.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Active admin or cron authorization token required.",
      },
      { status: 401 }
    );
  }

  const health = getMonitoringHealth();
  const history = getExecutionHistory(20);
  const lock = getJobLockStatus();

  return NextResponse.json(
    {
      success: true,
      health: {
        ...health,
        lock,
      },
      recentExecutions: history,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
