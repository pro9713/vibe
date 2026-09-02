import {
  createProduct,
  type Product,
  type StoreOffer,
} from "@/lib/data/types";
import { getStoreByName } from "@/data/stores";
import type { QuickCommerceRawProduct, SupportedPlatform } from "./types";
import { normalizeBrand } from "@/lib/search/aliases";

/**
 * Verified trust scores for supported QuickCommerce & Retailer platforms
 */
export const PLATFORM_TRUST_SCORES: Record<string, number> = {
  myntra: 94,
  amazon: 92,
  ajio: 91,
  flipkart: 89,
  swiggy: 90,
  bigbasket: 90,
  nykaa: 90,
  blinkit: 88,
  zepto: 88,
  dmart: 88,
  jiomart: 87,
  minutes: 85,
};

export function getPlatformTrustScore(platformName: string): number {
  const store = getStoreByName(platformName);
  if (store && store.trustScore) {
    return store.trustScore;
  }
  const normalized = platformName.toLowerCase();
  return PLATFORM_TRUST_SCORES[normalized] || 85;
}

/**
 * Deterministic string cleaner for product titles and descriptions
 */
export function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return "Product";
  return rawTitle
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

/**
 * Basic heuristic to infer brand from product name if brand is omitted in API response
 */
function inferBrand(name: string, platform: string): string {
  const commonBrands = [
    "Nike", "Adidas", "Puma", "Levi's", "Casio", "Zara", "H&M",
    "Allen Solly", "US Polo", "Boat", "Sony", "Apple", "Samsung",
    "Amul", "Nestle", "Cadbury", "Britannia", "Tata", "Fortune"
  ];

  for (const brand of commonBrands) {
    if (new RegExp(`\\b${brand}\\b`, "i").test(name)) {
      return normalizeBrand(brand) || brand;
    }
  }

  return platform;
}

/**
 * Normalizes a single raw product from QuickCommerce API into Pricely's canonical Product model.
 */
export function normalizeQuickCommerceProduct(
  raw: QuickCommerceRawProduct,
  platform: SupportedPlatform | string,
  index: number = 0
): Product {
  // Extract store name handling string or { name, sla, open, icon } object
  let storeName = "QuickCommerce";
  if (typeof raw.platform === "string" && raw.platform.trim().length > 0) {
    storeName = raw.platform.trim();
  } else if (
    raw.platform &&
    typeof raw.platform === "object" &&
    "name" in (raw.platform as Record<string, unknown>) &&
    typeof (raw.platform as Record<string, unknown>).name === "string"
  ) {
    storeName = ((raw.platform as Record<string, unknown>).name as string).trim();
  } else if (typeof platform === "string" && platform.trim().length > 0) {
    storeName = platform.trim();
  }

  const rawId = raw.id || raw.product_id || `item-${index}-${Date.now()}`;
  const slugId = `qc-${storeName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${String(rawId).replace(/[^a-z0-9]/g, "-")}`;

  const rawName = (raw.name || raw.title || "Product").trim();
  const name = cleanProductTitle(rawName);

  const rawBrand = (raw.brand && typeof raw.brand === "string" && raw.brand.trim().length > 0)
    ? raw.brand.trim()
    : inferBrand(name, storeName);
  const brand = normalizeBrand(rawBrand) || rawBrand;

  const category = (raw.category && typeof raw.category === "string" && raw.category.trim().length > 0)
    ? raw.category.trim()
    : "Quick Commerce";

  const description =
    raw.description ||
    [raw.quantity, raw.unit].filter(Boolean).join(" • ") ||
    `${name} available on ${storeName}`;

  // Image handling
  const image =
    (Array.isArray(raw.images) && raw.images.length > 0 && typeof raw.images[0] === "string" ? raw.images[0] : null) ||
    (typeof raw.image === "string" ? raw.image : null) ||
    "/images/placeholder.png";

  const images = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images.filter((img): img is string => typeof img === "string")
    : [image];

  // Pricing calculations
  const offerPrice = typeof raw.offer_price === "number" && raw.offer_price > 0
    ? raw.offer_price
    : typeof raw.price === "number" && raw.price > 0
    ? raw.price
    : typeof raw.mrp === "number" && raw.mrp > 0
    ? raw.mrp
    : 0;

  const mrp = typeof raw.mrp === "number" && raw.mrp > offerPrice ? raw.mrp : undefined;

  // Availability handling
  let availability = true;
  if (typeof (raw as Record<string, unknown>).available === "boolean") {
    availability = (raw as Record<string, unknown>).available as boolean;
  } else if (raw.out_of_stock === true) {
    availability = false;
  } else if (raw.in_stock === false) {
    availability = false;
  } else if (typeof raw.inventory === "number") {
    availability = raw.inventory > 0;
  } else if (raw.inventory === false) {
    availability = false;
  }

  const rawUrl = (typeof raw.deeplink === "string" ? raw.deeplink : typeof raw.url === "string" ? raw.url : "#").trim();
  const trustScore = getPlatformTrustScore(storeName);

  const offer: StoreOffer = {
    store: storeName,
    price: offerPrice,
    originalPrice: mrp,
    currency: "INR",
    url: rawUrl,
    availability,
    lastUpdated: new Date().toISOString(),
  };

  const rating = typeof raw.rating === "number" && raw.rating >= 1 && raw.rating <= 5
    ? Math.round(raw.rating * 10) / 10
    : 4.2;

  const reviews = typeof raw.rating_count === "number"
    ? raw.rating_count
    : typeof raw.reviews_count === "number"
    ? raw.reviews_count
    : 50;

  const currentMonthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return createProduct({
    id: slugId,
    name,
    brand,
    category,
    description,
    image,
    images,
    rating,
    reviews,
    trustScore,
    offers: [offer],
    priceHistory: [
      {
        month: currentMonthYear,
        price: offerPrice,
        date: new Date().toISOString().split("T")[0],
      },
    ],
  });
}

/**
 * Deduplicates normalized products by unique key (store + product id / clean title + price).
 */
export function deduplicateNormalizedProducts(productList: Product[]): Product[] {
  if (!Array.isArray(productList)) return [];

  const seenKeys = new Set<string>();
  const deduplicated: Product[] = [];

  for (const prod of productList) {
    const offer = prod.offers[0];
    const key = offer
      ? `${offer.store.toLowerCase()}_${prod.name.toLowerCase()}_${offer.price}`
      : prod.id;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(prod);
    }
  }

  return deduplicated;
}

/**
 * Normalizes an array of raw products from QuickCommerce API and deduplicates identical listings.
 */
export function normalizeQuickCommerceProductList(
  rawList: QuickCommerceRawProduct[],
  platform: SupportedPlatform | string
): Product[] {
  if (!Array.isArray(rawList)) return [];

  const normalized = rawList
    .map((item, index) => normalizeQuickCommerceProduct(item, platform, index))
    .filter((p) => p.offers.length > 0 && p.offers[0].price > 0);

  return deduplicateNormalizedProducts(normalized);
}
