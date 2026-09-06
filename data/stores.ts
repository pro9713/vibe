import { LOCAL_TRUSTED_STORES } from "../lib/data/providers/local-store.provider.ts";
import type { Store } from "../lib/data/types.ts";

export type { Store };

/**
 * Verified trusted retail stores with validated trust scores:
 * - Myntra: 94
 * - Amazon: 92
 * - AJIO: 91
 * - Flipkart: 89
 */
export const trustedStores: Store[] = LOCAL_TRUSTED_STORES || [];

/**
 * Find a store definition by its name (case-insensitive).
 */
export function getStoreByName(name: string): Store | undefined {
  if (!name) return undefined;
  const storeList = trustedStores || LOCAL_TRUSTED_STORES || [];
  const normalized = name.trim().toLowerCase();
  return storeList.find((s) => s && s.name && s.name.toLowerCase() === normalized);
}

/**
 * Find a store definition by its unique identifier.
 */
export function getStoreById(id: string): Store | undefined {
  if (!id) return undefined;
  const storeList = trustedStores || LOCAL_TRUSTED_STORES || [];
  return storeList.find((s) => s && s.id === id);
}