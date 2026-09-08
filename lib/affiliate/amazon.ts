import type { Product, StoreOffer } from "../data/types";

/**
 * Validates whether a hostname belongs to Amazon.
 * Matches amazon.in, amazon.com, amzn.to, amzn.in, and international Amazon domains,
 * while preventing false matches on spoofed domains (e.g. notamazon.com or amazon.fake.org).
 */
export function isAmazonHost(hostname: string): boolean {
  if (!hostname) return false;
  const normalized = hostname.toLowerCase().trim();

  // Short Amazon link domains
  if (normalized === "amzn.to" || normalized.endsWith(".amzn.to")) return true;
  if (normalized === "amzn.in" || normalized.endsWith(".amzn.in")) return true;

  // Standard Amazon domains (e.g. amazon.in, www.amazon.in, amazon.com, www.amazon.co.uk)
  const amazonDomainRegex = /(^|\.)amazon\.(in|com|co\.uk|de|fr|es|it|ca|com\.au|co\.jp)$/i;
  return amazonDomainRegex.test(normalized);
}

/**
 * Checks whether a given string is a valid Amazon URL.
 */
export function isAmazonUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return isAmazonHost(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Retrieves the configured Amazon Associate tag from the server environment.
 * Never hardcodes the tag or uses insecure defaults.
 */
export function getAmazonAssociateTag(): string | undefined {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }
  const tag = process.env.AMAZON_ASSOCIATE_TAG?.trim();
  return tag || undefined;
}

/**
 * Converts an Amazon URL into an Amazon Associates Special Link using the associate tag.
 *
 * Rules:
 * 1. If the URL is NOT an Amazon URL (e.g. Flipkart, Myntra, AJIO), it is returned completely unchanged.
 * 2. Preserves the original protocol, host, pathname, hash, and all existing query parameters safely.
 * 3. Safely sets the `tag` parameter to the configured Amazon Associate Tag.
 * 4. If no tag is provided and none is in the environment, the original URL is preserved safely.
 */
export function buildAmazonAffiliateUrl(
  url: string | null | undefined,
  associateTag?: string
): string {
  if (!url || typeof url !== "string") {
    return url || "";
  }

  // If not an Amazon URL, do not modify
  if (!isAmazonUrl(url)) {
    return url;
  }

  const tag = (associateTag ?? getAmazonAssociateTag())?.trim();
  if (!tag) {
    return url;
  }

  try {
    const parsed = new URL(url);
    // Set or replace the associate tag parameter
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Builds an outbound redirect URL with affiliate tracking parameters (e.g. ?tag=...).
 */
export function buildAffiliateUrl(
  url: string | null | undefined,
  optionsOrTag?:
    | string
    | {
        store?: string;
        affiliateType?: string;
        affiliateParam?: string;
        affiliateValue?: string;
      }
): string {
  if (!url || typeof url !== "string") {
    return url || "";
  }

  if (typeof optionsOrTag === "string") {
    return buildAmazonAffiliateUrl(url, optionsOrTag);
  }

  if (!optionsOrTag) {
    return buildAmazonAffiliateUrl(url);
  }

  if (
    isAmazonUrl(url) ||
    optionsOrTag.affiliateType === "amazon_tag" ||
    optionsOrTag.store?.toLowerCase().includes("amazon")
  ) {
    const tag = optionsOrTag.affiliateValue || getAmazonAssociateTag();
    return buildAmazonAffiliateUrl(url, tag);
  }

  const paramKey = optionsOrTag.affiliateParam?.trim() || "tag";
  const paramVal = optionsOrTag.affiliateValue?.trim();

  if (paramVal) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set(paramKey, paramVal);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

/**
 * Checks whether an offer belongs to Amazon by store name or by URL.
 */
export function isAmazonOffer(offer: Pick<StoreOffer, "store"> & { url?: string }): boolean {
  if (!offer) return false;
  if (offer.store && offer.store.toLowerCase().trim() === "amazon") {
    return true;
  }
  return Boolean(offer.url && isAmazonUrl(offer.url));
}

/**
 * Converts a StoreOffer's Amazon URL to an Amazon Associates Special Link if the offer
 * belongs to Amazon. Non-Amazon store offers remain completely unmodified.
 */
export function tagAmazonOffer(offer: StoreOffer, associateTag?: string): StoreOffer {
  if (!offer) return offer;

  if (!isAmazonOffer(offer)) {
    // Non-Amazon store: preserve unchanged
    return { ...offer };
  }

  const targetUrl = offer.url || offer.affiliateUrl || "";
  if (!targetUrl) {
    return { ...offer };
  }

  const taggedUrl = buildAmazonAffiliateUrl(targetUrl, associateTag);
  return {
    ...offer,
    affiliateUrl: taggedUrl,
  };
}

/**
 * Batch-tags Amazon offers within an array of StoreOffers, leaving all other store offers untouched.
 */
export function tagAmazonOffers(offers: StoreOffer[], associateTag?: string): StoreOffer[] {
  if (!Array.isArray(offers)) return [];
  return offers.map((offer) => tagAmazonOffer(offer, associateTag));
}

/**
 * Attaches the Amazon Associate tag to all Amazon offers belonging to a product.
 */
export function tagProductAmazonOffers(product: Product, associateTag?: string): Product {
  if (!product) return product;

  const taggedOffers = tagAmazonOffers(product.offers, associateTag);

  return {
    ...product,
    offers: taggedOffers,
    prices: taggedOffers,
    bestDeal: product.bestDeal
      ? { ...product.bestDeal }
      : { store: taggedOffers[0]?.store || "", price: taggedOffers[0]?.price || 0 },
  };
}
