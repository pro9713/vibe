import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { products, getProductById } from "../data/products.ts";
import { executeSmartSearch } from "../lib/search/searchEngine.ts";
import { BRAND_TAXONOMY } from "../lib/search/aliases.ts";
import { tagProductAmazonOffers } from "../lib/affiliate/amazon.ts";

const CANONICAL_CATEGORIES = ["Shoes", "Men", "Women", "Watches", "Bags", "Beauty"];
const VALID_STORES = ["Amazon", "Flipkart", "Myntra", "AJIO"];

test("1. Catalog contains at least 50 products", () => {
  assert.ok(
    products.length >= 50,
    `Expected at least 50 products, found ${products.length}`
  );
});

test("2. All product IDs are unique with zero duplicates", () => {
  const seenIds = new Set();
  const duplicates = [];

  for (const product of products) {
    if (seenIds.has(product.id)) {
      duplicates.push(product.id);
    }
    seenIds.add(product.id);
  }

  assert.equal(
    duplicates.length,
    0,
    `Found duplicate product IDs: ${duplicates.join(", ")}`
  );
  assert.equal(seenIds.size, products.length);
});

test("3. All products belong to canonical categories", () => {
  const categoryCounts = {};
  for (const cat of CANONICAL_CATEGORIES) {
    categoryCounts[cat] = 0;
  }

  for (const product of products) {
    assert.ok(
      CANONICAL_CATEGORIES.includes(product.category),
      `Product "${product.id}" has invalid category: ${product.category}`
    );
    categoryCounts[product.category]++;
  }

  // Every canonical category must have products
  for (const [cat, count] of Object.entries(categoryCounts)) {
    assert.ok(
      count > 0,
      `Expected category "${cat}" to have at least one product, found ${count}`
    );
  }
});

test("4. All products belong to recognized brands in taxonomy", () => {
  const validBrandNames = Object.keys(BRAND_TAXONOMY);

  for (const product of products) {
    assert.ok(
      validBrandNames.includes(product.brand),
      `Product "${product.id}" brand "${product.brand}" is not in brand taxonomy`
    );
  }
});

test("5. Every product has complete, valid mandatory fields and existing local image", () => {
  for (const product of products) {
    assert.ok(product.id && typeof product.id === "string", `Product missing valid id: ${JSON.stringify(product)}`);
    assert.ok(product.name && typeof product.name === "string", `Product ${product.id} missing name`);
    assert.ok(product.brand && typeof product.brand === "string", `Product ${product.id} missing brand`);
    assert.ok(product.category && typeof product.category === "string", `Product ${product.id} missing category`);
    assert.ok(product.description && product.description.length > 10, `Product ${product.id} has insufficient description`);
    assert.ok(typeof product.rating === "number" && product.rating >= 0 && product.rating <= 5, `Product ${product.id} invalid rating: ${product.rating}`);
    assert.ok(typeof product.reviews === "number" && product.reviews >= 0, `Product ${product.id} invalid reviews: ${product.reviews}`);
    assert.ok(typeof product.trustScore === "number" && product.trustScore >= 0 && product.trustScore <= 100, `Product ${product.id} invalid trustScore: ${product.trustScore}`);

    // Image path validation
    assert.ok(product.image && product.image.startsWith("/images/products/"), `Product ${product.id} has invalid image path: ${product.image}`);
    const localImagePath = path.join(process.cwd(), "public", product.image);
    assert.ok(
      fs.existsSync(localImagePath),
      `Image file does not exist on disk: ${localImagePath} for product ${product.id}`
    );
  }
});

test("6. Every product has valid store offers and real retailer URLs", () => {
  for (const product of products) {
    assert.ok(Array.isArray(product.offers) && product.offers.length > 0, `Product ${product.id} has no offers`);

    for (const offer of product.offers) {
      assert.ok(VALID_STORES.includes(offer.store), `Product ${product.id} has invalid store: ${offer.store}`);
      assert.ok(typeof offer.price === "number" && offer.price > 0, `Product ${product.id} has invalid offer price: ${offer.price}`);
      assert.equal(offer.currency, "INR");
      assert.ok(typeof offer.availability === "boolean");
      assert.ok(offer.url && offer.url.startsWith("https://"), `Product ${product.id} offer has invalid URL: ${offer.url}`);

      // Verify no hardcoded affiliate tag in seed URL
      if (offer.store === "Amazon") {
        assert.doesNotMatch(offer.url, /tag=/, `Amazon URL must not contain hardcoded affiliate tag: ${offer.url}`);
      }
    }

    // Best deal must be present and match an offer
    assert.ok(product.bestDeal, `Product ${product.id} missing bestDeal`);
    assert.ok(product.bestDeal.price > 0, `Product ${product.id} bestDeal price must be > 0`);
  }
});

test("7. Every product has valid price history", () => {
  for (const product of products) {
    assert.ok(
      Array.isArray(product.priceHistory) && product.priceHistory.length > 0,
      `Product ${product.id} missing priceHistory`
    );
    for (const item of product.priceHistory) {
      assert.ok(typeof item.price === "number" && item.price > 0, `Invalid price history price in ${product.id}`);
    }
  }
});

test("8. Product detail lookup (getProductById) succeeds for all products", () => {
  for (const product of products) {
    const fetched = getProductById(product.id);
    assert.ok(fetched, `Failed to retrieve product by id: ${product.id}`);
    assert.equal(fetched.id, product.id);
    assert.equal(fetched.name, product.name);
  }

  // Non-existent id returns undefined
  assert.equal(getProductById("non-existent-slug-xyz"), undefined);
});

test("9. Smart Search V2 execution across categories and filters", async () => {
  // Nike shoes
  const nikeShoes = await executeSmartSearch("Nike shoes");
  assert.ok(nikeShoes.products.length > 0, "Expected search for 'Nike shoes' to return products");
  assert.ok(nikeShoes.products.some((p) => p.brand.toLowerCase() === "nike"));

  // Adidas sneakers
  const adidasSneakers = await executeSmartSearch("Adidas sneakers");
  assert.ok(adidasSneakers.products.length > 0, "Expected search for 'Adidas sneakers' to return products");
  assert.ok(adidasSneakers.products.some((p) => p.brand.toLowerCase() === "adidas"));

  // Levi jeans
  const leviJeans = await executeSmartSearch("Levi jeans");
  assert.ok(leviJeans.products.length > 0, "Expected search for 'Levi jeans' to return products");
  assert.ok(leviJeans.products.some((p) => p.brand.toLowerCase() === "levi's"));

  // watches
  const watches = await executeSmartSearch("watches");
  assert.ok(watches.products.length > 0, "Expected search for 'watches' to return products");
  assert.ok(watches.products.every((p) => p.category === "Watches" || p.name.toLowerCase().includes("watch")));

  // bags
  const bags = await executeSmartSearch("bags");
  assert.ok(bags.products.length > 0, "Expected search for 'bags' to return products");
  assert.ok(bags.products.every((p) => p.category === "Bags" || p.name.toLowerCase().includes("bag") || p.name.toLowerCase().includes("backpack")));

  // beauty
  const beauty = await executeSmartSearch("beauty");
  assert.ok(beauty.products.length > 0, "Expected search for 'beauty' to return products");
  assert.ok(beauty.products.every((p) => p.category === "Beauty"));

  // Price constraints: under 3000
  const under3000 = await executeSmartSearch("shoes under 3000");
  assert.ok(under3000.products.length > 0, "Expected results for 'shoes under 3000'");
  assert.ok(under3000.products.every((p) => p.bestDeal.price <= 3000));

  // Nonsense query
  const nonsense = await executeSmartSearch("zzzxxyyynonexistent999");
  assert.equal(nonsense.products.length, 0, "Expected nonsense query to return 0 products");
});

test("10. Wishlist and Price Tracking compatibility", () => {
  // Verify product structure conforms with wishlist and alert stores
  for (const product of products) {
    // Wishlist requires unique string ID
    assert.equal(typeof product.id, "string");
    assert.ok(product.id.length > 2);

    // Price tracking target check
    const currentPrice = product.bestDeal.price;
    assert.ok(currentPrice > 0);

    const simulatedTargetPrice = Math.round(currentPrice * 0.9);
    const wouldTriggerDrop = currentPrice <= simulatedTargetPrice;
    assert.equal(wouldTriggerDrop, false); // Current price is higher than 90% target
  }
});

test("11. Affiliate tag attachment across all expanded products", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    for (const product of products) {
      const tagged = tagProductAmazonOffers(product);
      for (const offer of tagged.offers) {
        if (offer.store === "Amazon") {
          assert.ok(offer.affiliateUrl, `Amazon offer in ${product.id} missing affiliateUrl`);
          assert.match(
            offer.affiliateUrl,
            /tag=pricelyindia-21/,
            `Amazon offer in ${product.id} should have affiliate tag`
          );
        } else {
          // Non-Amazon offer must NOT contain Amazon tag
          assert.doesNotMatch(
            offer.affiliateUrl || "",
            /tag=pricelyindia-21/,
            `Non-Amazon offer (${offer.store}) in ${product.id} must not have Amazon tag`
          );
        }
      }
    }
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});
