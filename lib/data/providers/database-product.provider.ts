import type { ProductProvider } from "../provider.interface.ts";
import { createProduct, type Product, type ProductFilterOptions, type StoreOffer } from "../types.ts";
import { createAdminSupabaseClient } from "../../supabase/admin.ts";
import { tagProductAmazonOffers } from "../../affiliate/amazon.ts";

// In-memory fallback store for development or testing
const inMemoryAdminProducts = new Map<string, { product: Product; status: string }>();

let globalDbCache: Product[] | null = null;
let globalDbCacheTimestamp: number = 0;

export function invalidateDatabaseProductCache(): void {
  globalDbCache = null;
  globalDbCacheTimestamp = 0;
}

/**
 * Helper to register in-memory admin products during tests or offline mode
 */
export function registerInMemoryAdminProduct(product: Product, status: string = "published"): void {
  inMemoryAdminProducts.set(product.id, { product, status });
  invalidateDatabaseProductCache();
}

export function clearInMemoryAdminProducts(): void {
  inMemoryAdminProducts.clear();
  invalidateDatabaseProductCache();
}

/**
 * DatabaseProductProvider
 *
 * Implements ProductProvider to serve admin-created products from Supabase.
 * Strictly filters by `status = 'published'` for public access.
 */
export class DatabaseProductProvider implements ProductProvider {
  readonly providerId = "database-product-provider";
  readonly name = "Database Admin Product Provider";

  private readonly CACHE_TTL_MS = 60 * 1000; // 1-minute in-memory cache

  /**
   * Fetches all published admin products from database or fallback store.
   */
  async getProducts(): Promise<Product[]> {
    const now = Date.now();
    if (globalDbCache && now - globalDbCacheTimestamp < this.CACHE_TTL_MS) {
      return globalDbCache;
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      const memoryItems = Array.from(inMemoryAdminProducts.values())
        .filter((item) => item.status === "published")
        .map((item) => item.product);
      globalDbCache = memoryItems;
      globalDbCacheTimestamp = now;
      return memoryItems;
    }

    try {
      const { data: rawProducts, error: prodError } = await supabase
        .from("admin_products")
        .select(`
          id,
          name,
          brand,
          category,
          description,
          image,
          images,
          rating,
          reviews,
          trust_score,
          status,
          admin_product_offers (
            id,
            store,
            price,
            original_price,
            currency,
            url,
            affiliate_url,
            availability,
            last_updated
          )
        `)
        .eq("status", "published");

      if (prodError || !rawProducts) {
        console.warn("[DatabaseProductProvider] Error fetching published products:", prodError?.message);
        return Array.from(inMemoryAdminProducts.values())
          .filter((item) => item.status === "published")
          .map((item) => item.product);
      }

      const products: Product[] = rawProducts.map((p: any) => {
        const offers: StoreOffer[] = (p.admin_product_offers || []).map((o: any) => ({
          store: o.store,
          price: Number(o.price),
          originalPrice: o.original_price ? Number(o.original_price) : undefined,
          currency: o.currency || "INR",
          url: o.url,
          affiliateUrl: o.affiliate_url || undefined,
          availability: o.availability !== false,
          lastUpdated: o.last_updated,
        }));

        const rawProd = createProduct({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          description: p.description || "",
          image: p.image,
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image],
          rating: Number(p.rating) || 0,
          reviews: Number(p.reviews) || 0,
          trustScore: Number(p.trust_score) || 0,
          offers,
          priceHistory: offers[0]
            ? [
                {
                  month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
                  price: offers[0].price,
                  date: new Date().toISOString().split("T")[0],
                },
              ]
            : [],
        });

        return tagProductAmazonOffers(rawProd);
      });

      // Merge with in-memory published products if any exist
      const memoryItems = Array.from(inMemoryAdminProducts.values())
        .filter((item) => item.status === "published")
        .map((item) => item.product);

      const combinedMap = new Map<string, Product>();
      for (const prod of [...products, ...memoryItems]) {
        combinedMap.set(prod.id, prod);
      }

      const finalProducts = Array.from(combinedMap.values());
      globalDbCache = finalProducts;
      globalDbCacheTimestamp = now;
      return finalProducts;
    } catch (err) {
      console.warn("[DatabaseProductProvider] Exception in getProducts:", err);
      return [];
    }
  }

  /**
   * Fetches a single published admin product by unique ID.
   */
  async getProductById(id: string): Promise<Product | undefined> {
    if (!id) return undefined;

    // Check in-memory store
    const mem = inMemoryAdminProducts.get(id);
    if (mem && mem.status === "published") {
      return mem.product;
    }

    const all = await this.getProducts();
    return all.find((p) => p.id === id);
  }

  /**
   * Fetches products by category.
   */
  async getProductsByCategory(category: string): Promise<Product[]> {
    if (!category) return this.getProducts();
    const normalized = category.trim().toLowerCase();
    const all = await this.getProducts();
    return all.filter((p) => p.category.toLowerCase() === normalized);
  }

  /**
   * Fetches products by brand.
   */
  async getProductsByBrand(brand: string): Promise<Product[]> {
    if (!brand) return this.getProducts();
    const normalized = brand.trim().toLowerCase();
    const all = await this.getProducts();
    return all.filter((p) => p.brand.toLowerCase() === normalized);
  }

  /**
   * Search published admin products matching query and filters.
   */
  async searchProducts(query?: string, options?: ProductFilterOptions): Promise<Product[]> {
    let results = await this.getProducts();

    if (query && query.trim().length > 0) {
      const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      results = results.filter((p) => {
        const text = `${p.name} ${p.brand} ${p.description} ${p.category}`.toLowerCase();
        return searchTerms.every((term) => text.includes(term));
      });
    }

    if (options?.category) {
      const cat = options.category.toLowerCase();
      results = results.filter((p) => p.category.toLowerCase() === cat);
    }

    if (options?.brand) {
      const b = options.brand.toLowerCase();
      results = results.filter((p) => p.brand.toLowerCase() === b);
    }

    if (options?.minPrice !== undefined) {
      results = results.filter((p) => p.bestDeal.price >= options.minPrice!);
    }

    if (options?.maxPrice !== undefined) {
      results = results.filter((p) => p.bestDeal.price <= options.maxPrice!);
    }

    return results;
  }

  /**
   * Invalidate in-memory cache upon admin mutations.
   */
  public invalidateCache(): void {
    invalidateDatabaseProductCache();
  }
}
