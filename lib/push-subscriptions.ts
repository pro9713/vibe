import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface PushSubscriptionRecord {
  id: string;
  userId?: string | null;
  anonymousClientId?: string | null;
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
  deviceLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  failureCount: number;
}

export type PushSubscriptionData = PushSubscriptionRecord;

export interface CreateSubscriptionInput {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string | null;
  anonymousClientId?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
}

export interface SubscriptionStats {
  total: number;
  active: number;
  failing: number;
  uniqueDevices: number;
}

// Local file-backed persistent storage path for development
const DATA_DIR = path.join(process.cwd(), ".data");
const STORAGE_FILE = path.join(DATA_DIR, "push_subscriptions.json");

// In-memory cache synced with persistent store
let memoryCache: Map<string, PushSubscriptionRecord> | null = null;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore in read-only / serverless environments
  }
}

function loadFromDisk(): Map<string, PushSubscriptionRecord> {
  const map = new Map<string, PushSubscriptionRecord>();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      const list: PushSubscriptionRecord[] = JSON.parse(raw);
      for (const item of list) {
        if (item && item.endpoint) {
          map.set(item.endpoint, item);
        }
      }
    }
  } catch (err) {
    console.warn("[PushSubscriptionStore] Error reading persistent storage:", err);
  }
  return map;
}

function saveToDisk(map: Map<string, PushSubscriptionRecord>): void {
  try {
    ensureDataDir();
    const list = Array.from(map.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[PushSubscriptionStore] Error saving persistent storage:", err);
  }
}

function getCache(): Map<string, PushSubscriptionRecord> {
  if (!memoryCache) {
    memoryCache = loadFromDisk();
  }
  return memoryCache;
}

/**
 * Adds or updates a persistent push subscription record.
 * Deduplicates using the unique endpoint URL.
 */
export async function addSubscription(
  input: CreateSubscriptionInput
): Promise<PushSubscriptionRecord> {
  if (!input.endpoint || !input.keys?.p256dh || !input.keys?.auth) {
    throw new Error("Invalid push subscription: endpoint and keys (p256dh, auth) are required.");
  }

  const cache = getCache();
  const existing = cache.get(input.endpoint);
  const now = new Date().toISOString();

  const record: PushSubscriptionRecord = {
    id: existing?.id || crypto.randomUUID(),
    userId: input.userId ?? existing?.userId ?? null,
    anonymousClientId: input.anonymousClientId ?? existing?.anonymousClientId ?? null,
    endpoint: input.endpoint,
    expirationTime: input.expirationTime ?? existing?.expirationTime ?? null,
    keys: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    userAgent: input.userAgent ?? existing?.userAgent ?? null,
    deviceLabel: input.deviceLabel ?? existing?.deviceLabel ?? "This device",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastSuccessAt: existing?.lastSuccessAt ?? null,
    lastFailureAt: existing?.lastFailureAt ?? null,
    failureCount: existing?.failureCount ?? 0,
  };

  cache.set(input.endpoint, record);
  saveToDisk(cache);

  return record;
}

/**
 * Removes a subscription by endpoint.
 * If anonymousClientId is provided, verifies ownership to prevent unauthorized deletion.
 */
export async function removeSubscription(
  endpoint: string,
  requesterIdentity?: string
): Promise<boolean> {
  if (!endpoint) return false;
  const cache = getCache();
  const existing = cache.get(endpoint);

  if (!existing) return false;

  // If requesterIdentity is provided, verify it matches either anonymousClientId or userId
  if (requesterIdentity) {
    const matchesAnon = existing.anonymousClientId && existing.anonymousClientId === requesterIdentity;
    const matchesUser = existing.userId && existing.userId === requesterIdentity;

    if (!matchesAnon && !matchesUser) {
      console.warn("[PushSubscriptionStore] Unauthorized deletion attempt for endpoint");
      return false;
    }
  }

  const removed = cache.delete(endpoint);
  if (removed) {
    saveToDisk(cache);
  }
  return removed;
}

/**
 * Retrieves a subscription by endpoint.
 */
export async function getSubscription(
  endpoint: string
): Promise<PushSubscriptionRecord | null> {
  if (!endpoint) return null;
  const cache = getCache();
  return cache.get(endpoint) || null;
}

/**
 * Lists all registered subscriptions, optionally filtered by user ID or anonymous client ID.
 */
export async function listSubscriptions(filter?: {
  userId?: string;
  anonymousClientId?: string;
}): Promise<PushSubscriptionRecord[]> {
  const cache = getCache();
  const all = Array.from(cache.values());

  if (!filter) {
    return all;
  }

  return all.filter((sub) => {
    if (filter.userId && sub.userId === filter.userId) return true;
    if (filter.anonymousClientId && sub.anonymousClientId === filter.anonymousClientId) return true;
    return false;
  });
}

/**
 * Links all subscriptions associated with an anonymous client ID to an authenticated user ID.
 * Idempotent: returns the count of newly linked subscriptions.
 */
export async function linkAnonymousSubscriptionsToUser(
  anonymousClientId: string,
  userId: string
): Promise<number> {
  if (!anonymousClientId || !userId) return 0;
  const cache = getCache();
  let linkedCount = 0;
  const now = new Date().toISOString();

  for (const record of cache.values()) {
    if (record.anonymousClientId === anonymousClientId && record.userId !== userId) {
      record.userId = userId;
      record.updatedAt = now;
      linkedCount++;
    }
  }

  if (linkedCount > 0) {
    saveToDisk(cache);
  }

  return linkedCount;
}

/**
 * Lists all subscriptions for a specific authenticated user.
 */
export async function listUserSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  if (!userId) return [];
  return listSubscriptions({ userId });
}

/**
 * Checks if a subscription endpoint exists.
 */
export async function hasSubscription(endpoint: string): Promise<boolean> {
  if (!endpoint) return false;
  const cache = getCache();
  return cache.has(endpoint);
}

/**
 * Records a successful push delivery for an endpoint.
 */
export async function recordPushSuccess(endpoint: string): Promise<void> {
  const cache = getCache();
  const existing = cache.get(endpoint);
  if (existing) {
    existing.lastSuccessAt = new Date().toISOString();
    existing.failureCount = 0;
    existing.updatedAt = new Date().toISOString();
    saveToDisk(cache);
  }
}

/**
 * Records a failed push delivery for an endpoint and increments failure count.
 */
export async function recordPushFailure(
  endpoint: string,
  isPermanentInvalid?: boolean
): Promise<void> {
  const cache = getCache();
  const existing = cache.get(endpoint);
  if (existing) {
    existing.lastFailureAt = new Date().toISOString();
    existing.failureCount = (existing.failureCount || 0) + 1;
    existing.updatedAt = new Date().toISOString();

    // If permanent HTTP 404/410 or failureCount exceeds 5, automatically remove
    if (isPermanentInvalid || existing.failureCount >= 5) {
      console.info(`[PushSubscriptionStore] Purging permanently invalid subscription: ${endpoint}`);
      cache.delete(endpoint);
    }
    saveToDisk(cache);
  }
}

/**
 * Removes an invalid subscription.
 */
export async function removeInvalidSubscription(endpoint: string): Promise<boolean> {
  return removeSubscription(endpoint);
}

/**
 * Returns observability stats on stored subscriptions.
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const cache = getCache();
  const all = Array.from(cache.values());

  const active = all.filter((s) => s.failureCount === 0).length;
  const failing = all.filter((s) => s.failureCount > 0).length;

  return {
    total: all.length,
    active,
    failing,
    uniqueDevices: all.length,
  };
}

/**
 * Clears all subscriptions (for testing).
 */
export async function clearSubscriptions(): Promise<void> {
  const cache = getCache();
  cache.clear();
  saveToDisk(cache);
}
