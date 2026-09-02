"use client";

export const PUSH_PREFERENCES_KEY = "pricely-push-preferences";

export interface PushPreferences {
  notifyPriceDrops: boolean;
  notifyTargetReached: boolean;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export function getPushPreferences(): PushPreferences {
  if (typeof window === "undefined") {
    return { notifyPriceDrops: true, notifyTargetReached: true };
  }

  try {
    const raw = window.localStorage.getItem(PUSH_PREFERENCES_KEY);
    if (!raw) return { notifyPriceDrops: true, notifyTargetReached: true };
    const parsed = JSON.parse(raw);
    return {
      notifyPriceDrops: parsed.notifyPriceDrops ?? true,
      notifyTargetReached: parsed.notifyTargetReached ?? true,
    };
  } catch {
    return { notifyPriceDrops: true, notifyTargetReached: true };
  }
}

export const CLIENT_ID_KEY = "pricely-client-id";

export function getAnonymousClientId(): string {
  if (typeof window === "undefined") return "server-client-id";
  let clientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export function getDeviceLabel(): string {
  if (typeof window === "undefined") return "This device";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";

  let os = "Desktop";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "Mac";

  return `${browser} on ${os}`;
}

export function setPushPreferences(prefs: Partial<PushPreferences>): PushPreferences {
  const current = getPushPreferences();
  const updated: PushPreferences = { ...current, ...prefs };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PUSH_PREFERENCES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("push-preferences-updated", { detail: updated }));
  }
  return updated;
}

/**
 * Registers service worker and subscribes browser to Web Push with multi-device support.
 */
export async function subscribeUserToPush(vapidPublicKey?: string): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: false, error: "Web Push notifications are not supported in this browser." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: `Notification permission was ${permission}.` };
    }

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const pubKey = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    let subOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    };

    if (pubKey && pubKey.trim().length > 0) {
      subOptions.applicationServerKey = urlBase64ToUint8Array(pubKey.trim()) as BufferSource;
    }

    const subscription = await reg.pushManager.subscribe(subOptions);
    const clientId = getAnonymousClientId();
    const label = getDeviceLabel();

    // Send subscription to server with multi-device metadata
    const payload = {
      ...subscription.toJSON(),
      anonymousClientId: clientId,
      deviceLabel: label,
      userAgent: navigator.userAgent,
    };

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    return { success: true, subscription };
  } catch (err: unknown) {
    console.error("[ClientPush] Error subscribing:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to subscribe to push notifications.",
    };
  }
}

/**
 * Unsubscribes from browser Web Push.
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (sub) {
      const clientId = getAnonymousClientId();
      // Notify server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, anonymousClientId: clientId }),
      });

      await sub.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error("[ClientPush] Error unsubscribing:", err);
    return false;
  }
}
