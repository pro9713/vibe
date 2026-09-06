"use client";

import React from "react";
import { Sparkles, Store, Loader2, Radio, CheckCircle2 } from "lucide-react";

interface LiveSearchResultsBannerProps {
  searchQuery: string;
  localCount: number;
  liveCount: number;
  isLoading: boolean;
  hasSearchedLive: boolean;
  onSearchLive: () => void;
}

export default function LiveSearchResultsBanner({
  searchQuery,
  localCount,
  liveCount,
  isLoading,
  hasSearchedLive,
  onSearchLive,
}: LiveSearchResultsBannerProps) {
  const queryLabel = searchQuery.trim() ? `"${searchQuery.trim()}"` : "this query";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 p-5 md:p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-bold text-blue-700">
              <Radio size={12} className="animate-pulse text-blue-600" />
              Live Retailer Network
            </span>
            {hasSearchedLive && !isLoading && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle2 size={12} />
                Live Deals Active ({liveCount})
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 md:text-lg">
            {hasSearchedLive
              ? `Live retailer inventory loaded for ${queryLabel}`
              : `Want more options for ${queryLabel}?`}
          </h3>

          <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
            {hasSearchedLive
              ? `Showing real-time stock and prices fetched from BlinkIt, Zepto, Instamart, and Amazon.`
              : `We found ${localCount} verified catalog match${localCount === 1 ? "" : "es"}. Click below to query real-time live retailer inventory across quick-commerce stores.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSearchLive}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs md:text-sm font-bold shadow-md transition-all duration-200 active:scale-95 ${
              isLoading
                ? "bg-blue-400 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/20"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Searching Live Retailers...</span>
              </>
            ) : hasSearchedLive ? (
              <>
                <Sparkles size={16} className="text-amber-300 fill-amber-300" />
                <span>Refresh Live Deals</span>
              </>
            ) : (
              <>
                <Store size={16} />
                <span>Search Live Retailers</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
