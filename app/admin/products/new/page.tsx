"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseRetailerProductUrl } from "@/lib/admin/urlParser";
import { createAdminProductAction } from "@/app/admin/actions";
import type { AdminProductStatus } from "@/lib/admin/types";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackagePlus,
  Eye,
  ShieldCheck,
  Star,
} from "lucide-react";

export default function AddProductPage() {
  const router = useRouter();

  // Form State
  const [productUrl, setProductUrl] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Shoes");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [store, setStore] = useState("Amazon");
  const [availability, setAvailability] = useState(true);
  const [status, setStatus] = useState<AdminProductStatus>("draft");

  // UI State
  const [urlFeedback, setUrlFeedback] = useState<{ domain?: string; detectedStore?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle URL Paste / Input
  const handleUrlChange = (value: string) => {
    setProductUrl(value);
    setErrorMessage(null);

    if (value.trim()) {
      const parsed = parseRetailerProductUrl(value);
      if (parsed.isValid) {
        setUrlFeedback({ domain: parsed.domain, detectedStore: parsed.detectedStore });
        if (parsed.detectedStore) {
          setStore(parsed.detectedStore);
        }
      } else {
        setUrlFeedback(null);
      }
    } else {
      setUrlFeedback(null);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim() || !brand.trim() || !imageUrl.trim() || !price.trim() || !productUrl.trim()) {
      setErrorMessage("Please fill in all mandatory product fields.");
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage("Please enter a valid price greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminProductAction({
        name: name.trim(),
        brand: brand.trim(),
        category,
        description: description.trim(),
        image: imageUrl.trim(),
        price: priceNum,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        store: store.trim(),
        url: productUrl.trim(),
        availability,
        status, // Defaults to 'draft'
        rating: 0,
        reviews: 0,
        trustScore: 0,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create product.");
      } else {
        setSuccessMessage("Product created successfully! Redirecting to products list...");
        setTimeout(() => {
          router.push("/admin/products");
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const priceVal = Number(price) || 0;
  const originalVal = Number(originalPrice) || 0;
  const savings = originalVal > priceVal ? originalVal - priceVal : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-950">Add Product</h1>
            <p className="text-xs text-gray-500">
              Enter retailer product link or fill in details manually.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-green-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Step 1: Retailer URL Auto-Detection Box */}
          <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5 shadow-xs space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900">
              <Sparkles size={14} className="text-blue-600 fill-blue-600" />
              1. Paste Retailer Product URL
            </label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.amazon.in/dp/... or https://www.myntra.com/..."
              className="w-full rounded-2xl border border-blue-200 bg-white p-3 text-xs text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
            {urlFeedback && (
              <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold">
                <CheckCircle2 size={13} className="text-blue-600" />
                <span>Detected Domain: {urlFeedback.domain}</span>
                {urlFeedback.detectedStore && (
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    Store: {urlFeedback.detectedStore}
                  </span>
                )}
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              Extracts domain and cleans URL parameters without web scraping.
            </p>
          </div>

          {/* Step 2: Product Core Information */}
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
              2. Product Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Nike, Zara, Casio"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="Shoes">Shoes</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Watches">Watches</option>
                  <option value="Bags">Bags</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Product Title / Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Air Zoom Pegasus 40 Running Shoes"
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key highlights, material, size details..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Image URL *
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or CDN link"
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Step 3: Pricing & Store Offer */}
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
              3. Store Offer & Pricing
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Store / Retailer *
                </label>
                <input
                  type="text"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder="e.g. Amazon, Myntra, Zara"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Offer Price (₹) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2999"
                  min="1"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Original MRP (₹)
                </label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="4999"
                  min="1"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Availability
                </label>
                <select
                  value={availability ? "in_stock" : "out_of_stock"}
                  onChange={(e) => setAvailability(e.target.value === "in_stock")}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="in_stock">In Stock / Available</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Lifecycle Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AdminProductStatus)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="draft">Draft (Review first)</option>
                  <option value="published">Published (Live in Store)</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/admin/products"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition disabled:bg-blue-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <PackagePlus size={16} />
                  <span>Save {status === "draft" ? "as Draft" : "and Publish"}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Card Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <Eye size={14} />
            <span>Store Preview</span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-[#F8F9FA] flex items-center justify-center">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={name || "Product preview"}
                  className="h-full w-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/placeholder.png";
                  }}
                />
              ) : (
                <div className="text-center text-xs text-gray-400">
                  <p>Image preview will appear here</p>
                </div>
              )}

              {savings > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                  SAVE ₹{savings.toLocaleString("en-IN")}
                </span>
              )}

              <span
                className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs ${
                  status === "published"
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {status.toUpperCase()}
              </span>
            </div>

            <div className="p-3 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#FF5126] tracking-wider">
                  {brand || "Brand"}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                  <ShieldCheck size={11} />
                  <span>Unverified</span>
                </span>
              </div>

              <h4 className="text-sm font-bold text-gray-950 line-clamp-2">
                {name || "Product Title Name"}
              </h4>

              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <Star size={12} className="text-gray-300" />
                <span>No ratings yet</span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                <div>
                  <p className="text-xl font-black text-gray-950">
                    ₹{priceVal.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Cheapest on <strong className="text-gray-800">{store || "Store"}</strong>
                  </p>
                </div>
                {originalVal > priceVal && (
                  <p className="text-xs text-gray-400 line-through">
                    ₹{originalVal.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
