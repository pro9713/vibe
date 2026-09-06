import { getQuickCommerceClient } from "./client.ts";
import { normalizeQuickCommerceProduct } from "./normalizer.ts";
import { products } from "../../data/products.ts";
import { trustedStores } from "../../data/stores.ts";
import { getBestTrustedDeal, analyzeDeals, getCheapestOffer } from "../../data/dealEngine.ts";
import { calculateProductMatchConfidence } from "../search/productMatcher.ts";
import type { Product, StoreOffer } from "../data/types.ts";
import { type SupportedPlatform, validatePlatform } from "./types.ts";

export interface ComparisonResult {
  success: boolean;
  productId: string;
  productName: string;
  offers: StoreOffer[];
  bestTrustedDeal: ReturnType<typeof getBestTrustedDeal>;
  cheapestOffer: ReturnType<typeof getCheapestOffer>;
  dealAnalysis: ReturnType<typeof analyzeDeals>;
  isLive: boolean;
  cached: boolean;
  lastUpdated: string;
  error?: string;
}

interface CacheEntry {
  data: ComparisonResult;
  timestamp: number;
}

// In-memory server cache to protect API credits (5-minute TTL)
const comparisonCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Compare live offers across retail and quick commerce stores for a target product.
 */
export async function compareProductOffers(params: {
  productId: string;
  pincode?: string;
  lat?: number;
  lon?: number;
  platforms?: string[];
}): Promise<ComparisonResult> {
  const { productId, pincode } = params;
  const lat = params.lat ?? 19.0760;
  const lon = params.lon ?? 72.8777;

  const targetProduct = products.find((p) => p.id === productId);

  if (!targetProduct) {
    throw new Error(`Product with ID "${productId}" not found.`);
  }

  // 1. Check in-memory cache to prevent duplicate API requests
  const cacheKey = `${productId}_${pincode || "default"}_${lat}_${lon}`;
  const cached = comparisonCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
    };
  }

  const client = getQuickCommerceClient();
  let liveOffers: StoreOffer[] = [];
  let isLive = false;
  let fetchError: string | undefined;

  if (client.hasApiKey()) {
    try {
      // Prioritized platforms for comparison
      const targetPlatforms: SupportedPlatform[] = ["BlinkIt"];

      const searchQuery = `${targetProduct.brand} ${targetProduct.name}`;

      for (const platform of targetPlatforms) {
        try {
          const result = await client.search({
            q: searchQuery,
            lat,
            lon,
            platform,
            pincode,
          });

          for (const raw of result.products) {
            // Apply strict product matcher to reject accessories or mismatched items
            const match = calculateProductMatchConfidence(targetProduct, {
              name: raw.name || raw.title,
              brand: raw.brand || targetProduct.brand,
              category: raw.category || targetProduct.category,
              description: raw.description,
              price: raw.offer_price ?? raw.price,
            });

            if (match.isMatch) {
              const normalized = normalizeQuickCommerceProduct(raw, result.platform);
              if (normalized && normalized.offers.length > 0) {
                liveOffers.push(...normalized.offers);
              }
            }
          }
        } catch (err: unknown) {
          console.warn(`[LiveComparison] Error searching platform ${platform}:`, err);
        }
      }

      if (liveOffers.length > 0) {
        isLive = true;
      }
    } catch (err: unknown) {
      console.warn("[LiveComparison] Failed to query live platforms, falling back to local offers:", err);
      fetchError = err instanceof Error ? err.message : "Live prices are temporarily unavailable.";
    }
  } else {
    fetchError = "Live API key is not configured; showing verified catalog offers.";
  }

  // Merge live offers with existing verified store offers (deduplicating by store name)
  const offersByStore = new Map<string, StoreOffer>();

  // Add existing local verified offers first
  for (const offer of targetProduct.offers) {
    offersByStore.set(offer.store.toLowerCase(), offer);
  }

  // Override or add live offers
  for (const live of liveOffers) {
    offersByStore.set(live.store.toLowerCase(), live);
  }

  const finalOffers = Array.from(offersByStore.values()).sort(
    (a, b) => a.price - b.price
  );

  const bestTrustedDeal = getBestTrustedDeal(finalOffers);
  const cheapestOffer = getCheapestOffer(finalOffers);
  const dealAnalysis = analyzeDeals(finalOffers);

  const result: ComparisonResult = {
    success: true,
    productId: targetProduct.id,
    productName: targetProduct.name,
    offers: finalOffers,
    bestTrustedDeal,
    cheapestOffer,
    dealAnalysis,
    isLive,
    cached: false,
    lastUpdated: new Date().toISOString(),
    error: fetchError,
  };

  // Cache successful comparison result
  comparisonCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
  });

  return result;
}
