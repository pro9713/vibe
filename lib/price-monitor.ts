import { products } from "@/data/products";
import { compareProductOffers, type ComparisonResult } from "@/lib/quickcommerce/comparison";
import { acquireJobLock, releaseJobLock } from "@/lib/monitoring/lock";
import {
  recordExecutionLog,
  type ExecutionStatus,
} from "@/lib/monitoring/logger";
import { recordPriceSnapshot } from "@/lib/price-history";
import { createCloudPriceAlert } from "@/lib/cloud/price-alerts";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface MonitoredProductTarget {
  id?: string;
  userId?: string;
  productId: string;
  targetPrice?: number;
  pincode?: string;
  trackedAt?: string;
  lastCheckedAt?: number;
}

export interface MonitoringJobResult {
  success: boolean;
  executionId: string;
  status: ExecutionStatus;
  checkedProducts: number;
  checkedOffers: number;
  newSnapshots: number;
  alertsGenerated: number;
  skippedProducts: number;
  errors: number;
  retries: number;
  errorMessages?: string[];
  durationMs: number;
  timestamp: string;
}

// In-memory registry of server-side monitored products & last checked timestamps
const monitoredTargetsRegistry = new Map<string, MonitoredProductTarget>();
const lastCheckedTimestamps = new Map<string, number>();

/**
 * Registers or updates a product for server-side automated background monitoring.
 */
export function registerProductForMonitoring(target: MonitoredProductTarget): void {
  if (!target.productId) return;
  const key = `${target.userId || "anon"}_${target.productId}_${target.pincode || "default"}`;
  monitoredTargetsRegistry.set(key, target);
}

/**
 * Loads active tracked targets directly from the Supabase tracked_targets database table.
 */
export async function loadActiveTrackedTargets(): Promise<MonitoredProductTarget[]> {
  const admin = createAdminSupabaseClient();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("tracked_targets")
        .select("id, user_id, product_id, target_price, tracked_at");

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          productId: row.product_id,
          targetPrice: row.target_price !== null ? Number(row.target_price) : undefined,
          trackedAt: row.tracked_at,
          pincode: "400001", // Default delivery postal code for comparison
        }));
      }
    } catch (err) {
      console.warn("[PriceMonitor] Error querying tracked_targets table:", err);
    }
  }

  // Fallback to in-memory registry if database is empty or inaccessible
  return Array.from(monitoredTargetsRegistry.values());
}

/**
 * Clears monitored registry (for testing purposes).
 */
export function clearMonitoredRegistry(): void {
  monitoredTargetsRegistry.clear();
  lastCheckedTimestamps.clear();
}

/**
 * Helper to determine if an error is transient (e.g. network/timeout) vs permanent.
 */
function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("network") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("rate limit")
  );
}

export type PriceOfferFetcher = (params: {
  productId: string;
  pincode?: string;
}) => Promise<ComparisonResult>;

/**
 * Runs the automated background price monitoring job with lock safety, batching, and error isolation.
 * Loads active user targets from Supabase, compares live prices, and triggers cloud price alerts.
 */
export async function runPriceMonitoringJob(options?: {
  forceAll?: boolean;
  maxBatchSize?: number;
  intervalMinutes?: number;
  maxRetries?: number;
  targetsOverride?: MonitoredProductTarget[];
  offerFetcher?: PriceOfferFetcher;
}): Promise<MonitoringJobResult> {
  const startTime = Date.now();
  const executionId = `exec_${startTime}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Acquire execution lock
  const lockAcquired = acquireJobLock(executionId);
  if (!lockAcquired) {
    const lockedResult: MonitoringJobResult = {
      success: false,
      executionId,
      status: "LOCKED",
      checkedProducts: 0,
      checkedOffers: 0,
      newSnapshots: 0,
      alertsGenerated: 0,
      skippedProducts: 0,
      errors: 0,
      retries: 0,
      errorMessages: ["Concurrent monitoring execution blocked: Another job is currently active."],
      durationMs: 0,
      timestamp: new Date().toISOString(),
    };

    recordExecutionLog({
      executionId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      status: "LOCKED",
      targetsProcessed: 0,
      successfulChecks: 0,
      failedChecks: 0,
      alertsGenerated: 0,
      skippedCount: 0,
      retries: 0,
      durationMs: 0,
      errors: ["Concurrent monitoring execution blocked"],
      lockAcquired: false,
    });

    return lockedResult;
  }

  const envInterval = parseInt(process.env.PRICE_MONITOR_INTERVAL_MINUTES || "60", 10);
  const intervalMinutes = options?.intervalMinutes ?? (isNaN(envInterval) ? 60 : envInterval);
  const intervalMs = intervalMinutes * 60 * 1000;

  const envBatchSize = parseInt(process.env.PRICE_MONITOR_BATCH_SIZE || "50", 10);
  const maxBatchSize = options?.maxBatchSize ?? (isNaN(envBatchSize) ? 50 : envBatchSize);
  const maxRetries = options?.maxRetries ?? 1;

  // Load active user tracked targets from Supabase (or override if provided for testing)
  const targets = options?.targetsOverride ?? (await loadActiveTrackedTargets());
  const offerFetcher = options?.offerFetcher ?? compareProductOffers;
  const errorMessages: string[] = [];

  let checkedProducts = 0;
  let successfulChecks = 0;
  let checkedOffers = 0;
  let newSnapshots = 0;
  let alertsGenerated = 0;
  let skippedProducts = 0;
  let errorCount = 0;
  let totalRetries = 0;

  try {
    for (const target of targets) {
      if (checkedProducts >= maxBatchSize) {
        break;
      }

      const targetKey = `${target.userId || "anon"}_${target.productId}_${target.pincode || "default"}`;
      const lastChecked = lastCheckedTimestamps.get(targetKey) || 0;
      const now = Date.now();

      // Skip recently checked products unless forceAll is specified
      if (!options?.forceAll && now - lastChecked < intervalMs) {
        skippedProducts++;
        continue;
      }

      let attempt = 0;
      let success = false;

      while (attempt <= maxRetries && !success) {
        try {
          // Compare live product offers using configured offer fetcher
          const comparison: ComparisonResult = await offerFetcher({
            productId: target.productId,
            pincode: target.pincode,
          });

          lastCheckedTimestamps.set(targetKey, Date.now());
          checkedProducts++;

          if (!comparison.success || !Array.isArray(comparison.offers) || comparison.offers.length === 0) {
            // If no current live price is available, safely skip and record reason
            skippedProducts++;
            errorMessages.push(`Target ${target.productId}: No live price offers returned`);
            success = true;
            break;
          }

          const validOffers = comparison.offers.filter((o) => o.price > 0 && o.availability !== false);
          if (validOffers.length === 0) {
            skippedProducts++;
            errorMessages.push(`Target ${target.productId}: No available in-stock offers`);
            success = true;
            break;
          }

          successfulChecks++;
          success = true;
          checkedOffers += validOffers.length;

          const targetProduct = products.find((p) => p.id === target.productId);
          const productName = comparison.productName || targetProduct?.name || target.productId;

          for (const offer of validOffers) {
            newSnapshots++;

            // Record price snapshot for historical charting
            recordPriceSnapshot({
              productId: target.productId,
              store: offer.store,
              price: offer.price,
              pincode: target.pincode,
              source: "quickcommerce",
            });

            const previousPrice = offer.originalPrice && offer.originalPrice > offer.price
              ? offer.originalPrice
              : undefined;

            // Target user assignment
            const alertUserId = target.userId;

            // 1. Detect TARGET_REACHED: current price <= target_price
            if (target.targetPrice && offer.price <= target.targetPrice) {
              const dropAmount = previousPrice && previousPrice > offer.price
                ? previousPrice - offer.price
                : (target.targetPrice > offer.price ? target.targetPrice - offer.price : 0);

              const dropPercentage = previousPrice && previousPrice > 0
                ? Math.round(((previousPrice - offer.price) / previousPrice) * 100)
                : undefined;

              if (alertUserId) {
                const cloudAlert = await createCloudPriceAlert(alertUserId, {
                  productId: target.productId,
                  productName,
                  store: offer.store,
                  previousPrice,
                  currentPrice: offer.price,
                  targetPrice: target.targetPrice,
                  dropAmount: dropAmount > 0 ? dropAmount : undefined,
                  dropPercentage,
                  pincode: target.pincode,
                  type: "TARGET_REACHED",
                });

                if (cloudAlert) {
                  alertsGenerated++;
                }
              }
            }
            // 2. Detect PRICE_DROP: significant price drop (>= 5%)
            else if (
              previousPrice &&
              previousPrice > offer.price &&
              (previousPrice - offer.price) / previousPrice >= 0.05
            ) {
              const dropAmount = previousPrice - offer.price;
              const dropPercentage = Math.round((dropAmount / previousPrice) * 100);

              if (alertUserId) {
                const cloudAlert = await createCloudPriceAlert(alertUserId, {
                  productId: target.productId,
                  productName,
                  store: offer.store,
                  previousPrice,
                  currentPrice: offer.price,
                  targetPrice: target.targetPrice,
                  dropAmount,
                  dropPercentage,
                  pincode: target.pincode,
                  type: "PRICE_DROP",
                });

                if (cloudAlert) {
                  alertsGenerated++;
                }
              }
            }
          }
        } catch (err: unknown) {
          attempt++;
          if (attempt <= maxRetries && isTransientError(err)) {
            totalRetries++;
            // Conservative backoff
            await new Promise((r) => setTimeout(r, 50 * attempt));
          } else {
            errorCount++;
            checkedProducts++;
            const msg = err instanceof Error ? err.message : String(err);
            errorMessages.push(`Target ${target.productId}: ${msg}`);
            console.warn(`[PriceMonitor] Error monitoring target ${target.productId}:`, err);
            break;
          }
        }
      }
    }
  } finally {
    // 2. Release lock
    releaseJobLock(executionId);
  }

  const durationMs = Date.now() - startTime;
  let status: ExecutionStatus = "SUCCESS";
  if (errorCount > 0 && successfulChecks === 0) {
    status = "FAILED";
  } else if (errorCount > 0) {
    status = "PARTIAL_SUCCESS";
  }

  const result: MonitoringJobResult = {
    success: status === "SUCCESS" || status === "PARTIAL_SUCCESS",
    executionId,
    status,
    checkedProducts,
    checkedOffers,
    newSnapshots,
    alertsGenerated,
    skippedProducts,
    errors: errorCount,
    retries: totalRetries,
    errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    durationMs,
    timestamp: new Date(startTime).toISOString(),
  };

  // Record execution in persistent health log
  recordExecutionLog({
    executionId,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    status,
    targetsProcessed: checkedProducts,
    successfulChecks,
    failedChecks: errorCount,
    alertsGenerated,
    skippedCount: skippedProducts,
    retries: totalRetries,
    durationMs,
    errors: errorMessages.length > 0 ? errorMessages : undefined,
    lockAcquired: true,
  });

  return result;
}
