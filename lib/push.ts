import webpush from "web-push";
import type { PriceAlert } from "./price-alerts";
import {
  listSubscriptions,
  removeSubscription,
  recordPushSuccess,
  recordPushFailure,
  type PushSubscriptionData,
} from "./push-subscriptions";

export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  alertId?: string;
  productId?: string;
  type?: string;
}

export interface PushDeliveryResult {
  total: number;
  sent: number;
  failed: number;
  removed: number;
  errors?: string[];
}

let vapidInitialized = false;

/**
 * Initializes web-push with VAPID credentials if available.
 */
function initVapid(): boolean {
  if (vapidInitialized) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:alerts@pricely.in";

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidInitialized = true;
    return true;
  } catch (err) {
    console.warn("[WebPush] Failed to initialize VAPID details:", err);
    return false;
  }
}

/**
 * Checks if VAPID credentials are fully configured on the server.
 */
export function isPushConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  return Boolean(publicKey && privateKey && publicKey.length > 0 && privateKey.length > 0);
}

/**
 * Sends a push notification to a single subscriber.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!initVapid()) {
    console.warn("[WebPush] Skipping push: VAPID is not configured on the server.");
    return false;
  }

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  try {
    const stringPayload = JSON.stringify(payload);
    await webpush.sendNotification(pushSubscription, stringPayload);
    await recordPushSuccess(subscription.endpoint);
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const isPermanent = statusCode === 404 || statusCode === 410;

    await recordPushFailure(subscription.endpoint, isPermanent);

    if (isPermanent) {
      console.info(`[WebPush] Removed expired push subscription (${statusCode}): ${subscription.endpoint}`);
    } else {
      console.warn("[WebPush] Error delivering push notification:", err);
    }
    return false;
  }
}

/**
 * Converts a PriceAlert into a user-friendly browser notification payload and dispatches it
 * to all active subscribers with failure isolation and preference filtering.
 */
export async function sendAlertPushNotification(
  alert: PriceAlert,
  options?: {
    allowPriceDrops?: boolean;
    allowTargetReached?: boolean;
    userId?: string;
    anonymousClientId?: string;
  }
): Promise<PushDeliveryResult> {
  const allowDrops = options?.allowPriceDrops ?? true;
  const allowTargets = options?.allowTargetReached ?? true;

  if (alert.type === "PRICE_DROP" && !allowDrops) {
    return { total: 0, sent: 0, failed: 0, removed: 0 };
  }
  if (alert.type === "TARGET_REACHED" && !allowTargets) {
    return { total: 0, sent: 0, failed: 0, removed: 0 };
  }

  // Format concise notification text
  let title = "Price Alert";
  let body = "";

  if (alert.type === "TARGET_REACHED") {
    title = "🎯 Target Price Reached!";
    body = `${alert.productName} is now ₹${alert.currentPrice.toLocaleString("en-IN")} at ${alert.store}. Target was ₹${(alert.targetPrice || 0).toLocaleString("en-IN")}.`;
  } else if (alert.type === "PRICE_DROP") {
    title = "🔥 Price Drop Alert!";
    const dropText = alert.dropAmount
      ? `Save ₹${alert.dropAmount.toLocaleString("en-IN")} (${alert.dropPercentage}%)`
      : "";
    body = `${alert.productName} dropped to ₹${alert.currentPrice.toLocaleString("en-IN")} at ${alert.store}. ${dropText}`.trim();
  }

  const payload: PushNotificationPayload = {
    title,
    body,
    url: `/product/${alert.productId}`,
    tag: `alert_${alert.productId}`,
    alertId: alert.id,
    productId: alert.productId,
    type: alert.type,
  };

  const subscriptions = await listSubscriptions({
    userId: options?.userId,
    anonymousClientId: options?.anonymousClientId,
  });
  const errors: string[] = [];

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    try {
      const ok = await sendPushNotification(sub, payload);
      if (ok) {
        sent++;
      } else {
        failed++;
      }
    } catch (err: unknown) {
      failed++;
      errors.push(`Sub ${sub.endpoint.slice(0, 30)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    total: subscriptions.length,
    sent,
    failed,
    removed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
