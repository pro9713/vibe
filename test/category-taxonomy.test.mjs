import test from "node:test";
import assert from "node:assert/strict";
import { products, getProductsByCategory } from "../data/products.ts";
import { executeSmartSearch } from "../lib/search/searchEngine.ts";

test("1. Men's category filter contains zero Women's products", async () => {
  const menCategoryProducts = getProductsByCategory("Men");
  assert.ok(menCategoryProducts.length > 0, "Expected Men's category to contain products");
  assert.ok(
    menCategoryProducts.every((p) => p.category === "Men"),
    "Found non-Men products in getProductsByCategory('Men')"
  );

  const menSearchFiltered = await executeSmartSearch("", { category: "Men" });
  assert.ok(menSearchFiltered.products.length > 0, "Expected Men's filtered search to return products");
  assert.ok(
    menSearchFiltered.products.every((p) => p.category === "Men"),
    "Found non-Men products in executeSmartSearch with { category: 'Men' }"
  );
  assert.equal(
    menSearchFiltered.products.filter((p) => p.category === "Women").length,
    0,
    "Men's category must contain 0 Women's products"
  );
});

test("2. Women's category filter contains zero Men's products", async () => {
  const womenCategoryProducts = getProductsByCategory("Women");
  assert.ok(womenCategoryProducts.length > 0, "Expected Women's category to contain products");
  assert.ok(
    womenCategoryProducts.every((p) => p.category === "Women"),
    "Found non-Women products in getProductsByCategory('Women')"
  );

  const womenSearchFiltered = await executeSmartSearch("", { category: "Women" });
  assert.ok(womenSearchFiltered.products.length > 0, "Expected Women's filtered search to return products");
  assert.ok(
    womenSearchFiltered.products.every((p) => p.category === "Women"),
    "Found non-Women products in executeSmartSearch with { category: 'Women' }"
  );
  assert.equal(
    womenSearchFiltered.products.filter((p) => p.category === "Men").length,
    0,
    "Women's category must contain 0 Men's products"
  );
});

test("3. Men's search queries ('men', 'mens', 'men\'s') return only Men's products", async () => {
  for (const query of ["men", "mens", "men's"]) {
    const results = await executeSmartSearch(query);
    assert.ok(results.products.length > 0, `Expected search for '${query}' to return products`);
    assert.ok(
      results.products.every((p) => p.category === "Men"),
      `Search for '${query}' returned non-Men products`
    );
    assert.equal(
      results.products.filter((p) => p.category === "Women").length,
      0,
      `Search for '${query}' must not return any Women's products`
    );
  }
});

test("4. Women's search queries ('women', 'womens', 'women\'s') return only Women's products", async () => {
  for (const query of ["women", "womens", "women's"]) {
    const results = await executeSmartSearch(query);
    assert.ok(results.products.length > 0, `Expected search for '${query}' to return products`);
    assert.ok(
      results.products.every((p) => p.category === "Women"),
      `Search for '${query}' returned non-Women products`
    );
    assert.equal(
      results.products.filter((p) => p.category === "Men").length,
      0,
      `Search for '${query}' must not return any Men's products`
    );
  }
});

test("5. Shoes search still works independently across keywords", async () => {
  for (const query of ["shoes", "sneakers", "running shoes"]) {
    const results = await executeSmartSearch(query);
    assert.ok(results.products.length > 0, `Expected search for '${query}' to return products`);
    assert.ok(
      results.products.every((p) => p.category === "Shoes"),
      `Search for '${query}' returned non-Shoe products`
    );
  }
});

test("6. Non-gender-specific search ('Levi jeans') works across both Men and Women", async () => {
  const results = await executeSmartSearch("Levi jeans");
  assert.ok(results.products.length > 0, "Expected 'Levi jeans' to return products");
  assert.ok(
    results.products.every((p) => p.brand.toLowerCase() === "levi's"),
    "All results for 'Levi jeans' must be Levi's brand"
  );
  assert.ok(
    results.products.some((p) => p.category === "Men"),
    "Expected 'Levi jeans' to return Men's jeans"
  );
  assert.ok(
    results.products.some((p) => p.category === "Women"),
    "Expected 'Levi jeans' to return Women's jeans"
  );
});

test("7. Watches, Bags, and Beauty categories are not polluted by Men/Women aliases", async () => {
  const watches = await executeSmartSearch("", { category: "Watches" });
  assert.ok(watches.products.length > 0 && watches.products.every((p) => p.category === "Watches"));

  const bags = await executeSmartSearch("", { category: "Bags" });
  assert.ok(bags.products.length > 0 && bags.products.every((p) => p.category === "Bags"));

  const beauty = await executeSmartSearch("", { category: "Beauty" });
  assert.ok(beauty.products.length > 0 && beauty.products.every((p) => p.category === "Beauty"));
});
