"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  TrendingDown,
  CheckCheck,
  Trash2,
  ExternalLink,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  X,
  Target,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import NotificationSettings from "@/app/components/NotificationSettings";
import {
  usePriceAlerts,
  useUnreadAlertsCount,
  markPriceAlertRead,
  markAllPriceAlertsRead,
  deletePriceAlert,
  clearPriceAlerts,
  syncAlertsWithCloud,
  type PriceAlert,
} from "@/lib/price-alerts";
import { useAuth } from "@/lib/auth/use-auth";
import { getTrackedTargets, type TrackedTarget } from "@/lib/wishlist";
import { products } from "@/data/products";

function formatRelativeTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return "Recently";
    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  } catch {
    return "Recently";
  }
}

export default function AlertsPage() {
  const alerts = usePriceAlerts();
  const unreadCount = useUnreadAlertsCount();
  const { user, isAuthenticated } = useAuth();
  const [trackedTargets, setTrackedTargets] = useState<Record<string, TrackedTarget>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTrackedTargets(getTrackedTargets());

      const updateTargets = () => {
        setTrackedTargets(getTrackedTargets());
      };
      window.addEventListener("tracked-targets-updated", updateTargets);
      return () => {
        window.removeEventListener("tracked-targets-updated", updateTargets);
      };
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      syncAlertsWithCloud(user.id).catch(() => {});
    }
  }, [isAuthenticated, user?.id]);

  const handleClear = () => {
    if (alerts.length === 0) return;
    if (window.confirm("Are you sure you want to clear all price alerts? This cannot be undone.")) {
      clearPriceAlerts();
    }
  };

  const handleDelete = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    deletePriceAlert(alertId);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900">
                  Price Alerts
                </h1>
                {unreadCount > 0 && (
                  <span className="flex items-center rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-700">
                    {unreadCount} unread
                  </span>
                )}
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                    <Smartphone size={12} />
                    <span>Cloud Synced</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Real-time price drop and target alerts from your tracked products
              </p>
            </div>

            {alerts.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllPriceAlertsRead}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                  >
                    <CheckCheck size={14} className="text-blue-600" />
                    <span>Mark all as read</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 shadow-sm transition hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 active:scale-95"
                >
                  <Trash2 size={14} />
                  <span>Clear all</span>
                </button>
              </div>
            )}
          </div>

          {/* Automatic Monitoring Status Card */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/30 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  Automated Background Price Monitoring
                </p>
                <p className="text-[11px] text-gray-500">
                  Scheduled server execution runs every 60 mins to detect price drops and target matches.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">
              Active / Hourly
            </span>
          </div>

          {/* Notification Settings */}
          <div className="mt-6">
            <NotificationSettings />
          </div>

          {/* Active Tracked Targets Section */}
          {Object.keys(trackedTargets).length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Target size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-gray-900">
                      Active Price Targets ({Object.keys(trackedTargets).length})
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      Products being actively monitored for your desired target prices
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                {Object.values(trackedTargets).map((target) => {
                  const product = products.find((p) => p.id === target.productId);
                  const name = product?.name || target.productId;

                  return (
                    <Link
                      key={target.productId}
                      href={`/product/${target.productId}`}
                      className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-bold text-gray-900 group-hover:text-blue-600">
                          {name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          Target Price:{" "}
                          <span className="font-bold text-emerald-600">
                            {target.targetPrice ? `₹${target.targetPrice.toLocaleString("en-IN")}` : "Any drop"}
                          </span>
                        </p>
                      </div>
                      <ExternalLink size={14} className="shrink-0 text-gray-400 group-hover:text-blue-600" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alerts List or Empty State */}
          <div className="mt-8 space-y-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Bell size={28} />
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900">
                  You&apos;re all caught up
                </h3>
                <p className="mt-1 max-w-sm text-xs text-gray-500">
                  Track products or set a target price, and Pricely will show real price drops and deal alerts here.
                </p>
                <Link
                  href="/search"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
                >
                  <span>Explore Products</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              alerts.map((alert) => {
                const isTargetReached = alert.type === "TARGET_REACHED";

                return (
                  <div
                    key={alert.id}
                    onClick={() => markPriceAlertRead(alert.id)}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all cursor-pointer ${
                      alert.read
                        ? "border-gray-200 bg-white hover:border-gray-300"
                        : isTargetReached
                        ? "border-green-300 bg-gradient-to-r from-green-50/70 via-white to-white shadow-sm"
                        : "border-blue-300 bg-gradient-to-r from-blue-50/70 via-white to-white shadow-sm"
                    }`}
                  >
                    {!alert.read && (
                      <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                    )}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isTargetReached
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isTargetReached ? <Bell size={20} /> : <TrendingDown size={20} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                isTargetReached
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isTargetReached ? "Target Price Reached" : "Price Drop"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(alert.timestamp)}
                            </span>
                          </div>

                          <h2 className="mt-1 text-base font-bold text-gray-900">
                            {alert.productName}
                          </h2>

                          <p className="text-xs text-gray-500">
                            Sold by <strong className="text-gray-700">{alert.store}</strong>
                            {alert.pincode && (
                              <span> • PIN {alert.pincode}</span>
                            )}
                          </p>

                          {/* Metric Detail */}
                          <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
                            <span className="text-lg font-black text-gray-900">
                              ₹{alert.currentPrice.toLocaleString("en-IN")}
                            </span>

                            {isTargetReached && alert.targetPrice && (
                              <span className="text-xs font-semibold text-green-700">
                                Target: ₹{alert.targetPrice.toLocaleString("en-IN")} ✓
                              </span>
                            )}

                            {!isTargetReached && alert.previousPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                ₹{alert.previousPrice.toLocaleString("en-IN")}
                              </span>
                            )}

                            {alert.dropAmount && alert.dropPercentage && (
                              <span className="flex items-center gap-0.5 text-xs font-bold text-green-700">
                                <TrendingDown size={13} />
                                <span>
                                  ↓ ₹{alert.dropAmount.toLocaleString("en-IN")} ({alert.dropPercentage}%)
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Link
                          href={`/product/${alert.productId}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600 active:scale-95"
                        >
                          <span>View Product</span>
                          <ExternalLink size={13} />
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, alert.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition"
                          title="Delete alert"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
