import { useSyncExternalStore } from "react";

export const RECENTLY_VIEWED_KEY = "pricely-recently-viewed";

const emptyArray: string[] = [];

/**
 * Retrieves the list of recently viewed product IDs from localStorage.
 */
export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") {
    return emptyArray;
  }

  try {
    const stored = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!stored) {
      return emptyArray;
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : emptyArray;
  } catch (error) {
    console.error("Error reading recently viewed products from localStorage:", error);
    return emptyArray;
  }
}

/**
 * Checks if a specific product ID exists in the recently viewed list.
 */
export function isRecentlyViewed(productId: string): boolean {
  if (!productId) return false;
  const recent = getRecentlyViewed();
  return recent.includes(productId);
}

/**
 * Adds a product ID to the top of the recently viewed list.
 * Deduplicates and caps the list at maxItems (default 10).
 */
export function addRecentlyViewed(productId: string, maxItems: number = 10): void {
  if (typeof window === "undefined" || !productId) {
    return;
  }

  try {
    const current = getRecentlyViewed();
    const filtered = current.filter((id) => id !== productId);
    const updated = [productId, ...filtered].slice(0, maxItems);

    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("recently-viewed-updated", { detail: { productId, items: updated } }));
  } catch (error) {
    console.error("Error saving recently viewed product to localStorage:", error);
  }
}

/**
 * Removes a specific product ID from the recently viewed list.
 */
export function removeRecentlyViewed(productId: string): void {
  if (typeof window === "undefined" || !productId) {
    return;
  }

  try {
    const current = getRecentlyViewed();
    const updated = current.filter((id) => id !== productId);

    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("recently-viewed-updated", { detail: { productId, items: updated } }));
  } catch (error) {
    console.error("Error removing recently viewed product from localStorage:", error);
  }
}

/**
 * Clears all recently viewed product IDs.
 */
export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
    window.dispatchEvent(new CustomEvent("recently-viewed-updated", { detail: { items: [] } }));
  } catch (error) {
    console.error("Error clearing recently viewed products:", error);
  }
}

function subscribeRecentlyViewed(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("recently-viewed-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("recently-viewed-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedRecentRaw: string | null = null;
let cachedRecentSnapshot: string[] = emptyArray;

function getRecentlyViewedSnapshot(): string[] {
  if (typeof window === "undefined") return emptyArray;
  const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
  if (raw !== cachedRecentRaw) {
    cachedRecentRaw = raw;
    cachedRecentSnapshot = getRecentlyViewed();
  }
  return cachedRecentSnapshot;
}

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(
    subscribeRecentlyViewed,
    getRecentlyViewedSnapshot,
    () => emptyArray
  );
}
