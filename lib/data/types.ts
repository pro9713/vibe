/**
 * Core Data Types for Pricely Product & Store Provider Architecture.
 *
 * Designed to normalize multi-store retail data across local datasets,
 * affiliate feeds, and future direct retailer API integrations.
 */

export interface StoreOffer {
  store: string;
  price: number;
  originalPrice?: number;
  currency: string;
  url: string;
  affiliateUrl?: string;
  availability: boolean;
  lastUpdated?: string;
}

export type ProductPrice = StoreOffer;

export interface PriceHistoryItem {
  month?: string;
  price: number;
  date?: string;
  store?: string;
  productId?: string;
  source?: "local" | "quickcommerce" | "api";
  pincode?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  images?: string[];
  rating: number;
  reviews: number;
  trustScore: number;
  offers: StoreOffer[];
  priceHistory: PriceHistoryItem[];

  // Convenience accessors & backwards compatibility properties
  bestDeal: {
    store: string;
    price: number;
  };
  prices: StoreOffer[];
  history: PriceHistoryItem[];
}

export interface RawProductInput {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  images?: string[];
  rating: number;
  reviews: number;
  trustScore: number;
  offers: StoreOffer[];
  priceHistory: PriceHistoryItem[];
  bestDeal?: {
    store: string;
    price: number;
  };
}

export interface Store {
  id: string;
  name: string;
  trusted: boolean;
  trustScore: number;
  website?: string;
  logo?: string;
}

export interface ProductFilterOptions {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  store?: string;
  sortBy?: "default" | "best-value" | "low" | "high" | "price-low" | "price-high" | "rating" | "brand";
}

/**
 * Normalizes raw product input into a standard Product model with bestDeal convenience properties.
 */
export function createProduct(input: RawProductInput): Product {
  const availableOffers = input.offers.filter((o) => o.availability !== false);
  const bestOffer =
    availableOffers.length > 0
      ? availableOffers.reduce((best, curr) => (curr.price < best.price ? curr : best))
      : input.offers[0] || { store: "Unavailable", price: 0, currency: "INR", url: "#", availability: false };

  const history = input.priceHistory || [];

  return {
    ...input,
    rating: input.rating !== undefined ? Number(input.rating) : 0,
    reviews: input.reviews !== undefined ? Number(input.reviews) : 0,
    trustScore: input.trustScore !== undefined ? Number(input.trustScore) : 0,
    priceHistory: history,
    bestDeal: input.bestDeal || {
      store: bestOffer.store,
      price: bestOffer.price,
    },
    prices: input.offers,
    history,
  };
}
