"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseRetailerUrl } from "@/lib/admin/url-parser";
import { createAdminProductAction } from "../actions";
import type { AdminProductStatus } from "@/lib/admin/types";
import type { RetailerBadgeTier } from "@/types/catalog";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackagePlus,
  ShieldCheck,
  Store,
  Tag,
  Image as ImageIcon,
  ExternalLink,
  Layers,
  FileCheck,
} from "lucide-react";

export default function AddProductPage() {
  const router = useRouter();

  // URL Ingestion State
  const [productUrl, setProductUrl] = useState("");
  const [urlFeedback, setUrlFeedback] = useState<{
    domain: string;
    retailerName: string;
    cleanUrl: string;
    productId?: string;
    isSupported: boolean;
  } | null>(null);

  // Product Metadata State
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Shoes");
  const [gender, setGender] = useState("unisex");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sku, setSku] = useState("");
  const [trustScore, setTrustScore] = useState<number>(90);

  // Initial Store Offer State
  const [store, setStore] = useState("Amazon India");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [seller, setSeller] = useState("");
  const [isAuthorizedSeller, setIsAuthorizedSeller] = useState(true);
  const [badgeTier, setBadgeTier] = useState<RetailerBadgeTier>("trusted_retailer");

  // Form Status & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<AdminProductStatus>("draft");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Process and sanitize URL
  const handleUrlChange = (value: string) => {
    setProductUrl(value);
    setErrorMessage(null);

    if (value.trim()) {
      const parsed = parseRetailerUrl(value);
      if (parsed.isValid) {
        setUrlFeedback({
          domain: parsed.domain,
          retailerName: parsed.retailerName,
          cleanUrl: parsed.cleanUrl,
          productId: parsed.productId,
          isSupported: parsed.isSupportedRetailer,
        });

        if (parsed.retailerName && parsed.retailerName !== "Unknown") {
          setStore(parsed.retailerName);
        }
        if (parsed.productId && !sku) {
          setSku(parsed.productId);
        }
      } else {
        setUrlFeedback(null);
      }
    } else {
      setUrlFeedback(null);
    }
  };

  const handleManualDetect = () => {
    if (!productUrl.trim()) {
      setErrorMessage("Please paste a product URL to analyze.");
      return;
    }
    const parsed = parseRetailerUrl(productUrl);
    if (!parsed.isValid) {
      setErrorMessage(parsed.error || "Invalid URL. Please enter a valid HTTP/HTTPS product link.");
      setUrlFeedback(null);
      return;
    }
    setErrorMessage(null);
    setUrlFeedback({
      domain: parsed.domain,
      retailerName: parsed.retailerName,
      cleanUrl: parsed.cleanUrl,
      productId: parsed.productId,
      isSupported: parsed.isSupportedRetailer,
    });
    if (parsed.retailerName && parsed.retailerName !== "Unknown") {
      setStore(parsed.retailerName);
    }
    if (parsed.productId && !sku) {
      setSku(parsed.productId);
    }
  };

  const handleSubmit = async (submitStatus: AdminProductStatus) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim() || !brand.trim() || !imageUrl.trim() || !price.trim() || !productUrl.trim()) {
      setErrorMessage("Please complete all required fields (Name, Brand, Image URL, Price, and Product URL).");
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage("Please enter a valid offer price greater than 0.");
      return;
    }

    const origNum = originalPrice ? Number(originalPrice) : undefined;
    if (origNum !== undefined && (isNaN(origNum) || origNum < 0)) {
      setErrorMessage("Please enter a valid original/MRP price.");
      return;
    }

    setIsSubmitting(true);
    setSubmittingStatus(submitStatus);

    try {
      const res = await createAdminProductAction({
        name: name.trim(),
        brand: brand.trim(),
        category: category.trim(),
        gender,
        description: description.trim(),
        image: imageUrl.trim(),
        sku: sku.trim() || undefined,
        trustScore,
        status: submitStatus, // 'draft' or 'published'

        // Offer
        store: store.trim(),
        price: priceNum,
        originalPrice: origNum,
        currency: "INR",
        url: urlFeedback?.cleanUrl || productUrl.trim(),
        seller: seller.trim() || undefined,
        isAuthorizedSeller,
        badgeTier,
        availability: true,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create product.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        submitStatus === "published"
          ? "Product created and published live to catalog!"
          : "Product saved as draft in admin review queue."
      );

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition"
              title="Back to All Products"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-950">
              Add New Product
            </h1>
          </div>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            Ingest retail URLs, attach sanitized store offers, and extend the catalog with verified products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            Default Status: Draft
          </span>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs md:text-sm font-semibold text-red-700 flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs md:text-sm font-bold text-emerald-800 flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        {/* Step 1: URL Ingestion & Retailer Detection */}
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white p-6 md:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-950">
                1. Retailer Link Ingestion & URL Sanitization
              </h2>
              <p className="text-xs text-gray-500">
                Paste a product URL from Amazon India, Myntra, Nykaa, AJIO, Tata CLiQ Luxury, or Nike India.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Product URL <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={productUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.amazon.in/dp/B0CHX1W1XY or https://www.myntra.com/..."
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleManualDetect}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-bold text-white hover:bg-gray-800 transition"
              >
                <Sparkles size={14} />
                <span>Detect Retailer</span>
              </button>
            </div>
          </div>

          {/* URL Detection Feedback */}
          {urlFeedback && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Detected Retailer:</span>
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 font-bold text-white shadow-2xs">
                    {urlFeedback.retailerName}
                  </span>
                  <span className="text-gray-500">({urlFeedback.domain})</span>
                </div>

                {urlFeedback.productId && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-bold text-gray-700 border border-blue-200">
                    SKU / ASIN: {urlFeedback.productId}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-gray-600 flex items-center gap-1.5 overflow-hidden">
                <span className="font-bold shrink-0">Cleaned URL:</span>
                <span className="truncate text-gray-500">{urlFeedback.cleanUrl}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Core Product Metadata */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-950">2. Product Information</h2>
              <p className="text-xs text-gray-500">
                Core product attributes. All ratings and review counts strictly default to 0.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Product Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nike Air Force 1 '07 Sneakers"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Nike, Apple, Levi's, Zara"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              >
                <option value="Shoes">Shoes / Footwear</option>
                <option value="Clothing">Clothing / Apparel</option>
                <option value="Watches">Watches</option>
                <option value="Bags">Bags & Luggage</option>
                <option value="Beauty">Beauty & Personal Care</option>
                <option value="Electronics">Electronics & Tech</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Gender Classification
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              >
                <option value="unisex">Unisex / Neutral</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Primary Cover Image URL <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 items-start">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://m.media-amazon.com/..."
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                />

                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        (e.target as any).src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100";
                      }}
                    />
                  ) : (
                    <ImageIcon size={20} className="text-gray-300" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                SKU / Model Number
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CW2288-111 or B0CHX1W1XY"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Trust Score (1 - 100)
                </label>
                <span className="text-xs font-black text-blue-600">{trustScore}/100</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={trustScore}
                onChange={(e) => setTrustScore(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of product specifications, materials, and highlights..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Initial Retailer Offer */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Tag size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-950">3. Initial Store Offer</h2>
              <p className="text-xs text-gray-500">
                Configure live pricing, seller credentials, and verification badge.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Store / Retailer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Amazon India, Myntra, Nykaa, etc."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Offer Price (INR ₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 7499"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                MRP / Original Price (INR ₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="e.g. 8999 (Optional for discount calculation)"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Seller Name
              </label>
              <input
                type="text"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                placeholder="e.g. Nike Official Store, RetailNet, Appario"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Verification Badge Tier
              </label>
              <select
                value={badgeTier}
                onChange={(e) => setBadgeTier(e.target.value as RetailerBadgeTier)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs md:text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              >
                <option value="official_brand">Official Brand Store</option>
                <option value="authorized_dealer">Authorized Dealer</option>
                <option value="verified_marketplace">Verified Marketplace</option>
                <option value="trusted_retailer">Trusted Retailer</option>
                <option value="standard">Standard Merchant</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAuthorizedSeller}
                  onChange={(e) => setIsAuthorizedSeller(e.target.checked)}
                  className="h-4 w-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Mark as Authorized / Verified Partner
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Step 4: Submission Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <Link
            href="/admin/products"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-3.5 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting && submittingStatus === "draft" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileCheck size={15} />
            )}
            <span>Save as Draft (Default)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting && submittingStatus === "published" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <PackagePlus size={15} />
            )}
            <span>Save & Publish Live</span>
          </button>
        </div>
      </form>
    </div>
  );
}
