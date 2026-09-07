import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdminProductAction,
  clearInMemoryAdminProducts,
} from "../../../app/admin/products/actions.ts";
import {
  validateProductPayload,
  type CreateProductPayload,
} from "../../../lib/admin/types.ts";

test.beforeEach(() => {
  clearInMemoryAdminProducts();
});

const mockAdminUser = {
  id: "adm-user-123",
  email: "admin@pricely.in",
  app_metadata: { role: "admin" },
};

const mockRegularUser = {
  id: "reg-user-456",
  email: "shopper@gmail.com",
  app_metadata: { role: "authenticated" },
};

test("1. Product Payload Validation - enforces mandatory fields", () => {
  // Missing name
  const invalidName: any = {
    brand: "Nike",
    category: "Shoes",
    image: "https://example.com/img.jpg",
    url: "https://www.amazon.in/dp/B0CHX1W1XY",
    price: 4999,
  };
  const res1 = validateProductPayload(invalidName);
  assert.equal(res1.isValid, false);
  assert.equal(res1.error, "Product name is required.");

  // Missing brand
  const invalidBrand: any = {
    name: "Air Force 1",
    category: "Shoes",
    image: "https://example.com/img.jpg",
    url: "https://www.amazon.in/dp/B0CHX1W1XY",
    price: 4999,
  };
  const res2 = validateProductPayload(invalidBrand);
  assert.equal(res2.isValid, false);
  assert.equal(res2.error, "Brand is required.");

  // Invalid price
  const invalidPrice: any = {
    name: "Air Force 1",
    brand: "Nike",
    category: "Shoes",
    image: "https://example.com/img.jpg",
    url: "https://www.amazon.in/dp/B0CHX1W1XY",
    price: -100,
  };
  const res3 = validateProductPayload(invalidPrice);
  assert.equal(res3.isValid, false);
  assert.equal(res3.error, "Offer price must be a valid number greater than 0.");
});

test("2. Product Creation - Authorization Guard rejects non-admin users", async () => {
  const validPayload: CreateProductPayload = {
    name: "Air Max 90",
    brand: "Nike",
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    url: "https://www.amazon.in/dp/B0CHX1W1XY",
    store: "Amazon India",
    price: 7999,
  };

  // Unauthorized (null user)
  await assert.rejects(
    async () => {
      await createAdminProductAction(validPayload, null);
    },
    { message: /UNAUTHORIZED: Authentication required/ }
  );

  // Forbidden (regular shopper)
  await assert.rejects(
    async () => {
      await createAdminProductAction(validPayload, mockRegularUser);
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );
});

test("3. Product Creation - Default status is strictly 'draft'", async () => {
  const payload: CreateProductPayload = {
    name: "Ultraboost Light",
    brand: "Adidas",
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb",
    url: "https://www.myntra.com/casual-shoes/adidas/1234567/buy?utm_source=fb",
    store: "Myntra",
    price: 11999,
    // Note: status is not specified
  };

  const result = await createAdminProductAction(payload, mockAdminUser);

  assert.equal(result.success, true);
  assert.ok(result.product);
  assert.equal(result.product?.status, "draft", "Status must strictly default to 'draft'");
});

test("4. Product Creation - Strictly zero synthetic ratings/reviews", async () => {
  const payload: CreateProductPayload = {
    name: "Kay Beauty Matte Lipstick",
    brand: "Kay Beauty",
    category: "Beauty",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa",
    url: "https://www.nykaa.com/kay-beauty-matte-lipstick/p/897654?utm_source=google",
    store: "Nykaa",
    price: 899,
  };

  const result = await createAdminProductAction(payload, mockAdminUser);

  assert.equal(result.success, true);
  assert.equal(result.product?.rating, 0, "Rating must strictly default to 0 without fake stars");
  assert.equal(result.product?.reviews, 0, "Review count must strictly default to 0");
});

test("5. Product Creation - Sanitizes URL and attaches initial store offer", async () => {
  const payload: CreateProductPayload = {
    name: "iPhone 15 Pro Max",
    brand: "Apple",
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab",
    url: "https://www.amazon.in/dp/B0CHX1W1XY?utm_source=google&gclid=12345&tag=aff-21",
    store: "Amazon India",
    price: 134900,
    originalPrice: 159900,
    status: "published",
  };

  const result = await createAdminProductAction(payload, mockAdminUser);

  assert.equal(result.success, true);
  assert.ok(result.product);
  assert.equal(result.product?.status, "published");
  assert.equal(result.product?.offers.length, 1);

  const offer = result.product?.offers[0];
  assert.equal(offer?.store, "Amazon India");
  assert.equal(offer?.price, 134900);
  assert.equal(offer?.originalPrice, 159900);
  // Verify clean URL in offer
  assert.equal(offer?.url.includes("utm_source"), false);
  assert.equal(offer?.url.includes("gclid"), false);
});
