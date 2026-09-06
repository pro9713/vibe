import { NextRequest, NextResponse } from "next/server";
import { getQuickCommerceClient } from "@/lib/quickcommerce/client";
import { normalizeQuickCommerceProductList } from "@/lib/quickcommerce/normalizer";
import {
  validatePlatform,
  QuickCommerceError,
  QuickCommerceAuthError,
  QuickCommerceCreditsExhaustedError,
  QuickCommerceRateLimitError,
  QuickCommerceValidationError,
  SUPPORTED_PLATFORMS,
} from "@/lib/quickcommerce/types";

import {
  buildLiveSearchCacheKey,
  getCachedLiveSearch,
  setCachedLiveSearch,
  getInFlightLiveSearch,
  setInFlightLiveSearch,
} from "@/lib/quickcommerce/live-product-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/quickcommerce/search
 *
 * Query Parameters:
 * - q (required): Search keyword string
 * - lat (required): Latitude (-90 to 90)
 * - lon (required): Longitude (-180 to 180)
 * - platform (required): One of the supported platforms
 * - pincode (optional): 6-digit postal code
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const platformParam = searchParams.get("platform");
    const pincode = searchParams.get("pincode") || undefined;

    // 1. Validate 'q'
    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Missing required parameter 'q'.",
          details: "Search keyword cannot be empty.",
        },
        { status: 400 }
      );
    }

    // 2. Validate location (Pincode or Coordinates with Mumbai fallback)
    let lat = 19.0760;
    let lon = 72.8777;

    if (latParam !== null && lonParam !== null) {
      const parsedLat = Number(latParam);
      const parsedLon = Number(lonParam);

      if (isNaN(parsedLat) || isNaN(parsedLon) || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
        return NextResponse.json(
          {
            error: "Invalid coordinate values.",
            details: "Latitude must be a number between -90 and 90, and longitude between -180 and 180.",
          },
          { status: 400 }
        );
      }

      lat = parsedLat;
      lon = parsedLon;
    }

    // 3. Validate 'platform'
    const platformToUse = platformParam || "BlinkIt";
    const validatedPlatform = validatePlatform(platformToUse);

    if (!validatedPlatform) {
      return NextResponse.json(
        {
          error: `Unsupported platform: "${platformToUse}".`,
          details: `Allowed platforms: ${SUPPORTED_PLATFORMS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 4. Check Server-side 15-Minute Live Cache (Credit Protection)
    const cacheKey = buildLiveSearchCacheKey({
      query: q.trim(),
      lat,
      lon,
      pincode: pincode?.trim(),
      platform: validatedPlatform,
    });

    const cachedProducts = getCachedLiveSearch(cacheKey);
    if (cachedProducts) {
      return NextResponse.json(
        {
          success: true,
          query: q.trim(),
          platform: validatedPlatform,
          location: { lat, lon, pincode: pincode || null },
          count: cachedProducts.length,
          products: cachedProducts,
          cached: true,
          meta: {
            requestId: "cached",
            creditsRemaining: null,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
          },
        }
      );
    }

    // 5. In-flight request deduplication
    let searchPromise = getInFlightLiveSearch(cacheKey);
    if (!searchPromise) {
      searchPromise = (async () => {
        const client = getQuickCommerceClient();
        const searchResult = await client.search({
          q: q.trim(),
          lat,
          lon,
          platform: validatedPlatform,
          pincode: pincode?.trim(),
        });

        const normalized = normalizeQuickCommerceProductList(
          searchResult.products,
          searchResult.platform
        );

        setCachedLiveSearch(cacheKey, normalized, validatedPlatform, q.trim());
        return normalized;
      })();
      setInFlightLiveSearch(cacheKey, searchPromise);
    }

    const normalizedProducts = await searchPromise;

    return NextResponse.json(
      {
        success: true,
        query: q.trim(),
        platform: validatedPlatform,
        location: { lat, lon, pincode: pincode || null },
        count: normalizedProducts.length,
        products: normalizedProducts,
        cached: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; statusCode?: number; requestId?: string | null };
    const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
    const message = err?.message || "An unexpected error occurred while processing QuickCommerce search.";
    const requestId = err?.requestId || null;

    // Log server diagnostic without revealing secrets
    console.error(`[QuickCommerce API Route Error] [${err?.name || "Error"}]:`, message);

    if (error instanceof QuickCommerceAuthError || err?.name === "QuickCommerceAuthError" || statusCode === 401) {
      return NextResponse.json(
        {
          error: "QuickCommerce Authentication Failed",
          message: "Server API key is missing or invalid. Check server QUICKCOMMERCE_API_KEY configuration.",
          requestId,
        },
        { status: 401 }
      );
    }

    if (error instanceof QuickCommerceCreditsExhaustedError || err?.name === "QuickCommerceCreditsExhaustedError" || statusCode === 402) {
      return NextResponse.json(
        {
          error: "QuickCommerce Credits Exhausted",
          message: "API credit quota has been exhausted (HTTP 402).",
          requestId,
        },
        { status: 402 }
      );
    }

    if (error instanceof QuickCommerceRateLimitError || err?.name === "QuickCommerceRateLimitError" || statusCode === 429) {
      return NextResponse.json(
        {
          error: "QuickCommerce Rate Limit Exceeded",
          message: "Too many requests to QuickCommerce API. Please retry shortly.",
          requestId,
        },
        { status: 429 }
      );
    }

    if (error instanceof QuickCommerceValidationError || err?.name === "QuickCommerceValidationError" || statusCode === 422) {
      return NextResponse.json(
        {
          error: "QuickCommerce Validation Error",
          message,
          requestId,
        },
        { status: 422 }
      );
    }

    if (error instanceof QuickCommerceError || err?.name === "QuickCommerceError" || (statusCode >= 400 && statusCode < 600)) {
      return NextResponse.json(
        {
          error: err?.name || "QuickCommerce Request Error",
          message,
          requestId,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing QuickCommerce search.",
      },
      { status: 500 }
    );
  }
}
