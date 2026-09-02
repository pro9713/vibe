import type { ProductProvider } from "../provider.interface";
import { createProduct, type Product, type ProductFilterOptions } from "../types";

/**
 * Local Product Dataset
 *
 * Seed dataset of fashion, shoes, watches, and men's apparel.
 */
export const LOCAL_PRODUCTS: Product[] = [
  createProduct({
    id: "air-max-270",
    name: "Air Max 270",
    brand: "Nike",
    category: "Shoes",
    description: "Lightweight running shoes with premium Max Air cushioning and breathable engineered mesh upper.",
    rating: 4.5,
    reviews: 1200,
    trustScore: 92,
    image: "/images/products/nike-air-max.png",
    images: ["/images/products/nike-air-max.png"],
    offers: [
      {
        store: "Amazon",
        price: 2499,
        originalPrice: 3499,
        currency: "INR",
        url: "https://www.amazon.in",
        affiliateUrl: "https://www.amazon.in?tag=pricelyindia-21",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Flipkart",
        price: 2549,
        originalPrice: 3499,
        currency: "INR",
        url: "https://www.flipkart.com",
        affiliateUrl: "https://www.flipkart.com?affid=pricely",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Myntra",
        price: 2599,
        originalPrice: 3499,
        currency: "INR",
        url: "https://www.myntra.com",
        affiliateUrl: "https://www.myntra.com",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "AJIO",
        price: 2699,
        originalPrice: 3499,
        currency: "INR",
        url: "https://www.ajio.com",
        affiliateUrl: "https://www.ajio.com",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
    ],
    priceHistory: [
      { month: "May 2026", price: 3199 },
      { month: "June 2026", price: 2999 },
      { month: "July 2026", price: 2799 },
      { month: "August 2026", price: 2499 },
    ],
  }),

  createProduct({
    id: "rs-x-sneakers",
    name: "RS-X Sneakers",
    brand: "Puma",
    category: "Shoes",
    description: "Bold lifestyle sneakers with retro running silhouette, chunky aesthetic, and superior PU midsole comfort.",
    rating: 4.4,
    reviews: 850,
    trustScore: 89,
    image: "/images/products/adidas-ultraboost.jpg",
    images: ["/images/products/adidas-ultraboost.jpg"],
    offers: [
      {
        store: "Myntra",
        price: 1899,
        originalPrice: 2999,
        currency: "INR",
        url: "https://www.myntra.com",
        affiliateUrl: "https://www.myntra.com",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Amazon",
        price: 1999,
        originalPrice: 2999,
        currency: "INR",
        url: "https://www.amazon.in",
        affiliateUrl: "https://www.amazon.in?tag=pricelyindia-21",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "AJIO",
        price: 2099,
        originalPrice: 2999,
        currency: "INR",
        url: "https://www.ajio.com",
        affiliateUrl: "https://www.ajio.com",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Flipkart",
        price: 2199,
        originalPrice: 2999,
        currency: "INR",
        url: "https://www.flipkart.com",
        affiliateUrl: "https://www.flipkart.com?affid=pricely",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
    ],
    priceHistory: [
      { month: "May 2026", price: 2499 },
      { month: "June 2026", price: 2299 },
      { month: "July 2026", price: 2199 },
      { month: "August 2026", price: 1899 },
    ],
  }),

  createProduct({
    id: "501-jeans",
    name: "501 Jeans",
    brand: "Levi's",
    category: "Men",
    description: "Classic straight-fit denim jeans crafted from non-stretch heavyweight denim with iconic button fly.",
    rating: 4.6,
    reviews: 2100,
    trustScore: 95,
    image: "/images/products/levis-501.jpg",
    images: ["/images/products/levis-501.jpg"],
    offers: [
      {
        store: "AJIO",
        price: 1499,
        originalPrice: 2599,
        currency: "INR",
        url: "https://www.ajio.com",
        affiliateUrl: "https://www.ajio.com",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Amazon",
        price: 1499,
        originalPrice: 2599,
        currency: "INR",
        url: "https://www.amazon.in/Levis-Mens-Slim-Jeans-A7087-0093_Blue/dp/B0C6QW8T95",
        affiliateUrl: "https://www.amazon.in/Levis-Mens-Slim-Jeans-A7087-0093_Blue/dp/B0C6QW8T95?tag=pricelyindia-21",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Flipkart",
        price: 1699,
        originalPrice: 2599,
        currency: "INR",
        url: "https://www.flipkart.com",
        affiliateUrl: "https://www.flipkart.com?affid=pricely",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
    ],
    priceHistory: [
      { month: "May 2026", price: 1899 },
      { month: "June 2026", price: 1799 },
      { month: "July 2026", price: 1599 },
      { month: "August 2026", price: 1499 },
    ],
  }),

  createProduct({
    id: "vintage-watch",
    name: "Vintage Watch",
    brand: "Casio",
    category: "Watches",
    description: "Digital wristwatch with timeless retro stainless steel bracelet, LED backlight, and daily alarm.",
    rating: 4.3,
    reviews: 620,
    trustScore: 87,
    image: "/images/products/casio-watch.jpg",
    images: ["/images/products/casio-watch.jpg"],
    offers: [
      {
        store: "Flipkart",
        price: 2999,
        originalPrice: 3995,
        currency: "INR",
        url: "https://www.flipkart.com",
        affiliateUrl: "https://www.flipkart.com?affid=pricely",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
      {
        store: "Amazon",
        price: 3199,
        originalPrice: 3995,
        currency: "INR",
        url: "https://www.amazon.in",
        affiliateUrl: "https://www.amazon.in?tag=pricelyindia-21",
        availability: true,
        lastUpdated: "2026-08-30T18:00:00Z",
      },
    ],
    priceHistory: [
      { month: "May 2026", price: 3499 },
      { month: "June 2026", price: 3299 },
      { month: "July 2026", price: 2999 },
      { month: "August 2026", price: 2499 },
    ],
  }),
];

/**
 * LocalProductProvider
 *
 * Implements ProductProvider interface using the curated local product dataset.
 * Serves as both the default active provider and the architectural reference for
 * future live API providers.
 */
export class LocalProductProvider implements ProductProvider {
  readonly providerId = "local-product-provider";
  readonly name = "Local Product Catalog";

  private products: Product[];

  constructor(customProducts?: Product[]) {
    this.products = customProducts || LOCAL_PRODUCTS;
  }

  async getProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    if (!id) return undefined;
    return this.products.find((p) => p.id === id);
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
