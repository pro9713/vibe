import type { Product } from "@/lib/data/types";
import type { ParsedSearchQuery } from "@/lib/searchParser";
import { CATEGORY_TAXONOMY, normalizeBrand } from "./aliases";

export interface RelevanceScoreBreakdown {
  categoryMatch: number;
  brandMatch: number;
  tokenMatch: number;
  priceConstraint: number;
  availability: number;
  ratingScore: number;
  reviewScore: number;
  storeTrustScore: number;
  dealQualityScore: number;
  penalty: number;
  totalScore: number;
}

export interface ScoredProduct {
  product: Product;
  isRelevant: boolean;
  rejectionReason?: string;
  relevanceScore: number;
  breakdown: RelevanceScoreBreakdown;
}

export interface FilterCriteria {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  store?: string;
  sortBy?: string;
}

/**
 * Evaluates and scores a single product against search query constraints with hard category & brand integrity.
 */
export function scoreProductRelevance(
  product: Product,
  parsed: ParsedSearchQuery,
  criteria?: FilterCriteria
): ScoredProduct {
  const breakdown: RelevanceScoreBreakdown = {
    categoryMatch: 0,
    brandMatch: 0,
    tokenMatch: 0,
    priceConstraint: 0,
    availability: 0,
    ratingScore: 0,
    reviewScore: 0,
    storeTrustScore: 0,
    dealQualityScore: 0,
    penalty: 0,
    totalScore: 0,
  };

  const effectiveCategory = (criteria?.category && criteria.category !== "all" ? criteria.category : parsed.category) || null;
  const effectiveBrand = (criteria?.brand && criteria.brand !== "all" ? criteria.brand : parsed.brand) || null;
  const effectiveMaxPrice = criteria?.maxPrice !== undefined ? criteria.maxPrice : parsed.maxPrice;
  const effectiveMinPrice = criteria?.minPrice !== undefined ? criteria.minPrice : parsed.minPrice;

  const productName = product.name.toLowerCase();
  const productBrand = product.brand.toLowerCase();
  const productCategory = product.category.toLowerCase();
  const productDescription = product.description.toLowerCase();
  const searchableText = `${productName} ${productBrand} ${productCategory} ${productDescription}`;

  // -------------------------------------------------------------
  // 1. HARD CATEGORY FILTER & REJECTION
  // -------------------------------------------------------------
  if (effectiveCategory && CATEGORY_TAXONOMY[effectiveCategory]) {
    const taxonomy = CATEGORY_TAXONOMY[effectiveCategory];

    // Check if product contains explicit negative exclusion terms for this category
    // (e.g. "wristband", "towel", "socks" when category is "Shoes")
    const hasExclusion = taxonomy.exclusionKeywords.some((neg) => {
      const regex = new RegExp(`\\b${neg}\\b`, "i");
      return regex.test(productName) || regex.test(productDescription);
    });

    if (hasExclusion) {
      return {
        product,
        isRelevant: false,
        rejectionReason: `Contains incompatible keyword for category "${effectiveCategory}".`,
        relevanceScore: -999,
        breakdown,
      };
    }

    // Check if product matches positive category aliases or category field
    const matchesPositiveAlias = taxonomy.positiveAliases.some((alias) => {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      return regex.test(searchableText);
    });

    const matchesCategoryField = productCategory === effectiveCategory.toLowerCase();

    if (matchesPositiveAlias || matchesCategoryField) {
      breakdown.categoryMatch = 40;
    } else {
      // If user specifically requested Shoes, and product doesn't mention any shoe terms -> REJECT
      return {
        product,
        isRelevant: false,
        rejectionReason: `Does not match requested category "${effectiveCategory}".`,
        relevanceScore: -999,
        breakdown,
      };
    }
  }

  // -------------------------------------------------------------
  // 2. HARD BRAND FILTER & REJECTION
  // -------------------------------------------------------------
  if (effectiveBrand) {
    const canonicalTargetBrand = normalizeBrand(effectiveBrand) || effectiveBrand;
    const canonicalProductBrand = normalizeBrand(product.brand) || product.brand;

    const brandMatched =
      canonicalTargetBrand.toLowerCase() === canonicalProductBrand.toLowerCase() ||
      new RegExp(`\\b${canonicalTargetBrand}\\b`, "i").test(searchableText);

    if (brandMatched) {
      breakdown.brandMatch = 25;
    } else {
      // If brand was explicitly specified and product brand belongs to a different known brand -> REJECT
      return {
        product,
        isRelevant: false,
        rejectionReason: `Brand "${product.brand}" does not match requested brand "${effectiveBrand}".`,
        relevanceScore: -999,
        breakdown,
      };
    }
  }

  // -------------------------------------------------------------
  // 3. HARD PRICE FILTER
  // -------------------------------------------------------------
  const price = product.bestDeal?.price ?? (product.offers[0]?.price || 0);

  if (effectiveMaxPrice !== undefined && price > effectiveMaxPrice) {
    return {
      product,
      isRelevant: false,
      rejectionReason: `Price ₹${price} exceeds maximum ₹${effectiveMaxPrice}.`,
      relevanceScore: -999,
      breakdown,
    };
  }

  if (effectiveMinPrice !== undefined && price < effectiveMinPrice) {
    return {
      product,
      isRelevant: false,
      rejectionReason: `Price ₹${price} is below minimum ₹${effectiveMinPrice}.`,
      relevanceScore: -999,
      breakdown,
    };
  }

  if (effectiveMaxPrice !== undefined || effectiveMinPrice !== undefined) {
    breakdown.priceConstraint = 10;
  }

  // -------------------------------------------------------------
  // 4. HARD STORE FILTER (if requested)
  // -------------------------------------------------------------
  if (criteria?.store && criteria.store !== "all") {
    const targetStore = criteria.store.toLowerCase();
    const hasStore = product.offers.some((o) => o.store.toLowerCase() === targetStore);
    if (!hasStore) {
      return {
        product,
        isRelevant: false,
        rejectionReason: `Not available on requested store "${criteria.store}".`,
        relevanceScore: -999,
        breakdown,
      };
    }
  }

  // -------------------------------------------------------------
  // 5. QUERY TOKEN MATCHING
  // -------------------------------------------------------------
  const rawSearchText = parsed.searchText || "";
  const queryTokens = rawSearchText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (queryTokens.length > 0) {
    const matchedTokensCount = queryTokens.filter((token) =>
      searchableText.includes(token)
    ).length;

    const tokenMatchRatio = matchedTokensCount / queryTokens.length;
    breakdown.tokenMatch = Math.round(tokenMatchRatio * 20);

    // If query has specific keywords and none matched at all -> slight penalty
    if (matchedTokensCount === 0 && !effectiveCategory && !effectiveBrand) {
      breakdown.penalty += 40;
    }
  } else {
    // If no remaining search tokens after brand/category extraction, grant full token score
    breakdown.tokenMatch = 20;
  }

  // -------------------------------------------------------------
  // 6. AVAILABILITY, TRUST & DEAL SIGNALS
  // -------------------------------------------------------------
  const isAvailable = product.offers.some((o) => o.availability !== false);
  if (isAvailable) {
    breakdown.availability = 10;
  } else {
    breakdown.penalty += 15;
  }

  // Rating score (0 to +5)
  breakdown.ratingScore = Math.min(5, Math.max(0, (product.rating / 5) * 5));

  // Reviews score (0 to +5)
  breakdown.reviewScore = Math.min(5, (product.reviews / 200) * 5);

  // Store trust score (0 to +10)
  breakdown.storeTrustScore = Math.min(10, Math.max(0, (product.trustScore / 100) * 10));

  // Deal quality bonus
  const originalPrice = product.offers[0]?.originalPrice || 0;
  if (originalPrice > price) {
    const discountPct = Math.round(((originalPrice - price) / originalPrice) * 100);
    breakdown.dealQualityScore = Math.min(10, Math.round(discountPct / 5));
  }

  // -------------------------------------------------------------
  // 7. TOTAL RELEVANCE SCORE
  // -------------------------------------------------------------
  breakdown.totalScore =
    breakdown.categoryMatch +
    breakdown.brandMatch +
    breakdown.tokenMatch +
    breakdown.priceConstraint +
    breakdown.availability +
    breakdown.ratingScore +
    breakdown.reviewScore +
    breakdown.storeTrustScore +
    breakdown.dealQualityScore -
    breakdown.penalty;

  const isRelevant = breakdown.totalScore > 0;

  return {
    product,
    isRelevant,
    relevanceScore: breakdown.totalScore,
    breakdown,
  };
}

/**
 * Filter and rank a list of products using Smart Search V2 deterministic engine.
 */
export function rankProducts(
  products: Product[],
  parsed: ParsedSearchQuery,
  criteria?: FilterCriteria
): Product[] {
  const scored = products
    .map((p) => scoreProductRelevance(p, parsed, criteria))
    .filter((s) => s.isRelevant);

  const effectiveSort = criteria?.sortBy || parsed.sortIntent || "default";

  switch (effectiveSort) {
    case "low":
    case "price-low":
      return scored
        .sort((a, b) => a.product.bestDeal.price - b.product.bestDeal.price)
        .map((s) => s.product);

    case "high":
    case "price-high":
      return scored
        .sort((a, b) => b.product.bestDeal.price - a.product.bestDeal.price)
        .map((s) => s.product);

    case "rating":
      return scored
        .sort((a, b) => b.product.rating - a.product.rating)
        .map((s) => s.product);

    case "brand":
      return scored
        .sort((a, b) => a.product.brand.localeCompare(b.product.brand))
        .map((s) => s.product);

    case "best-value":
      return scored
        .sort((a, b) => {
          const scoreA =
            a.relevanceScore * 0.4 +
            a.product.trustScore * 0.3 +
            a.product.rating * 10 * 0.2 +
            Math.max(0, 100 - a.product.bestDeal.price / 50) * 0.1;

          const scoreB =
            b.relevanceScore * 0.4 +
            b.product.trustScore * 0.3 +
            b.product.rating * 10 * 0.2 +
            Math.max(0, 100 - b.product.bestDeal.price / 50) * 0.1;

          return scoreB - scoreA;
        })
        .map((s) => s.product);

    case "default":
    default:
      return scored
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map((s) => s.product);
  }
}
