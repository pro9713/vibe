/**
 * Types and Platform Definitions for QuickCommerce API
 * Base URL: https://api.quickcommerceapi.com
 */

export const SUPPORTED_PLATFORMS = [
  "BlinkIt",
  "Zepto",
  "Swiggy",
  "BigBasket",
  "DMart",
  "JioMart",
  "Minutes",
  "Amazon",
  "Nykaa",
  "Myntra",
  "Flipkart",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

/**
 * Validates and standardizes platform input (case-insensitive)
 */
export function validatePlatform(input: string): SupportedPlatform | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  const match = SUPPORTED_PLATFORMS.find(
    (p) => p.toLowerCase() === normalized
  );
  return match || null;
}

export interface QuickCommerceSearchParams {
  q: string;
  lat: number | string;
  lon: number | string;
  platform: SupportedPlatform | string;
  pincode?: string;
}

/**
 * Raw product item returned by QuickCommerce API endpoints.
 * Handles flexible variations in casing / key names returned by different backend platforms.
 */
export interface QuickCommerceRawProduct {
  id?: string | number;
  product_id?: string | number;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  description?: string;
  image?: string;
  images?: string[];
  mrp?: number;
  price?: number;
  offer_price?: number;
  unit?: string;
  quantity?: string;
  deeplink?: string;
  url?: string;
  rating?: number;
  rating_count?: number;
  reviews_count?: number;
  inventory?: number | boolean;
  in_stock?: boolean;
  out_of_stock?: boolean;
  platform?: string;
  [key: string]: unknown;
}

export interface QuickCommerceApiResponse {
  success?: boolean;
  status?: string | number;
  message?: string;
  data?: QuickCommerceRawProduct[] | {
    products?: QuickCommerceRawProduct[];
    items?: QuickCommerceRawProduct[];
    [key: string]: unknown;
  };
  products?: QuickCommerceRawProduct[];
  items?: QuickCommerceRawProduct[];
  [key: string]: unknown;
}

export interface QuickCommerceClientResult {
  products: QuickCommerceRawProduct[];
  platform: SupportedPlatform;
  requestId: string | null;
  creditsRemaining: string | null;
  cached?: boolean;
}

/**
 * Custom Error Classes for QuickCommerce API
 */
export class QuickCommerceError extends Error {
  public statusCode: number;
  public requestId: string | null;
  public creditsRemaining: string | null;

  constructor(message: string, statusCode: number = 500, requestId: string | null = null, creditsRemaining: string | null = null) {
    super(message);
    this.name = "QuickCommerceError";
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.creditsRemaining = creditsRemaining;
  }
}

export class QuickCommerceAuthError extends QuickCommerceError {
  constructor(message: string = "QuickCommerce API key is invalid or missing", requestId: string | null = null) {
    super(message, 401, requestId);
    this.name = "QuickCommerceAuthError";
  }
}

export class QuickCommerceCreditsExhaustedError extends QuickCommerceError {
  constructor(message: string = "QuickCommerce API credit quota exhausted (402)", requestId: string | null = null) {
    super(message, 402, requestId);
    this.name = "QuickCommerceCreditsExhaustedError";
  }
}

export class QuickCommerceRateLimitError extends QuickCommerceError {
  constructor(message: string = "QuickCommerce API rate limit exceeded (429)", requestId: string | null = null) {
    super(message, 429, requestId);
    this.name = "QuickCommerceRateLimitError";
  }
}

export class QuickCommerceValidationError extends QuickCommerceError {
  constructor(message: string, requestId: string | null = null) {
    super(message, 422, requestId);
    this.name = "QuickCommerceValidationError";
  }
}
