import type { Product } from "../data/types.ts";
import { normalizeBrand, CATEGORY_TAXONOMY } from "./aliases.ts";

export interface MatchResult {
  isMatch: boolean;
  confidence: number;
  reason: string;
  matchTier?: "HIGH" | "MEDIUM" | "LOW";
  extractedAttributes?: {
    size?: string;
    capacity?: string;
    packSize?: string;
    generation?: string;
    color?: string;
  };
}

export interface MatchingDiagnostics {
  rawCount: number;
  normalizedCount: number;
  matchedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  retailersCovered: string[];
}

/**
 * Extracts product variant attributes (size, capacity, pack size, series/generation, color)
 */
export function extractProductAttributes(text: string): {
  size?: string;
  capacity?: string;
  packSize?: string;
  generation?: string;
  color?: string;
} {
  const normalized = text.toLowerCase();
  const attributes: {
    size?: string;
    capacity?: string;
    packSize?: string;
    generation?: string;
    color?: string;
  } = {};

  // 1. Dimensions / Millimeter Sizes (e.g., "42mm", "46mm", "40mm", "44mm")
  const mmMatch = normalized.match(/\b(\d{2,3})\s*mm\b/i);
  if (mmMatch) {
    attributes.size = `${mmMatch[1]}mm`;
  }

  // 2. Shoe / Clothing Sizes (e.g., "uk 8", "uk 9", "size 10", "size xl", "size 32")
  if (!attributes.size) {
    const shoeSizeMatch = normalized.match(/\b(?:uk|us|eu|size)\s*([0-9]{1,2}(?:\.[0-9])?)\b/i);
    if (shoeSizeMatch) {
      attributes.size = `Size ${shoeSizeMatch[1]}`;
    } else {
      const apparelSizeMatch = normalized.match(/\b(?:size\s+)?(xxl|xl|xs|[sml])\b/i);
      if (apparelSizeMatch && !/\b(?:air|max|rs|pro)\b/i.test(apparelSizeMatch[1])) {
        attributes.size = apparelSizeMatch[1].toUpperCase();
      }
    }
  }

  // 3. Storage / Capacity / Weight (e.g., "128gb", "256gb", "1tb", "500g", "1kg", "500ml", "1l")
  const capacityMatch = normalized.match(/\b(\d{1,4})\s*(gb|tb|mb|kg|gm|g|ml|l|litre|liter)\b/i);
  if (capacityMatch) {
    attributes.capacity = `${capacityMatch[1]}${capacityMatch[2].toLowerCase()}`;
  }

  // 4. Pack Size (e.g., "pack of 2", "pack of 3", "set of 4", "combo of 2")
  const packMatch = normalized.match(/\b(?:pack|set|combo)\s*(?:of)?\s*([0-9]{1,2})\b/i);
  if (packMatch) {
    attributes.packSize = `Pack of ${packMatch[1]}`;
  }

  // 5. Generation / Series (e.g., "series 9", "series 10", "gen 2", "gen 3")
  const genMatch = normalized.match(/\b(series\s*[0-9]{1,2}|gen\s*[0-9]{1,2}|pro\s*[0-9]{1,2})\b/i);
  if (genMatch) {
    attributes.generation = genMatch[1].replace(/\s+/g, " ").trim();
  }

  // 6. Common Colors
  const colors = ["black", "white", "blue", "red", "green", "midnight", "starlight", "silver", "gold", "space grey", "grey", "yellow", "pink", "purple"];
  for (const c of colors) {
    if (new RegExp(`\\b${c}\\b`, "i").test(normalized)) {
      attributes.color = c;
      break;
    }
  }

  return attributes;
}

/**
 * Deterministically evaluates whether a candidate listing matches a target product.
 * Enforces strict brand integrity, category negative exclusion, and variant safety.
 */
export function calculateProductMatchConfidence(
  target: Product,
  candidate: {
    name?: string;
    brand?: string;
    category?: string;
    description?: string;
    price?: number;
    maxPrice?: number;
    sku?: string;
    productId?: string;
  }
): MatchResult {
  const candidateName = (candidate.name || "").trim().toLowerCase();
  const candidateBrand = (candidate.brand || "").trim().toLowerCase();
  const candidateDescription = (candidate.description || "").trim().toLowerCase();

  const targetName = target.name.trim().toLowerCase();
  const targetBrand = target.brand.trim().toLowerCase();
  const targetCategory = target.category.trim();

  // 0. EXPLICIT PRICE CEILING REJECTION
  if (candidate.maxPrice && candidate.price && candidate.price > candidate.maxPrice) {
    return {
      isMatch: false,
      confidence: 0,
      reason: `Price ₹${candidate.price} exceeds explicit maximum ceiling of ₹${candidate.maxPrice}.`,
      matchTier: "LOW",
    };
  }

  // 1. BRAND INTEGRITY CHECK
  const canonicalTargetBrand = normalizeBrand(targetBrand) || targetBrand;
  const canonicalCandidateBrand = normalizeBrand(candidateBrand) || candidateBrand;

  if (canonicalCandidateBrand && canonicalTargetBrand) {
    if (canonicalCandidateBrand.toLowerCase() !== canonicalTargetBrand.toLowerCase()) {
      return {
        isMatch: false,
        confidence: 0,
        reason: `Brand mismatch: target is "${target.brand}", candidate is "${candidate.brand}".`,
        matchTier: "LOW",
      };
    }
  }

  // 2. CATEGORY EXCLUSION CHECK
  if (targetCategory && CATEGORY_TAXONOMY[targetCategory]) {
    const taxonomy = CATEGORY_TAXONOMY[targetCategory];
    const hasExclusion = taxonomy.exclusionKeywords.some((neg) => {
      const regex = new RegExp(`\\b${neg}\\b`, "i");
      return regex.test(candidateName) || regex.test(candidateDescription);
    });

    if (hasExclusion) {
      return {
        isMatch: false,
        confidence: 0,
        reason: `Incompatible category keywords found for category "${targetCategory}".`,
        matchTier: "LOW",
      };
    }
  }

  // 3. VARIANT SAFETY (Size, Dimensions, Capacity, Generation, Pack Size)
  const targetAttrs = extractProductAttributes(`${target.name} ${target.description || ""}`);
  const candidateAttrs = extractProductAttributes(`${candidate.name || ""} ${candidate.description || ""}`);

  if (targetAttrs.size && candidateAttrs.size && targetAttrs.size.toLowerCase() !== candidateAttrs.size.toLowerCase()) {
    return {
      isMatch: false,
      confidence: 0,
      reason: `Variant size mismatch: target is "${targetAttrs.size}", candidate is "${candidateAttrs.size}".`,
      matchTier: "LOW",
      extractedAttributes: candidateAttrs,
    };
  }

  if (targetAttrs.capacity && candidateAttrs.capacity && targetAttrs.capacity.toLowerCase() !== candidateAttrs.capacity.toLowerCase()) {
    return {
      isMatch: false,
      confidence: 0,
      reason: `Variant capacity mismatch: target is "${targetAttrs.capacity}", candidate is "${candidateAttrs.capacity}".`,
      matchTier: "LOW",
      extractedAttributes: candidateAttrs,
    };
  }

  if (targetAttrs.packSize && candidateAttrs.packSize && targetAttrs.packSize.toLowerCase() !== candidateAttrs.packSize.toLowerCase()) {
    return {
      isMatch: false,
      confidence: 0,
      reason: `Pack size mismatch: target is "${targetAttrs.packSize}", candidate is "${candidateAttrs.packSize}".`,
      matchTier: "LOW",
      extractedAttributes: candidateAttrs,
    };
  }

  if (targetAttrs.generation && candidateAttrs.generation && targetAttrs.generation.toLowerCase() !== candidateAttrs.generation.toLowerCase()) {
    return {
      isMatch: false,
      confidence: 0,
      reason: `Generation/Series mismatch: target is "${targetAttrs.generation}", candidate is "${candidateAttrs.generation}".`,
      matchTier: "LOW",
      extractedAttributes: candidateAttrs,
    };
  }

  // 4. TOKEN SIMILARITY & MODEL IDENTIFIER MATCHING
  const stopWords = new Set(["for", "men", "mens", "women", "womens", "unisex", "the", "and", "with", "original", "premium"]);

  const targetTokens = targetName
    .split(/[\s\-_/,.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stopWords.has(t));

  const candidateTokens = candidateName
    .split(/[\s\-_/,.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stopWords.has(t));

  if (targetTokens.length === 0 || candidateTokens.length === 0) {
    return {
      isMatch: false,
      confidence: 0,
      reason: "Insufficient tokens for matching.",
      matchTier: "LOW",
    };
  }

  let matchedTokens = 0;
  for (const token of targetTokens) {
    if (candidateTokens.includes(token) || candidateName.includes(token)) {
      matchedTokens++;
    }
  }

  const tokenOverlapScore = matchedTokens / targetTokens.length;

  // Model Code Check (e.g. "40", "270", "501", "rs-x", "ultraboost")
  const numericModelRegex = /\b(\d{2,4}|[a-z]{1,4}-\d{1,4})\b/i;
  const targetModelMatch = targetName.match(numericModelRegex);
  let modelCodeScore = 0.5;

  if (targetModelMatch) {
    const modelCode = targetModelMatch[1].toLowerCase();
    if (candidateName.includes(modelCode)) {
      modelCodeScore = 1.0;
    } else {
      return {
        isMatch: false,
        confidence: 0,
        reason: `Model identifier mismatch: target has "${modelCode}" but candidate does not.`,
        matchTier: "LOW",
        extractedAttributes: candidateAttrs,
      };
    }
  }

  const confidence = Number(
    (tokenOverlapScore * 0.55 + modelCodeScore * 0.45).toFixed(2)
  );

  let matchTier: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (confidence >= 0.85) {
    matchTier = "HIGH";
  } else if (confidence >= 0.65) {
    matchTier = "MEDIUM";
  }

  const isMatch = confidence >= 0.65;

  return {
    isMatch,
    confidence,
    matchTier,
    reason: isMatch
      ? `${matchTier} confidence model match (${Math.round(confidence * 100)}%).`
      : `Low confidence score (${Math.round(confidence * 100)}%). Overlap: ${matchedTokens}/${targetTokens.length} tokens.`,
    extractedAttributes: candidateAttrs,
  };
}

/**
 * Computes observability diagnostics for a batch matching operation.
 */
export function getProductMatchingDiagnostics(params: {
  rawResults: unknown[];
  normalizedResults: Product[];
  matchedResults: MatchResult[];
  duplicatesCount: number;
  retailers: string[];
}): MatchingDiagnostics {
  const highConf = params.matchedResults.filter((m) => m.matchTier === "HIGH").length;
  const medConf = params.matchedResults.filter((m) => m.matchTier === "MEDIUM").length;
  const matched = params.matchedResults.filter((m) => m.isMatch).length;
  const rejected = params.matchedResults.filter((m) => !m.isMatch).length;

  return {
    rawCount: params.rawResults.length,
    normalizedCount: params.normalizedResults.length,
    matchedCount: matched,
    rejectedCount: rejected,
    duplicateCount: params.duplicatesCount,
    highConfidenceCount: highConf,
    mediumConfidenceCount: medConf,
    retailersCovered: Array.from(new Set(params.retailers)),
  };
}
