import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdminRetailersAction,
  upsertAdminRetailerAction,
  toggleRetailerActiveAction,
  deleteAdminRetailerAction,
  clearInMemoryAdminRetailers,
} from "../../../app/admin/retailers/actions.ts";
import {
  validateRetailerPayload,
  clampTrustScore,
  type UpsertRetailerPayload,
} from "../../../lib/admin/types.ts";

const mockAdminUser = {
  id: "adm-retailer-tester",
  email: "admin@pricely.in",
  app_metadata: { role: "admin" },
};

const mockRegularUser = {
  id: "reg-user-999",
  email: "shopper@gmail.com",
  app_metadata: { role: "authenticated" },
};

test.beforeEach(() => {
  clearInMemoryAdminRetailers();
});

test("1. Retailer Payload Validation & Trust Score Bounds", () => {
  // Missing name
  const invalidName: any = {
    website: "https://www.nike.com",
  };
  const res1 = validateRetailerPayload(invalidName);
  assert.equal(res1.isValid, false);
  assert.equal(res1.error, "Retailer name is required.");

  // Missing website
  const invalidSite: any = {
    name: "Nike India",
  };
  const res2 = validateRetailerPayload(invalidSite);
  assert.equal(res2.isValid, false);
  assert.equal(res2.error, "Retailer website URL is required.");

  // Invalid trust score > 100
  const invalidScore: any = {
    name: "Store",
    website: "https://store.com",
    trustScore: 150,
  };
  const res3 = validateRetailerPayload(invalidScore);
  assert.equal(res3.isValid, false);
  assert.equal(res3.error, "Trust score must be a number between 1 and 100.");

  // Invalid trust score < 1
  const invalidScoreLow: any = {
    name: "Store",
    website: "https://store.com",
    trustScore: -5,
  };
  const res4 = validateRetailerPayload(invalidScoreLow);
  assert.equal(res4.isValid, false);

  // Clamping helper verification
  assert.equal(clampTrustScore(150), 100);
  assert.equal(clampTrustScore(-20), 1);
  assert.equal(clampTrustScore(92.4), 92);
  assert.equal(clampTrustScore("invalid", 85), 85);
});

test("2. Authorization Guards - Rejects unauthenticated and non-admin requests", async () => {
  const validPayload: UpsertRetailerPayload = {
    name: "Tata CLiQ Luxury",
    website: "https://luxury.tatacliq.com",
    trustScore: 95,
    badgeTier: "authorized_dealer",
  };

  // Unauthorized (null)
  await assert.rejects(
    async () => {
      await upsertAdminRetailerAction(validPayload, null);
    },
    { message: /UNAUTHORIZED: Authentication required/ }
  );

  // Forbidden (regular shopper)
  await assert.rejects(
    async () => {
      await upsertAdminRetailerAction(validPayload, mockRegularUser);
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );

  // Forbidden toggle
  await assert.rejects(
    async () => {
      await toggleRetailerActiveAction("myntra", false, mockRegularUser);
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );
});

test("3. Retailer Upsert - Creates and updates retailer with authenticity tier and affiliate rules", async () => {
  const newRetailerPayload: UpsertRetailerPayload = {
    name: "Puma India Direct",
    website: "https://in.puma.com",
    logo: "https://example.com/puma.svg",
    trustScore: 100,
    badgeTier: "official_brand",
    affiliateType: "query_param",
    affiliateParam: "utm_campaign",
    affiliateValue: "vibe_deals",
    isActive: true,
  };

  // 1. Create
  const createRes = await upsertAdminRetailerAction(newRetailerPayload, mockAdminUser);
  assert.equal(createRes.success, true);
  assert.ok(createRes.retailer);
  assert.equal(createRes.retailer?.name, "Puma India Direct");
  assert.equal(createRes.retailer?.badgeTier, "official_brand");
  assert.equal(createRes.retailer?.trustScore, 100);
  assert.equal(createRes.retailer?.affiliateType, "query_param");
  assert.equal(createRes.retailer?.affiliateParam, "utm_campaign");

  const retailerId = createRes.retailer!.id;

  // 2. Update existing
  const updateRes = await upsertAdminRetailerAction(
    {
      id: retailerId,
      name: "Puma India Flagship",
      website: "https://in.puma.com",
      trustScore: 98,
      badgeTier: "official_brand",
      isActive: true,
    },
    mockAdminUser
  );

  assert.equal(updateRes.success, true);
  assert.equal(updateRes.retailer?.name, "Puma India Flagship");
  assert.equal(updateRes.retailer?.trustScore, 98);
});

test("4. Active/Inactive Toggle - Correctly toggles store availability", async () => {
  const created = await upsertAdminRetailerAction(
    {
      name: "AJIO Luxe",
      website: "https://luxe.ajio.com",
      trustScore: 93,
      badgeTier: "authorized_dealer",
      isActive: true,
    },
    mockAdminUser
  );

  const retailerId = created.retailer!.id;

  // Toggle to inactive
  const deactRes = await toggleRetailerActiveAction(retailerId, false, mockAdminUser);
  assert.equal(deactRes.success, true);

  const all = await getAdminRetailersAction(mockAdminUser);
  const found = all.find((r) => r.id === retailerId);
  assert.ok(found);
  assert.equal(found?.isActive, false);

  // Toggle back to active
  const reactRes = await toggleRetailerActiveAction(retailerId, true, mockAdminUser);
  assert.equal(reactRes.success, true);

  const allAfter = await getAdminRetailersAction(mockAdminUser);
  const foundAfter = allAfter.find((r) => r.id === retailerId);
  assert.equal(foundAfter?.isActive, true);
});

test("5. Delete Retailer - Safely removes retailer record", async () => {
  const created = await upsertAdminRetailerAction(
    {
      name: "Temporary Shop",
      website: "https://temp.com",
      trustScore: 70,
      badgeTier: "standard",
    },
    mockAdminUser
  );

  const retailerId = created.retailer!.id;

  // Delete
  const delRes = await deleteAdminRetailerAction(retailerId, mockAdminUser);
  assert.equal(delRes.success, true);

  const all = await getAdminRetailersAction(mockAdminUser);
  const found = all.find((r) => r.id === retailerId);
  assert.equal(found, undefined);
});
