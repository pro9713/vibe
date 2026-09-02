import type { Product, Store, StoreOffer, ProductFilterOptions } from "./types";

/**
 * ProductProvider Interface
 *
 * Common contract for all product data sources (Local dataset, Retailer APIs,
 * Affiliate feeds, Headless CMS, or Database).
 *
 * Future retailer API integrations (e.g. Amazon PA-API, Flipkart Affiliate API,
 * Myntra Product Feed, or Multi-retailer Aggregator) will implement this interface.
 *
 * Architecture Flow:
 * [ LocalProductProvider / FutureRetailerApiProvider ]
 *                        ↓
 *             [ ProductProvider Interface ]
 *                        ↓
 *             [ Normalized Product & Offer Model ]
 *                        ↓
 *             [ Deal Engine & Search Parser ]
 *                        ↓
 *                   [ Frontend UI ]
 */
export interface ProductProvider {
  /** Unique identifier for the provider instance */
  readonly providerId: string;

  /** Human-readable name for logging/debugging */
  readonly name: string;

  /** Fetch all available products */
  getProducts(): Promise<Product[]>;

  /** Fetch a single product by unique ID/slug */
  getProductById(id: string): Promise<Product | undefined>;

  /** Fetch products filtered by category */
  getProductsByCategory(category: string): Promise<Product[]>;

  /** Fetch products filtered by brand */
  getProductsByBrand(brand: string): Promise<Product[]>;

  /**
   * Search and filter products matching query string and optional filter criteria
   */
  searchProducts(query?: string, options?: ProductFilterOptions): Promise<Product[]>;

  /** Optional: Fetch latest live offers for a specific product */
  getLiveOffers?(productId: string): Promise<StoreOffer[]>;
}

/**
 * StoreProvider Interface
 *
 * Contract for managing store metadata, trust scores, and affiliate configurations.
 */
export interface StoreProvider {
  /** Unique identifier for the provider instance */
  readonly providerId: string;

  /** Fetch all registered stores */
  getStores(): Promise<Store[]>;

  /** Fetch store details by unique ID */
  getStoreById(id: string): Promise<Store | undefined>;

  /** Fetch store details by store name (case-insensitive) */
  getStoreByName(name: string): Promise<Store | undefined>;
}
