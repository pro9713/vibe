import { products } from "@/data/products";

export interface DetectedToken {
  type: "brand" | "category" | "price-max" | "price-min" | "price-range" | "intent";
  label: string;
  value: string | number;
  rawText: string;
}

export interface ParsedSearchQuery {
  originalQuery: string;
  searchText: string;
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortIntent?: "relevance" | "price-low" | "price-high" | "best-value";
  detectedTokens: DetectedToken[];
}

// Canonical category aliases mapping
const categoryAliasMap: Record<string, string[]> = {
  Shoes: [
    "running shoes",
    "sports shoes",
    "walking shoes",
    "casual shoes",
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "trainer",
    "trainers",
    "footwear",
    "boots",
    "boot",
    "loafers",
    "loafer",
    "sandals",
    "sandal",
    "heels",
    "heel",
    "slippers",
    "slipper",
    "slides",
    "slide",
    "clogs",
  ],
  Men: [
    "men",
    "mens",
    "man",
    "jean",
    "jeans",
    "denim",
    "shirt",
    "shirts",
    "tshirt",
    "t-shirt",
    "pants",
    "pant",
    "trouser",
    "trousers",
    "joggers",
    "jogger",
    "bottoms",
    "bottom",
    "chinos",
    "chino",
    "shorts",
  ],
  Women: [
    "women",
    "womens",
    "woman",
    "dress",
    "dresses",
    "skirt",
    "skirts",
    "top",
    "tops",
    "kurti",
    "kurtis",
    "saree",
    "sarees",
    "lehenga",
    "gown",
  ],
  Watches: [
    "smart watch",
    "smartwatch",
    "digital watch",
    "analog watch",
    "watch",
    "watches",
    "timepiece",
    "timepieces",
    "clock",
    "clocks",
    "wristwatch",
    "wrist watch",
    "chronograph",
  ],
  Bags: [
    "messenger bag",
    "crossbody",
    "bag",
    "bags",
    "handbag",
    "handbags",
    "backpack",
    "backpacks",
    "tote",
    "totes",
    "wallet",
    "wallets",
    "purse",
    "purses",
    "duffle",
    "duffel",
    "luggage",
  ],
  Beauty: [
    "skin care",
    "face wash",
    "beauty",
    "cosmetic",
    "cosmetics",
    "skincare",
    "makeup",
    "perfume",
    "perfumes",
    "fragrance",
    "fragrances",
    "lipstick",
    "lotion",
    "cream",
    "serum",
  ],
};

// Brand alias variations mapping
const brandAliasMap: Record<string, string[]> = {
  Nike: ["nike", "nikes"],
  Puma: ["puma", "pumas"],
  "Levi's": ["levi", "levis", "levi's", "levis'", "levi strauss"],
  Casio: ["casio", "g-shock", "gshock", "edifice"],
  Adidas: ["adidas", "adi das", "originals"],
  Zara: ["zara"],
  "H&M": ["h&m", "hm", "h and m"],
  "Allen Solly": ["allen solly", "allensolly"],
  "US Polo": ["us polo", "uspa", "u.s. polo", "u.s polo"],
  Bersache: ["bersache"],
  Campus: ["campus"],
  Sparx: ["sparx"],
  RedTape: ["redtape", "red tape"],
};

// Common intent keywords
const bestIntentWords = ["best", "top", "greatest", "highest rated", "recommended", "popular"];
const cheapIntentWords = ["cheap", "cheapest", "budget", "affordable", "lowest price", "low price", "cheaper"];
const expensiveIntentWords = ["expensive", "luxury", "premium", "high end", "costliest", "highest price"];

const stopWords = new Set(["for", "in", "with", "and", "of", "the", "a", "an", "at", "to", "on", "by"]);

/**
 * Parses a freeform user search query into structured search constraints.
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const original = query || "";
  const detectedTokens: DetectedToken[] = [];

  let textToParse = original.trim();
  let brand: string | undefined;
  let category: string | undefined;
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let sortIntent: "relevance" | "price-low" | "price-high" | "best-value" | undefined;

  // 1. PRICE DETECTION
  // Pattern A: Range "between 2000 and 3000" or "from 2000 to 3000"
  const rangePattern = /\b(?:between|from)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:and|to|-)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\b/i;
  const rangeMatch = textToParse.match(rangePattern);

  if (rangeMatch) {
    const p1 = parseInt(rangeMatch[1].replace(/,/g, ""), 10);
    const p2 = parseInt(rangeMatch[2].replace(/,/g, ""), 10);

    if (!isNaN(p1) && !isNaN(p2) && p1 >= 100 && p2 >= 100) {
      minPrice = Math.min(p1, p2);
      maxPrice = Math.max(p1, p2);

      detectedTokens.push({
        type: "price-range",
        label: `₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")}`,
        value: `${minPrice}-${maxPrice}`,
        rawText: rangeMatch[0],
      });

      textToParse = textToParse.replace(rangeMatch[0], " ");
    }
  }

  // Pattern B: Max Price ("under 3000", "below 2500", "less than 3000", "up to 3000", "max 3000" - NOT "air max")
  if (maxPrice === undefined) {
    // Ensure "max" is not preceded by "air " (like Nike Air Max)
    const maxPattern = /\b(?:under|below|less\s+than|up\s+to|(?<!air\s+)max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\b/i;
    const maxMatch = textToParse.match(maxPattern);

    if (maxMatch) {
      const parsed = parseInt(maxMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsed) && parsed >= 100) {
        maxPrice = parsed;
        detectedTokens.push({
          type: "price-max",
          label: `Under ₹${parsed.toLocaleString("en-IN")}`,
          value: parsed,
          rawText: maxMatch[0],
        });
        textToParse = textToParse.replace(maxMatch[0], " ");
      }
    }
  }

  // Pattern C: Min Price ("above 2000", "over 2000", "more than 2000", "min 2000")
  if (minPrice === undefined) {
    const minPattern = /\b(?:above|over|more\s+than|min(?:imum)?|greater\s+than)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\b/i;
    const minMatch = textToParse.match(minPattern);

    if (minMatch) {
      const parsed = parseInt(minMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsed) && parsed >= 100) {
        minPrice = parsed;
        detectedTokens.push({
          type: "price-min",
          label: `Above ₹${parsed.toLocaleString("en-IN")}`,
          value: parsed,
          rawText: minMatch[0],
        });
        textToParse = textToParse.replace(minMatch[0], " ");
      }
    }
  }

  // Pattern D: Standalone explicit currency amount like "₹3000" or "3000rs" without comparison word
  if (maxPrice === undefined && minPrice === undefined) {
    const explicitCurrencyPattern = /(?:₹|rs\.?|inr)\s*([\d,]+)\b|\b([\d,]+)\s*(?:rs\.?|inr)\b/i;
    const currMatch = textToParse.match(explicitCurrencyPattern);

    if (currMatch) {
      const rawNum = currMatch[1] || currMatch[2];
      const parsed = parseInt(rawNum.replace(/,/g, ""), 10);
      if (!isNaN(parsed) && parsed >= 100) {
        maxPrice = parsed;
        detectedTokens.push({
          type: "price-max",
          label: `Under ₹${parsed.toLocaleString("en-IN")}`,
          value: parsed,
          rawText: currMatch[0],
        });
        textToParse = textToParse.replace(currMatch[0], " ");
      }
    }
  }

  // 2. SORT / INTENT DETECTION
  for (const phrase of bestIntentWords) {
    const regex = new RegExp(`\\b${phrase}\\b`, "i");
    if (regex.test(textToParse)) {
      sortIntent = "best-value";
      detectedTokens.push({
        type: "intent",
        label: "Best Value",
        value: "best-value",
        rawText: phrase,
      });
      textToParse = textToParse.replace(regex, " ");
      break;
    }
  }

  if (!sortIntent) {
    for (const phrase of cheapIntentWords) {
      const regex = new RegExp(`\\b${phrase}\\b`, "i");
      if (regex.test(textToParse)) {
        sortIntent = "price-low";
        detectedTokens.push({
          type: "intent",
          label: "Price: Low to High",
          value: "price-low",
          rawText: phrase,
        });
        textToParse = textToParse.replace(regex, " ");
        break;
      }
    }
  }

  if (!sortIntent) {
    for (const phrase of expensiveIntentWords) {
      const regex = new RegExp(`\\b${phrase}\\b`, "i");
      if (regex.test(textToParse)) {
        sortIntent = "price-high";
        detectedTokens.push({
          type: "intent",
          label: "Price: High to Low",
          value: "price-high",
          rawText: phrase,
        });
        textToParse = textToParse.replace(regex, " ");
        break;
      }
    }
  }

  // 3. BRAND DETECTION
  // Collect all known brands from products + predefined alias mapping
  const knownBrands = Array.from(
    new Set(products.map((p) => p.brand).concat(Object.keys(brandAliasMap)))
  );

  for (const canonicalBrand of knownBrands) {
    const aliases = brandAliasMap[canonicalBrand] || [canonicalBrand.toLowerCase()];
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(textToParse)) {
        brand = canonicalBrand;
        detectedTokens.push({
          type: "brand",
          label: canonicalBrand,
          value: canonicalBrand,
          rawText: alias,
        });
        textToParse = textToParse.replace(regex, " ");
        break;
      }
    }
    if (brand) break;
  }

  // 4. CATEGORY DETECTION
  for (const [canonicalCategory, aliases] of Object.entries(categoryAliasMap)) {
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(textToParse)) {
        category = canonicalCategory;
        detectedTokens.push({
          type: "category",
          label: canonicalCategory,
          value: canonicalCategory,
          rawText: alias,
        });
        textToParse = textToParse.replace(regex, " ");
        break;
      }
    }
    if (category) break;
  }

  // 5. REMAINING SEARCH TEXT & CLEANUP
  const remainingTokens = textToParse
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .filter((word) => word.length > 0 && !stopWords.has(word));

  const searchText = remainingTokens.join(" ").trim();

  return {
    originalQuery: original,
    searchText,
    brand,
    category,
    minPrice,
    maxPrice,
    sortIntent,
    detectedTokens,
  };
}
