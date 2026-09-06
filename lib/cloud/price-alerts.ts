import { type PriceAlert, type AlertType } from "../price-alerts.ts";
import { createAdminSupabaseClient } from "../supabase/admin.ts";

const MAX_CLOUD_ALERTS = 50;
const DEDUPLICATION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours deduplication window

interface CloudAlertsStore {
  userAlerts: Map<string, PriceAlert[]>; // userId -> PriceAlert[]
}

let inMemoryAlertsStore: CloudAlertsStore = {
  userAlerts: new Map(),
};

/**
 * Resets the in-memory alerts store (useful for test isolation).
 */
export function clearCloudAlertsStore(): void {
  inMemoryAlertsStore = {
    userAlerts: new Map(),
  };
}

/**
 * Retrieves all price alerts for a user from the cloud.
 */
export async function getCloudPriceAlerts(userId: string): Promise<PriceAlert[]> {
  if (!userId) return [];

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("price_alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_CLOUD_ALERTS);

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          productId: row.product_id,
          productName: row.product_name,
          store: row.store,
          previousPrice: row.previous_price !== null ? Number(row.previous_price) : undefined,
          currentPrice: Number(row.current_price),
          targetPrice: row.target_price !== null ? Number(row.target_price) : undefined,
          dropAmount: row.drop_amount !== null ? Number(row.drop_amount) : undefined,
          dropPercentage: row.drop_percentage !== null ? Number(row.drop_percentage) : undefined,
          pincode: row.pincode || undefined,
          type: row.alert_type as AlertType,
          timestamp: row.created_at,
          read: Boolean(row.read),
        }));
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  const list = inMemoryAlertsStore.userAlerts.get(userId);
  return list ? [...list] : [];
}

/**
 * Creates and persists a new PriceAlert in the cloud with deduplication.
 */
export async function createCloudPriceAlert(
  userId: string,
  params: Omit<PriceAlert, "id" | "timestamp" | "read">
): Promise<PriceAlert | null> {
  if (!userId || !params.productId || params.currentPrice <= 0) return null;

  const existing = await getCloudPriceAlerts(userId);
  const now = Date.now();

  // Strict deduplication check
  const isDuplicate = existing.some((a) => {
    if (
      a.productId === params.productId &&
      a.store.toLowerCase() === params.store.toLowerCase() &&
      a.type === params.type &&
      a.currentPrice === params.currentPrice &&
      (a.pincode || "") === (params.pincode || "")
    ) {
      const alertTime = new Date(a.timestamp).getTime();
      return Math.abs(now - alertTime) < DEDUPLICATION_WINDOW_MS;
    }
    return false;
  });

  if (isDuplicate) {
    return null;
  }

  const alertId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(16).padStart(8, '0')}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
  const timestamp = new Date(now).toISOString();

  const newAlert: PriceAlert = {
    ...params,
    id: alertId,
    timestamp,
    read: false,
  };

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin.from("price_alerts").insert({
        id: alertId,
        user_id: userId,
        alert_type: params.type,
        product_id: params.productId,
        product_name: params.productName,
        store: params.store,
        previous_price: params.previousPrice ?? null,
        current_price: params.currentPrice,
        target_price: params.targetPrice ?? null,
        drop_amount: params.dropAmount ?? null,
        drop_percentage: params.dropPercentage ?? null,
        pincode: params.pincode ?? null,
        read: false,
        created_at: timestamp,
      });
    } catch {
      // Fallback to in-memory store
    }
  }

  const updated = [newAlert, ...existing].slice(0, MAX_CLOUD_ALERTS);
  inMemoryAlertsStore.userAlerts.set(userId, updated);

  return newAlert;
}

/**
 * Marks a specific alert as read.
 */
export async function markCloudPriceAlertRead(userId: string, alertId: string): Promise<void> {
  if (!userId || !alertId) return;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin
        .from("price_alerts")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("id", alertId);
    } catch {
      // Fallback
    }
  }

  const list = inMemoryAlertsStore.userAlerts.get(userId);
  if (list) {
    const updated = list.map((a) => (a.id === alertId ? { ...a, read: true } : a));
    inMemoryAlertsStore.userAlerts.set(userId, updated);
  }
}

/**
 * Marks all price alerts for a user as read.
 */
export async function markAllCloudPriceAlertsRead(userId: string): Promise<void> {
  if (!userId) return;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin
        .from("price_alerts")
        .update({ read: true })
        .eq("user_id", userId);
    } catch {
      // Fallback
    }
  }

  const list = inMemoryAlertsStore.userAlerts.get(userId);
  if (list) {
    const updated = list.map((a) => ({ ...a, read: true }));
    inMemoryAlertsStore.userAlerts.set(userId, updated);
  }
}

/**
 * Deletes a single alert for a user.
 */
export async function deleteCloudPriceAlert(userId: string, alertId: string): Promise<void> {
  if (!userId || !alertId) return;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin
        .from("price_alerts")
        .delete()
        .eq("user_id", userId)
        .eq("id", alertId);
    } catch {
      // Fallback
    }
  }

  const list = inMemoryAlertsStore.userAlerts.get(userId);
  if (list) {
    const updated = list.filter((a) => a.id !== alertId);
    inMemoryAlertsStore.userAlerts.set(userId, updated);
  }
}

/**
 * Clears all alerts for a user.
 */
export async function clearCloudPriceAlerts(userId: string): Promise<void> {
  if (!userId) return;

  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      await admin.from("price_alerts").delete().eq("user_id", userId);
    } catch {
      // Fallback
    }
  }

  inMemoryAlertsStore.userAlerts.delete(userId);
}

/**
 * Merges anonymous local alerts into the cloud account idempotently.
 */
export async function mergeAnonymousAlerts(
  userId: string,
  localAlerts: PriceAlert[]
): Promise<PriceAlert[]> {
  if (!userId) return localAlerts || [];
  if (!Array.isArray(localAlerts) || localAlerts.length === 0) {
    return getCloudPriceAlerts(userId);
  }

  const currentCloud = await getCloudPriceAlerts(userId);
  const cloudKeys = new Set(
    currentCloud.map((a) => `${a.productId}_${a.store.toLowerCase()}_${a.type}_${a.currentPrice}`)
  );

  for (const alert of localAlerts) {
    const key = `${alert.productId}_${alert.store.toLowerCase()}_${alert.type}_${alert.currentPrice}`;
    if (!cloudKeys.has(key)) {
      await createCloudPriceAlert(userId, {
        productId: alert.productId,
        productName: alert.productName,
        store: alert.store,
        previousPrice: alert.previousPrice,
        currentPrice: alert.currentPrice,
        targetPrice: alert.targetPrice,
        dropAmount: alert.dropAmount,
        dropPercentage: alert.dropPercentage,
        pincode: alert.pincode,
        type: alert.type,
      });
      cloudKeys.add(key);
    }
  }

  return getCloudPriceAlerts(userId);
}
