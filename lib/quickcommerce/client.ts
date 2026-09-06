import {
  type QuickCommerceSearchParams,
  type QuickCommerceClientResult,
  type QuickCommerceApiResponse,
  type QuickCommerceRawProduct,
  validatePlatform,
  QuickCommerceError,
  QuickCommerceAuthError,
  QuickCommerceCreditsExhaustedError,
  QuickCommerceRateLimitError,
  QuickCommerceValidationError,
} from "./types.ts";

const QUICKCOMMERCE_BASE_URL = "https://api.quickcommerceapi.com";
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Server-side QuickCommerce API Client
 *
 * CRITICAL SECURITY & CREDIT RULES:
 * - Runs server-side ONLY.
 * - API Key is retrieved exclusively from process.env.QUICKCOMMERCE_API_KEY.
 * - API Key is NEVER returned in response objects, logged, or exposed to the client.
 * - No aggressive automatic retries to avoid wasting paid API credits.
 */
export class QuickCommerceClient {
  private apiKey: string | null = null;
  private cacheTtlSeconds: number;

  constructor() {
    if (typeof window !== "undefined") {
      throw new Error("QuickCommerceClient must only be instantiated on the server.");
    }

    this.apiKey = process.env.QUICKCOMMERCE_API_KEY || null;

    const envCacheTtl = parseInt(process.env.QUICKCOMMERCE_CACHE_SECONDS || "60", 10);
    this.cacheTtlSeconds = isNaN(envCacheTtl) || envCacheTtl < 0 ? 60 : envCacheTtl;
  }

  private getApiKey(): string | null {
    return process.env.QUICKCOMMERCE_API_KEY?.trim() || this.apiKey?.trim() || null;
  }

  /**
   * Checks if a valid API key is configured.
   */
  public hasApiKey(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.length > 0);
  }

  /**
   * Search endpoint: GET /v1/search
   */
  public async search(params: QuickCommerceSearchParams): Promise<QuickCommerceClientResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new QuickCommerceAuthError(
        "QUICKCOMMERCE_API_KEY environment variable is not configured on the server."
      );
    }

    // Parameter validation
    const platform = validatePlatform(params.platform);
    if (!platform) {
      throw new QuickCommerceValidationError(
        `Invalid or unsupported platform: "${params.platform}". Supported platforms: BlinkIt, Zepto, Swiggy, BigBasket, DMart, JioMart, Minutes, Amazon, Nykaa, Myntra, Flipkart.`
      );
    }

    if (!params.q || params.q.trim().length === 0) {
      throw new QuickCommerceValidationError("Query parameter 'q' is required.");
    }

    const lat = Number(params.lat);
    const lon = Number(params.lon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new QuickCommerceValidationError(
        `Invalid coordinates: lat=${params.lat}, lon=${params.lon}. Latitude must be between -90 and 90, Longitude between -180 and 180.`
      );
    }

    // Build URL query params
    const query = new URLSearchParams({
      q: params.q.trim(),
      lat: String(lat),
      lon: String(lon),
      platform: platform,
    });

    if (params.pincode && params.pincode.trim().length > 0) {
      query.set("pincode", params.pincode.trim());
    }

    const endpointUrl = `${QUICKCOMMERCE_BASE_URL}/v1/search?${query.toString()}`;

    // Request timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          "Accept": "application/json",
          "User-Agent": "Pricely-App/1.0",
        },
        signal: controller.signal,
        next: {
          revalidate: this.cacheTtlSeconds,
        },
      });
    } catch (networkError: unknown) {
      clearTimeout(timeoutId);

      if (networkError instanceof Error && networkError.name === "AbortError") {
        throw new QuickCommerceError(
          `QuickCommerce API request timed out after ${DEFAULT_TIMEOUT_MS}ms.`,
          504
        );
      }

      throw new QuickCommerceError(
        `Network error connecting to QuickCommerce API: ${networkError instanceof Error ? networkError.message : "Unknown connection failure"}`,
        502
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const requestId = response.headers.get("x-request-id");
    const creditsRemaining = response.headers.get("x-credits-remaining");

    // Handle HTTP error responses safely
    if (!response.ok) {
      let errorMessage = `QuickCommerce API returned HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson === "object") {
          const msg = (errorJson as Record<string, unknown>).message || (errorJson as Record<string, unknown>).error;
          if (typeof msg === "string") {
            errorMessage = msg;
          }
        }
      } catch {
        // Response was not JSON
      }

      switch (response.status) {
        case 401:
          throw new QuickCommerceAuthError(errorMessage, requestId);
        case 402:
          throw new QuickCommerceCreditsExhaustedError(errorMessage, requestId);
        case 422:
          throw new QuickCommerceValidationError(errorMessage, requestId);
        case 429:
          throw new QuickCommerceRateLimitError(errorMessage, requestId);
        case 404:
          throw new QuickCommerceError(`Resource not found: ${errorMessage}`, 404, requestId, creditsRemaining);
        case 500:
        case 502:
        case 503:
        case 504:
          throw new QuickCommerceError(`QuickCommerce API server error (${response.status}): ${errorMessage}`, response.status, requestId, creditsRemaining);
        default:
          throw new QuickCommerceError(errorMessage, response.status, requestId, creditsRemaining);
      }
    }

    // Parse JSON
    let json: QuickCommerceApiResponse;
    try {
      json = await response.json();
    } catch {
      throw new QuickCommerceError("Failed to parse QuickCommerce API JSON response.", 502, requestId, creditsRemaining);
    }

    // Extract product list across supported JSON envelope patterns
    let rawList: QuickCommerceRawProduct[] = [];

    if (Array.isArray(json)) {
      rawList = json;
    } else if (Array.isArray(json.data)) {
      rawList = json.data;
    } else if (json.data && typeof json.data === "object") {
      if (Array.isArray(json.data.products)) {
        rawList = json.data.products;
      } else if (Array.isArray(json.data.items)) {
        rawList = json.data.items;
      }
    } else if (Array.isArray(json.products)) {
      rawList = json.products;
    } else if (Array.isArray(json.items)) {
      rawList = json.items;
    }

    return {
      products: rawList,
      platform,
      requestId,
      creditsRemaining,
    };
  }
}

// Global server client singleton
let clientInstance: QuickCommerceClient | null = null;

export function getQuickCommerceClient(): QuickCommerceClient {
  if (!clientInstance) {
    clientInstance = new QuickCommerceClient();
  }
  return clientInstance;
}
