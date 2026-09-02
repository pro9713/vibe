import { products as localProducts } from "@/data/products";
import type { Product } from "@/lib/data/types";
import { parseSearchQuery, type ParsedSearchQuery } from "@/lib/searchParser";
import { rankProducts, type FilterCriteria } from "./relevance";

export * from "./aliases";
export * from "./relevance";

export interface SearchOptions extends FilterCriteria {
  enableLiveQuickCommerce?: boolean;
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

  let candidatePool: Product[] = [...localProducts];
  let source: "local" | "quickcommerce" | "hybrid" = "local";

  // If live search is explicitly enabled and we have search terms
  if (options?.enableLiveQuickCommerce && (query.trim().length > 0 || parsed.brand || parsed.category)) {
    try {
      const liveQuery = [parsed.brand, parsed.category, parsed.searchText].filter(Boolean).join(" ") || query;
      const lat = options?.lat ?? DEFAULT_SEARCH_LOCATION.lat;
      const lon = options?.lon ?? DEFAULT_SEARCH_LOCATION.lon;
      const platform = options?.platform || "BlinkIt";

      const queryParams = new URLSearchParams({
        q: liveQuery,
        lat: String(lat),
        lon: String(lon),
        platform,
      });

      if (options?.pincode) {
        queryParams.set("pincode", options.pincode);
      }

      // If running on server or client, fetch via API proxy
      let liveProducts: Product[] = [];

      if (typeof window === "undefined") {
        // Direct server-side call
        const { getQuickCommerceClient } = await import("@/lib/quickcommerce/client");
        const { normalizeQuickCommerceProductList } = await import("@/lib/quickcommerce/normalizer");
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
        }
      } else {
        // Browser call to local API proxy
        const res = await fetch(`/api/quickcommerce/search?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            liveProducts = data.products;
          }
        }
      }

      if (liveProducts.length > 0) {
        // Deduplicate by product ID/name
        const seenIds = new Set<string>();
        candidatePool = [];

        for (const item of liveProducts) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            candidatePool.push(item);
          }
        }

        for (const item of localProducts) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            candidatePool.push(item);
          }
        }

        source = "hybrid";
      }
    } catch (err) {
      console.warn("[SmartSearchV2] Live search error, utilizing local catalog:", err);
      source = "local";
    }
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
