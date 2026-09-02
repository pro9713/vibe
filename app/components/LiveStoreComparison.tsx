"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import type { Product, StoreOffer } from "@/lib/data/types";
import { useLocation } from "@/lib/location";
import { trustedStores } from "@/data/stores";
import { getBestTrustedDeal, getCheapestOffer, analyzeDeals } from "@/data/dealEngine";
import { recordPriceSnapshot } from "@/lib/price-history";

interface LiveStoreComparisonProps {
  product: Product;
  initialOffers: StoreOffer[];
}

export default function LiveStoreComparison({
  product,
  initialOffers,
}: LiveStoreComparisonProps) {
  const location = useLocation();
  const [offers, setOffers] = useState<StoreOffer[]>(initialOffers);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute deal metrics dynamically from current active offers
  const bestTrustedDeal = getBestTrustedDeal(offers);
  const cheapestOffer = getCheapestOffer(offers);
  const dealAnalysis = analyzeDeals(offers);

  const bestPrice = bestTrustedDeal?.price ?? (cheapestOffer?.price || 0);

  // Buy URL for Best Trusted Deal primary CTA
  const primaryBuyUrl =
    bestTrustedDeal?.affiliateUrl ||
    bestTrustedDeal?.url ||
    offers.find((o) => o.price === bestPrice)?.affiliateUrl ||
    offers.find((o) => o.price === bestPrice)?.url ||
    "#";

  // Identify next trusted store for savings calculation
  const trustedSorted = offers
    .filter((item) => {
      const storeInfo = trustedStores.find(
        (s) => s.name.toLowerCase() === item.store.toLowerCase() && s.trusted
      );
      return Boolean(storeInfo);
    })
    .sort((a, b) => a.price - b.price);

  const nextTrustedDeal =
    trustedSorted.find(
      (item) =>
        item.store !== bestTrustedDeal?.store ||
        item.price !== bestTrustedDeal?.price
    ) ?? null;

  const nextTrustedSavings = nextTrustedDeal
    ? nextTrustedDeal.price - bestPrice
    : 0;

  const competitorSavings = dealAnalysis.savings;

  const handleFetchLiveOffers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        productId: product.id,
        lat: String(location.latitude ?? 19.0760),
        lon: String(location.longitude ?? 72.8777),
      });

      if (location.pincode) {
        params.set("pincode", location.pincode);
      }

      const res = await fetch(`/api/quickcommerce/compare?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Comparison API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.offers) && data.offers.length > 0) {
        setOffers(data.offers);
        setIsLive(Boolean(data.isLive));
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

        // Record real live price snapshots into Price History V2
        for (const offer of data.offers) {
          if (offer.price > 0 && offer.availability !== false) {
            recordPriceSnapshot({
              productId: product.id,
              store: offer.store,
              price: offer.price,
              pincode: location.pincode,
              source: "quickcommerce",
            });
          }
        }
      } else if (data.error) {
        setErrorMessage(data.error);
      }
    } catch (err: unknown) {
      console.warn("[Live Comparison Error]:", err);
      setErrorMessage("Live prices are temporarily unavailable. Showing verified catalog rates.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Best Trusted Deal Hero Card */}
      {bestTrustedDeal && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-green-500 bg-gradient-to-br from-green-50/70 via-white to-green-50/40 p-6 md:p-8 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="text-green-600" size={24} />
              <span className="text-lg font-extrabold text-green-900">
                Best Trusted Deal
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                  Live Quote
                </span>
              )}
              <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                Recommended
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-4">
            <span className="text-4xl md:text-5xl font-black text-gray-900">
              ₹{bestTrustedDeal.price.toLocaleString("en-IN")}
            </span>
            {dealAnalysis.highestPrice > bestTrustedDeal.price && (
              <span className="text-lg text-gray-400 line-through">
                ₹{dealAnalysis.highestPrice.toLocaleString("en-IN")}
              </span>
            )}
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
              {dealAnalysis.dealLabel}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Sold by <strong className="text-gray-900">{bestTrustedDeal.store}</strong> (Trust Score:{" "}
            <strong className="text-green-700">{bestTrustedDeal.trustScore}/100</strong>)
          </p>

          {/* Why this deal wins */}
          <div className="mt-6 rounded-2xl border border-green-200 bg-white/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-green-800">
              Why Pricely Picked This Deal
            </p>
            <ul className="mt-2.5 space-y-1.5 text-xs text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <span>Highest trust-rated retailer with best competitive offer</span>
              </li>
              {nextTrustedSavings > 0 && nextTrustedDeal && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span>
                    ₹{nextTrustedSavings.toLocaleString("en-IN")} cheaper than the next trusted store ({nextTrustedDeal.store})
                  </span>
                </li>
              )}
              {dealAnalysis.discountFromAverage > 0 && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span>{dealAnalysis.discountFromAverage}% lower than marketplace average</span>
                </li>
              )}
            </ul>
          </div>

          {/* Primary Action Button */}
          <a
            href={primaryBuyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-center text-base font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 active:scale-[0.99]"
          >
            <span>Buy Now at {bestTrustedDeal.store}</span>
            <ExternalLink size={18} />
          </a>
        </div>
      )}

      {/* Price Comparison Table */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        {/* Header & Location / Live Button Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compare Store Prices</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={13} className={location.isFallback ? "text-gray-400" : "text-blue-600"} />
              <span>
                {location.isFallback
                  ? `Comparing for Mumbai (Default Fallback)`
                  : `Comparing for ${location.label}`}
              </span>
              {lastUpdated && (
                <span className="text-gray-400 font-normal">
                  • Updated {lastUpdated}
                </span>
              )}
            </div>
          </div>

          {/* Action to Compare Live Prices */}
          <button
            type="button"
            onClick={handleFetchLiveOffers}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>{isLoading ? "Checking Live Prices..." : "Compare Live Prices"}</span>
          </button>
        </div>

        {/* Notice/Error Message */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle size={15} className="shrink-0 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Offers List */}
        <div className="mt-6 divide-y divide-gray-100">
          {offers.map((item) => {
            const storeInfo = trustedStores.find(
              (store) => store.name.toLowerCase() === item.store.toLowerCase()
            );
            const isWinner =
              bestTrustedDeal?.store.toLowerCase() === item.store.toLowerCase() &&
              bestTrustedDeal?.price === item.price;

            const isCheapest =
              cheapestOffer?.store.toLowerCase() === item.store.toLowerCase() &&
              cheapestOffer?.price === item.price;

            const offerUrl = item.affiliateUrl || item.url || "#";

            return (
              <div
                key={`${item.store}-${item.price}`}
                className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between transition ${
                  isWinner ? "bg-green-50/50 -mx-4 px-4 rounded-xl" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {item.store}
                    </span>
                    {isWinner && (
                      <span className="rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        Best Deal
                      </span>
                    )}
                    {!isWinner && isCheapest && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Cheapest
                      </span>
                    )}
                    {item.availability === false && (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  {storeInfo && (
                    <p className="text-xs text-gray-500">
                      Store Trust: <strong>{storeInfo.trustScore}/100</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-gray-900">
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <p className="text-[11px] text-gray-400 line-through">
                        ₹{item.originalPrice.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  <a
                    href={offerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      isWinner
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-900 text-white hover:bg-blue-600"
                    }`}
                  >
                    <span>Go to Store</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Bottom Summary */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs font-semibold text-gray-600">
          <div>
            <span>Cheapest Price: </span>
            <strong className="text-gray-900">
              ₹{cheapestOffer?.price.toLocaleString("en-IN")} ({cheapestOffer?.store})
            </strong>
          </div>

          <div>
            <span>Best Trusted Deal: </span>
            <strong className="text-green-700">
              {bestTrustedDeal?.store} (₹{bestTrustedDeal?.price.toLocaleString("en-IN")})
            </strong>
          </div>

          {competitorSavings > 0 && (
            <div className="flex items-center gap-1 text-green-700">
              <TrendingDown size={14} />
              <span>You save up to ₹{competitorSavings.toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
