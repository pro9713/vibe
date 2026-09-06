import type { Product } from "../data/types.ts";

export interface CachedSearchResult {
  products: Product[];
  timestamp: number;
  platform: string;
  query: string;
}

export interface CachedProductEntry {
  product: Product;
  timestamp: number;
}

// 15-minute TTL for live search results (900,000 ms)
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;

// 1-hour TTL for individual live product models (3,600,000 ms)
const PRODUCT_CACHE_TTL_MS = 60 * 60 * 1000;

// In-memory singleton stores
const searchCache = new Map<string, CachedSearchResult>();
const productCache = new Map<string, CachedProductEntry>();
const inFlightRequests = new Map<string, Promise<Product[]>>();

/**
 * Builds a deterministic cache key based on query, location, and platform.
 */
export function buildLiveSearchCacheKey(params: {
  query: string;
  lat?: number;
  lon?: number;
  pincode?: string;
  platform?: string;
}): string {
  const q = params.query.trim().toLowerCase();
  const lat = params.lat !== undefined ? params.lat.toFixed(4) : "19.0760";
  const lon = params.lon !== undefined ? params.lon.toFixed(4) : "72.8777";
  const pin = params.pincode ? params.pincode.trim() : "none";
  const platform = params.platform ? params.platform.trim().toLowerCase() : "all";

  return `live_search:${platform}:${pin}:${lat},${lon}:${q}`;
}

/**
 * Retrieves cached live search results if valid and within the 15-minute TTL.
 */
export function getCachedLiveSearch(key: string): Product[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }

  return entry.products;
}

/**
 * Caches live search results with a 15-minute TTL and automatically caches
 * each individual product entry with a 1-hour TTL for product detail lookups.
 */
export function setCachedLiveSearch(
  key: string,
  products: Product[],
  platform: string = "BlinkIt",
  query: string = ""
): void {
  const now = Date.now();
  searchCache.set(key, {
    products,
    timestamp: now,
    platform,
    query,
  });

  // Also cache individual products for 1 hour so /product/[id] lookups succeed
  for (const product of products) {
    if (product && product.id) {
      setCachedLiveProduct(product);
    }
  }
}

/**
 * Retrieves a cached live product by ID if valid within the 1-hour TTL.
 */
export function getCachedLiveProduct(id: string): Product | null {
  if (!id) return null;
  const entry = productCache.get(id);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > PRODUCT_CACHE_TTL_MS) {
    productCache.delete(id);
    return null;
  }

  return entry.product;
}

/**
 * Caches an individual live product with a 1-hour TTL.
 */
export function setCachedLiveProduct(product: Product): void {
  if (!product || !product.id) return;
  productCache.set(product.id, {
    product,
    timestamp: Date.now(),
  });
}

/**
 * Checks if a live search request for the given key is currently in-flight.
 */
export function getInFlightLiveSearch(key: string): Promise<Product[]> | null {
  return inFlightRequests.get(key) || null;
}

/**
 * Sets an in-flight promise for request deduplication.
 */
export function setInFlightLiveSearch(
  key: string,
  promise: Promise<Product[]>
): void {
  inFlightRequests.set(key, promise);
  promise.finally(() => {
    inFlightRequests.delete(key);
  });
}

/**
 * Clears all live caches (useful during testing or cache invalidation).
 */
export function clearLiveCache(): void {
  searchCache.clear();
  productCache.clear();
  inFlightRequests.clear();
}
