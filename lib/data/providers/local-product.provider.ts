import type { ProductProvider } from "../provider.interface.ts";
import type { Product, ProductFilterOptions } from "../types.ts";
import { CATALOG_PRODUCTS } from "./catalog-data.ts";
import { DatabaseProductProvider } from "./database-product.provider.ts";
import { getCachedLiveProduct } from "../../quickcommerce/live-product-cache.ts";

export { CATALOG_PRODUCTS };

/**
 * Local Product Dataset
 *
 * Curated dataset of 52 verified products across Shoes, Men, Women, Watches, Bags, and Beauty.
 */
export const LOCAL_PRODUCTS: Product[] = CATALOG_PRODUCTS;

const databaseProvider = new DatabaseProductProvider();

/**
 * LocalProductProvider
 *
 * Implements ProductProvider interface using the curated local product dataset.
 * Follows strict layered resolution:
 * 1. Existing 52 local products
 * 2. Published admin products from database
 * 3. Live qc-* cached products
 */
export class LocalProductProvider implements ProductProvider {
  readonly providerId = "local-product-provider";
  readonly name = "Local Product Catalog";

  private products: Product[];

  constructor(customProducts?: Product[]) {
    this.products = customProducts || LOCAL_PRODUCTS;
  }

  async getProducts(): Promise<Product[]> {
    const dbProducts = await databaseProvider.getProducts();
    if (dbProducts.length === 0) {
      return this.products;
    }
    const map = new Map<string, Product>();
    for (const p of this.products) {
      map.set(p.id, p);
    }
    for (const p of dbProducts) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    if (!id) return undefined;
    // 1. Existing 52 local products
    const localProduct = this.products.find((p) => p.id === id);
    if (localProduct) {
      return localProduct;
    }
    // 2. Published admin products from database
    const dbProduct = await databaseProvider.getProductById(id);
    if (dbProduct) {
      return dbProduct;
    }
    // 3. Live qc-* cached products
    const cachedLive = getCachedLiveProduct(id);
    if (cachedLive) {
      return cachedLive;
    }
    return undefined;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    if (!category) return this.products;
    const normalized = category.trim().toLowerCase();
    return this.products.filter((p) => p.category.toLowerCase() === normalized);
  }

  async getProductsByBrand(brand: string): Promise<Product[]> {
    if (!brand) return this.products;
    const normalized = brand.trim().toLowerCase();
    return this.products.filter((p) => p.brand.toLowerCase() === normalized);
  }

  async searchProducts(query?: string, options?: ProductFilterOptions): Promise<Product[]> {
    let results = [...this.products];

    if (query && query.trim().length > 0) {
      const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      results = results.filter((p) => {
        const text = `${p.name} ${p.brand} ${p.description} ${p.category}`.toLowerCase();
        return searchTerms.every((term) => text.includes(term));
      });
    }

    if (options?.category && options.category !== "all") {
      const cat = options.category.toLowerCase();
      results = results.filter((p) => p.category.toLowerCase() === cat);
    }

    if (options?.brand && options.brand !== "all") {
      const br = options.brand.toLowerCase();
      results = results.filter((p) => p.brand.toLowerCase() === br);
    }

    if (options?.minPrice !== undefined) {
      results = results.filter((p) => p.bestDeal.price >= options.minPrice!);
    }

    if (options?.maxPrice !== undefined) {
      results = results.filter((p) => p.bestDeal.price <= options.maxPrice!);
    }

    if (options?.store && options.store !== "all") {
      const storeName = options.store.toLowerCase();
      results = results.filter((p) =>
        p.offers.some((o) => o.store.toLowerCase() === storeName)
      );
    }

    if (options?.sortBy) {
      switch (options.sortBy) {
        case "low":
        case "price-low":
          results.sort((a, b) => a.bestDeal.price - b.bestDeal.price);
          break;
        case "high":
        case "price-high":
          results.sort((a, b) => b.bestDeal.price - a.bestDeal.price);
          break;
        case "rating":
          results.sort((a, b) => b.rating - a.rating);
          break;
        case "brand":
          results.sort((a, b) => a.brand.localeCompare(b.brand));
          break;
        case "best-value":
          results.sort((a, b) => {
            const scoreA = a.trustScore * 0.4 + a.rating * 10 * 0.3;
            const scoreB = b.trustScore * 0.4 + b.rating * 10 * 0.3;
            return scoreB - scoreA;
          });
          break;
      }
    }

    return results;
  }

  // Synchronous convenience methods
  getProductsSync(): Product[] {
    return this.products;
  }

  getProductByIdSync(id: string): Product | undefined {
    if (!id) return undefined;
    return this.products.find((p) => p.id === id);
  }
}
