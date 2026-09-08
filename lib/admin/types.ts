import type { StoreOffer } from "../data/types.ts";
export type { StoreOffer };

export type AdminProductStatus = "draft" | "published" | "hidden" | "archived";

export type AffiliateType = "none" | "amazon_tag" | "query_param" | "custom_url";

export type RetailerBadgeTier =
  | "official_brand"
  | "authorized_dealer"
  | "verified_marketplace"
  | "trusted_retailer"
  | "standard";

export interface AdminRetailer {
  id: string;
  name: string;
  website: string;
  website_url?: string;
  logo?: string;
  trusted: boolean;
  trustScore: number;
  badgeTier?: RetailerBadgeTier;
  badgeLabel?: string;
  affiliateType: AffiliateType;
  affiliateParam?: string;
  affiliateValue?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertRetailerPayload {
  id?: string;
  name: string;
  website: string;
  logo?: string;
  trusted?: boolean;
  trustScore?: number;
  badgeTier?: RetailerBadgeTier;
  badgeLabel?: string;
  affiliateType?: AffiliateType;
  affiliateParam?: string;
  affiliateValue?: string;
  isActive?: boolean;
}

/**
 * Clamps trust scores strictly between 1 and 100.
 */
export function clampTrustScore(val: any, defaultVal: number = 85): number {
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  return Math.min(100, Math.max(1, Math.round(num)));
}

/**
 * Validates a retailer payload before upserting.
 */
export function validateRetailerPayload(payload: UpsertRetailerPayload): {
  isValid: boolean;
  error?: string;
} {
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    return { isValid: false, error: "Retailer name is required." };
  }

  if (!payload.website || typeof payload.website !== "string" || !payload.website.trim()) {
    return { isValid: false, error: "Retailer website URL is required." };
  }

  try {
    const rawUrl = payload.website.startsWith("http://") || payload.website.startsWith("https://")
      ? payload.website
      : `https://${payload.website}`;
    new URL(rawUrl);
  } catch {
    return { isValid: false, error: "Invalid website URL format." };
  }

  if (payload.trustScore !== undefined) {
    const score = Number(payload.trustScore);
    if (isNaN(score) || score < 1 || score > 100) {
      return { isValid: false, error: "Trust score must be a number between 1 and 100." };
    }
  }

  const validTiers: RetailerBadgeTier[] = [
    "official_brand",
    "authorized_dealer",
    "verified_marketplace",
    "trusted_retailer",
    "standard",
  ];
  if (payload.badgeTier && !validTiers.includes(payload.badgeTier)) {
    return { isValid: false, error: `Invalid badge tier '${payload.badgeTier}'.` };
  }

  const validAffiliateTypes: AffiliateType[] = ["none", "amazon_tag", "query_param", "custom_url"];
  if (payload.affiliateType && !validAffiliateTypes.includes(payload.affiliateType)) {
    return { isValid: false, error: `Invalid affiliate type '${payload.affiliateType}'.` };
  }

  return { isValid: true };
}

/**
 * Default badge label mapping for authenticity tiers.
 */
export function getBadgeLabelForTier(tier?: RetailerBadgeTier): string {
  switch (tier) {
    case "official_brand":
      return "Official Brand Direct";
    case "authorized_dealer":
      return "Authorized Dealer";
    case "verified_marketplace":
      return "Marketplace Assured";
    case "trusted_retailer":
      return "Trusted Retailer";
    case "standard":
    default:
      return "Standard Partner";
  }
}

export interface AdminProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  trustScore: number;
  status: AdminProductStatus;
  sourceUrl?: string;
  offers: StoreOffer[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductPayload {
  name: string;
  brand: string;
  category: string;
  gender?: "men" | "women" | "unisex" | "kids" | string;
  description?: string;
  image: string;
  images?: string[];
  sku?: string;
  trustScore?: number;
  status?: AdminProductStatus;

  // Initial Store Offer
  store: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  url: string;
  seller?: string;
  isAuthorizedSeller?: boolean;
  badgeTier?: RetailerBadgeTier;
  availability?: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  brand?: string;
  category?: string;
  gender?: string;
  description?: string;
  image?: string;
  images?: string[];
  sku?: string;
  trustScore?: number;
  status?: AdminProductStatus;

  // Offer fields
  store?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  url?: string;
  seller?: string;
  availability?: boolean;
}

/**
 * Validates product creation input payload.
 */
export function validateProductPayload(payload: CreateProductPayload): {
  isValid: boolean;
  error?: string;
} {
  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim()) {
    return { isValid: false, error: "Product name is required." };
  }

  if (!payload.brand || typeof payload.brand !== "string" || !payload.brand.trim()) {
    return { isValid: false, error: "Brand is required." };
  }

  if (!payload.category || typeof payload.category !== "string" || !payload.category.trim()) {
    return { isValid: false, error: "Category is required." };
  }

  if (!payload.image || typeof payload.image !== "string" || !payload.image.trim()) {
    return { isValid: false, error: "Primary image URL is required." };
  }

  if (!payload.url || typeof payload.url !== "string" || !payload.url.trim()) {
    return { isValid: false, error: "Store product URL is required." };
  }

  const price = Number(payload.price);
  if (isNaN(price) || price <= 0) {
    return { isValid: false, error: "Offer price must be a valid number greater than 0." };
  }

  if (payload.originalPrice !== undefined) {
    const orig = Number(payload.originalPrice);
    if (isNaN(orig) || orig < 0) {
      return { isValid: false, error: "Original price must be a non-negative number." };
    }
  }

  return { isValid: true };
}

export interface CreateProductInput {
  id?: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  image: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  trustScore?: number;
  status?: AdminProductStatus;
  sourceUrl?: string;
  store: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  url: string;
  availability?: boolean;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  image?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  trustScore?: number;
  status?: AdminProductStatus;
  sourceUrl?: string;
  store?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  url?: string;
  availability?: boolean;
}

export interface CreateRetailerInput extends UpsertRetailerPayload {}
export interface UpdateRetailerInput extends UpsertRetailerPayload {
  id: string;
}
