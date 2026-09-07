/**
 * Product Metadata Extractor for Admin Hybrid Auto-Fetch Workflow.
 *
 * Extracts OpenGraph, Twitter Card, Schema.org JSON-LD, and Microdata
 * tags from retailer HTML with graceful fallback for anti-bot protections.
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

  // Strip common suffixes
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
 * Parses raw HTML and extracts metadata using regex / DOM pattern matching.
 */
export function parseHtmlMetadata(
  html: string,
  parsedUrl: ParsedRetailerUrl
): Partial<ExtractedProductMetadata> {
  const result: Partial<ExtractedProductMetadata> = {
    store: parsedUrl.retailerName,
    sku: parsedUrl.productId,
  };

  // 1. Extract JSON-LD Schemas
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
          if (item.name && !result.title) {
            result.title = String(item.name).trim();
          }
          if (item.description && !result.description) {
            result.description = String(item.description).trim();
          }
          if (item.sku && !result.sku) {
            result.sku = String(item.sku).trim();
          }
          if (item.brand) {
            const brandName = typeof item.brand === "object" ? item.brand.name : item.brand;
            if (brandName && !result.brand) {
              result.brand = String(brandName).trim();
            }
          }
          if (item.image) {
            const img = Array.isArray(item.image) ? item.image[0] : typeof item.image === "object" ? item.image.url : item.image;
            if (img && typeof img === "string" && !result.image) {
              result.image = img.trim();
            }
          }

          // Offers
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
      // Continue searching
    }
  }

  // 2. OpenGraph & Meta Tags Helper
  const getMetaTag = (propertyOrName: string): string | undefined => {
    // Escaped search for property or name
    const regex1 = new RegExp(`<meta\\b[^>]*(?:property|name)=["']${propertyOrName}["'][^>]*content=["']([^"']*)["']`, "i");
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return match1[1].trim();

    const regex2 = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${propertyOrName}["']`, "i");
    const match2 = html.match(regex2);
    if (match2 && match2[1]) return match2[1].trim();

    return undefined;
  };

  // 3. Extract OpenGraph & Twitter Card Titles
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

  // Clean title
  if (result.title) {
    result.title = cleanProductTitle(result.title, parsedUrl.retailerName);
  }

  // 4. Extract Images
  if (!result.image) {
    const ogImage =
      getMetaTag("og:image") ||
      getMetaTag("og:image:secure_url") ||
      getMetaTag("twitter:image") ||
      getMetaTag("twitter:image:src");
    if (ogImage) {
      result.image = ogImage;
    } else {
      // Try link rel="image_src"
      const linkMatch = html.match(/<link\b[^>]*rel=["']image_src["'][^>]*href=["']([^"']*)["']/i);
      if (linkMatch && linkMatch[1]) {
        result.image = linkMatch[1].trim();
      }
    }
  }

  // 5. Extract Descriptions
  if (!result.description) {
    const ogDesc = getMetaTag("og:description") || getMetaTag("description") || getMetaTag("twitter:description");
    if (ogDesc) {
      result.description = ogDesc;
    }
  }

  // 6. Extract Prices from OpenGraph / Microdata / Meta
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

  // Fallback microdata itemprop="price"
  if (!result.price) {
    const itempropPriceMatch = html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
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
 * Fetches retailer HTML with browser user-agent headers and extracts metadata.
 * Returns gracefully with parsed fallback details if fetch fails or is blocked.
 */
export async function fetchRemoteProductMetadata(
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

    if (!response.ok) {
      return {
        ...baseResult,
        isFetched: false,
        message: `HTTP ${response.status} from retailer. URL parsed successfully for manual entry.`,
      };
    }

    const html = await response.text();
    const extracted = parseHtmlMetadata(html, parsed);

    return {
      ...baseResult,
      ...extracted,
      isFetched: Boolean(extracted.title || extracted.image || extracted.price),
      message: extracted.title || extracted.image || extracted.price
        ? "Metadata extracted successfully."
        : "Store responded, but metadata tags were protected or minimal. Please review and fill in fields manually.",
    };
  } catch (err: any) {
    return {
      ...baseResult,
      isFetched: false,
      message:
        err?.name === "AbortError"
          ? "Retailer connection timed out. URL parsed successfully."
          : "Retailer connection restricted or offline. URL parsed successfully.",
    };
  }
}
