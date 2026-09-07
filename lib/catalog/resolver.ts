/**
 * Unified Product Resolution Service.
 *
 * Coordinates layered product lookups across three tiers:
 * Tier 1: Local Curated Baseline (52 products)
 * Tier 2: Published Admin Catalog Products (Supabase / In-Memory)
 * Tier 3: Live QuickCommerce Products (Local Cache Only)
 *
 * CRITICAL GUARDRAILS:
 * 1. data/products.ts is 100% immutable.
 * 2. Draft, hidden, and archived items are NEVER exposed to public callers.
 * 3. QuickCommerce lookups strictly read from the local in-memory cache (zero remote network calls).
 * 4. Sub-millisecond performance with local-first fast caching.
 */

import { products as local52Products } from "../../data/products.ts";
import type { Product, StoreOffer } from "../data/types.ts";
import type { AdminProduct } from "../admin/types.ts";
import {
  type UnifiedProduct,
  type ProductOffer,
  type RetailerVerificationBadge,
  toUnifiedProduct,
} from "../../types/catalog.ts";
import {
  DatabaseProductProvider,
  getInMemoryAdminProductEntry,
} from "../data/providers/database-product.provider.ts";
import { getCachedLiveProduct } from "../quickcommerce/live-product-cache.ts";

const dbProductProvider = new DatabaseProductProvider();

// Fast in-memory cache for public catalog
let cachedPublicCatalog: UnifiedProduct[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds local memory cache

/**
 * Invalidates the resolver's public catalog memory cache.
 */
export function invalidatePublicCatalogCache(): void {
  cachedPublicCatalog = null;
  cacheTimestamp = 0;
}

/**
 * Checks whether an ID belongs to the immutable 52 baseline catalog.
 */
export function isBaselineProductId(productId: string): boolean {
  if (!productId) return false;
  return local52Products.some((p) => p.id === productId);
}

/**
 * Adapts a legacy Product object into a UnifiedProduct.
 */
export function adaptLocalProductToUnified(product: Product): UnifiedProduct {
  return toUnifiedProduct(product, "catalog");
}

/**
 * Adapts an AdminProduct object into a UnifiedProduct.
 */
export function adaptAdminProductToUnified(adminProduct: AdminProduct): UnifiedProduct {
  return toUnifiedProduct(adminProduct, "admin");
}

/**
 * Adapts a raw Supabase database row with offers into a UnifiedProduct.
 */
export function adaptDbRowToUnified(row: any): UnifiedProduct {
  const rawOffers = Array.isArray(row.admin_product_offers) ? row.admin_product_offers : [];

  const offers: ProductOffer[] = rawOffers.map((o: any, idx: number) => ({
    id: o.id || `${row.id}-offer-${idx}`,
    productId: row.id,
    store: o.store || "Store",
    price: Number(o.price) || 0,
    originalPrice: o.original_price ? Number(o.original_price) : undefined,
    currency: o.currency || "INR",
    url: o.url || "#",
    affiliateUrl: o.affiliate_url || undefined,
    availability: o.availability !== false,
    inStock: o.availability !== false,
    badge: {
      tier: "trusted_retailer",
      label: "Verified Retailer",
      trustScore: Number(row.trust_score) || 85,
      verified: true,
    },
    lastUpdated: o.last_updated || new Date().toISOString(),
  }));

  const availableOffers = offers.filter((o) => o.availability !== false);
  const bestOffer =
    availableOffers.length > 0
      ? availableOffers.reduce((best, curr) => (curr.price < best.price ? curr : best))
      : offers[0] || {
          store: "Unavailable",
          price: 0,
          currency: "INR",
          url: "#",
          availability: false,
        };

  const images = Array.isArray(row.images) && row.images.length > 0 ? row.images : [row.image];

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description || "",
    image: row.image,
    images,
    rating: Number(row.rating) || 0,
    reviews: Number(row.reviews) || 0,
    trustScore: Number(row.trust_score) || 90,
    source: "admin",
    status: row.status || "draft",
    offers,
    bestDeal: {
      store: bestOffer.store,
      price: bestOffer.price,
      currency: bestOffer.currency,
      originalPrice: bestOffer.originalPrice,
      discountPercent:
        bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price
          ? Math.round(((bestOffer.originalPrice - bestOffer.price) / bestOffer.originalPrice) * 100)
          : undefined,
      url: bestOffer.url,
      affiliateUrl: bestOffer.affiliateUrl,
    },
    priceHistory: [],
    isVerified: true,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Returns the aggregated public catalog (Local 52 + Published DB Admin products).
 * Draft, hidden, and archived items are strictly excluded.
 */
export async function getPublicCatalog(): Promise<UnifiedProduct[]> {
  const now = Date.now();
  if (cachedPublicCatalog && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPublicCatalog;
  }

  // 1. Convert baseline 52 products
  const unified52: UnifiedProduct[] = local52Products.map((p) => adaptLocalProductToUnified(p));

  // 2. Fetch published DB admin products
  let publishedDbProducts: Product[] = [];
  try {
    publishedDbProducts = await dbProductProvider.getProducts();
  } catch (err) {
    console.warn("[CatalogResolver] Warning fetching DB products:", err);
  }

  // 3. Merge with baseline precedence
  const catalogMap = new Map<string, UnifiedProduct>();

  for (const item of unified52) {
    catalogMap.set(item.id, item);
  }

  for (const dbItem of publishedDbProducts) {
    if (!catalogMap.has(dbItem.id)) {
      catalogMap.set(dbItem.id, adaptLocalProductToUnified(dbItem));
    }
  }

  const result = Array.from(catalogMap.values());
  cachedPublicCatalog = result;
  cacheTimestamp = now;

  return result;
}

/**
 * Resolves a single product by ID across the 3 tiers:
 * Tier 1: Local 52 baseline
 * Tier 2: DB Admin products (strictly checks status === 'published')
 * Tier 3: Live QuickCommerce cached product (zero network calls)
 *
 * Returns null if not found or if the product is draft/hidden and caller does not allow drafts.
 */
export async function getPublicProductById(
  id: string,
  options?: { allowDrafts?: boolean }
): Promise<UnifiedProduct | null> {
  if (!id || typeof id !== "string") {
    return null;
  }

  const cleanId = id.trim();

  // Tier 1: Local 52 baseline lookup
  const localItem = local52Products.find((p) => p.id === cleanId);
  if (localItem) {
    return adaptLocalProductToUnified(localItem);
  }

  // Tier 2: DB Admin product lookup
  try {
    if (options?.allowDrafts) {
      const memEntry = getInMemoryAdminProductEntry(cleanId);
      if (memEntry) {
        const unified = adaptLocalProductToUnified(memEntry.product);
        unified.status = memEntry.status as any;
        return unified;
      }
    }

    const dbItem = await dbProductProvider.getProductById(cleanId);
    if (dbItem) {
      const unified = adaptLocalProductToUnified(dbItem);
      if (unified.status === "published" || options?.allowDrafts) {
        return unified;
      }
      return null;
    }
  } catch {
    // Continue to next tier
  }

  // Tier 3: Live QuickCommerce cached lookup (zero network calls)
  if (cleanId.startsWith("qc-") || cleanId.includes("blinkit") || cleanId.includes("zepto")) {
    const cachedQc = getCachedLiveProduct(cleanId);
    if (cachedQc) {
      return adaptLocalProductToUnified(cachedQc);
    }
  }

  return null;
}

/**
 * Returns public products filtered by category and gender with strict isolation.
 */
export async function getPublicProductsByCategory(
  category: string,
  gender?: string
): Promise<UnifiedProduct[]> {
  const catalog = await getPublicCatalog();
  if (!category || category === "all") {
    return catalog;
  }

  const normCat = category.trim().toLowerCase();

  // Gender Isolation Rules
  if (normCat === "men") {
    return catalog.filter(
      (p) =>
        p.category.toLowerCase() === "men" ||
        (p.category.toLowerCase() === "clothing" && p.name.toLowerCase().includes("men"))
    ).filter((p) => p.category.toLowerCase() !== "women");
  }

  if (normCat === "women") {
    return catalog.filter(
      (p) =>
        p.category.toLowerCase() === "women" ||
        (p.category.toLowerCase() === "clothing" && p.name.toLowerCase().includes("women"))
    ).filter((p) => p.category.toLowerCase() !== "men");
  }

  // Standard category filter (e.g. Shoes, Watches, Bags, Beauty, Electronics)
  let filtered = catalog.filter((p) => p.category.toLowerCase() === normCat);

  if (gender) {
    const normGender = gender.trim().toLowerCase();
    if (normGender === "men") {
      filtered = filtered.filter(
        (p) => !p.name.toLowerCase().includes("women") && !p.category.toLowerCase().includes("women")
      );
    } else if (normGender === "women") {
      filtered = filtered.filter(
        (p) => !p.name.toLowerCase().includes("men") && !p.category.toLowerCase().includes("men")
      );
    }
  }

  return filtered;
}
