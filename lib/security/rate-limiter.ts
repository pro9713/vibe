/**
 * Zero-Dependency In-Memory Sliding Window Rate Limiter & Security Utilities.
 *
 * Provides IP-based rate limiting to prevent abuse of external QuickCommerce
 * live search and background cron execution.
 *
 * CRITICAL GUARDRAILS:
 * 1. Standard catalog searches and browsing remain 100% UNMETERED.
 * 2. Sliding window algorithm calculates exact request frequency.
 * 3. Automatic periodic garbage collection prevents memory leaks.
 */

import type { NextRequest } from "next/server";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds until next slot is free
}

interface WindowRecord {
  timestamps: number[];
  lastAccessed: number;
}

// In-memory sliding window bucket store
const ipBuckets = new Map<string, WindowRecord>();

// Default configuration: 10 requests per 60,000 ms (1 minute)
const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60 * 1000;

// Run garbage collection periodically (every 5 minutes)
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGcTime = Date.now();

/**
 * Prunes expired timestamps and removes stale IP records.
 */
function cleanupExpiredBuckets(windowMs: number = DEFAULT_WINDOW_MS): void {
  const now = Date.now();
  if (now - lastGcTime < GC_INTERVAL_MS) {
    return;
  }
  lastGcTime = now;

  for (const [key, record] of ipBuckets.entries()) {
    // Remove timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    // If no recent timestamps, delete the key to release memory
    if (record.timestamps.length === 0 || now - record.lastAccessed > windowMs * 2) {
      ipBuckets.delete(key);
    }
  }
}

/**
 * Checks and records a rate limit hit for a specific identifier (IP address).
 *
 * @param key Unique identifier (client IP address)
 * @param limit Maximum allowed requests within window (default: 10)
 * @param windowMs Time window in milliseconds (default: 60,000 ms)
 */
export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const cleanKey = (key || "unknown_ip").trim();

  // Periodic cleanup
  cleanupExpiredBuckets(windowMs);

  let record = ipBuckets.get(cleanKey);
  if (!record) {
    record = { timestamps: [], lastAccessed: now };
    ipBuckets.set(cleanKey, record);
  }

  record.lastAccessed = now;

  // Filter timestamps within sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const currentCount = record.timestamps.length;
  const resetTime = Math.ceil((now + windowMs) / 1000);

  if (currentCount >= limit) {
    // Over limit: calculate retry after based on oldest timestamp in window
    const oldestTimestamp = record.timestamps[0] || now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldestTimestamp));
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime,
      retryAfter: retryAfterSeconds,
    };
  }

  // Record this request
  record.timestamps.push(now);

  const remaining = Math.max(0, limit - record.timestamps.length);
  return {
    allowed: true,
    limit,
    remaining,
    resetTime,
    retryAfter: 0,
  };
}

/**
 * Extracts client IP safely from standard HTTP proxy headers.
 * Order of precedence:
 * 1. x-forwarded-for (first IP in comma-separated list)
 * 2. x-real-ip
 * 3. cf-connecting-ip (Cloudflare)
 * 4. Fallback to 127.0.0.1
 */
export function getClientIp(request: Request | NextRequest): string {
  const headers = request.headers;

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Returns standard HTTP RateLimit response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetTime),
  };

  if (!result.allowed && result.retryAfter > 0) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Validates CRON Authorization token against configured environment secrets.
 */
export function validateCronAuthorization(
  authHeader: string | null | undefined,
  secretOverride?: string
): boolean {
  const cronSecret =
    secretOverride || process.env.PRICELY_CRON_SECRET || process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.trim().length === 0) {
    // In dev environment, allow local test tokens
    if (process.env.NODE_ENV === "development") {
      return authHeader === "Bearer dev_secret" || authHeader === "Bearer local_test";
    }
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const expected = `Bearer ${cronSecret.trim()}`;
  return authHeader.trim() === expected;
}

/**
 * Clears in-memory rate limiter state (used in testing).
 */
export function clearRateLimiter(): void {
  ipBuckets.clear();
}
