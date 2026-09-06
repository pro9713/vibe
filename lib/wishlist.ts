"use client";

import { useSyncExternalStore } from "react";
import { getClientUser } from "./auth/index.ts";
import { createBrowserSupabaseClient } from "./supabase/client.ts";

export const WISHLIST_KEY = "pricely-wishlist";
export const TRACKED_TARGETS_KEY = "pricely-tracked-targets";
export const ACTIVE_USER_ID_KEY = "pricely-active-user-id";

const emptyArray: string[] = [];

// Helper to mark active storage key for guest if unassigned
function ensureGuestActiveKey(): void {
  if (typeof window === "undefined") return;
  try {
    const active = window.localStorage.getItem(ACTIVE_USER_ID_KEY);
    if (!active) {
      window.localStorage.setItem(ACTIVE_USER_ID_KEY, "guest");
    }
  } catch {
    // Ignore error
  }
}

// Helper to notify cloud if authenticated (fire-and-forget safe)
async function sendCloudMutation(action: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const user = await getClientUser();
    if (!user) return;

    fetch("/api/cloud/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }).catch(() => {
      // Offline / network failure: local storage remains reliable
    });
  } catch {
    // Ignore error
  }
}

/**
 * Retrieves all wishlisted product IDs from localStorage.
 */
export function getWishlist(): string[] {
  if (typeof window === "undefined") {
    return emptyArray;
  }

  try {
    const stored = window.localStorage.getItem(WISHLIST_KEY);
    if (!stored) {
      return emptyArray;
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : emptyArray;
  } catch (error) {
    console.error("Error reading wishlist from localStorage:", error);
    return emptyArray;
  }
}

/**
 * Checks if a specific product ID is currently in the wishlist.
 */
export function isWishlisted(productId: string): boolean {
  if (!productId) return false;
  const wishlist = getWishlist();
  return wishlist.includes(productId);
}

/**
 * Toggles a product in the wishlist (adds if absent, removes if present).
 * Returns true if the product is now in the wishlist, false otherwise.
 */
export function toggleWishlist(productId: string): boolean {
  if (typeof window === "undefined" || !productId) {
    return false;
  }

  try {
    ensureGuestActiveKey();
    const current = getWishlist();
    const isAlreadyWishlisted = current.includes(productId);
    const updated = isAlreadyWishlisted
      ? current.filter((id) => id !== productId)
      : [...current, productId];

    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    cachedWishlistRaw = JSON.stringify(updated);
    cachedWishlistSnapshot = updated;

    window.dispatchEvent(
      new CustomEvent("wishlist-updated", {
        detail: { productId, wishlisted: !isAlreadyWishlisted, count: updated.length },
      })
    );

    // Sync mutation to cloud if authenticated
    sendCloudMutation(isAlreadyWishlisted ? "remove-wishlist" : "add-wishlist", { productId });

    return !isAlreadyWishlisted;
  } catch (error) {
    console.error("Error updating wishlist in localStorage:", error);
    return false;
  }
}

/**
 * Adds a product ID to the wishlist.
 */
export function addToWishlist(productId: string): void {
  if (typeof window === "undefined" || !productId) {
    return;
  }

  try {
    ensureGuestActiveKey();
    const current = getWishlist();
    if (!current.includes(productId)) {
      const updated = [...current, productId];
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
      cachedWishlistRaw = JSON.stringify(updated);
      cachedWishlistSnapshot = updated;

      window.dispatchEvent(
        new CustomEvent("wishlist-updated", {
          detail: { productId, wishlisted: true, count: updated.length },
        })
      );

      sendCloudMutation("add-wishlist", { productId });
    }
  } catch (error) {
    console.error("Error adding to wishlist in localStorage:", error);
  }
}

/**
 * Removes a product ID from the wishlist.
 */
export function removeFromWishlist(productId: string): void {
  if (typeof window === "undefined" || !productId) {
    return;
  }

  try {
    const current = getWishlist();
    const updated = current.filter((id) => id !== productId);
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    cachedWishlistRaw = JSON.stringify(updated);
    cachedWishlistSnapshot = updated;

    window.dispatchEvent(
      new CustomEvent("wishlist-updated", {
        detail: { productId, wishlisted: false, count: updated.length },
      })
    );

    sendCloudMutation("remove-wishlist", { productId });
  } catch (error) {
    console.error("Error removing from wishlist in localStorage:", error);
  }
}

/**
 * Clears the entire active wishlist.
 */
export function clearWishlist(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(WISHLIST_KEY);
    cachedWishlistRaw = null;
    cachedWishlistSnapshot = emptyArray;
    window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { count: 0 } }));
    sendCloudMutation("clear-wishlist", {});
  } catch (error) {
    console.error("Error clearing wishlist in localStorage:", error);
  }
}

/**
 * Resets local wishlist and targets on sign out to ensure account isolation.
 * Prevents the next guest or user from seeing previous user's data.
 */
export function resetLocalWishlistState(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(WISHLIST_KEY);
    window.localStorage.removeItem(TRACKED_TARGETS_KEY);
    window.localStorage.setItem(ACTIVE_USER_ID_KEY, "guest");

    cachedWishlistRaw = null;
    cachedWishlistSnapshot = emptyArray;

    window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { count: 0 } }));
    window.dispatchEvent(new CustomEvent("tracked-targets-updated", { detail: { targets: {} } }));
  } catch (error) {
    console.error("Error resetting local wishlist state on sign out:", error);
  }
}

function subscribeWishlist(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("wishlist-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("wishlist-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedWishlistRaw: string | null = null;
let cachedWishlistSnapshot: string[] = emptyArray;

function getWishlistSnapshot(): string[] {
  if (typeof window === "undefined") return emptyArray;
  const raw = window.localStorage.getItem(WISHLIST_KEY);
  if (raw !== cachedWishlistRaw) {
    cachedWishlistRaw = raw;
    cachedWishlistSnapshot = getWishlist();
  }
  return cachedWishlistSnapshot;
}

export function useWishlist(): string[] {
  return useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    () => emptyArray
  );
}

// -------------------------------------------------------------
// PRICE TRACKING & TARGET PRICE EXTENSIONS
// -------------------------------------------------------------

export interface TrackedTarget {
  productId: string;
  targetPrice?: number;
  trackedAt: string;
}

export function getTrackedTargets(): Record<string, TrackedTarget> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRACKED_TARGETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getTrackedTarget(productId: string): TrackedTarget | null {
  const all = getTrackedTargets();
  return all[productId] || null;
}

export function setTrackedTarget(productId: string, targetPrice?: number): TrackedTarget {
  const all = getTrackedTargets();
  const newTarget: TrackedTarget = {
    productId,
    targetPrice,
    trackedAt: new Date().toISOString(),
  };

  all[productId] = newTarget;

  if (typeof window !== "undefined") {
    ensureGuestActiveKey();
    window.localStorage.setItem(TRACKED_TARGETS_KEY, JSON.stringify(all));
    // Also add to wishlist if not already wishlisted
    addToWishlist(productId);
    window.dispatchEvent(
      new CustomEvent("tracked-targets-updated", { detail: { productId, target: newTarget } })
    );

    sendCloudMutation("set-target", { productId, targetPrice });
  }

  return newTarget;
}

export function removeTrackedTarget(productId: string): void {
  const all = getTrackedTargets();
  delete all[productId];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(TRACKED_TARGETS_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent("tracked-targets-updated", { detail: { productId, target: null } })
    );

    sendCloudMutation("remove-target", { productId });
  }
}

function subscribeTrackedTargets(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("tracked-targets-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("tracked-targets-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useTrackedTarget(productId: string): TrackedTarget | null {
  const getSnapshot = () => JSON.stringify(getTrackedTarget(productId));
  const json = useSyncExternalStore(
    subscribeTrackedTargets,
    getSnapshot,
    () => "null"
  );
  return JSON.parse(json);
}

// -------------------------------------------------------------
// CLOUD SYNC & MERGE UTILITY
// -------------------------------------------------------------

let inFlightSyncPromise: Promise<{
  wishlist: string[];
  trackedTargets: Record<string, TrackedTarget>;
} | null> | null = null;

/**
 * Synchronizes local state with cloud state upon login/mount.
 * Merges local anonymous items into the cloud account, then updates localStorage cache.
 * Fully deduplicated to prevent concurrent duplicate API requests.
 */
export async function syncWithCloud(userId?: string): Promise<{
  wishlist: string[];
  trackedTargets: Record<string, TrackedTarget>;
} | null> {
  if (typeof window === "undefined") return null;

  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  inFlightSyncPromise = (async () => {
    try {
      const user = userId ? { id: userId } : await getClientUser();
      if (!user) return null;

      const prevOwner = window.localStorage.getItem(ACTIVE_USER_ID_KEY);

      // If the local cache belongs to a DIFFERENT authenticated user, wipe it first
      // so User A's items are never merged into User B's account!
      if (prevOwner && prevOwner !== "guest" && prevOwner !== user.id) {
        window.localStorage.removeItem(WISHLIST_KEY);
        window.localStorage.removeItem(TRACKED_TARGETS_KEY);
      }

      // Only merge anonymous data if the previous owner was a legitimate guest
      const isLegitimateGuest = !prevOwner || prevOwner === "guest";
      const localWishlist = isLegitimateGuest ? getWishlist() : [];
      const localTargets = isLegitimateGuest ? getTrackedTargets() : {};

      const hasGuestData = localWishlist.length > 0 || Object.keys(localTargets).length > 0;

      const res = await fetch("/api/cloud/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          action: hasGuestData ? "merge" : "get",
          anonymousData: hasGuestData
            ? {
                wishlist: localWishlist,
                trackedTargets: localTargets,
              }
            : {},
        }),
      });

      if (!res.ok) return null;

      const json = await res.json();
      if (json.success && json.data) {
        const { wishlist, trackedTargets } = json.data;

        // Set active user identifier
        window.localStorage.setItem(ACTIVE_USER_ID_KEY, user.id);

        // Update local storage cache
        if (Array.isArray(wishlist)) {
          window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
          window.localStorage.setItem(`pricely-wishlist-${user.id}`, JSON.stringify(wishlist));
          cachedWishlistRaw = JSON.stringify(wishlist);
          cachedWishlistSnapshot = wishlist;
          window.dispatchEvent(
            new CustomEvent("wishlist-updated", { detail: { count: wishlist.length } })
          );
        }

        if (trackedTargets && typeof trackedTargets === "object") {
          window.localStorage.setItem(TRACKED_TARGETS_KEY, JSON.stringify(trackedTargets));
          window.localStorage.setItem(`pricely-tracked-targets-${user.id}`, JSON.stringify(trackedTargets));
          window.dispatchEvent(
            new CustomEvent("tracked-targets-updated", { detail: { targets: trackedTargets } })
          );
        }

        return json.data;
      }

      return null;
    } catch (err) {
      console.warn("[CloudSync] Background sync skipped:", err);
      return null;
    } finally {
      inFlightSyncPromise = null;
    }
  })();

  return inFlightSyncPromise;
}

// -------------------------------------------------------------
// REACTIVE AUTH LISTENER FOR WISHLIST & CLOUD ISOLATION
// -------------------------------------------------------------

let authListenerInitialized = false;

export function initWishlistAuthListener(): void {
  if (typeof window === "undefined" || authListenerInitialized) return;
  authListenerInitialized = true;

  // 1. Custom auth-state-changed event
  window.addEventListener("auth-state-changed", (e: Event) => {
    const user = (e as CustomEvent).detail;
    if (user?.id) {
      syncWithCloud(user.id).catch(() => {});
    } else {
      resetLocalWishlistState();
    }
  });

  // 2. Supabase onAuthStateChange
  try {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id: string } } | null) => {
      const activeUser = window.localStorage.getItem(ACTIVE_USER_ID_KEY);
      if (session?.user?.id && (event === "SIGNED_IN" || activeUser !== session.user.id)) {
        await syncWithCloud(session.user.id).catch(() => {});
      } else if (event === "SIGNED_OUT" || (!session && activeUser && activeUser !== "guest")) {
        resetLocalWishlistState();
      }
    });
  } catch {
    // Ignore if Supabase client not initialized
  }
}

if (typeof window !== "undefined") {
  initWishlistAuthListener();
}
