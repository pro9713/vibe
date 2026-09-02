import { products } from "@/data/products";
import { compareProductOffers, type ComparisonResult } from "@/lib/quickcommerce/comparison";
import { acquireJobLock, releaseJobLock } from "@/lib/monitoring/lock";
import {
  recordExecutionLog,
  type MonitoringExecutionRecord,
  type ExecutionStatus,
} from "@/lib/monitoring/logger";
import { recordPriceSnapshot } from "@/lib/price-history";
import { createPriceAlert } from "@/lib/price-alerts";

export interface MonitoredProductTarget {
  productId: string;
  targetPrice?: number;
  pincode?: string;
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
  const key = `${target.productId}_${target.pincode || "default"}`;
  monitoredTargetsRegistry.set(key, target);
}

/**
 * Gets all currently registered products for server monitoring.
 */
export function getMonitoredProducts(): MonitoredProductTarget[] {
  // If registry is empty, seed with catalog products to allow immediate scheduled checks
  if (monitoredTargetsRegistry.size === 0) {
    for (const prod of products) {
      registerProductForMonitoring({
        productId: prod.id,
        targetPrice: Math.round(prod.bestDeal.price * 0.9), // Default 10% below current
        pincode: "400001",
      });
    }
  }
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
 * Helper to determine if an error is transient (e.g. network/timeout) vs permanent (e.g. invalid ID).
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

/**
 * Runs the automated background price monitoring job with lock safety, batching, and error isolation.
 */
export async function runPriceMonitoringJob(options?: {
  forceAll?: boolean;
  maxBatchSize?: number;
  intervalMinutes?: number;
  maxRetries?: number;
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

  const envBatchSize = parseInt(process.env.PRICE_MONITOR_BATCH_SIZE || "20", 10);
  const maxBatchSize = options?.maxBatchSize ?? (isNaN(envBatchSize) ? 20 : envBatchSize);
  const maxRetries = options?.maxRetries ?? 1;

  const targets = getMonitoredProducts();
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

      const targetKey = `${target.productId}_${target.pincode || "default"}`;
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
          // Compare real product offers
          const comparison: ComparisonResult = await compareProductOffers({
            productId: target.productId,
            pincode: target.pincode,
          });

          lastCheckedTimestamps.set(targetKey, Date.now());
          checkedProducts++;
          successfulChecks++;
          success = true;

          if (comparison.success && Array.isArray(comparison.offers)) {
            checkedOffers += comparison.offers.length;

            for (const offer of comparison.offers) {
              if (offer.price > 0 && offer.availability !== false) {
                newSnapshots++;

                // Record real historical snapshot
                recordPriceSnapshot({
                  productId: target.productId,
                  store: offer.store,
                  price: offer.price,
                  pincode: target.pincode,
                  source: "quickcommerce",
                });

                // Check if offer meets or beats target price
                if (target.targetPrice && offer.price <= target.targetPrice) {
                  const targetAlert = createPriceAlert({
                    productId: target.productId,
                    productName: target.productId,
                    store: offer.store,
                    currentPrice: offer.price,
                    targetPrice: target.targetPrice,
                    type: "TARGET_REACHED",
                    pincode: target.pincode,
                  });

                  if (targetAlert) {
                    alertsGenerated++;
                  }
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
            errorMessages.push(`Product ${target.productId}: ${msg}`);
            console.warn(`[PriceMonitor] Error monitoring product ${target.productId}:`, err);
            break; // Stop retrying this target, move to next
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
