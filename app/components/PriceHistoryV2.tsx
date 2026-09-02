"use client";

import { useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  Bell,
  Check,
  Calendar,
  AlertCircle,
  HelpCircle,
  Tag,
} from "lucide-react";
import type { Product } from "@/lib/data/types";
import { usePriceHistory, type PriceAnalytics } from "@/lib/price-history";
import { useLocation } from "@/lib/location";
import { useTrackedTarget, setTrackedTarget, removeTrackedTarget } from "@/lib/wishlist";

interface PriceHistoryV2Props {
  product: Product;
}

export default function PriceHistoryV2({ product }: PriceHistoryV2Props) {
  const location = useLocation();
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedDays, setSelectedDays] = useState<number>(90);
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>("");

  const trackedTarget = useTrackedTarget(product.id);
  const isTracked = Boolean(trackedTarget);

  // Subscribe to real price snapshots
  const { history, analytics } = usePriceHistory(product.id, {
    store: selectedStore,
    days: selectedDays,
    pincode: location.pincode,
  });

  // Extract unique stores present in this product's history and active offers
  const availableStores = Array.from(
    new Set([
      ...product.offers.map((o) => o.store),
      ...history.map((h) => h.store).filter((s): s is string => Boolean(s)),
    ])
  );

  // SVG Chart Dimensions
  const chartWidth = 700;
  const chartHeight = 240;
  const padding = 45;

  const prices = history.map((item) => item.price);
  const maxPrice = Math.max(...prices, 1);
  const minPrice = Math.min(...prices, 0);

  const points = history.map((item, index) => {
    const x =
      history.length === 1
        ? chartWidth / 2
        : padding + (index / (history.length - 1)) * (chartWidth - padding * 2);

    const range = maxPrice - minPrice || 1;
    const y = padding + ((maxPrice - item.price) / range) * (chartHeight - padding * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const path = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(targetInput.replace(/[^\d]/g, ""), 10);
    if (!isNaN(num) && num > 0) {
      setTrackedTarget(product.id, num);
      setIsEditingTarget(false);
      setTargetInput("");
    }
  };

  const handleToggleTracking = () => {
    if (isTracked) {
      removeTrackedTarget(product.id);
      setIsEditingTarget(false);
    } else {
      const defaultTarget = Math.round(product.bestDeal.price * 0.9);
      setTrackedTarget(product.id, defaultTarget);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Price History & Trends</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                analytics.dealStatus === "great"
                  ? "bg-green-100 text-green-800"
                  : analytics.dealStatus === "good"
                  ? "bg-amber-100 text-amber-800"
                  : analytics.dealStatus === "high"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {analytics.dealStatusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Real historical observations recorded across retail partners
          </p>
        </div>

        {/* Time Range Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 text-xs font-semibold text-gray-700 self-start sm:self-auto">
          {[
            { label: "7D", days: 7 },
            { label: "30D", days: 30 },
            { label: "90D", days: 90 },
            { label: "All", days: 0 },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setSelectedDays(tab.days)}
              className={`rounded-lg px-3 py-1.5 transition ${
                selectedDays === tab.days
                  ? "bg-white text-gray-900 shadow-sm font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Store Filter Tabs */}
      {availableStores.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-bold text-gray-400 mr-1">Store:</span>
          <button
            type="button"
            onClick={() => setSelectedStore("all")}
            className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
              selectedStore === "all"
                ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Stores
          </button>
          {availableStores.map((store) => (
            <button
              key={store}
              type="button"
              onClick={() => setSelectedStore(store)}
              className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                selectedStore.toLowerCase() === store.toLowerCase()
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {store}
            </button>
          ))}
        </div>
      )}

      {/* Deal Insight Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Pricely Price Insight
            </p>
            <p className="mt-1 text-xs text-blue-950 leading-relaxed font-medium">
              {analytics.dealInsight}
            </p>
            {analytics.priceDrop && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-green-700">
                <TrendingDown size={14} />
                <span>
                  Recent drop: ₹{analytics.priceDrop.amount.toLocaleString("en-IN")} ({analytics.priceDrop.percentage}%) compared to previous observation
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5">
          <span className="text-[11px] font-semibold text-gray-500">Current Price</span>
          <p className="mt-1 text-lg font-black text-gray-900">
            ₹{analytics.currentPrice.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50/40 p-3.5">
          <span className="text-[11px] font-semibold text-green-700">Lowest Recorded</span>
          <p className="mt-1 text-lg font-black text-green-800">
            ₹{analytics.lowestPrice.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5">
          <span className="text-[11px] font-semibold text-gray-500">Average Price</span>
          <p className="mt-1 text-lg font-black text-gray-900">
            ₹{analytics.averagePrice.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5">
          <span className="text-[11px] font-semibold text-gray-500">Highest Recorded</span>
          <p className="mt-1 text-lg font-black text-gray-900">
            ₹{analytics.highestPrice.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* SVG Chart or Insufficient History State */}
      {!analytics.hasSufficientData ? (
        <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Clock size={24} />
          </div>
          <h3 className="mt-3 text-sm font-bold text-gray-900">
            Price history is being collected
          </h3>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {history.length === 1
              ? "1 real price observation recorded. Pricely needs more observations over time to render a trend chart."
              : "Pricely needs more real observations for this specific filter to render a trend chart."}
          </p>
        </div>
      ) : (
        <div className="mt-4 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-64 w-full min-w-[500px]"
          >
            {/* Guide lines */}
            <line
              x1={padding}
              y1={padding}
              x2={chartWidth - padding}
              y2={padding}
              stroke="#f3f4f6"
              strokeDasharray="4 4"
            />
            <line
              x1={padding}
              y1={chartHeight / 2}
              x2={chartWidth - padding}
              y2={chartHeight / 2}
              stroke="#f3f4f6"
              strokeDasharray="4 4"
            />
            <line
              x1={padding}
              y1={chartHeight - padding}
              y2={chartHeight - padding}
              x2={chartWidth - padding}
              stroke="#e5e7eb"
            />

            {/* Price Trend Line */}
            <path
              d={path}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {points.map((point, index) => {
              const isLowest = point.price === analytics.lowestPrice;
              const isLast = index === points.length - 1;

              return (
                <g key={`${point.date}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isLowest || isLast ? "6" : "4.5"}
                    fill={isLowest ? "#16a34a" : isLast ? "#2563eb" : "#ffffff"}
                    stroke={isLowest ? "#16a34a" : "#2563eb"}
                    strokeWidth="2.5"
                    className="transition-all hover:r-8"
                  />
                  {/* Price Tag above point */}
                  <text
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    className={`text-[11px] font-bold ${
                      isLowest ? "fill-green-700" : "fill-gray-700"
                    }`}
                  >
                    ₹{point.price.toLocaleString("en-IN")}
                  </text>
                  {/* Date label below axis */}
                  <text
                    x={point.x}
                    y={chartHeight - padding + 22}
                    textAnchor="middle"
                    className="text-[10px] fill-gray-400 font-medium"
                  >
                    {point.month || (point.date ? new Date(point.date).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Price Tracking & Target Alert Section */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                isTracked ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
              }`}
            >
              <Bell size={18} className={isTracked ? "fill-red-500 text-red-500" : ""} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Price Drop Tracking</h4>
              <p className="text-xs text-gray-500">
                {isTracked
                  ? trackedTarget?.targetPrice
                    ? `Target price set to ₹${trackedTarget.targetPrice.toLocaleString("en-IN")}.`
                    : "Product is active in your Price Watch list."
                  : "Save this product to track price drops locally."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTracked && (
              <button
                type="button"
                onClick={() => {
                  setTargetInput(String(trackedTarget?.targetPrice || Math.round(analytics.currentPrice * 0.9)));
                  setIsEditingTarget(!isEditingTarget);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {isEditingTarget ? "Cancel" : "Set Target"}
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleTracking}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 ${
                isTracked
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              }`}
            >
              {isTracked ? "Tracking Active ✓" : "Track Price"}
            </button>
          </div>
        </div>

        {/* Target Price Edit Form */}
        {isEditingTarget && isTracked && (
          <form onSubmit={handleSaveTarget} className="mt-4 border-t border-gray-200/60 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="target-price" className="text-xs font-bold text-gray-700">
                Target Price (₹):
              </label>
              <input
                id="target-price"
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="e.g. 2200"
                className="w-36 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Save Target
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              * Local target saved in browser. Automatic alerts will be enabled in a future release.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
