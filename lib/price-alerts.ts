"use client";

import { useSyncExternalStore } from "react";
import { getTrackedTarget } from "./wishlist";
import { products } from "@/data/products";
import { getClientUser } from "./auth";

export const PRICE_ALERTS_STORAGE_KEY = "pricely-price-alerts";
const MAX_ALERTS = 50;
const DEDUPLICATION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours deduplication window for identical alerts

export type AlertType = "TARGET_REACHED" | "PRICE_DROP";

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  store: string;
  previousPrice?: number;
  currentPrice: number;
  targetPrice?: number;
  dropAmount?: number;
  dropPercentage?: number;
  type: AlertType;
  timestamp: string;
  read: boolean;
  pincode?: string;
}

// Helper to notify cloud if authenticated (fire-and-forget safe)
async function sendCloudAlertMutation(action: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const user = await getClientUser();
    if (!user) return;

    fetch("/api/cloud/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }).catch(() => {
      // Offline / network failure: local storage remains reliable
    });
  } catch {
    // Ignore error
  }
}

/**
 * Retrieves all stored price alerts from localStorage.
 */
export function getPriceAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading price alerts from localStorage:", err);
    return [];
  }
}

/**
 * Returns the count of unread price alerts.
 */
export function getUnreadAlertsCount(): number {
  const alerts = getPriceAlerts();
  return alerts.filter((a) => !a.read).length;
}

/**
 * Creates and persists a new PriceAlert with strict deduplication.
 */
export function createPriceAlert(
  params: Omit<PriceAlert, "id" | "timestamp" | "read">
): PriceAlert | null {
  if (typeof window === "undefined" || !params.productId || params.currentPrice <= 0) {
    return null;
  }

  try {
    const existing = getPriceAlerts();
    const now = Date.now();

    // Check for recent duplicate alert (same product, store, type, and currentPrice within deduplication window)
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

    const newAlert: PriceAlert = {
      ...params,
      id: `alert_${now}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(now).toISOString(),
      read: false,
    };

    // Prepend new alert and cap at MAX_ALERTS
    const updated = [newAlert, ...existing].slice(0, MAX_ALERTS);

    window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("price-alerts-updated", { detail: { newAlert, count: updated.length } })
    );

    // Sync to cloud if authenticated
    sendCloudAlertMutation("create", { alertParams: params });

    return newAlert;
  } catch (err) {
    console.error("Error creating price alert in localStorage:", err);
    return null;
  }
}

/**
 * Evaluates a real price snapshot against user target price and previous observations.
 */
export function evaluatePriceSnapshot(params: {
  productId: string;
  store: string;
  currentPrice: number;
  previousPrice?: number;
  pincode?: string;
}): PriceAlert[] {
  if (params.currentPrice <= 0 || !params.productId) return [];

  const createdAlerts: PriceAlert[] = [];
  const targetProduct = products.find((p) => p.id === params.productId);
  const productName = targetProduct?.name || params.productId;

  // 1. EVALUATE TARGET PRICE REACHED
  const tracked = getTrackedTarget(params.productId);
  if (tracked?.targetPrice && params.currentPrice <= tracked.targetPrice) {
    const targetAlert = createPriceAlert({
      productId: params.productId,
      productName,
      store: params.store,
      currentPrice: params.currentPrice,
      targetPrice: tracked.targetPrice,
      type: "TARGET_REACHED",
      pincode: params.pincode,
    });

    if (targetAlert) {
      createdAlerts.push(targetAlert);
    }
  }

  // 2. EVALUATE MEANINGFUL PRICE DROP
  // Threshold Rule: Minimum absolute drop >= ₹50 OR percentage drop >= 3.0%
  if (params.previousPrice && params.previousPrice > params.currentPrice) {
    const dropAmount = params.previousPrice - params.currentPrice;
    const dropPercentage = Number(((dropAmount / params.previousPrice) * 100).toFixed(1));

    if (dropAmount >= 50 || dropPercentage >= 3.0) {
      const dropAlert = createPriceAlert({
        productId: params.productId,
        productName,
        store: params.store,
        previousPrice: params.previousPrice,
        currentPrice: params.currentPrice,
        dropAmount,
        dropPercentage,
        type: "PRICE_DROP",
        pincode: params.pincode,
      });

      if (dropAlert) {
        createdAlerts.push(dropAlert);
      }
    }
  }

  return createdAlerts;
}

/**
 * Marks a specific alert as read.
 */
export function markPriceAlertRead(alertId: string): void {
  if (typeof window === "undefined" || !alertId) return;

  try {
    const alerts = getPriceAlerts();
    const updated = alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a));
    window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("price-alerts-updated", { detail: { alertId } }));

    sendCloudAlertMutation("mark-read", { alertId });
  } catch (err) {
    console.error("Error marking price alert as read:", err);
  }
}

/**
 * Marks all price alerts as read.
 */
export function markAllPriceAlertsRead(): void {
  if (typeof window === "undefined") return;

  try {
    const alerts = getPriceAlerts();
    const updated = alerts.map((a) => ({ ...a, read: true }));
    window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("price-alerts-updated", { detail: { allRead: true } }));

    sendCloudAlertMutation("mark-all-read", {});
  } catch (err) {
    console.error("Error marking all price alerts as read:", err);
  }
}

/**
 * Deletes a single price alert.
 */
export function deletePriceAlert(alertId: string): void {
  if (typeof window === "undefined" || !alertId) return;

  try {
    const alerts = getPriceAlerts();
    const updated = alerts.filter((a) => a.id !== alertId);
    window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("price-alerts-updated", { detail: { deletedId: alertId } }));

    sendCloudAlertMutation("delete", { alertId });
  } catch (err) {
    console.error("Error deleting price alert:", err);
  }
}

/**
 * Clears all price alerts from storage without touching wishlist, history, or targets.
 */
export function clearPriceAlerts(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(PRICE_ALERTS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("price-alerts-updated", { detail: { cleared: true } }));

    sendCloudAlertMutation("clear", {});
  } catch (err) {
    console.error("Error clearing price alerts:", err);
  }
}

// -------------------------------------------------------------
// REACT 19 SUBSCRIPTION HOOKS
// -------------------------------------------------------------

function subscribePriceAlerts(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("price-alerts-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("price-alerts-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedAlertsRaw: string | null = null;
let cachedAlertsSnapshot: PriceAlert[] = [];

function getAlertsSnapshot(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
  if (raw !== cachedAlertsRaw) {
    cachedAlertsRaw = raw;
    cachedAlertsSnapshot = getPriceAlerts();
  }
  return cachedAlertsSnapshot;
}

export function usePriceAlerts(): PriceAlert[] {
  return useSyncExternalStore(
    subscribePriceAlerts,
    getAlertsSnapshot,
    () => []
  );
}

export function useUnreadAlertsCount(): number {
  const alerts = usePriceAlerts();
  return alerts.filter((a) => !a.read).length;
}

// -------------------------------------------------------------
// CLOUD ALERTS SYNC & MERGE UTILITY
// -------------------------------------------------------------

/**
 * Synchronizes local alerts with cloud alerts upon login/mount.
 * Merges local anonymous alerts into the cloud account, then updates localStorage cache.
 */
export async function syncAlertsWithCloud(userId?: string): Promise<PriceAlert[] | null> {
  if (typeof window === "undefined") return null;

  try {
    const user = userId ? { id: userId } : await getClientUser();
    if (!user) return null;

    const localAlerts = getPriceAlerts();

    const res = await fetch("/api/cloud/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        action: "merge",
        localAlerts,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json.success && Array.isArray(json.alerts)) {
      window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(json.alerts));
      window.dispatchEvent(
        new CustomEvent("price-alerts-updated", { detail: { alerts: json.alerts } })
      );
      return json.alerts;
    }

    return null;
  } catch (err) {
    console.warn("[CloudAlertsSync] Background alert sync skipped:", err);
    return null;
  }
}
