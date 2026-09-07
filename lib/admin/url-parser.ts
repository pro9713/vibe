/**
 * Deterministic URL Parser and Sanitizer for Product URLs.
 *
 * CRITICAL GUARDRAIL:
 * Pure URL parser and domain/product identifier extractor ONLY.
 * NEVER scrapes remote retailer websites or invokes third-party scraping APIs.
 */

export interface ParsedRetailerUrl {
  isValid: boolean;
  rawUrl: string;
  normalizedUrl: string;
  cleanUrl: string;
  canonicalUrl?: string;
  domain: string;
  retailerKey: string;
  retailerName: string;
  detectedStore?: string;
  detectedRetailer?: string;
  isSupportedRetailer: boolean;
  productId?: string;
  isAmazon: boolean;
  error?: string;
}

export interface RetailerDefinition {
  key: string;
  name: string;
  domains: string[];
  extractProductId?: (url: URL) => string | undefined;
  buildCanonicalUrl?: (url: URL, productId?: string) => string | undefined;
}

/**
 * List of tracking and analytics query parameters to strip.
 */
const TRACKING_QUERY_PARAMS = new Set([
  // UTM parameters
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_brand",

  // Ad network click IDs
  "gclid",
  "gclsrc",
  "fbclid",
  "msclkid",
  "dclid",
  "wbraid",
  "gbraid",

  // Analytics & session trackers
  "_ga",
  "_gl",
  "_gac",
  "ref",
  "ref_",
  "ref_src",
  "pf_rd_r",
  "pf_rd_m",
  "pf_rd_t",
  "pf_rd_i",
  "pf_rd_p",
  "pf_rd_s",
  "pd_rd_r",
  "pd_rd_w",
  "pd_rd_wg",
  "pd_rd_i",
  "tag",
  "linkCode",
  "ascsubtag",
  "tag_id",
  "source",
  "sr",
  "qid",
  "keywords",
  "crid",
  "sprefix",
  "dib",
  "dib_tag",
  "th",
  "psc",
]);

/**
 * Retailer definitions for domain recognition and canonical product extraction.
 */
export const SUPPORTED_RETAILERS: RetailerDefinition[] = [
  {
    key: "amazon_in",
    name: "Amazon India",
    domains: ["amazon.in", "amzn.in", "amzn.to"],
    extractProductId: (url) => {
      // Standard Amazon ASIN patterns: /dp/B0..., /gp/product/B0..., /gp/aw/d/B0...
      const match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
      return match ? match[1].toUpperCase() : undefined;
    },
    buildCanonicalUrl: (url, asin) => {
      if (asin) {
        return `https://www.amazon.in/dp/${asin}`;
      }
      return undefined;
    },
  },
  {
    key: "amazon_us",
    name: "Amazon",
    domains: ["amazon.com"],
    extractProductId: (url) => {
      const match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
      return match ? match[1].toUpperCase() : undefined;
    },
    buildCanonicalUrl: (url, asin) => {
      if (asin) {
        return `https://www.amazon.com/dp/${asin}`;
      }
      return undefined;
    },
  },
  {
    key: "myntra",
    name: "Myntra",
    domains: ["myntra.com"],
    extractProductId: (url) => {
      // Pattern: /category/brand/product-name/1234567/buy or /1234567
      const match = url.pathname.match(/\/(\d+)(?:\/buy)?(?:\/)?$/i) || url.pathname.match(/\/(\d+)/);
      return match ? match[1] : undefined;
    },
    buildCanonicalUrl: (url) => {
      return `https://www.myntra.com${url.pathname}`;
    },
  },
  {
    key: "nykaa",
    name: "Nykaa",
    domains: ["nykaa.com", "nykaaman.com"],
    extractProductId: (url) => {
      // Pattern: /p/12345 or /product-name/p/12345
      const match = url.pathname.match(/\/p\/(\d+)/i) || url.pathname.match(/\/p\/([a-zA-Z0-9_-]+)/i);
      return match ? match[1] : undefined;
    },
    buildCanonicalUrl: (url) => {
      const hostname = url.hostname.replace(/^www\./, "");
      return `https://www.${hostname}${url.pathname}`;
    },
  },
  {
    key: "ajio",
    name: "AJIO",
    domains: ["ajio.com"],
    extractProductId: (url) => {
      // Pattern: /brand-name-product/p/460783921_black
      const match = url.pathname.match(/\/p\/([a-zA-Z0-9_-]+)/i);
      return match ? match[1] : undefined;
    },
    buildCanonicalUrl: (url) => {
      return `https://www.ajio.com${url.pathname}`;
    },
  },
  {
    key: "tatacliq_luxury",
    name: "Tata CLiQ Luxury",
    domains: ["luxury.tatacliq.com"],
    extractProductId: (url) => {
      // Pattern: /brand-product/p-mp0000000123456
      const match = url.pathname.match(/\/p-(mp\d+|[a-zA-Z0-9]+)/i);
      return match ? match[1] : undefined;
    },
    buildCanonicalUrl: (url) => {
      return `https://luxury.tatacliq.com${url.pathname}`;
    },
  },
  {
    key: "tatacliq",
    name: "Tata CLiQ",
    domains: ["tatacliq.com"],
    extractProductId: (url) => {
      // Pattern: /brand-product/p-mp0000000123456
      const match = url.pathname.match(/\/p-(mp\d+|[a-zA-Z0-9]+)/i);
      return match ? match[1] : undefined;
    },
    buildCanonicalUrl: (url) => {
      return `https://www.tatacliq.com${url.pathname}`;
    },
  },
  {
    key: "nike_in",
    name: "Nike India",
    domains: ["nike.com"],
    extractProductId: (url) => {
      // Pattern: /in/t/product-name/CODE-NUM or /t/product-name/CODE-NUM
      const match = url.pathname.match(/\/t\/[^/]+\/([A-Z0-9-]+)/i);
      return match ? match[1] : undefined;
    },
    buildCanonicalUrl: (url) => {
      return `https://www.nike.com${url.pathname}`;
    },
  },
  {
    key: "flipkart",
    name: "Flipkart",
    domains: ["flipkart.com"],
    extractProductId: (url) => {
      const pidParam = url.searchParams.get("pid");
      if (pidParam) return pidParam;
      const match = url.pathname.match(/\/p\/([a-zA-Z0-9]+)/i);
      return match ? match[1] : undefined;
    },
  },
  {
    key: "zara",
    name: "Zara",
    domains: ["zara.com"],
  },
  {
    key: "hm",
    name: "H&M",
    domains: ["hm.com"],
  },
  {
    key: "adidas",
    name: "Adidas",
    domains: ["adidas.co.in", "adidas.com"],
  },
  {
    key: "puma",
    name: "Puma",
    domains: ["puma.com"],
  },
  {
    key: "levi",
    name: "Levi's",
    domains: ["levi.in", "levi.com"],
  },
];

/**
 * Checks if a string is a valid HTTP/HTTPS URL.
 */
export function isValidProductUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Strips tracking parameters from a URL object or string.
 */
export function cleanTrackingParams(urlInput: string | URL): string {
  try {
    const parsed = typeof urlInput === "string" ? new URL(urlInput.trim()) : new URL(urlInput.toString());

    // Iterate over all search params and delete tracking ones
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (
        TRACKING_QUERY_PARAMS.has(lowerKey) ||
        lowerKey.startsWith("utm_") ||
        lowerKey.startsWith("pf_rd_") ||
        lowerKey.startsWith("pd_rd_")
      ) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    return parsed.toString();
  } catch {
    return typeof urlInput === "string" ? urlInput : urlInput.toString();
  }
}

/**
 * Identifies the retailer definition matching a given hostname.
 */
export function findRetailerByHostname(hostname: string, pathname?: string): RetailerDefinition | undefined {
  const cleanHost = hostname.toLowerCase().replace(/^www\./, "");

  // Special case: Nike India vs Global Nike
  if (cleanHost === "nike.com") {
    if (pathname && (pathname.startsWith("/in/") || pathname.startsWith("/in"))) {
      const nikeIn = SUPPORTED_RETAILERS.find((r) => r.key === "nike_in");
      if (nikeIn) return nikeIn;
    }
  }

  // Exact match first
  for (const retailer of SUPPORTED_RETAILERS) {
    if (retailer.domains.includes(cleanHost)) {
      return retailer;
    }
  }

  // Subdomain match (e.g. luxury.tatacliq.com)
  for (const retailer of SUPPORTED_RETAILERS) {
    for (const d of retailer.domains) {
      if (cleanHost.endsWith(`.${d}`)) {
        return retailer;
      }
    }
  }

  return undefined;
}

/**
 * Sanitizes and deterministically identifies incoming product URLs without scraping.
 */
export function parseRetailerUrl(rawUrl: string): ParsedRetailerUrl {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      isValid: false,
      rawUrl: "",
      normalizedUrl: "",
      cleanUrl: "",
      domain: "",
      retailerKey: "unknown",
      retailerName: "Unknown",
      isSupportedRetailer: false,
      isAmazon: false,
      error: "Product URL is required.",
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return {
      isValid: false,
      rawUrl: trimmed,
      normalizedUrl: trimmed,
      cleanUrl: trimmed,
      domain: "",
      retailerKey: "unknown",
      retailerName: "Unknown",
      isSupportedRetailer: false,
      isAmazon: false,
      error: "URL must begin with http:// or https://",
    };
  }

  try {
    const parsed = new URL(trimmed);
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const retailer = findRetailerByHostname(parsed.hostname, parsed.pathname);

    // Clean tracking query params
    const cleanUrlString = cleanTrackingParams(parsed);
    const cleanParsed = new URL(cleanUrlString);

    const isAmazon =
      domain.includes("amazon") ||
      domain === "amzn.in" ||
      domain === "amzn.to";

    let productId: string | undefined = undefined;
    let canonicalUrl: string | undefined = undefined;

    if (retailer) {
      if (retailer.extractProductId) {
        productId = retailer.extractProductId(cleanParsed);
      }
      if (retailer.buildCanonicalUrl) {
        canonicalUrl = retailer.buildCanonicalUrl(cleanParsed, productId);
      }
    }

    return {
      isValid: true,
      rawUrl: trimmed,
      normalizedUrl: cleanUrlString,
      cleanUrl: cleanUrlString,
      canonicalUrl: canonicalUrl || cleanUrlString,
      domain,
      retailerKey: retailer ? retailer.key : "generic",
      retailerName: retailer ? retailer.name : domain,
      detectedStore: retailer ? retailer.name : undefined,
      detectedRetailer: retailer ? retailer.name : undefined,
      isSupportedRetailer: Boolean(retailer),
      productId,
      isAmazon,
    };
  } catch {
    return {
      isValid: false,
      rawUrl: trimmed,
      normalizedUrl: trimmed,
      cleanUrl: trimmed,
      domain: "",
      retailerKey: "unknown",
      retailerName: "Unknown",
      isSupportedRetailer: false,
      isAmazon: false,
      error: "Invalid URL format.",
    };
  }
}

// Backwards compatibility aliases
export const parseRetailerProductUrl = parseRetailerUrl;
export const parseProductUrl = parseRetailerUrl;
