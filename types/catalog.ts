/**
 * Core Catalog Type Definitions for Vibe / Pricely.
 *
 * Provides a unified data model bridging the baseline 52-product catalog,
 * dynamically managed admin catalog products, and multi-retailer live offers.
 */

import type { StoreOffer, PriceHistoryItem, Product } from "../lib/data/types.ts";
import type { AdminProduct, AdminProductStatus } from "../lib/admin/types.ts";

export type RetailerBadgeTier =
  | "official_brand"
  | "authorized_dealer"
  | "verified_marketplace"
  | "trusted_retailer"
  | "standard";

export interface RetailerVerificationBadge {
  tier: RetailerBadgeTier;
  label: string;
  trustScore: number;
  verified: boolean;
  icon?: string;
  description?: string;
  verificationDate?: string;
}

export interface ProductOffer {
  id?: string;
  productId?: string;
  store: string;
  retailerId?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  url: string;
  affiliateUrl?: string;
  availability: boolean;
  inStock?: boolean;
  badge?: RetailerVerificationBadge;
  deliveryInfo?: string;
  seller?: string;
  lastUpdated?: string;
}

export type CatalogProductSource = "catalog" | "admin" | "curated" | "community";

export interface UnifiedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  description: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  trustScore: number;
  source: CatalogProductSource;
  status: AdminProductStatus;
  offers: ProductOffer[];
  bestDeal: {
    store: string;
    price: number;
    currency?: string;
    originalPrice?: number;
    discountPercent?: number;
    url: string;
    affiliateUrl?: string;
  };
  priceHistory: PriceHistoryItem[];
  tags?: string[];
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Adapter converting a standard baseline Product or AdminProduct into a UnifiedProduct.
 */
export function toUnifiedProduct(
  input: Product | AdminProduct,
  source: CatalogProductSource = "catalog"
): UnifiedProduct {
  const isBaseline = "prices" in input || "history" in input;
  const rawOffers: (StoreOffer | ProductOffer)[] = input.offers || [];

  const offers: ProductOffer[] = rawOffers.map((o, idx) => ({
    id: `${input.id}-offer-${idx}`,
    productId: input.id,
    store: o.store,
    price: o.price,
    originalPrice: o.originalPrice,
    currency: o.currency || "INR",
    url: o.url,
    affiliateUrl: o.affiliateUrl,
    availability: o.availability !== false,
    inStock: o.availability !== false,
    badge: {
      tier: "trusted_retailer",
      label: "Verified Retailer",
      trustScore: input.trustScore || 85,
      verified: true,
    },
    lastUpdated: o.lastUpdated || new Date().toISOString(),
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

  const images = input.images && input.images.length > 0 ? input.images : [input.image];
  const priceHistory = "priceHistory" in input && input.priceHistory ? input.priceHistory : [];

  const status: AdminProductStatus =
    "status" in input && input.status ? input.status : "published";

  return {
    id: input.id,
    name: input.name,
    brand: input.brand,
    category: input.category,
    description: input.description || "",
    image: input.image,
    images,
    rating: typeof input.rating === "number" ? input.rating : 0,
    reviews: typeof input.reviews === "number" ? input.reviews : 0,
    trustScore: typeof input.trustScore === "number" ? input.trustScore : 85,
    source: isBaseline ? "catalog" : source,
    status,
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
    priceHistory,
    isVerified: true,
    createdAt: "createdAt" in input ? input.createdAt : new Date().toISOString(),
    updatedAt: "updatedAt" in input ? input.updatedAt : new Date().toISOString(),
  };
}
