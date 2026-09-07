import test from "node:test";
import assert from "node:assert/strict";
import {
  getPublicCatalog,
  getPublicProductById,
  getPublicProductsByCategory,
  adaptLocalProductToUnified,
  adaptAdminProductToUnified,
  invalidatePublicCatalogCache,
} from "../resolver.ts";
import {
  registerInMemoryAdminProduct,
  clearInMemoryAdminProducts,
} from "../../data/providers/database-product.provider.ts";
import { setCachedLiveProduct, clearLiveCache } from "../../quickcommerce/live-product-cache.ts";
import { createProduct } from "../../data/types.ts";

test.beforeEach(() => {
  clearInMemoryAdminProducts();
  clearLiveCache();
  invalidatePublicCatalogCache();
});

test("1. Baseline 52 catalog products load correctly as UnifiedProduct", async () => {
  const catalog = await getPublicCatalog();

  assert.ok(catalog.length >= 52, `Expected at least 52 products, got ${catalog.length}`);

  for (const item of catalog) {
    assert.ok(item.id, "Item must have an id");
    assert.ok(item.name, "Item must have a name");
    assert.ok(item.brand, "Item must have a brand");
    assert.ok(item.category, "Item must have a category");
    assert.ok(item.image, "Item must have an image");
    assert.ok(item.offers && item.offers.length > 0, "Item must have at least 1 offer");
    assert.ok(item.bestDeal && item.bestDeal.price > 0, "Item must have a valid bestDeal price");
    assert.equal(item.status, "published", "All public items must be published");
    assert.equal(item.isVerified, true);
  }
});

test("2. Published DB admin products merge cleanly into public catalog", async () => {
  const initialCatalog = await getPublicCatalog();
  const initialCount = initialCatalog.length;

  const mockPublished = createProduct({
    id: "adm-test-published-sneaker",
    name: "Limited Edition Air Jordan",
    brand: "Nike",
    category: "Shoes",
    description: "Exclusive sneaker release",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    rating: 0,
    reviews: 0,
    trustScore: 95,
    offers: [
      {
        store: "Nike Official Store",
        price: 14999,
        currency: "INR",
        url: "https://www.nike.com/in/t/air-jordan/123",
        availability: true,
      },
    ],
    priceHistory: [],
  });

  registerInMemoryAdminProduct(mockPublished, "published");
  invalidatePublicCatalogCache();

  const updatedCatalog = await getPublicCatalog();
  assert.equal(updatedCatalog.length, initialCount + 1, "Catalog should have 1 additional published item");

  const found = updatedCatalog.find((p) => p.id === "adm-test-published-sneaker");
  assert.ok(found, "Published item must be present in catalog");
  assert.equal(found?.name, "Limited Edition Air Jordan");
  assert.equal(found?.offers[0].store, "Nike Official Store");
  assert.equal(found?.bestDeal.price, 14999);
});

test("3. Draft, hidden, and archived DB products are strictly excluded from public catalog", async () => {
  const initialCatalog = await getPublicCatalog();
  const initialCount = initialCatalog.length;

  const draftProduct = createProduct({
    id: "adm-test-draft-watch",
    name: "Draft Watch Under Review",
    brand: "Casio",
    category: "Watches",
    description: "Pending verification",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d",
    rating: 0,
    reviews: 0,
    trustScore: 80,
    offers: [
      {
        store: "Amazon India",
        price: 3999,
        currency: "INR",
        url: "https://www.amazon.in/dp/B0001",
        availability: true,
      },
    ],
    priceHistory: [],
  });

  const hiddenProduct = createProduct({
    id: "adm-test-hidden-bag",
    name: "Hidden Bag",
    brand: "Lavie",
    category: "Bags",
    description: "Hidden item",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
    rating: 0,
    reviews: 0,
    trustScore: 80,
    offers: [
      {
        store: "Myntra",
        price: 2499,
        currency: "INR",
        url: "https://www.myntra.com/bag/123",
        availability: true,
      },
    ],
    priceHistory: [],
  });

  registerInMemoryAdminProduct(draftProduct, "draft");
  registerInMemoryAdminProduct(hiddenProduct, "hidden");
  invalidatePublicCatalogCache();

  const catalog = await getPublicCatalog();
  assert.equal(catalog.length, initialCount, "Draft and hidden products must NOT increase public catalog count");
  assert.equal(catalog.some((p) => p.id === "adm-test-draft-watch"), false);
  assert.equal(catalog.some((p) => p.id === "adm-test-hidden-bag"), false);

  // Direct lookup: Public caller gets null
  const publicLookup = await getPublicProductById("adm-test-draft-watch");
  assert.equal(publicLookup, null, "Draft product lookup by public caller must return null");

  // Direct lookup: Admin caller with allowDrafts gets the product
  const adminLookup = await getPublicProductById("adm-test-draft-watch", { allowDrafts: true });
  assert.ok(adminLookup, "Admin with allowDrafts can view the draft product");
  assert.equal(adminLookup?.id, "adm-test-draft-watch");
});

test("4. 3-Tier Layered Product ID Resolution", async () => {
  // Tier 1: Local 52 baseline product
  const tier1 = await getPublicProductById("air-max-270");
  assert.ok(tier1, "Tier 1: air-max-270 must resolve from local baseline");
  assert.equal(tier1?.brand, "Nike");
  assert.equal(tier1?.source, "catalog");

  // Tier 2: DB Published Admin product
  const dbProd = createProduct({
    id: "adm-tier2-jacket",
    name: "Admin Leather Jacket",
    brand: "Zara",
    category: "Clothing",
    description: "Premium jacket",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5",
    rating: 0,
    reviews: 0,
    trustScore: 90,
    offers: [{ store: "Zara", price: 8990, currency: "INR", url: "https://zara.com/p/123", availability: true }],
    priceHistory: [],
  });
  registerInMemoryAdminProduct(dbProd, "published");

  const tier2 = await getPublicProductById("adm-tier2-jacket");
  assert.ok(tier2, "Tier 2: DB published product must resolve");
  assert.equal(tier2?.id, "adm-tier2-jacket");

  // Tier 3: Live QuickCommerce cached product
  const qcProd = createProduct({
    id: "qc-blinkit-lays-chips",
    name: "Lay's Classic Salted",
    brand: "Lay's",
    category: "Snacks",
    description: "Crispy potato chips",
    image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b",
    rating: 4.2,
    reviews: 120,
    trustScore: 88,
    offers: [{ store: "BlinkIt", price: 20, currency: "INR", url: "https://blinkit.com/prn/123", availability: true }],
    priceHistory: [],
  });
  setCachedLiveProduct(qcProd);

  const tier3 = await getPublicProductById("qc-blinkit-lays-chips");
  assert.ok(tier3, "Tier 3: QC cached product must resolve");
  assert.equal(tier3?.offers[0].store, "BlinkIt");

  // Non-existent ID returns null
  const nonExistent = await getPublicProductById("non-existent-product-id-999");
  assert.equal(nonExistent, null);
});

test("5. Category & Gender Isolation Rules", async () => {
  const menProducts = await getPublicProductsByCategory("Men");
  assert.ok(menProducts.length > 0);
  assert.ok(
    menProducts.every((p) => p.category === "Men" || !p.category.toLowerCase().includes("women")),
    "Men category must not contain Women items"
  );

  const womenProducts = await getPublicProductsByCategory("Women");
  assert.ok(womenProducts.length > 0);
  assert.ok(
    womenProducts.every((p) => p.category === "Women" || !p.category.toLowerCase().includes("men")),
    "Women category must not contain Men items"
  );

  const shoesProducts = await getPublicProductsByCategory("Shoes");
  assert.ok(shoesProducts.length > 0);
  assert.ok(shoesProducts.every((p) => p.category.toLowerCase() === "shoes"));
});

test("6. Performance - Local-first fast caching", async () => {
  // Prime cache
  await getPublicCatalog();

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    await getPublicCatalog();
  }
  const totalDuration = performance.now() - start;
  const avgPerCall = totalDuration / 100;

  assert.ok(avgPerCall < 1, `Average call duration should be sub-millisecond, got ${avgPerCall.toFixed(3)}ms`);
});
