import { getPublicCatalog } from "../catalog/resolver.ts";
import { products as localProducts } from "../../data/products.ts";
import type { Product } from "../data/types.ts";
import { parseSearchQuery, type ParsedSearchQuery } from "../searchParser.ts";
import { rankProducts, type FilterCriteria } from "./relevance.ts";

export * from "./aliases.ts";
export * from "./relevance.ts";

export interface SearchOptions extends FilterCriteria {
  enableLiveQuickCommerce?: boolean;
  mode?: "local" | "live" | "hybrid";
  platform?: string;
  lat?: number;
  lon?: number;
  pincode?: string;
}

// Documented default coordinates (Mumbai fallback only when user has not specified location)
export const DEFAULT_SEARCH_LOCATION: { lat: number; lon: number; pincode?: string } = {
  lat: 19.0760,
  lon: 72.8777,
};

/**
 * Smart Search V2 Engine
 *
 * Executes multi-source product searches with natural-language query parsing,
 * live QuickCommerce retrieval, hard category/brand filtering, and deterministic ranking.
 *
 * Modes:
 * - "local" (default): Instant, offline search strictly using verified public catalog (0 API calls).
 * - "live": Searches live retailers only (QuickCommerce API with 15-min cache).
 * - "hybrid": Merges live retailer results with the verified public catalog.
 */
export async function executeSmartSearch(
  query: string,
  options?: SearchOptions
): Promise<{
  parsed: ParsedSearchQuery;
  products: Product[];
  totalMatches: number;
  source: "local" | "quickcommerce" | "hybrid";
}> {
  const parsed = parseSearchQuery(query);
  const searchMode: "local" | "live" | "hybrid" =
    options?.mode || (options?.enableLiveQuickCommerce ? "hybrid" : "local");

  // Hydrate candidate pool using the unified public catalog (Local 52 + Published DB items)
  let candidatePool: Product[] = [];
  try {
    const unifiedCatalog = await getPublicCatalog();
    candidatePool = unifiedCatalog.map((u) => ({
      id: u.id,
      name: u.name,
      brand: u.brand,
      category: u.category,
      description: u.description || "",
      image: u.image,
      images: u.images,
      rating: u.rating,
      reviews: u.reviews,
      trustScore: u.trustScore,
      offers: u.offers.map((o) => ({
        store: o.store,
        price: o.price,
        originalPrice: o.originalPrice,
        currency: o.currency || "INR",
        url: o.url,
        affiliateUrl: o.affiliateUrl,
        availability: o.availability,
        lastUpdated: o.lastUpdated,
      })),
      priceHistory: u.priceHistory || [],
      bestDeal: {
        store: u.bestDeal.store,
        price: u.bestDeal.price,
      },
      prices: u.offers.map((o) => ({
        store: o.store,
        price: o.price,
        originalPrice: o.originalPrice,
        currency: o.currency || "INR",
        url: o.url,
        affiliateUrl: o.affiliateUrl,
        availability: o.availability,
        lastUpdated: o.lastUpdated,
      })),
      history: u.priceHistory || [],
    }));
  } catch {
    candidatePool = [...localProducts];
  }

  let source: "local" | "quickcommerce" | "hybrid" = "local";

  // If mode is local, return products immediately with zero live API calls
  if (searchMode === "local") {
    const ranked = rankProducts(candidatePool, parsed, {
      category: options?.category,
      brand: options?.brand,
      minPrice: options?.minPrice,
      maxPrice: options?.maxPrice,
      store: options?.store,
      sortBy: options?.sortBy,
    });

    return {
      parsed,
      products: ranked,
      totalMatches: ranked.length,
      source: "local",
    };
  }

  // If live or hybrid mode is explicitly requested and we have query terms
  if (query.trim().length > 0 || parsed.brand || parsed.category || parsed.searchText) {
    try {
      const liveQuery = [parsed.brand, parsed.category, parsed.searchText].filter(Boolean).join(" ") || query;
      const lat = options?.lat ?? DEFAULT_SEARCH_LOCATION.lat;
      const lon = options?.lon ?? DEFAULT_SEARCH_LOCATION.lon;
      const platform = options?.platform || "BlinkIt";

      let liveProducts: Product[] = [];

      if (typeof window === "undefined") {
        // Direct server-side call with cache check
        const { getQuickCommerceClient } = await import("../quickcommerce/client.ts");
        const { normalizeQuickCommerceProductList } = await import("../quickcommerce/normalizer.ts");
        const { getCachedLiveSearch, setCachedLiveSearch, buildLiveSearchCacheKey } = await import("../quickcommerce/live-product-cache.ts");

        const cacheKey = buildLiveSearchCacheKey({
          query: liveQuery,
          lat,
          lon,
          pincode: options?.pincode,
          platform,
        });

        const cached = getCachedLiveSearch(cacheKey);
        if (cached) {
          liveProducts = cached;
        } else {
          const client = getQuickCommerceClient();
          if (client.hasApiKey()) {
            const result = await client.search({
              q: liveQuery,
              lat,
              lon,
              platform,
              pincode: options?.pincode,
            });
            liveProducts = normalizeQuickCommerceProductList(result.products, result.platform);
            setCachedLiveSearch(cacheKey, liveProducts, platform, liveQuery);
          }
        }
      } else {
        // Browser call to local API proxy
        const queryParams = new URLSearchParams({
          q: liveQuery,
          lat: String(lat),
          lon: String(lon),
          platform,
        });

        if (options?.pincode) {
          queryParams.set("pincode", options.pincode);
        }

        const res = await fetch(`/api/quickcommerce/search?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            liveProducts = data.products;
          }
        }
      }

      if (searchMode === "live") {
        candidatePool = liveProducts;
        source = "quickcommerce";
      } else if (searchMode === "hybrid") {
        if (liveProducts.length > 0) {
          const seenIds = new Set<string>();
          const basePool = candidatePool;
          candidatePool = [];

          for (const item of liveProducts) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              candidatePool.push(item);
            }
          }

          for (const item of basePool) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              candidatePool.push(item);
            }
          }

          source = "hybrid";
        }
      }
    } catch (err) {
      console.warn("[SmartSearchV2] Live search error, utilizing local catalog:", err);
      candidatePool = searchMode === "live" ? [] : candidatePool;
      source = searchMode === "live" ? "quickcommerce" : "local";
    }
  } else if (searchMode === "live") {
    candidatePool = [];
    source = "quickcommerce";
  }

  // Apply Smart Search V2 Hard Filtering and Relevance Ranking
  const ranked = rankProducts(candidatePool, parsed, {
    category: options?.category,
    brand: options?.brand,
    minPrice: options?.minPrice,
    maxPrice: options?.maxPrice,
    store: options?.store,
    sortBy: options?.sortBy,
  });

  return {
    parsed,
    products: ranked,
    totalMatches: ranked.length,
    source,
  };
}
