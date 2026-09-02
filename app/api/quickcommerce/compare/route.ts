import { NextRequest, NextResponse } from "next/server";
import { compareProductOffers } from "@/lib/quickcommerce/comparison";

export const dynamic = "force-dynamic";

/**
 * GET /api/quickcommerce/compare
 *
 * Query Parameters:
 * - productId (required): The product ID to compare
 * - pincode (optional): 6-digit user pincode
 * - lat (optional): Latitude coordinate
 * - lon (optional): Longitude coordinate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const pincode = searchParams.get("pincode") || undefined;
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    if (!productId || productId.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Missing required parameter 'productId'.",
        },
        { status: 400 }
      );
    }

    const lat = latParam ? Number(latParam) : undefined;
    const lon = lonParam ? Number(lonParam) : undefined;

    const result = await compareProductOffers({
      productId,
      pincode,
      lat,
      lon,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error: unknown) {
    console.error("[API Compare Error]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to compare live prices.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
