import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdminProductAction,
  updateProductStatusAction,
  updateAdminProductAction,
  deleteAdminProductAction,
  getAdminProductsAction,
  getAdminProductByIdAction,
  clearInMemoryAdminProducts,
} from "../../../app/admin/products/actions.ts";
import {
  getPublicCatalog,
  getPublicProductById,
  isBaselineProductId,
} from "../../../lib/catalog/resolver.ts";

test.beforeEach(() => {
  clearInMemoryAdminProducts();
});

const mockAdminUser = {
  id: "adm-user-999",
  email: "admin@pricely.in",
  app_metadata: { role: "admin" },
};

const mockRegularUser = {
  id: "reg-user-111",
  email: "shopper@gmail.com",
  app_metadata: { role: "authenticated" },
};

test("1. Baseline 52 Guardrail - Identifies and blocks modifications to baseline products", async () => {
  // Check known baseline IDs
  assert.equal(isBaselineProductId("air-max-270"), true);
  assert.equal(isBaselineProductId("501-jeans"), true);
  assert.equal(isBaselineProductId("non-existent-product-id"), false);

  // Attempting to update status of a baseline product must be rejected
  const statusRes = await updateProductStatusAction("air-max-270", "hidden", mockAdminUser);
  assert.equal(statusRes.success, false);
  assert.match(statusRes.error || "", /Baseline catalog products are immutable/);

  // Attempting to update metadata of a baseline product must be rejected
  const updateRes = await updateAdminProductAction(
    "air-max-270",
    { name: "Hacked Air Max" },
    mockAdminUser
  );
  assert.equal(updateRes.success, false);
  assert.match(updateRes.error || "", /Baseline catalog products are immutable/);

  // Attempting to delete a baseline product must be rejected
  const deleteRes = await deleteAdminProductAction("air-max-270", mockAdminUser);
  assert.equal(deleteRes.success, false);
  assert.match(deleteRes.error || "", /Baseline catalog products are immutable/);
});

test("2. Lifecycle Transitions - Transitions draft -> published -> hidden -> archived", async () => {
  // Create draft product
  const created = await createAdminProductAction(
    {
      name: "Superstar Vintage",
      brand: "Adidas",
      category: "Shoes",
      image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb",
      url: "https://www.myntra.com/adidas-superstar",
      store: "Myntra",
      price: 8999,
    },
    mockAdminUser
  );

  assert.equal(created.success, true);
  const productId = created.productId!;
  assert.ok(productId);

  // 1. Initial status: 'draft' -> Not in public catalog
  let pubItem = await getPublicProductById(productId);
  assert.equal(pubItem, null, "Draft product must not be exposed in public catalog");

  // 2. Transition to 'published'
  const pubRes = await updateProductStatusAction(productId, "published", mockAdminUser);
  assert.equal(pubRes.success, true);

  // Immediate cache purge: Product is now visible in public catalog
  pubItem = await getPublicProductById(productId);
  assert.ok(pubItem, "Published product must be visible in public catalog");
  assert.equal(pubItem?.name, "Superstar Vintage");

  // 3. Transition to 'hidden'
  const hideRes = await updateProductStatusAction(productId, "hidden", mockAdminUser);
  assert.equal(hideRes.success, true);

  pubItem = await getPublicProductById(productId);
  assert.equal(pubItem, null, "Hidden product must be removed immediately from public catalog");

  // 4. Transition to 'archived'
  const archRes = await updateProductStatusAction(productId, "archived", mockAdminUser);
  assert.equal(archRes.success, true);

  pubItem = await getPublicProductById(productId);
  assert.equal(pubItem, null, "Archived product must not be visible in public catalog");
});

test("3. Product Update - Updates metadata and store offers successfully", async () => {
  const created = await createAdminProductAction(
    {
      name: "Original Name",
      brand: "Nike",
      category: "Shoes",
      image: "https://example.com/img1.jpg",
      url: "https://www.amazon.in/dp/B0CHX1W1XY",
      store: "Amazon India",
      price: 4999,
      originalPrice: 6999,
    },
    mockAdminUser
  );

  const productId = created.productId!;

  // Update metadata and offer
  const updateRes = await updateAdminProductAction(
    productId,
    {
      name: "Updated Premium Name",
      brand: "Nike Lab",
      category: "Shoes",
      price: 5499,
      originalPrice: 7999,
      trustScore: 98,
    },
    mockAdminUser
  );

  assert.equal(updateRes.success, true);

  // Fetch product and verify
  const fetched = await getAdminProductByIdAction(productId, mockAdminUser);
  assert.ok(fetched);
  assert.equal(fetched?.name, "Updated Premium Name");
  assert.equal(fetched?.brand, "Nike Lab");
  assert.equal(fetched?.trustScore, 98);
  assert.equal(fetched?.offers[0]?.price, 5499);
  assert.equal(fetched?.offers[0]?.originalPrice, 7999);
});

test("4. Authorization Guards - Rejects unauthenticated and non-admin requests", async () => {
  // Unauthorized status update
  await assert.rejects(
    async () => {
      await updateProductStatusAction("adm-test-id", "published", null);
    },
    { message: /UNAUTHORIZED: Authentication required/ }
  );

  // Forbidden status update (regular user)
  await assert.rejects(
    async () => {
      await updateProductStatusAction("adm-test-id", "published", mockRegularUser);
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );

  // Forbidden product update (regular user)
  await assert.rejects(
    async () => {
      await updateAdminProductAction(
        "adm-test-id",
        { name: "Unauthorized Change" },
        mockRegularUser
      );
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );
});

test("5. Delete Admin Product - Deletes custom product and removes from search", async () => {
  const created = await createAdminProductAction(
    {
      name: "Temporary Item",
      brand: "TestBrand",
      category: "Accessories",
      image: "https://example.com/item.jpg",
      url: "https://www.amazon.in/dp/B0CHX1W1XY",
      store: "Amazon",
      price: 999,
      status: "published",
    },
    mockAdminUser
  );

  const productId = created.productId!;

  // Verify it exists in public catalog
  let pubItem = await getPublicProductById(productId);
  assert.ok(pubItem);

  // Delete product
  const delRes = await deleteAdminProductAction(productId, mockAdminUser);
  assert.equal(delRes.success, true);

  // Verify removed from public catalog
  pubItem = await getPublicProductById(productId);
  assert.equal(pubItem, null);
});
