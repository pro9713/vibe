import type { ProductProvider } from "../provider.interface.ts";
import type { Product, ProductFilterOptions, StoreOffer } from "../types.ts";
import { LocalProductProvider } from "./local-product.provider.ts";
import { type SupportedPlatform, validatePlatform } from "../../quickcommerce/types.ts";
import { normalizeQuickCommerceProductList } from "../../quickcommerce/normalizer.ts";
import { parseSearchQuery } from "../../searchParser.ts";
import { rankProducts } from "../../search/relevance.ts";
import { DEFAULT_SEARCH_LOCATION } from "../../search/searchEngine.ts";
import {
  getCachedLiveProduct,
  setCachedLiveProduct,
} from "../../quickcommerce/live-product-cache.ts";

export interface QuickCommerceProviderConfig {
  defaultLocation?: {
    lat: number;
    lon: number;
    pincode?: string;
  };
  defaultPlatform?: SupportedPlatform;
  fallbackToLocalOnError?: boolean;
}

/**
 * QuickCommerceProductProvider
 *
 * Live ProductProvider implementation connecting to QuickCommerce API.
 *
 * ARCHITECTURAL FLOW:
 * - Server context: Executes requests via server-side QuickCommerceClient.
 * - Browser context: Requests route through internal API proxy `/api/quickcommerce/search`.
 * - Error resilience: Automatically falls back to LocalProductProvider if API key is missing
 *   or remote server is unreachable, guaranteeing the UI never breaks.
 */
export class QuickCommerceProductProvider implements ProductProvider {
  readonly providerId = "quickcommerce-product-provider";
  readonly name = "QuickCommerce Live Provider";

  private fallbackProvider: LocalProductProvider;
  private config: QuickCommerceProviderConfig;
  private cachedProducts: Map<string, Product> = new Map();

  constructor(config?: QuickCommerceProviderConfig) {
    this.fallbackProvider = new LocalProductProvider();
    this.config = {
      defaultPlatform: "BlinkIt",
      fallbackToLocalOnError: true,
      ...config,
    };
  }

  /**
   * Configure runtime search location
   */
  public setLocation(lat: number, lon: number, pincode?: string): void {
    this.config.defaultLocation = { lat, lon, pincode };
  }

  /**
   * Set default platform
   */
  public setPlatform(platform: string): void {
    const validated = validatePlatform(platform);
    if (validated) {
      this.config.defaultPlatform = validated;
    }
  }

  /**
   * Fetch all active products
   */
  async getProducts(): Promise<Product[]> {
    if (this.cachedProducts.size > 0) {
      return Array.from(this.cachedProducts.values());
    }

    // Default to local catalog if no live query has been triggered
    return this.fallbackProvider.getProducts();
  }

  /**
   * Fetch product by ID
   */
  async getProductById(id: string): Promise<Product | undefined> {
    if (this.cachedProducts.has(id)) {
      return this.cachedProducts.get(id);
    }
    const cachedLive = getCachedLiveProduct(id);
    if (cachedLive) {
      return cachedLive;
    }
    return this.fallbackProvider.getProductById(id);
  }

  /**
   * Fetch products by category
   */
  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.searchProducts(category, { category });
  }

  /**
   * Fetch products by brand
   */
  async getProductsByBrand(brand: string): Promise<Product[]> {
    return this.searchProducts(brand, { brand });
  }

  /**
   * Execute live product search with search term, natural query parsing and filter constraints
   */
  async searchProducts(
    query?: string,
    options?: ProductFilterOptions
  ): Promise<Product[]> {
    const rawQuery = query || "";
    const parsed = parseSearchQuery(rawQuery);
    const searchTerm = (parsed.brand || parsed.category || parsed.searchText || rawQuery || options?.category || options?.brand || "shoes").trim();
    const platform = (options?.store && validatePlatform(options.store)) || this.config.defaultPlatform || "BlinkIt";
    const location = this.config.defaultLocation || DEFAULT_SEARCH_LOCATION;

    try {
      let normalizedProducts: Product[] = [];

      // Server execution
      if (typeof window === "undefined") {
        const { getQuickCommerceClient } = await import("@/lib/quickcommerce/client");
        const client = getQuickCommerceClient();

        if (!client.hasApiKey()) {
          if (this.config.fallbackToLocalOnError) {
            return this.fallbackProvider.searchProducts(query, options);
          }
          return [];
        }

        const result = await client.search({
          q: searchTerm,
          lat: location.lat,
          lon: location.lon,
          platform,
          pincode: location.pincode,
        });

        normalizedProducts = normalizeQuickCommerceProductList(result.products, result.platform);
      } else {
        // Browser execution: Call internal Next.js API proxy
        const queryParams = new URLSearchParams({
          q: searchTerm,
          lat: String(location.lat),
          lon: String(location.lon),
          platform,
        });

        if (location.pincode) {
          queryParams.set("pincode", location.pincode);
        }

        const response = await fetch(`/api/quickcommerce/search?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Internal QuickCommerce proxy returned HTTP ${response.status}`);
        }

        const data = await response.json();
        normalizedProducts = Array.isArray(data.products) ? data.products : [];
      }

      // Cache products in memory
      for (const prod of normalizedProducts) {
        this.cachedProducts.set(prod.id, prod);
      }

      // Combine with local products for hybrid discovery
      const candidatePool: Product[] = [...normalizedProducts, ...this.fallbackProvider.getProductsSync()];

      // Apply Smart Search V2 Hard Filtering and Relevance Ranking
      const filtered = rankProducts(candidatePool, parsed, {
        category: options?.category,
        brand: options?.brand,
        minPrice: options?.minPrice,
        maxPrice: options?.maxPrice,
        store: options?.store,
        sortBy: options?.sortBy,
      });

      return filtered.length > 0
        ? filtered
        : this.config.fallbackToLocalOnError
        ? this.fallbackProvider.searchProducts(query, options)
        : [];
    } catch (error) {
      console.warn("[QuickCommerceProductProvider] Live fetch failed, using local fallback:", error);
      if (this.config.fallbackToLocalOnError) {
        return this.fallbackProvider.searchProducts(query, options);
      }
      return [];
    }
  }

  /**
   * Fetch live multi-store comparison quotes for a specific product
   */
  async getLiveOffers(productId: string): Promise<StoreOffer[]> {
    try {
      if (typeof window === "undefined") {
        const { compareProductOffers } = await import("@/lib/quickcommerce/comparison");
        const location = this.config.defaultLocation || DEFAULT_SEARCH_LOCATION;
        const result = await compareProductOffers({
          productId,
          lat: location.lat,
          lon: location.lon,
          pincode: location.pincode,
        });
        return result.offers;
      } else {
        const location = this.config.defaultLocation || DEFAULT_SEARCH_LOCATION;
        const params = new URLSearchParams({
          productId,
          lat: String(location.lat),
          lon: String(location.lon),
        });
        if (location.pincode) {
          params.set("pincode", location.pincode);
        }

        const res = await fetch(`/api/quickcommerce/compare?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.offers)) {
            return data.offers;
          }
        }
      }
    } catch (err) {
      console.warn("[QuickCommerceProductProvider] Failed to fetch live offers, returning local:", err);
    }

    const product = await this.fallbackProvider.getProductById(productId);
    return product ? product.offers : [];
  }
}
