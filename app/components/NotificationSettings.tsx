"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Smartphone,
} from "lucide-react";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  getPushPreferences,
  setPushPreferences,
  type PushPreferences,
} from "@/lib/client-push";

export default function NotificationSettings() {
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PushPreferences>({
    notifyPriceDrops: true,
    notifyTargetReached: true,
  });

  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);

    if (isSupp) {
      setPermission(getNotificationPermission());
      setPreferences(getPushPreferences());

      // Check if already subscribed in service worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsSubscribed(Boolean(sub));
          });
        });
      }
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setStatusMessage(null);

    const res = await subscribeUserToPush();
    setPermission(getNotificationPermission());

    if (res.success) {
      setIsSubscribed(true);
      setStatusMessage("Browser notifications successfully enabled!");
    } else {
      setStatusMessage(res.error || "Failed to enable notifications.");
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    await unsubscribeUserFromPush();
    setIsSubscribed(false);
    setStatusMessage("Notifications disabled.");
    setLoading(false);
  };

  const handlePreferenceChange = (key: keyof PushPreferences, val: boolean) => {
    const updated = setPushPreferences({ [key]: val });
    setPreferences(updated);
  };

  if (!supported) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Web Push Notifications</p>
        <p className="mt-1">Push notifications are not supported by your current browser environment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Browser Web Push Notifications
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Get instant alerts for price drops & target matches even when Pricely is closed.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {permission === "denied" ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600" />
              <span>Blocked in browser</span>
            </div>
          ) : isSubscribed ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 border border-green-200">
                <CheckCircle2 size={14} className="text-green-600" />
                <span>This device enabled</span>
              </span>
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-red-600 underline font-medium"
              >
                Disable this device
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              <Bell size={14} />
              <span>{loading ? "Requesting..." : "Enable Notifications"}</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <p className="text-xs font-medium text-blue-700 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
          {statusMessage}
        </p>
      )}

      {/* Notification Preferences */}
      <div className="pt-1">
        <p className="text-xs font-bold text-gray-700 mb-2">Notification Types:</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.notifyPriceDrops}
              onChange={(e) => handlePreferenceChange("notifyPriceDrops", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-semibold text-gray-800">🔥 Meaningful Price Drops</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.notifyTargetReached}
              onChange={(e) => handlePreferenceChange("notifyTargetReached", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-semibold text-gray-800">🎯 Target Price Reached</span>
          </label>
        </div>
      </div>
    </div>
  );
}
