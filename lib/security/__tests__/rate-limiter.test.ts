import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
  validateCronAuthorization,
  clearRateLimiter,
} from "../../../lib/security/rate-limiter.ts";
import { getPublicCatalog, getPublicProductById } from "../../../lib/catalog/resolver.ts";

test.beforeEach(() => {
  clearRateLimiter();
});

test("1. Sliding Window Rate Limiting - Allows up to limit and blocks subsequent requests", () => {
  const testIp = "203.0.113.195";
  const limit = 5;
  const windowMs = 2000;

  // First 5 requests must be allowed
  for (let i = 1; i <= limit; i++) {
    const res = checkRateLimit(testIp, limit, windowMs);
    assert.equal(res.allowed, true, `Request ${i} should be allowed`);
    assert.equal(res.remaining, limit - i, `Remaining should be ${limit - i}`);
  }

  // 6th request must be blocked
  const blockedRes = checkRateLimit(testIp, limit, windowMs);
  assert.equal(blockedRes.allowed, false, "Request exceeding limit must be blocked");
  assert.equal(blockedRes.remaining, 0);
  assert.ok(blockedRes.retryAfter > 0, "retryAfter must be greater than 0");

  // Verify headers
  const headers = getRateLimitHeaders(blockedRes);
  assert.equal(headers["X-RateLimit-Limit"], "5");
  assert.equal(headers["X-RateLimit-Remaining"], "0");
  assert.ok(headers["X-RateLimit-Reset"]);
  assert.ok(headers["Retry-After"]);
});

test("2. IP Isolation - Requests on IP A do not consume quota on IP B", () => {
  const ipA = "10.0.0.1";
  const ipB = "10.0.0.2";
  const limit = 3;

  // Exhaust IP A
  for (let i = 0; i < limit; i++) {
    checkRateLimit(ipA, limit, 10000);
  }
  const ipABlocked = checkRateLimit(ipA, limit, 10000);
  assert.equal(ipABlocked.allowed, false, "IP A should be blocked");

  // IP B should still have full quota
  const ipBRes = checkRateLimit(ipB, limit, 10000);
  assert.equal(ipBRes.allowed, true, "IP B should still be allowed");
  assert.equal(ipBRes.remaining, 2);
});

test("3. Client IP Extraction from Proxy Headers", () => {
  // 1. x-forwarded-for with multiple hops
  const req1 = new Request("http://localhost/api/search", {
    headers: { "x-forwarded-for": "198.51.100.42, 10.0.0.1, 172.16.0.1" },
  });
  assert.equal(getClientIp(req1), "198.51.100.42");

  // 2. x-real-ip
  const req2 = new Request("http://localhost/api/search", {
    headers: { "x-real-ip": "198.51.100.99" },
  });
  assert.equal(getClientIp(req2), "198.51.100.99");

  // 3. cf-connecting-ip
  const req3 = new Request("http://localhost/api/search", {
    headers: { "cf-connecting-ip": "198.51.100.111" },
  });
  assert.equal(getClientIp(req3), "198.51.100.111");

  // 4. Fallback when no proxy headers present
  const req4 = new Request("http://localhost/api/search");
  assert.equal(getClientIp(req4), "127.0.0.1");
});

test("4. Cron Authorization Token Validation", () => {
  const testSecret = "super_secure_cron_secret_2026";

  // Valid Bearer token
  const valid = validateCronAuthorization(`Bearer ${testSecret}`, testSecret);
  assert.equal(valid, true);

  // Invalid Bearer token
  const invalid = validateCronAuthorization("Bearer wrong_token", testSecret);
  assert.equal(invalid, false);

  // Missing header
  const missing = validateCronAuthorization(null, testSecret);
  assert.equal(missing, false);

  // Malformed header without Bearer prefix
  const malformed = validateCronAuthorization(testSecret, testSecret);
  assert.equal(malformed, false);
});

test("5. Standard Catalog Unmetered Isolation - Catalog browsing remains zero-metered", async () => {
  const ip = "172.20.0.5";
  clearRateLimiter();

  // Perform multiple standard catalog lookups
  const catalog = await getPublicCatalog();
  assert.ok(catalog.length >= 52);

  const product = await getPublicProductById("air-max-270");
  assert.ok(product);

  // Rate limiter bucket for IP must remain completely untouched (remaining = 10)
  const rateLimitStatus = checkRateLimit(ip, 10, 60000);
  assert.equal(rateLimitStatus.allowed, true);
  assert.equal(rateLimitStatus.remaining, 9, "Only this single checkRateLimit invocation consumed quota");
});
