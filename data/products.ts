import {
  LOCAL_PRODUCTS,
  createProduct,
  type Product,
  type StoreOffer,
  type ProductPrice,
  type PriceHistoryItem,
  type RawProductInput,
  type ProductFilterOptions,
} from "../lib/data/index.ts";

export type {
  Product,
  StoreOffer,
  ProductPrice,
  PriceHistoryItem,
  RawProductInput,
  ProductFilterOptions,
};

export { createProduct };

/**
 * Active in-memory products array, referencing the local product provider dataset.
 */
export const products: Product[] = LOCAL_PRODUCTS;

/**
 * Helper to fetch a product by its unique slug/ID.
 */
export function getProductById(id: string): Product | undefined {
  if (!id) return undefined;
  return products.find((p) => p.id === id);
}

/**
 * Helper to get all products.
 */
export function getAllProducts(): Product[] {
  return products;
}

/**
 * Helper to get products filtered by category.
 */
export function getProductsByCategory(category: string): Product[] {
  if (!category) return products;
  const normalized = category.trim().toLowerCase();
  return products.filter((p) => p.category.toLowerCase() === normalized);
}

/**
 * Helper to get products filtered by brand.
 */
export function getProductsByBrand(brand: string): Product[] {
  if (!brand) return products;
  const normalized = brand.trim().toLowerCase();
  return products.filter((p) => p.brand.toLowerCase() === normalized);
}