/**
 * Smart Search V2 Category & Brand Alias Taxonomy
 *
 * Provides comprehensive positive aliases, negative exclusion terms,
 * and canonical taxonomy mapping for fashion and lifestyle commerce.
 */

export interface CategoryTaxonomy {
  canonicalName: string;
  positiveAliases: string[];
  exclusionKeywords: string[];
}

export const CATEGORY_TAXONOMY: Record<string, CategoryTaxonomy> = {
  Shoes: {
    canonicalName: "Shoes",
    positiveAliases: [
      "shoe",
      "shoes",
      "sneaker",
      "sneakers",
      "trainer",
      "trainers",
      "footwear",
      "running shoes",
      "sports shoes",
      "walking shoes",
      "casual shoes",
      "formal shoes",
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
      "flip-flops",
      "flip flops",
      "clogs",
      "air max",
      "rs-x",
      "ultraboost",
    ],
    exclusionKeywords: [
      "wrist band",
      "wristband",
      "wrist-band",
      "head band",
      "headband",
      "sweatband",
      "towel",
      "socks",
      "sock",
      "watch",
      "watches",
      "bag",
      "bags",
      "backpack",
      "cap",
      "caps",
      "hat",
      "hats",
      "belt",
      "belts",
      "wallet",
      "wallets",
      "bottle",
      "shaker",
      "sunglasses",
      "deodorant",
      "deo",
      "perfume",
      "spray",
      "tshirt",
      "t-shirt",
      "shirt",
      "jeans",
      "trouser",
      "pants",
    ],
  },
  Men: {
    canonicalName: "Men",
    positiveAliases: [
      "jeans",
      "jean",
      "denim",
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
      "cargo",
      "cargos",
      "shorts",
      "short",
      "501",
      "men",
      "mens",
      "man",
    ],
    exclusionKeywords: [
      "shoes",
      "sneakers",
      "sandals",
      "watch",
      "watches",
      "wristband",
      "towel",
      "perfume",
      "bottle",
    ],
  },
  Women: {
    canonicalName: "Women",
    positiveAliases: [
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
      "gowns",
      "handbag",
      "heels",
    ],
    exclusionKeywords: [
      "men jeans",
      "mens jeans",
      "men shirt",
      "mens shirt",
    ],
  },
  Watches: {
    canonicalName: "Watches",
    positiveAliases: [
      "watch",
      "watches",
      "timepiece",
      "timepieces",
      "clock",
      "clocks",
      "wristwatch",
      "wrist watch",
      "chronograph",
      "smartwatch",
      "smart watch",
      "digital watch",
      "analog watch",
    ],
    exclusionKeywords: [
      "shoes",
      "sneakers",
      "shirt",
      "tshirt",
      "jeans",
      "pants",
      "towel",
      "wrist band",
      "wristband",
      "bag",
      "backpack",
      "perfume",
    ],
  },
  Bags: {
    canonicalName: "Bags",
    positiveAliases: [
      "bag",
      "bags",
      "backpack",
      "backpacks",
      "handbag",
      "handbags",
      "tote",
      "totes",
      "wallet",
      "wallets",
      "purse",
      "purses",
      "duffle",
      "duffel",
      "luggage",
      "messenger bag",
      "crossbody",
    ],
    exclusionKeywords: [
      "shoes",
      "sneakers",
      "watch",
      "watches",
      "jeans",
      "pants",
      "shirt",
      "tshirt",
      "spray",
    ],
  },
  Beauty: {
    canonicalName: "Beauty",
    positiveAliases: [
      "beauty",
      "cosmetic",
      "cosmetics",
      "skincare",
      "skin care",
      "makeup",
      "perfume",
      "perfumes",
      "fragrance",
      "fragrances",
      "lipstick",
      "lipsticks",
      "lotion",
      "lotions",
      "cream",
      "serum",
      "moisturizer",
      "facewash",
      "face wash",
    ],
    exclusionKeywords: [
      "shoes",
      "sneakers",
      "watch",
      "watches",
      "jeans",
      "pants",
      "backpack",
    ],
  },
};

/**
 * Standard brand alias normalization dictionary
 */
export const BRAND_TAXONOMY: Record<string, string[]> = {
  Nike: ["nike", "nikes", "nike sports"],
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
  Woodland: ["woodland"],
  Bata: ["bata"],
};

/**
 * Find canonical brand name from raw text token (case-insensitive)
 */
export function normalizeBrand(input: string): string | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();

  for (const [canonical, aliases] of Object.entries(BRAND_TAXONOMY)) {
    if (canonical.toLowerCase() === clean) return canonical;
    if (aliases.some((a) => a.toLowerCase() === clean)) return canonical;
  }

  return null;
}

/**
 * Find canonical category name from raw text token (case-insensitive)
 */
export function normalizeCategory(input: string): string | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();

  for (const [canonical, tax] of Object.entries(CATEGORY_TAXONOMY)) {
    if (canonical.toLowerCase() === clean) return canonical;
    if (tax.positiveAliases.some((a) => a.toLowerCase() === clean)) return canonical;
  }

  return null;
}
