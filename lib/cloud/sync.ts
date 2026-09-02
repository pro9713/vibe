import { type TrackedTarget } from "@/lib/wishlist";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface CloudStore {
  wishlists: Map<string, Set<string>>; // userId -> Set of productIds
  trackedTargets: Map<string, Map<string, TrackedTarget>>; // userId -> (productId -> TrackedTarget)
}

let inMemoryStore: CloudStore = {
  wishlists: new Map(),
  trackedTargets: new Map(),
};

/**
 * Resets the in-memory cloud store (useful for test isolation).
 */
export function clearCloudStore(): void {
  inMemoryStore = {
    wishlists: new Map(),
    trackedTargets: new Map(),
  };
}

// -------------------------------------------------------------
// WISHLIST CLOUD OPERATIONS
// -------------------------------------------------------------

export async function getCloudWishlist(userId: string): Promise<string[]> {
  if (!userId) return [];

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", userId);

      if (!error && data) {
        return data.map((row) => row.product_id);
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  const set = inMemoryStore.wishlists.get(userId);
  return set ? Array.from(set) : [];
}

export async function addCloudWishlistItem(
  userId: string,
  productId: string
): Promise<string[]> {
  if (!userId || !productId) return [];

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin.from("wishlist_items").upsert(
        { user_id: userId, product_id: productId },
        { onConflict: "user_id,product_id" }
      );
    } catch {
      // Fallback
    }
  }

  let set = inMemoryStore.wishlists.get(userId);
  if (!set) {
    set = new Set();
    inMemoryStore.wishlists.set(userId, set);
  }
  set.add(productId);

  return Array.from(set);
}

export async function removeCloudWishlistItem(
  userId: string,
  productId: string
): Promise<string[]> {
  if (!userId || !productId) return [];

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin
        .from("wishlist_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);
    } catch {
      // Fallback
    }
  }

  const set = inMemoryStore.wishlists.get(userId);
  if (set) {
    set.delete(productId);
  }

  return set ? Array.from(set) : [];
}

export async function clearCloudWishlist(userId: string): Promise<void> {
  if (!userId) return;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin.from("wishlist_items").delete().eq("user_id", userId);
    } catch {
      // Fallback
    }
  }

  inMemoryStore.wishlists.delete(userId);
}

// -------------------------------------------------------------
// TRACKED TARGETS CLOUD OPERATIONS
// -------------------------------------------------------------

export async function getCloudTrackedTargets(
  userId: string
): Promise<Record<string, TrackedTarget>> {
  if (!userId) return {};

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("tracked_targets")
        .select("*")
        .eq("user_id", userId);

      if (!error && data) {
        const result: Record<string, TrackedTarget> = {};
        for (const row of data) {
          result[row.product_id] = {
            productId: row.product_id,
            targetPrice: row.target_price !== null ? Number(row.target_price) : undefined,
            trackedAt: row.tracked_at,
          };
        }
        return result;
      }
    } catch {
      // Fallback
    }
  }

  const map = inMemoryStore.trackedTargets.get(userId);
  if (!map) return {};

  const result: Record<string, TrackedTarget> = {};
  for (const [pid, target] of map.entries()) {
    result[pid] = target;
  }
  return result;
}

export async function setCloudTrackedTarget(
  userId: string,
  productId: string,
  targetPrice?: number
): Promise<TrackedTarget> {
  const target: TrackedTarget = {
    productId,
    targetPrice,
    trackedAt: new Date().toISOString(),
  };

  if (!userId || !productId) return target;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin.from("tracked_targets").upsert(
        {
          user_id: userId,
          product_id: productId,
          target_price: targetPrice ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,product_id" }
      );
    } catch {
      // Fallback
    }
  }

  let map = inMemoryStore.trackedTargets.get(userId);
  if (!map) {
    map = new Map();
    inMemoryStore.trackedTargets.set(userId, map);
  }
  map.set(productId, target);

  // Auto add to cloud wishlist as well
  await addCloudWishlistItem(userId, productId);

  return target;
}

export async function removeCloudTrackedTarget(
  userId: string,
  productId: string
): Promise<void> {
  if (!userId || !productId) return;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin
        .from("tracked_targets")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);
    } catch {
      // Fallback
    }
  }

  const map = inMemoryStore.trackedTargets.get(userId);
  if (map) {
    map.delete(productId);
  }
}

// -------------------------------------------------------------
// ANONYMOUS → ACCOUNT MERGE (IDEMPOTENT & CONFLICT-SAFE)
// -------------------------------------------------------------

export async function mergeAnonymousData(
  userId: string,
  anonymousData: {
    wishlist?: string[];
    trackedTargets?: Record<string, TrackedTarget>;
  }
): Promise<{
  wishlist: string[];
  trackedTargets: Record<string, TrackedTarget>;
}> {
  if (!userId) {
    return {
      wishlist: anonymousData.wishlist || [],
      trackedTargets: anonymousData.trackedTargets || {},
    };
  }

  // 1. Fetch current cloud state
  const currentCloudWishlist = await getCloudWishlist(userId);
  const currentCloudTargets = await getCloudTrackedTargets(userId);

  // 2. Merge Wishlist (union of unique product IDs)
  const mergedWishlistSet = new Set<string>(currentCloudWishlist);
  if (Array.isArray(anonymousData.wishlist)) {
    for (const pid of anonymousData.wishlist) {
      if (typeof pid === "string" && pid.trim().length > 0) {
        if (!mergedWishlistSet.has(pid)) {
          mergedWishlistSet.add(pid);
          await addCloudWishlistItem(userId, pid);
        }
      }
    }
  }

  // 3. Merge Tracked Targets (idempotent, preserve existing or update if newer)
  const mergedTargets: Record<string, TrackedTarget> = { ...currentCloudTargets };
  if (anonymousData.trackedTargets && typeof anonymousData.trackedTargets === "object") {
    for (const [pid, anonTarget] of Object.entries(anonymousData.trackedTargets)) {
      if (anonTarget && typeof anonTarget === "object") {
        const existingCloudTarget = currentCloudTargets[pid];
        if (!existingCloudTarget) {
          mergedTargets[pid] = anonTarget;
          await setCloudTrackedTarget(userId, pid, anonTarget.targetPrice);
        } else {
          // Both exist: if anonymous target has newer timestamp, update
          const anonTime = new Date(anonTarget.trackedAt || 0).getTime();
          const cloudTime = new Date(existingCloudTarget.trackedAt || 0).getTime();
          if (anonTime > cloudTime) {
            mergedTargets[pid] = anonTarget;
            await setCloudTrackedTarget(userId, pid, anonTarget.targetPrice);
          }
        }
      }
    }
  }

  return {
    wishlist: Array.from(mergedWishlistSet),
    trackedTargets: mergedTargets,
  };
}
