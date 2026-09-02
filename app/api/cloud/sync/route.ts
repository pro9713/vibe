import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import {
  getCloudWishlist,
  getCloudTrackedTargets,
  addCloudWishlistItem,
  removeCloudWishlistItem,
  clearCloudWishlist,
  setCloudTrackedTarget,
  removeCloudTrackedTarget,
  mergeAnonymousData,
} from "@/lib/cloud/sync";

export const dynamic = "force-dynamic";

function getUserIdFromRequest(request: NextRequest, serverUserId?: string): string | null {
  if (serverUserId) return serverUserId;
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer usr_")) {
    return authHeader.replace("Bearer ", "").trim();
  }
  return null;
}

/**
 * GET /api/cloud/sync
 * Retrieves the authenticated user's cloud wishlist and tracked targets.
 */
export async function GET(request: NextRequest) {
  try {
    const serverUser = await getServerUser();
    const userId = getUserIdFromRequest(request, serverUser?.id);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const wishlist = await getCloudWishlist(userId);
    const trackedTargets = await getCloudTrackedTargets(userId);

    return NextResponse.json(
      {
        success: true,
        data: {
          wishlist,
          trackedTargets,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error syncing cloud data",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cloud/sync
 * Performs cloud mutations or anonymous data merge.
 */
export async function POST(request: NextRequest) {
  try {
    const serverUser = await getServerUser();
    const userId = getUserIdFromRequest(request, serverUser?.id);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, productId, targetPrice, anonymousData } = body;

    if (action === "merge") {
      const merged = await mergeAnonymousData(userId, anonymousData || {});
      return NextResponse.json({ success: true, data: merged });
    }

    if (action === "add-wishlist") {
      if (!productId) {
        return NextResponse.json({ success: false, error: "Missing productId" }, { status: 400 });
      }
      const wishlist = await addCloudWishlistItem(userId, productId);
      return NextResponse.json({ success: true, wishlist });
    }

    if (action === "remove-wishlist") {
      if (!productId) {
        return NextResponse.json({ success: false, error: "Missing productId" }, { status: 400 });
      }
      const wishlist = await removeCloudWishlistItem(userId, productId);
      return NextResponse.json({ success: true, wishlist });
    }

    if (action === "clear-wishlist") {
      await clearCloudWishlist(userId);
      return NextResponse.json({ success: true, wishlist: [] });
    }

    if (action === "set-target") {
      if (!productId) {
        return NextResponse.json({ success: false, error: "Missing productId" }, { status: 400 });
      }
      const target = await setCloudTrackedTarget(userId, productId, targetPrice);
      return NextResponse.json({ success: true, target });
    }

    if (action === "remove-target") {
      if (!productId) {
        return NextResponse.json({ success: false, error: "Missing productId" }, { status: 400 });
      }
      await removeCloudTrackedTarget(userId, productId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error executing sync operation",
      },
      { status: 500 }
    );
  }
}
