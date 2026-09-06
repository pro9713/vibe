/**
 * Pure URL parser and Retailer Domain Detector.
 *
 * CRITICAL RULE:
 * Performs client-side/server-side deterministic URL normalization and domain inference ONLY.
 * NEVER scrapes remote retailer websites or calls external APIs.
 */

export interface ParsedRetailerUrl {
  isValid: boolean;
  normalizedUrl: string;
  cleanUrl: string;
  domain: string;
  detectedStore?: string;
  detectedRetailer?: string;
  isAmazon: boolean;
  error?: string;
}

const KNOWN_STORE_DOMAINS: Record<string, string> = {
  "amazon.in": "Amazon India",
  "amazon.com": "Amazon",
  "amzn.in": "Amazon India",
  "amzn.to": "Amazon India",
  "myntra.com": "Myntra",
  "flipkart.com": "Flipkart",
  "ajio.com": "AJIO",
  "nykaa.com": "Nykaa",
  "nykaaman.com": "Nykaa",
  "tatacliq.com": "Tata CLiQ",
  "zara.com": "Zara",
  "hm.com": "H&M",
  "nike.com": "Nike",
  "adidas.co.in": "Adidas",
  "adidas.com": "Adidas",
  "puma.com": "Puma",
  "levi.in": "Levi's",
  "casio-intl.com": "Casio",
  "fossil.com": "Fossil",
  "titan.co.in": "Titan",
  "blinkit.com": "BlinkIt",
  "zeptonow.com": "Zepto",
  "swiggy.com": "Instamart",
};

/**
 * Checks if a string is a valid HTTP/HTTPS product URL.
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
 * Validates and extracts retailer domain information from a product URL.
 */
export function parseRetailerProductUrl(rawUrl: string): ParsedRetailerUrl {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      isValid: false,
      normalizedUrl: "",
      cleanUrl: "",
      domain: "",
      isAmazon: false,
      error: "Product URL is required.",
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return {
      isValid: false,
      normalizedUrl: trimmed,
      cleanUrl: trimmed,
      domain: "",
      isAmazon: false,
      error: "URL must begin with http:// or https://",
    };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // Find known retailer name if available
    let detectedStore: string | undefined = undefined;

    for (const [domainKey, storeName] of Object.entries(KNOWN_STORE_DOMAINS)) {
      if (hostname === domainKey || hostname.endsWith(`.${domainKey}`)) {
        detectedStore = storeName;
        break;
      }
    }

    // Clean tracking query noise (utm_*, gclid, fbclid, etc.)
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
      "_ga",
      "_gl",
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    const clean = parsed.toString();
    const isAmazon = hostname.includes("amazon") || hostname.includes("amzn");

    return {
      isValid: true,
      normalizedUrl: clean,
      cleanUrl: clean,
      domain: hostname,
      detectedStore,
      detectedRetailer: detectedStore,
      isAmazon,
    };
  } catch {
    return {
      isValid: false,
      normalizedUrl: trimmed,
      cleanUrl: trimmed,
      domain: "",
      isAmazon: false,
      error: "Invalid URL format.",
    };
  }
}
