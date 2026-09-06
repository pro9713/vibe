"use client";

import { useSyncExternalStore } from "react";
import type { PriceHistoryItem } from "./data/types.ts";
import { products } from "../data/products.ts";
import { evaluatePriceSnapshot } from "./price-alerts.ts";

export const PRICE_HISTORY_STORAGE_KEY = "pricely-price-history";
const MAX_SNAPSHOTS_PER_PRODUCT = 50;
const DUPLICATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour duplicate threshold for identical price/store/pincode

export interface PriceAnalytics {
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  distanceFromLowest: number;
  distanceFromAverage: number;
  priceDrop: {
    amount: number;
    percentage: number;
    previousPrice: number;
  } | null;
  biggestDrop: number;
  dealStatus: "great" | "good" | "fair" | "high" | "insufficient";
  dealStatusLabel: string;
  dealInsight: string;
  hasSufficientData: boolean;
  totalObservations: number;
}

/**
 * Retrieves all stored price snapshots from localStorage grouped by product.
 */
export function getAllStoredSnapshots(): Record<string, PriceHistoryItem[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PRICE_HISTORY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (err) {
    console.error("Error reading price history from localStorage:", err);
    return {};
  }
}

/**
 * Records a real observed price snapshot with strict deduplication and capacity bounds.
 */
export function recordPriceSnapshot(snapshot: {
  productId: string;
  store: string;
  price: number;
  date?: string;
  pincode?: string;
  source?: "local" | "quickcommerce" | "api";
}): boolean {
  if (typeof window === "undefined" || !snapshot.productId || snapshot.price <= 0) {
    return false;
  }

  try {
    const all = getAllStoredSnapshots();
    const productHistory = all[snapshot.productId] || [];

    const now = snapshot.date ? new Date(snapshot.date).getTime() : Date.now();
    const isoDate = snapshot.date || new Date(now).toISOString();

    // Deduplication check: Avoid duplicate snapshot if same store, same pincode, and same price within 1 hour
    const lastSimilar = productHistory
      .filter(
        (s) =>
          s.store?.toLowerCase() === snapshot.store.toLowerCase() &&
          (s.pincode || "") === (snapshot.pincode || "")
      )
      .slice(-1)[0];

    if (lastSimilar) {
      const lastTime = new Date(lastSimilar.date || Date.now()).getTime();
      const timeDiff = Math.abs(now - lastTime);

      if (lastSimilar.price === snapshot.price && timeDiff < DUPLICATE_WINDOW_MS) {
        // Skip inserting duplicate identical snapshot
        return false;
      }
    }

    const newSnapshot: PriceHistoryItem = {
      productId: snapshot.productId,
      store: snapshot.store,
      price: snapshot.price,
      date: isoDate,
      pincode: snapshot.pincode,
      source: snapshot.source || "quickcommerce",
    };

    // Append and enforce maximum capacity
    const updatedHistory = [...productHistory, newSnapshot].slice(-MAX_SNAPSHOTS_PER_PRODUCT);
    all[snapshot.productId] = updatedHistory;

    window.localStorage.setItem(PRICE_HISTORY_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent("price-history-updated", { detail: { productId: snapshot.productId } })
    );

    // Evaluate new observation for Target Reached & Price Drop Alerts
    try {
      evaluatePriceSnapshot({
        productId: snapshot.productId,
        store: snapshot.store,
        currentPrice: snapshot.price,
        previousPrice: lastSimilar?.price,
        pincode: snapshot.pincode,
      });
    } catch (alertErr) {
      console.warn("[PriceAlerts] Evaluation warning:", alertErr);
    }

    return true;
  } catch (err) {
    console.error("Error saving price snapshot to localStorage:", err);
    return false;
  }
}

/**
 * Merges base verified catalog history with real recorded live snapshots for a product.
 */
export function getProductPriceHistory(
  productId: string,
  options?: {
    store?: string;
    days?: number;
    pincode?: string;
  }
): PriceHistoryItem[] {
  const baseProduct = products.find((p) => p.id === productId);
  const baseHistory = (baseProduct?.priceHistory || []).map((item) => ({
    ...item,
    productId,
    source: "local" as const,
  }));

  const stored = getAllStoredSnapshots()[productId] || [];

  // Combine real base verified snapshots with stored live snapshots
  const combined = [...baseHistory, ...stored];

  // Filter by store if requested
  let filtered = combined;
  if (options?.store && options.store !== "all") {
    const targetStore = options.store.toLowerCase();
    filtered = filtered.filter((item) => (item.store || "").toLowerCase() === targetStore);
  }

  // Filter by pincode if requested and present
  if (options?.pincode) {
    filtered = filtered.filter((item) => !item.pincode || item.pincode === options.pincode);
  }

  // Filter by time range (days)
  if (options?.days && options.days > 0) {
    const cutoffTime = Date.now() - options.days * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((item) => {
      const timestamp = new Date(item.date || Date.now()).getTime();
      return isNaN(timestamp) || timestamp >= cutoffTime;
    });
  }

  // Sort chronologically ascending
  return filtered.sort((a, b) => {
    const timeA = new Date(a.date || Date.now()).getTime();
    const timeB = new Date(b.date || Date.now()).getTime();
    return timeA - timeB;
  });
}

/**
 * Calculates deterministic price analytics, deal status, and insights.
 */
export function calculatePriceAnalytics(
  history: PriceHistoryItem[],
  currentPriceOverride?: number
): PriceAnalytics {
  if (!history || history.length === 0) {
    const current = currentPriceOverride || 0;
    return {
      currentPrice: current,
      lowestPrice: current,
      highestPrice: current,
      averagePrice: current,
      distanceFromLowest: 0,
      distanceFromAverage: 0,
      priceDrop: null,
      biggestDrop: 0,
      dealStatus: "insufficient",
      dealStatusLabel: "Price Tracking Started",
      dealInsight: "Price tracking has just started. More data is needed for a reliable trend.",
      hasSufficientData: false,
      totalObservations: 0,
    };
  }

  const prices = history.map((h) => h.price).filter((p) => p > 0);
  const currentPrice = currentPriceOverride || prices[prices.length - 1] || 0;

  const lowestPrice = Math.min(...prices, currentPrice);
  const highestPrice = Math.max(...prices, currentPrice);
  const averagePrice = Math.round(
    prices.reduce((sum, p) => sum + p, 0) / (prices.length || 1)
  );

  const distanceFromLowest = currentPrice - lowestPrice;
  const distanceFromAverage = currentPrice - averagePrice;

  // Price drop detection against immediate previous snapshot for the same store
  let priceDrop: PriceAnalytics["priceDrop"] = null;
  let biggestDrop = 0;

  if (history.length >= 2) {
    // Check previous price point
    const prevItem = history[history.length - 2];
    if (prevItem && prevItem.price > currentPrice) {
      const dropAmount = prevItem.price - currentPrice;
      const dropPct = Number(((dropAmount / prevItem.price) * 100).toFixed(1));
      priceDrop = {
        amount: dropAmount,
        percentage: dropPct,
        previousPrice: prevItem.price,
      };
    }

    // Calculate biggest single step decrease in observed history
    for (let i = 1; i < history.length; i++) {
      const diff = history[i - 1].price - history[i].price;
      if (diff > biggestDrop) {
        biggestDrop = diff;
      }
    }
  }

  const hasSufficientData = prices.length >= 2;

  // Deterministic Deal Status Classification
  let dealStatus: PriceAnalytics["dealStatus"] = "fair";
  let dealStatusLabel = "⚪ Fair Price";
  let dealInsight = "Current price is consistent with the historical average.";

  if (!hasSufficientData) {
    dealStatus = "insufficient";
    dealStatusLabel = "⚪ Initial Observation";
    dealInsight = "Price tracking has just started. More real observations are needed for a trend.";
  } else if (distanceFromLowest <= 50 || currentPrice <= lowestPrice * 1.03) {
    dealStatus = "great";
    dealStatusLabel = "🟢 Great Deal";
    dealInsight =
      distanceFromLowest === 0
        ? "Lowest recorded price! This is the best historical price observed."
        : `Great deal! Current price is within ₹${distanceFromLowest.toLocaleString("en-IN")} of the lowest recorded price.`;
  } else if (distanceFromAverage < 0 && Math.abs(distanceFromAverage) >= averagePrice * 0.05) {
    dealStatus = "good";
    dealStatusLabel = "🟡 Good Deal";
    dealInsight = `Good time to buy: Current price is ₹${Math.abs(distanceFromAverage).toLocaleString("en-IN")} below the recent average.`;
  } else if (distanceFromAverage > averagePrice * 0.05) {
    dealStatus = "high";
    dealStatusLabel = "🔴 High Price";
    dealInsight = `Consider waiting: Current price is ₹${distanceFromAverage.toLocaleString("en-IN")} above the recent average.`;
  } else {
    dealStatus = "fair";
    dealStatusLabel = "⚪ Fair Price";
    dealInsight = "Current price is around the historical average.";
  }

  return {
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice,
    distanceFromLowest,
    distanceFromAverage,
    priceDrop,
    biggestDrop,
    dealStatus,
    dealStatusLabel,
    dealInsight,
    hasSufficientData,
    totalObservations: prices.length,
  };
}

/**
 * Event subscriber for React useSyncExternalStore
 */
function subscribePriceHistory(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("price-history-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("price-history-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * React 19 Hook for reactive Price History subscription
 */
export function usePriceHistory(
  productId: string,
  options?: {
    store?: string;
    days?: number;
    pincode?: string;
  }
): {
  history: PriceHistoryItem[];
  analytics: PriceAnalytics;
} {
  const getSnapshot = () => {
    const history = getProductPriceHistory(productId, options);
    const analytics = calculatePriceAnalytics(history);
    return JSON.stringify({ history, analytics });
  };

  const json = useSyncExternalStore(
    subscribePriceHistory,
    getSnapshot,
    () => {
      const history = getProductPriceHistory(productId, options);
      const analytics = calculatePriceAnalytics(history);
      return JSON.stringify({ history, analytics });
    }
  );

  return JSON.parse(json);
}
