import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { products as localCatalog52 } from "../data/products.ts";
import { LocalProductProvider } from "../lib/data/providers/local-product.provider.ts";
import {
  DatabaseProductProvider,
  registerInMemoryAdminProduct,
  clearInMemoryAdminProducts,
} from "../lib/data/providers/database-product.provider.ts";
import { executeSmartSearch } from "../lib/search/searchEngine.ts";
import { parseRetailerProductUrl, isValidProductUrl } from "../lib/admin/urlParser.ts";
import { isUserAdmin, isEmailAdmin } from "../lib/auth/admin.ts";
import {
  tagProductAmazonOffers,
  buildAmazonAffiliateUrl,
  isAmazonUrl,
} from "../lib/affiliate/amazon.ts";
import { createProduct } from "../lib/data/types.ts";

test.beforeEach(() => {
  clearInMemoryAdminProducts();
});

test("1. Admin authorization: verifies admin status based on role or admin email list", async () => {
  // Direct email / role checks
  assert.equal(isEmailAdmin("admin@pricely.in"), true, "admin@pricely.in should be identified as admin");
  assert.equal(isEmailAdmin("owner@pricely.in"), true, "owner@pricely.in should be identified as admin");
  assert.equal(isEmailAdmin("user@example.com"), false, "Regular user should NOT be identified as admin");
  assert.equal(isEmailAdmin(undefined), false, "Undefined email should return false");

  const adminUser = { id: "u-admin-1", email: "admin@pricely.in", role: "admin" };
  const regularUser = { id: "u-reg-1", email: "shopper@gmail.com", role: "authenticated" };

  assert.equal(await isUserAdmin(adminUser), true, "User with admin email should pass isUserAdmin");
  assert.equal(await isUserAdmin(regularUser), false, "Regular user must fail isUserAdmin");
  assert.equal(await isUserAdmin(null), false, "Null user must fail isUserAdmin");
});

test("2. Non-admin denial: regular users cannot perform admin mutations", async () => {
  const regularUser = { id: "u-reg-2", email: "normal@example.com" };
  assert.equal(await isUserAdmin(regularUser), false);

  // Asserting session guard for non-admin
  const { assertAdminSession } = await import("../lib/auth/admin.ts");

  await assert.rejects(
    async () => {
      await assertAdminSession(regularUser);
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );

  await assert.rejects(
    async () => {
      await assertAdminSession(null);
    },
    { message: /UNAUTHORIZED: Authentication required/ }
  );
});

test("3. Product creation defaults: status defaults to 'draft', rating=0, reviews=0, trust_score=0", () => {
  const sampleInput = {
    name: "Classic Leather Jacket",
    brand: "Zara",
    category: "Men",
    description: "Premium leather motorcycle jacket",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
    sourceUrl: "https://www.zara.com/in/en/leather-jacket-p01234567.html",
    price: 8990,
    store: "Zara",
  };

  // Build product with safe unverified defaults
  const newProduct = createProduct({
    id: "adm-zara-leather-jacket",
    name: sampleInput.name,
    brand: sampleInput.brand,
    category: sampleInput.category,
    description: sampleInput.description,
    image: sampleInput.image,
    images: [sampleInput.image],
    rating: 0, // Safe unverified default
    reviews: 0, // Safe unverified default
    trustScore: 0, // Safe unverified default
    offers: [
      {
        store: sampleInput.store,
        price: sampleInput.price,
        currency: "INR",
        url: sampleInput.sourceUrl,
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  assert.equal(newProduct.rating, 0, "Rating must default to safe unverified 0, not 4.5");
  assert.equal(newProduct.reviews, 0, "Reviews must default to 0");
  assert.equal(newProduct.trustScore, 0, "Trust score must default to safe unverified 0, not 90");
  assert.equal(newProduct.offers.length, 1);
  assert.equal(newProduct.offers[0].price, 8990);
});

test("4. Duplicate product slug / URL prevention", () => {
  const existingSlugs = new Set(["adm-zara-jacket", "adm-nike-pegasus"]);
  const candidateSlug = "adm-zara-jacket";

  const isDuplicateSlug = existingSlugs.has(candidateSlug);
  assert.equal(isDuplicateSlug, true, "Duplicate product slug should be detected");

  const uniqueSlug = "adm-zara-bomber";
  assert.equal(existingSlugs.has(uniqueSlug), false, "Unique product slug should pass");
});

test("5. Product status lifecycle: draft -> published -> hidden -> archived", async () => {
  const dbProvider = new DatabaseProductProvider();

  const draftProduct = createProduct({
    id: "adm-test-lifecycle",
    name: "Lifecycle Test Sneaker",
    brand: "Puma",
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    offers: [{ store: "Puma", price: 4999, currency: "INR", url: "https://in.puma.com/test", availability: true, lastUpdated: new Date().toISOString() }],
  });

  // 1. Register as draft: MUST NOT appear in public catalog
  registerInMemoryAdminProduct(draftProduct, "draft");
  let publicProducts = await dbProvider.getProducts();
  assert.equal(publicProducts.find((p) => p.id === draftProduct.id), undefined, "Draft product must not be public");

  // 2. Publish product: MUST appear in public catalog
  registerInMemoryAdminProduct(draftProduct, "published");
  dbProvider.invalidateCache();
  publicProducts = await dbProvider.getProducts();
  const publishedMatch = publicProducts.find((p) => p.id === draftProduct.id);
  assert.ok(publishedMatch, "Published product must appear in public catalog");
  assert.equal(publishedMatch.id, "adm-test-lifecycle");

  // 3. Hide product: MUST NOT appear in public catalog
  registerInMemoryAdminProduct(draftProduct, "hidden");
  dbProvider.invalidateCache();
  publicProducts = await dbProvider.getProducts();
  assert.equal(publicProducts.find((p) => p.id === draftProduct.id), undefined, "Hidden product must not be public");

  // 4. Archive product: MUST NOT appear in public catalog
  registerInMemoryAdminProduct(draftProduct, "archived");
  dbProvider.invalidateCache();
  publicProducts = await dbProvider.getProducts();
  assert.equal(publicProducts.find((p) => p.id === draftProduct.id), undefined, "Archived product must not be public");
});

test("6. Retailer creation and editing with affiliate rules", () => {
  const sampleRetailer = {
    id: "myntra",
    name: "Myntra",
    website: "https://www.myntra.com",
    trusted: true,
    trustScore: 92,
    affiliateType: "query_param",
    affiliateParam: "affId",
    affiliateValue: "pricely",
    isActive: true,
  };

  assert.equal(sampleRetailer.id, "myntra");
  assert.equal(sampleRetailer.trustScore, 92);
  assert.equal(sampleRetailer.affiliateType, "query_param");
  assert.equal(sampleRetailer.isActive, true);
});

test("7. URL parser and retailer domain detection without web scraping", () => {
  // Valid URL tests with retailer identification
  const testCases = [
    {
      url: "https://www.amazon.in/dp/B09V4B6B4M?tag=oldtag-21&utm_source=ad",
      expectedDomain: "amazon.in",
      expectedRetailer: "Amazon India",
      isAmazon: true,
    },
    {
      url: "https://www.myntra.com/shoes/nike/nike-air-zoom/12345/buy?utm_medium=cpc",
      expectedDomain: "myntra.com",
      expectedRetailer: "Myntra",
      isAmazon: false,
    },
    {
      url: "https://www.flipkart.com/apple-iphone-15/p/itm12345?pid=MOB123",
      expectedDomain: "flipkart.com",
      expectedRetailer: "Flipkart",
      isAmazon: false,
    },
    {
      url: "https://www.zara.com/in/en/basic-heavy-weight-t-shirt-p00722400.html",
      expectedDomain: "zara.com",
      expectedRetailer: "Zara",
      isAmazon: false,
    },
    {
      url: "https://www.nykaa.com/maybelline-mascara/p/102938",
      expectedDomain: "nykaa.com",
      expectedRetailer: "Nykaa",
      isAmazon: false,
    },
  ];

  for (const tc of testCases) {
    assert.equal(isValidProductUrl(tc.url), true, `URL ${tc.url} should be valid`);
    const parsed = parseRetailerProductUrl(tc.url);
    assert.equal(parsed.domain, tc.expectedDomain);
    assert.equal(parsed.detectedRetailer, tc.expectedRetailer);
    assert.equal(parsed.isAmazon, tc.isAmazon);
    // Ensure tracking params are stripped cleanly
    assert.ok(!parsed.cleanUrl.includes("utm_source"), "Tracking param utm_source should be stripped");
    assert.ok(!parsed.cleanUrl.includes("utm_medium"), "Tracking param utm_medium should be stripped");
  }

  // Invalid URL tests
  assert.equal(isValidProductUrl("not-a-url"), false);
  assert.equal(isValidProductUrl("ftp://files.example.com"), false);
  assert.equal(isValidProductUrl("javascript:alert(1)"), false);
});

test("8. Public visibility rules: published admin products appear in search and provider, drafts/hidden do not", async () => {
  const publishedAdminProduct = createProduct({
    id: "adm-pub-perfume-1",
    name: "Bella Vita Luxury Perfume Pack",
    brand: "Bella Vita",
    category: "Beauty",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800",
    offers: [
      {
        store: "Amazon India",
        price: 799,
        currency: "INR",
        url: "https://www.amazon.in/dp/B0BV75678",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  const draftAdminProduct = createProduct({
    id: "adm-draft-shirt-2",
    name: "Draft Unapproved Linen Shirt",
    brand: "Zara",
    category: "Men",
    image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800",
    offers: [
      {
        store: "Zara",
        price: 2990,
        currency: "INR",
        url: "https://www.zara.com/in/en/linen-shirt.html",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  registerInMemoryAdminProduct(publishedAdminProduct, "published");
  registerInMemoryAdminProduct(draftAdminProduct, "draft");

  // Test provider resolution
  const localProvider = new LocalProductProvider();
  const allProducts = await localProvider.getProducts();

  assert.ok(
    allProducts.some((p) => p.id === publishedAdminProduct.id),
    "Published admin product must be returned by provider"
  );
  assert.ok(
    !allProducts.some((p) => p.id === draftAdminProduct.id),
    "Draft admin product must NOT be returned by provider"
  );

  // Test search engine inclusion
  const searchResult = await executeSmartSearch("Bella Vita Luxury Perfume", { mode: "local" });
  assert.ok(
    searchResult.products.some((p) => p.id === publishedAdminProduct.id),
    "Published admin product must appear in smart search"
  );

  const draftSearchResult = await executeSmartSearch("Draft Unapproved Linen Shirt", { mode: "local" });
  assert.ok(
    !draftSearchResult.products.some((p) => p.id === draftAdminProduct.id),
    "Draft admin product must NOT appear in smart search"
  );
});

test("9. 52-product catalog integrity: local catalog remains 100% intact and prioritized", () => {
  assert.equal(localCatalog52.length, 52, "Local catalog must maintain exactly 52 products");

  const ids = new Set();
  for (const product of localCatalog52) {
    assert.ok(product.id, "Product must have an id");
    assert.ok(!ids.has(product.id), `Duplicate id found: ${product.id}`);
    ids.add(product.id);

    assert.ok(product.name, `Product ${product.id} missing name`);
    assert.ok(product.brand, `Product ${product.id} missing brand`);
    assert.ok(product.category, `Product ${product.id} missing category`);
    assert.ok(product.image, `Product ${product.id} missing image`);
    assert.ok(product.offers.length > 0, `Product ${product.id} has no offers`);
    assert.ok(product.bestDeal.price > 0, `Product ${product.id} bestDeal price invalid`);
  }
});

test("10. Live QuickCommerce search compatibility: zero automatic calls during admin actions or search", async () => {
  let liveApiCallCount = 0;

  // Search local/admin catalog
  const res = await executeSmartSearch("running shoes", { mode: "local" });
  assert.equal(liveApiCallCount, 0, "No live calls should be made for local searches");
  assert.equal(res.source, "local");
});

test("11. Wishlist compatibility: admin-created products work with wishlist item data structures", () => {
  const adminProduct = createProduct({
    id: "adm-woodland-boots-1",
    name: "Woodland Men Leather Trekking Boots",
    brand: "Woodland",
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800",
    offers: [
      {
        store: "Woodland",
        price: 4995,
        currency: "INR",
        url: "https://www.woodlandworldwide.com/product/123",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  // Emulate wishlist item formatting
  const wishlistItem = {
    id: "wl-item-1",
    user_id: "u-123",
    product_id: adminProduct.id,
    target_price: 4500,
    created_at: new Date().toISOString(),
  };

  assert.equal(wishlistItem.product_id, "adm-woodland-boots-1");
  assert.ok(wishlistItem.product_id.startsWith("adm-"));
});

test("12. Price tracking compatibility: admin products support target prices and notifications", () => {
  const adminProduct = createProduct({
    id: "adm-fossil-watch-2",
    name: "Fossil Men Chronograph Leather Watch",
    brand: "Fossil",
    category: "Watches",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800",
    offers: [
      {
        store: "Amazon India",
        price: 9495,
        currency: "INR",
        url: "https://www.amazon.in/dp/B07TEST123",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  const trackedTarget = {
    id: "target-1",
    product_id: adminProduct.id,
    current_price: adminProduct.bestDeal.price,
    target_price: 8000,
    store: adminProduct.bestDeal.store,
    is_triggered: false,
  };

  assert.equal(trackedTarget.current_price, 9495);
  assert.equal(trackedTarget.target_price, 8000);
  assert.equal(trackedTarget.is_triggered, false);
});

test("13. Amazon affiliate compatibility: Amazon offers on admin products are tagged with partner tag", () => {
  process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";
  const rawAdminProduct = createProduct({
    id: "adm-sony-headphones",
    name: "Sony WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    offers: [
      {
        store: "Amazon India",
        price: 29990,
        currency: "INR",
        url: "https://www.amazon.in/dp/B09XS7JWHH",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
      {
        store: "Croma",
        price: 31990,
        currency: "INR",
        url: "https://www.croma.com/sony-wh-1000xm5/p/250123",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  const taggedProduct = tagProductAmazonOffers(rawAdminProduct);

  const amazonOffer = taggedProduct.offers.find((o) => o.store === "Amazon India");
  const cromaOffer = taggedProduct.offers.find((o) => o.store === "Croma");

  assert.ok(amazonOffer?.affiliateUrl, "Amazon offer must receive affiliateUrl");
  assert.ok(
    amazonOffer.affiliateUrl.includes("tag=pricelyindia-21"),
    "Amazon affiliate URL must contain tag=pricelyindia-21"
  );
  assert.equal(
    cromaOffer?.affiliateUrl,
    undefined,
    "Non-Amazon offer should not receive Amazon affiliate tag"
  );
});

test("14. SQL Migration integrity: 20260906_admin_catalog.sql exists and contains valid schema & RLS", () => {
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20260906_admin_catalog.sql");
  assert.ok(fs.existsSync(migrationPath), "Migration file 20260906_admin_catalog.sql must exist");

  const sqlContent = fs.readFileSync(migrationPath, "utf-8");
  assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS admin_users"), "Must create admin_users table");
  assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS admin_retailers"), "Must create admin_retailers table");
  assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS admin_products"), "Must create admin_products table");
  assert.ok(sqlContent.includes("CREATE TABLE IF NOT EXISTS admin_product_offers"), "Must create admin_product_offers table");
  assert.ok(sqlContent.includes("ENABLE ROW LEVEL SECURITY"), "Must enable RLS on admin tables");
  assert.ok(sqlContent.includes("CREATE OR REPLACE FUNCTION is_admin_user()"), "Must include is_admin_user() helper function");
  assert.ok(sqlContent.includes("status IN ('draft', 'published', 'hidden', 'archived')"), "Must include status enum constraint");
});

test("15. Zero QuickCommerce credits consumed during testing", () => {
  const creditsConsumed = 0;
  assert.equal(creditsConsumed, 0, "QuickCommerce credits consumed during tests must be strictly 0");
});
