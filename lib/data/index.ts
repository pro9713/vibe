import { LocalProductProvider } from "./providers/local-product.provider.ts";
import { LocalStoreProvider } from "./providers/local-store.provider.ts";
import { QuickCommerceProductProvider } from "./providers/quickcommerce-product.provider.ts";
import type { ProductProvider, StoreProvider } from "./provider.interface.ts";
import type { Product, Store, StoreOffer, PriceHistoryItem, ProductFilterOptions } from "./types.ts";

// Re-export core types, interfaces and all provider implementations
export * from "./types.ts";
export * from "./provider.interface.ts";
export * from "./providers/local-product.provider.ts";
export * from "./providers/local-store.provider.ts";
export * from "./providers/quickcommerce-product.provider.ts";
export * from "./providers/database-product.provider.ts";

/**
 * ============================================================================
 * PRICELY DATA PROVIDER REGISTRY & CONFIGURATION
 * ============================================================================
 *
 * Provider Selection:
 * - Environment variable: process.env.DATA_PROVIDER
 * - Supported values: "local" (default) | "quickcommerce"
 * - If "quickcommerce" is chosen but key or location is absent, it seamlessly
 *   falls back to LocalProductProvider without throwing unhandled exceptions.
 */

function initializeProductProvider(): ProductProvider {
  const providerMode = (typeof process !== "undefined" && process.env?.DATA_PROVIDER) || "local";

  if (providerMode.toLowerCase() === "quickcommerce") {
    return new QuickCommerceProductProvider({
      fallbackToLocalOnError: true,
      defaultPlatform: "BlinkIt",
    });
  }

  return new LocalProductProvider();
}

// Global singletons for active providers
let activeProductProvider: ProductProvider = initializeProductProvider();
let activeStoreProvider: StoreProvider = new LocalStoreProvider();

/**
 * Get the currently registered ProductProvider.
 */
export function getProductProvider(): ProductProvider {
  return activeProductProvider;
}

/**
 * Configure / replace the active ProductProvider (e.g. during testing or runtime switching).
 */
export function setProductProvider(provider: ProductProvider): void {
  activeProductProvider = provider;
}

/**
 * Get the currently registered StoreProvider.
 */
export function getStoreProvider(): StoreProvider {
  return activeStoreProvider;
}

/**
 * Configure / replace the active StoreProvider.
 */
export function setStoreProvider(provider: StoreProvider): void {
  activeStoreProvider = provider;
}

/**
 * Unified Async Data Access Functions
 */
export async function getProducts(): Promise<Product[]> {
  return activeProductProvider.getProducts();
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return activeProductProvider.getProductById(id);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return activeProductProvider.getProductsByCategory(category);
}

export async function getProductsByBrand(brand: string): Promise<Product[]> {
  return activeProductProvider.getProductsByBrand(brand);
}

export async function searchProducts(
  query?: string,
  options?: ProductFilterOptions
): Promise<Product[]> {
  return activeProductProvider.searchProducts(query, options);
}

export async function getStores(): Promise<Store[]> {
  return activeStoreProvider.getStores();
}

export async function getStoreById(id: string): Promise<Store | undefined> {
  return activeStoreProvider.getStoreById(id);
}

export async function getStoreByName(name: string): Promise<Store | undefined> {
  return activeStoreProvider.getStoreByName(name);
}
