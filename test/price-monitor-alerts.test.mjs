import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { runPriceMonitoringJob, clearMonitoredRegistry } from "../lib/price-monitor.js";
import { clearCloudAlertsStore, getCloudPriceAlerts } from "../lib/cloud/price-alerts.js";

// Read Supabase config
const envContent = fs.readFileSync(".env.local", "utf-8");
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

let supabaseUrl = urlMatch[1].trim();
if (!supabaseUrl.startsWith("http")) {
  supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}
const serviceKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, serviceKey);

test("1. Mock offer fetcher produces TARGET_REACHED when currentPrice <= targetPrice", async () => {
  clearCloudAlertsStore();
  clearMonitoredRegistry();

  const userAId = "d3b07384-d113-494b-bb12-9c17e48b1111";

  // Deterministic mock offer fetcher (ZERO QuickCommerce API calls)
  const mockOfferFetcher = async ({ productId }) => {
    if (productId === "501-jeans") {
      return {
        success: true,
        productId: "501-jeans",
        productName: "501 Jeans",
        isLive: true,
        cached: false,
        lastUpdated: new Date().toISOString(),
        bestTrustedDeal: null,
        cheapestOffer: null,
        dealAnalysis: null,
        offers: [
          {
            store: "Amazon",
            price: 1299,
            originalPrice: 1499,
            currency: "INR",
            url: "https://amazon.in/test",
            availability: true,
          },
        ],
      };
    }
    return { success: false, productId, productName: productId, offers: [], isLive: false, cached: false, lastUpdated: "" };
  };

  const result = await runPriceMonitoringJob({
    forceAll: true,
    targetsOverride: [
      {
        userId: userAId,
        productId: "501-jeans",
        targetPrice: 1349,
      },
    ],
    offerFetcher: mockOfferFetcher,
  });

  assert.equal(result.success, true);
  assert.equal(result.checkedProducts, 1);
  assert.equal(result.alertsGenerated, 1);

  // Verify alert is stored under userAId
  const alerts = await getCloudPriceAlerts(userAId);
  assert.equal(alerts.length >= 1, true);

  const targetAlert = alerts.find((a) => a.productId === "501-jeans");
  assert.ok(targetAlert);
  assert.equal(targetAlert.type, "TARGET_REACHED");
  assert.equal(targetAlert.currentPrice, 1299);
  assert.equal(targetAlert.previousPrice, 1499);
  assert.equal(targetAlert.targetPrice, 1349);
  assert.equal(targetAlert.store, "Amazon");
});

test("2. Duplicate monitoring does not create duplicate alerts", async () => {
  const userAId = "d3b07384-d113-494b-bb12-9c17e48b1111";

  const mockOfferFetcher = async () => ({
    success: true,
    productId: "501-jeans",
    productName: "501 Jeans",
    isLive: true,
    cached: false,
    lastUpdated: new Date().toISOString(),
    bestTrustedDeal: null,
    cheapestOffer: null,
    dealAnalysis: null,
    offers: [
      {
        store: "Amazon",
        price: 1299,
        originalPrice: 1499,
        currency: "INR",
        url: "https://amazon.in/test",
        availability: true,
      },
    ],
  });

  // Run a second time with exact same price
  const result = await runPriceMonitoringJob({
    forceAll: true,
    targetsOverride: [
      {
        userId: userAId,
        productId: "501-jeans",
        targetPrice: 1349,
      },
    ],
    offerFetcher: mockOfferFetcher,
  });

  // Since alert already exists within deduplication window, alertsGenerated should be 0
  assert.equal(result.alertsGenerated, 0);
});

test("3. User isolation: User A and User B alerts are strictly isolated", async () => {
  const userAId = "11111111-1111-1111-1111-111111111111";
  const userBId = "22222222-2222-2222-2222-222222222222";

  const mockOfferFetcher = async ({ productId }) => {
    if (productId === "prod-A") {
      return {
        success: true,
        productId: "prod-A",
        productName: "Product A",
        isLive: true,
        cached: false,
        lastUpdated: "",
        bestTrustedDeal: null,
        cheapestOffer: null,
        dealAnalysis: null,
        offers: [{ store: "Flipkart", price: 800, originalPrice: 1000, currency: "INR", url: "", availability: true }],
      };
    }
    if (productId === "prod-B") {
      return {
        success: true,
        productId: "prod-B",
        productName: "Product B",
        isLive: true,
        cached: false,
        lastUpdated: "",
        bestTrustedDeal: null,
        cheapestOffer: null,
        dealAnalysis: null,
        offers: [{ store: "Myntra", price: 600, originalPrice: 900, currency: "INR", url: "", availability: true }],
      };
    }
    return { success: false, productId, productName: "", offers: [], isLive: false, cached: false, lastUpdated: "" };
  };

  const result = await runPriceMonitoringJob({
    forceAll: true,
    targetsOverride: [
      { userId: userAId, productId: "prod-A", targetPrice: 850 },
      { userId: userBId, productId: "prod-B", targetPrice: 650 },
    ],
    offerFetcher: mockOfferFetcher,
  });

  assert.equal(result.alertsGenerated, 2);

  const userAAlerts = await getCloudPriceAlerts(userAId);
  const userBAlerts = await getCloudPriceAlerts(userBId);

  assert.ok(userAAlerts.some((a) => a.productId === "prod-A"));
  assert.equal(userAAlerts.some((a) => a.productId === "prod-B"), false, "User A must not have User B's alerts");

  assert.ok(userBAlerts.some((a) => a.productId === "prod-B"));
  assert.equal(userBAlerts.some((a) => a.productId === "prod-A"), false, "User B must not have User A's alerts");
});

test("4. No alert created when price is above target price and no price drop", async () => {
  const userCId = "33333333-3333-3333-3333-333333333333";

  const mockOfferFetcher = async () => ({
    success: true,
    productId: "high-price-item",
    productName: "High Price Item",
    isLive: true,
    cached: false,
    lastUpdated: "",
    bestTrustedDeal: null,
    cheapestOffer: null,
    dealAnalysis: null,
    offers: [
      {
        store: "Store1",
        price: 2500, // Above target 2000
        originalPrice: 2500, // No drop
        currency: "INR",
        url: "",
        availability: true,
      },
    ],
  });

  const result = await runPriceMonitoringJob({
    forceAll: true,
    targetsOverride: [
      {
        userId: userCId,
        productId: "high-price-item",
        targetPrice: 2000,
      },
    ],
    offerFetcher: mockOfferFetcher,
  });

  assert.equal(result.alertsGenerated, 0);
});

test("5. PRICE_DROP alert generated when price dropped significantly even if above target", async () => {
  const userDId = "44444444-4444-4444-4444-444444444444";

  const mockOfferFetcher = async () => ({
    success: true,
    productId: "drop-item",
    productName: "Drop Item",
    isLive: true,
    cached: false,
    lastUpdated: "",
    bestTrustedDeal: null,
    cheapestOffer: null,
    dealAnalysis: null,
    offers: [
      {
        store: "Store2",
        price: 3000, // target is 2000, but original was 4000 (25% drop!)
        originalPrice: 4000,
        currency: "INR",
        url: "",
        availability: true,
      },
    ],
  });

  const result = await runPriceMonitoringJob({
    forceAll: true,
    targetsOverride: [
      {
        userId: userDId,
        productId: "drop-item",
        targetPrice: 2000,
      },
    ],
    offerFetcher: mockOfferFetcher,
  });

  assert.equal(result.alertsGenerated, 1);
  const alerts = await getCloudPriceAlerts(userDId);
  const dropAlert = alerts.find((a) => a.productId === "drop-item");
  assert.ok(dropAlert);
  assert.equal(dropAlert.type, "PRICE_DROP");
  assert.equal(dropAlert.dropPercentage, 25);
});

test("6. Verify existing tracked target 501-jeans in Supabase remains intact", async () => {
  const { data, error } = await supabase
    .from("tracked_targets")
    .select("*")
    .eq("product_id", "501-jeans");

  assert.equal(error, null);
  assert.ok(Array.isArray(data) && data.length > 0);
  const target = data[0];
  assert.equal(target.product_id, "501-jeans");
  assert.equal(Number(target.target_price), 1349);
});
