import {
  getProducts as fetchProducts,
  getProductById as fetchProductById,
  type Product,
  type StoreOffer,
  type PriceHistoryItem,
} from "@/lib/data";
import { getBestTrustedDeal, analyzeDeals } from "@/data/dealEngine";

export type { Product, StoreOffer, PriceHistoryItem };

export function calculateDiscount(
  originalPrice: number,
  price: number
): number {
  if (originalPrice <= 0 || price >= originalPrice) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Returns all active products in the system via the active ProductProvider.
 */
export async function getProducts(): Promise<Product[]> {
  return fetchProducts();
}

/**
 * Returns a single product by ID with computed deal intelligence via the active ProductProvider.
 */
export async function getProductWithDeals(id: string) {
  const product = await fetchProductById(id);
  if (!product) return null;

  const bestTrusted = getBestTrustedDeal(product.offers);
  const analysis = analyzeDeals(product.offers);

  return {
    product,
    bestTrusted,
    analysis,
  };
}