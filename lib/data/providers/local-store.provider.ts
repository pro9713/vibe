import type { StoreProvider } from "../provider.interface";
import type { Store } from "../types";

/**
 * Verified Retail Stores Dataset.
 *
 * Current trusted retailer trust scores:
 * - Myntra: 94
 * - Amazon: 92
 * - AJIO: 91
 * - Flipkart: 89
 */
export const LOCAL_TRUSTED_STORES: Store[] = [
  {
    id: "myntra",
    name: "Myntra",
    trusted: true,
    trustScore: 94,
    website: "https://www.myntra.com",
  },
  {
    id: "amazon-in",
    name: "Amazon",
    trusted: true,
    trustScore: 92,
    website: "https://www.amazon.in",
  },
  {
    id: "ajio",
    name: "AJIO",
    trusted: true,
    trustScore: 91,
    website: "https://www.ajio.com",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    trusted: true,
    trustScore: 89,
    website: "https://www.flipkart.com",
  },
];

/**
 * LocalStoreProvider
 *
 * Default StoreProvider implementation backed by the verified local store dataset.
 * Future dynamic store providers (e.g. database-driven or remote config) can implement
 * StoreProvider similarly.
 */
export class LocalStoreProvider implements StoreProvider {
  readonly providerId = "local-store-provider";

  private stores: Store[];

  constructor(customStores?: Store[]) {
    this.stores = customStores || LOCAL_TRUSTED_STORES;
  }

  async getStores(): Promise<Store[]> {
    return this.stores;
  }

  async getStoreById(id: string): Promise<Store | undefined> {
    if (!id) return undefined;
    return this.stores.find((s) => s.id === id);
  }

  async getStoreByName(name: string): Promise<Store | undefined> {
    if (!name) return undefined;
    const normalized = name.trim().toLowerCase();
    return this.stores.find((s) => s.name.toLowerCase() === normalized);
  }

  // Synchronous convenience helpers
  getStoresSync(): Store[] {
    return this.stores;
  }

  getStoreByNameSync(name: string): Store | undefined {
    if (!name) return undefined;
    const normalized = name.trim().toLowerCase();
    return this.stores.find((s) => s.name.toLowerCase() === normalized);
  }
}
