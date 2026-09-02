"use client";

import { useSyncExternalStore } from "react";
import { getClientUser } from "./auth";

export const WISHLIST_KEY = "pricely-wishlist";
export const TRACKED_TARGETS_KEY = "pricely-tracked-targets";

const emptyArray: string[] = [];

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
    const current = getWishlist();
    const isAlreadyWishlisted = current.includes(productId);
    const updated = isAlreadyWishlisted
      ? current.filter((id) => id !== productId)
      : [...current, productId];

    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
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
    const current = getWishlist();
    if (!current.includes(productId)) {
      const updated = [...current, productId];
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
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
 * Clears the entire wishlist.
 */
export function clearWishlist(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(WISHLIST_KEY);
    window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { count: 0 } }));
    sendCloudMutation("clear-wishlist", {});
  } catch (error) {
    console.error("Error clearing wishlist in localStorage:", error);
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

/**
 * Synchronizes local state with cloud state upon login/mount.
 * Merges local anonymous items into the cloud account, then updates localStorage cache.
 */
export async function syncWithCloud(userId?: string): Promise<{
  wishlist: string[];
  trackedTargets: Record<string, TrackedTarget>;
} | null> {
  if (typeof window === "undefined") return null;

  try {
    const user = userId ? { id: userId } : await getClientUser();
    if (!user) return null;

    const localWishlist = getWishlist();
    const localTargets = getTrackedTargets();

    const res = await fetch("/api/cloud/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        action: "merge",
        anonymousData: {
          wishlist: localWishlist,
          trackedTargets: localTargets,
        },
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json.success && json.data) {
      const { wishlist, trackedTargets } = json.data;

      // Update local storage cache
      if (Array.isArray(wishlist)) {
        window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
        window.dispatchEvent(
          new CustomEvent("wishlist-updated", { detail: { count: wishlist.length } })
        );
      }

      if (trackedTargets && typeof trackedTargets === "object") {
        window.localStorage.setItem(TRACKED_TARGETS_KEY, JSON.stringify(trackedTargets));
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
  }
}
