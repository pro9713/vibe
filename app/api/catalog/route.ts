import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/catalog/resolver";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getPublicCatalog();

    return NextResponse.json(
      {
        products,
        total: products.length,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Failed to load public catalog",
        products: [],
      },
      { status: 500 }
    );
  }
}
