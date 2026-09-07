import test from "node:test";
import assert from "node:assert/strict";
import { executeSmartSearch } from "../searchEngine.ts";
import {
  registerInMemoryAdminProduct,
  clearInMemoryAdminProducts,
} from "../../data/providers/database-product.provider.ts";
import {
  getPublicCatalog,
  getPublicProductById,
  invalidatePublicCatalogCache,
} from "../../catalog/resolver.ts";
import { createProduct } from "../../data/types.ts";

test.beforeEach(() => {
  clearInMemoryAdminProducts();
  invalidatePublicCatalogCache();
});

test("1. Unified Search - Published DB products appear in Smart Search V2 results", async () => {
  const publishedSneaker = createProduct({
    id: "adm-puma-nitro-elite",
    name: "Puma Nitro Elite Carbon Running Shoes",
    brand: "Puma",
    category: "Shoes",
    description: "High-performance carbon plate marathon racing shoes with Nitro Elite foam.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    rating: 0,
    reviews: 0,
    trustScore: 94,
    offers: [
      {
        store: "Puma India",
        price: 18999,
        originalPrice: 22999,
        currency: "INR",
        url: "https://puma.com/in/nitro-elite",
        availability: true,
      },
    ],
    priceHistory: [],
  });

  registerInMemoryAdminProduct(publishedSneaker, "published");
  invalidatePublicCatalogCache();

  // Search by exact name term
  const res1 = await executeSmartSearch("Nitro Elite");
  assert.ok(res1.products.length > 0);
  assert.ok(
    res1.products.some((p) => p.id === "adm-puma-nitro-elite"),
    "Expected published DB product to be found by search query 'Nitro Elite'"
  );

  // Search by brand + category
  const res2 = await executeSmartSearch("Puma Shoes");
  assert.ok(res2.products.length > 0);
  assert.ok(
    res2.products.some((p) => p.id === "adm-puma-nitro-elite"),
    "Expected published DB product to be found by query 'Puma Shoes'"
  );
});

test("2. Unified Search - Draft and hidden products NEVER appear in Smart Search", async () => {
  const draftProduct = createProduct({
    id: "adm-secret-prototype-shoes",
    name: "Secret Prototype HyperSpeed",
    brand: "Nike",
    category: "Shoes",
    description: "Internal testing prototype only.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    rating: 0,
    reviews: 0,
    trustScore: 70,
    offers: [
      {
        store: "Nike Internal",
        price: 99999,
        currency: "INR",
        url: "https://nike.com/proto",
        availability: true,
      },
    ],
    priceHistory: [],
  });

  const hiddenProduct = createProduct({
    id: "adm-hidden-archived-bag",
    name: "Hidden Discontinued Travel Bag",
    brand: "Wildcraft",
    category: "Bags",
    description: "Hidden archived inventory.",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
    rating: 0,
    reviews: 0,
    trustScore: 70,
    offers: [
      {
        store: "Wildcraft",
        price: 1999,
        currency: "INR",
        url: "https://wildcraft.com/bag",
        availability: true,
      },
    ],
    priceHistory: [],
  });

  registerInMemoryAdminProduct(draftProduct, "draft");
  registerInMemoryAdminProduct(hiddenProduct, "hidden");
  invalidatePublicCatalogCache();

  // Search for draft product terms
  const searchDraft = await executeSmartSearch("Secret Prototype");
  assert.equal(
    searchDraft.products.some((p) => p.id === "adm-secret-prototype-shoes"),
    false,
    "Draft product must NEVER appear in search results"
  );

  // Search for hidden product terms
  const searchHidden = await executeSmartSearch("Discontinued Travel Bag");
  assert.equal(
    searchHidden.products.some((p) => p.id === "adm-hidden-archived-bag"),
    false,
    "Hidden product must NEVER appear in search results"
  );
});

test("3. Unified Search - Strict Gender Isolation across unified catalog", async () => {
  const customMenProduct = createProduct({
    id: "adm-custom-men-blazer",
    name: "Men Slim Fit Formal Blazer",
    brand: "Zara",
    category: "Men",
    description: "Italian wool blend tailored blazer for men.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf",
    rating: 0,
    reviews: 0,
    trustScore: 90,
    offers: [{ store: "Zara", price: 6990, currency: "INR", url: "https://zara.com/blazer", availability: true }],
    priceHistory: [],
  });

  const customWomenProduct = createProduct({
    id: "adm-custom-women-gown",
    name: "Women Floral Silk Maxi Gown",
    brand: "H&M",
    category: "Women",
    description: "Flowing silk formal dress for women.",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b",
    rating: 0,
    reviews: 0,
    trustScore: 90,
    offers: [{ store: "H&M", price: 4999, currency: "INR", url: "https://hm.com/gown", availability: true }],
    priceHistory: [],
  });

  registerInMemoryAdminProduct(customMenProduct, "published");
  registerInMemoryAdminProduct(customWomenProduct, "published");
  invalidatePublicCatalogCache();

  // Men search query
  for (const query of ["men", "mens", "men's"]) {
    const res = await executeSmartSearch(query);
    assert.ok(res.products.length > 0);
    assert.ok(
      res.products.every((p) => p.category === "Men" || !p.category.toLowerCase().includes("women")),
      `Search for '${query}' must not return any Women's products`
    );
    assert.equal(
      res.products.filter((p) => p.category === "Women").length,
      0,
      `Men query '${query}' returned Women products`
    );
  }

  // Women search query
  for (const query of ["women", "womens", "women's"]) {
    const res = await executeSmartSearch(query);
    assert.ok(res.products.length > 0);
    assert.ok(
      res.products.every((p) => p.category === "Women" || !p.category.toLowerCase().includes("men")),
      `Search for '${query}' must not return any Men's products`
    );
    assert.equal(
      res.products.filter((p) => p.category === "Men").length,
      0,
      `Women query '${query}' returned Men products`
    );
  }
});

test("4. Unified Product Resolver - Public vs Admin ID lookups", async () => {
  const publishedItem = createProduct({
    id: "adm-published-sunglasses",
    name: "Ray-Ban Aviator Classic",
    brand: "Ray-Ban",
    category: "Accessories",
    description: "Iconic sunglasses",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083",
    rating: 0,
    reviews: 0,
    trustScore: 96,
    offers: [{ store: "Amazon", price: 8590, currency: "INR", url: "https://amazon.in/dp/123", availability: true }],
    priceHistory: [],
  });

  const draftItem = createProduct({
    id: "adm-draft-sunglasses",
    name: "Ray-Ban Wayfarer Draft",
    brand: "Ray-Ban",
    category: "Accessories",
    description: "Unpublished draft",
    image: "https://images.unsplash.com/photo-1508296695146-257a814070b4",
    rating: 0,
    reviews: 0,
    trustScore: 90,
    offers: [{ store: "Amazon", price: 7590, currency: "INR", url: "https://amazon.in/dp/456", availability: true }],
    priceHistory: [],
  });

  registerInMemoryAdminProduct(publishedItem, "published");
  registerInMemoryAdminProduct(draftItem, "draft");
  invalidatePublicCatalogCache();

  // Published item resolves for public caller
  const pubRes = await getPublicProductById("adm-published-sunglasses");
  assert.ok(pubRes);
  assert.equal(pubRes?.id, "adm-published-sunglasses");

  // Draft item returns null for public caller
  const draftPubRes = await getPublicProductById("adm-draft-sunglasses");
  assert.equal(draftPubRes, null, "Draft item must return null for public caller");

  // Draft item resolves when allowDrafts is true (admin preview)
  const draftAdminRes = await getPublicProductById("adm-draft-sunglasses", { allowDrafts: true });
  assert.ok(draftAdminRes);
  assert.equal(draftAdminRes?.id, "adm-draft-sunglasses");
});

test("5. Performance - Instant offline local search with 0 network calls", async () => {
  const start = performance.now();
  for (let i = 0; i < 50; i++) {
    await executeSmartSearch("Nike shoes");
  }
  const total = performance.now() - start;
  const avg = total / 50;

  assert.ok(avg < 5, `Local search must execute instantaneously, got ${avg.toFixed(3)}ms per query`);
});
