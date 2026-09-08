/**
 * Upgraded Product Metadata Extractor for Admin Hybrid Auto-Fetch Workflow.
 *
 * Extracts complete product details using:
 * 1. JSON-LD schema parsing (@type: "Product" -> name, brand, image, offers.price, sku)
 * 2. OpenGraph / Twitter Cards / Microdata fallback (og:title, og:image, twitter:title, twitter:image, itemprop="price")
 * 3. Public scraper fallback via api.microlink.io when blocked (403, 503, CAPTCHA) or missing image/title
 */

import { parseRetailerUrl, type ParsedRetailerUrl } from "./url-parser.ts";

export interface ExtractedProductMetadata {
  success: boolean;
  rawUrl: string;
  cleanUrl: string;
  domain: string;
  store: string;
  sku?: string;
  title?: string;
  brand?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  image?: string;
  images?: string[];
  isFetched: boolean;
  message?: string;
}

/**
 * Clean store-specific noise from scraped/extracted product titles.
 */
export function cleanProductTitle(rawTitle?: string, storeName?: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  // Strip common suffixes from retailer titles
  const suffixes = [
    /\s*:\s*Amazon\.(?:in|com)(?::.*)?$/i,
    /\s*\|\s*Amazon\.(?:in|com)$/i,
    /\s*-\s*Buy\s+.*Online\s+at\s+Best\s+Prices?\s+in\s+India.*$/i,
    /\s*\|\s*Myntra$/i,
    /\s*\|\s*Nykaa(?:\s+Man)?$/i,
    /\s*\|\s*AJIO$/i,
    /\s*\|\s*Tata\s+CLiQ(?:\s+Luxury)?$/i,
    /\s*\|\s*Nike\s+IN$/i,
    /\s*\|\s*Flipkart\.com$/i,
  ];

  for (const pattern of suffixes) {
    clean = clean.replace(pattern, "").trim();
  }

  return clean;
}

/**
 * Parses raw HTML and extracts metadata using JSON-LD, OpenGraph, Twitter Cards, and Microdata.
 */
export function parseHtmlMetadata(
  html: string,
  parsedUrl: ParsedRetailerUrl
): Partial<ExtractedProductMetadata> {
  const result: Partial<ExtractedProductMetadata> = {
    store: parsedUrl.retailerName,
    sku: parsedUrl.productId,
  };

  // 1. SCAN FOR <script type="application/ld+json"> AND PARSE @type: "Product"
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const content = jsonLdMatch[1].trim();
      if (!content) continue;
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const itemType = String(item["@type"] || "").toLowerCase();

        if (itemType.includes("product")) {
          // Name (Title)
          if (item.name && !result.title) {
            result.title = String(item.name).trim();
          }
          // Description
          if (item.description && !result.description) {
            result.description = String(item.description).trim();
          }
          // SKU
          if (item.sku && !result.sku) {
            result.sku = String(item.sku).trim();
          }
          // Brand
          if (item.brand) {
            const brandName = typeof item.brand === "object" ? item.brand.name : item.brand;
            if (brandName && !result.brand) {
              result.brand = String(brandName).trim();
            }
          }
          // Image
          if (item.image) {
            const img = Array.isArray(item.image)
              ? item.image[0]
              : typeof item.image === "object"
              ? item.image.url
              : item.image;
            if (img && typeof img === "string" && !result.image) {
              result.image = img.trim();
            }
          }

          // Offers & Price
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offer && typeof offer === "object") {
              const offerPrice = Number(offer.price || offer.lowPrice || offer.highPrice);
              if (!isNaN(offerPrice) && offerPrice > 0 && !result.price) {
                result.price = Math.round(offerPrice);
              }
              if (offer.priceCurrency && !result.currency) {
                result.currency = String(offer.priceCurrency).trim();
              }
            }
          }
        }
      }
    } catch {
      // Continue search across other json-ld tags
    }
  }

  // Helper for meta tags
  const getMetaTag = (propertyOrName: string): string | undefined => {
    const regex1 = new RegExp(
      `<meta\\b[^>]*(?:property|name)=["']${propertyOrName}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return match1[1].trim();

    const regex2 = new RegExp(
      `<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${propertyOrName}["']`,
      "i"
    );
    const match2 = html.match(regex2);
    if (match2 && match2[1]) return match2[1].trim();

    return undefined;
  };

  // 2. OPEN GRAPH & TWITTER CARDS (og:title, twitter:title, <title>)
  if (!result.title) {
    const ogTitle = getMetaTag("og:title") || getMetaTag("twitter:title");
    if (ogTitle) {
      result.title = ogTitle;
    } else {
      const titleTagMatch = html.match(/<title\b[^>]*>([^<]+)<\/title>/i);
      if (titleTagMatch && titleTagMatch[1]) {
        result.title = titleTagMatch[1].trim();
      }
    }
  }

  // Clean title suffix noise
  if (result.title) {
    result.title = cleanProductTitle(result.title, parsedUrl.retailerName);
  }

  // 3. OPEN GRAPH & TWITTER IMAGES (og:image, twitter:image)
  if (!result.image) {
    const ogImage =
      getMetaTag("og:image") ||
      getMetaTag("og:image:secure_url") ||
      getMetaTag("twitter:image") ||
      getMetaTag("twitter:image:src");
    if (ogImage) {
      result.image = ogImage;
    } else {
      const linkMatch = html.match(/<link\b[^>]*rel=["']image_src["'][^>]*href=["']([^"']*)["']/i);
      if (linkMatch && linkMatch[1]) {
        result.image = linkMatch[1].trim();
      }
    }
  }

  // 4. DESCRIPTIONS
  if (!result.description) {
    const ogDesc =
      getMetaTag("og:description") ||
      getMetaTag("description") ||
      getMetaTag("twitter:description");
    if (ogDesc) {
      result.description = ogDesc;
    }
  }

  // 5. PRICES (og:price:amount, product:price:amount, itemprop="price")
  if (!result.price) {
    const priceStr =
      getMetaTag("og:price:amount") ||
      getMetaTag("product:price:amount") ||
      getMetaTag("price") ||
      getMetaTag("product:price") ||
      getMetaTag("priceAmount");

    if (priceStr) {
      const cleaned = priceStr.replace(/[^0-9.]/g, "");
      const num = Number(cleaned);
      if (!isNaN(num) && num > 0) {
        result.price = Math.round(num);
      }
    }
  }

  if (!result.price) {
    const itempropPriceMatch =
      html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i);
    if (itempropPriceMatch && itempropPriceMatch[1]) {
      const num = Number(itempropPriceMatch[1].replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        result.price = Math.round(num);
      }
    }
  }

  return result;
}

/**
 * Fallback to public metadata scraper via api.microlink.io when direct scraping is blocked or incomplete.
 */
export async function fetchMicrolinkFallback(
  targetUrl: string
): Promise<Partial<ExtractedProductMetadata> | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const json = await res.json();
    if (json?.status === "success" && json?.data) {
      const data = json.data;
      const title = data.title ? cleanProductTitle(data.title) : undefined;
      const image = data.image?.url || data.logo?.url || undefined;
      const description = data.description || undefined;
      const brand = data.publisher || data.author || undefined;

      return {
        title,
        image,
        description,
        brand,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Upgraded metadata fetcher with direct HTML parsing + Microlink public scraper fallback.
 */
export async function fetchProductMetadata(
  rawUrl: string
): Promise<ExtractedProductMetadata> {
  const parsed = parseRetailerUrl(rawUrl);

  const baseResult: ExtractedProductMetadata = {
    success: parsed.isValid,
    rawUrl: parsed.rawUrl,
    cleanUrl: parsed.cleanUrl,
    domain: parsed.domain,
    store: parsed.retailerName,
    sku: parsed.productId,
    isFetched: false,
  };

  if (!parsed.isValid) {
    return {
      ...baseResult,
      success: false,
      message: parsed.error || "Invalid URL",
    };
  }

  let html: string | null = null;
  let isBlocked = false;

  // 1. Direct HTML fetch with browser headers
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(parsed.cleanUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (response.status === 403 || response.status === 429 || response.status === 503) {
      isBlocked = true;
    } else if (response.ok) {
      html = await response.text();
      // Check for common CAPTCHA / Bot check pages
      if (
        html.includes("Robot Check") ||
        html.includes("cf-browser-verification") ||
        html.includes("Attention Required! | Cloudflare")
      ) {
        isBlocked = true;
      }
    }
  } catch {
    isBlocked = true;
  }

  let extracted: Partial<ExtractedProductMetadata> = {};

  if (html && !isBlocked) {
    extracted = parseHtmlMetadata(html, parsed);
  }

  // 2. Fallback to api.microlink.io if blocked or missing critical fields (image / title)
  if (isBlocked || !extracted.image || !extracted.title) {
    const fallback = await fetchMicrolinkFallback(parsed.cleanUrl);
    if (fallback) {
      if (!extracted.title && fallback.title) extracted.title = fallback.title;
      if (!extracted.image && fallback.image) extracted.image = fallback.image;
      if (!extracted.description && fallback.description) extracted.description = fallback.description;
      if (!extracted.brand && fallback.brand) extracted.brand = fallback.brand;
    }
  }

  const isFetched = Boolean(extracted.title || extracted.image || extracted.price);

  return {
    ...baseResult,
    ...extracted,
    isFetched,
    message: isFetched
      ? "Product details extracted successfully."
      : "Store verified. Please fill in or confirm missing details manually.",
  };
}

// Aliases for backwards compatibility
export const fetchRemoteProductMetadata = fetchProductMetadata;
export const fetchMetadata = fetchProductMetadata;
