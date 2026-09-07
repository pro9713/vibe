"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAdminProductByIdAction,
  updateAdminProductAction,
  updateProductStatusAction,
} from "@/app/admin/products/actions";
import { isBaselineProductId } from "@/lib/catalog/resolver";
import type { AdminProduct, AdminProductStatus } from "@/lib/admin/types";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Boxes,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Archive,
  RefreshCw,
  Tag,
  Store,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditProductPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isBaseline, setIsBaseline] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [trustScore, setTrustScore] = useState<number>(90);
  const [status, setStatus] = useState<AdminProductStatus>("draft");

  // Primary Offer fields
  const [store, setStore] = useState("");
  const [price, setPrice] = useState<number | string>("");
  const [originalPrice, setOriginalPrice] = useState<number | string>("");
  const [offerUrl, setOfferUrl] = useState("");

  // Submitting states & feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (isBaselineProductId(id)) {
        setIsBaseline(true);
        setLoading(false);
        return;
      }

      try {
        const found = await getAdminProductByIdAction(id);
        if (found) {
          setProduct(found);
          setName(found.name);
          setBrand(found.brand);
          setCategory(found.category);
          setDescription(found.description || "");
          setImage(found.image);
          setTrustScore(found.trustScore || 90);
          setStatus(found.status);

          const primaryOffer = found.offers?.[0];
          if (primaryOffer) {
            setStore(primaryOffer.store);
            setPrice(primaryOffer.price);
            setOriginalPrice(primaryOffer.originalPrice || "");
            setOfferUrl(primaryOffer.url);
          }
        }
      } catch (err) {
        console.warn("[EditProduct] Error loading product:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStatusChange = async (newStatus: AdminProductStatus) => {
    if (isBaseline) {
      setErrorMessage("Baseline catalog products are immutable and cannot be updated.");
      return;
    }
    setStatusLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await updateProductStatusAction(id, newStatus);
      if (res.success) {
        setStatus(newStatus);
        setSuccessMessage(`Product status updated to ${newStatus.toUpperCase()}. Catalog caches purged.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to update status.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error updating status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBaseline) {
      setErrorMessage("Baseline catalog products are immutable and cannot be updated.");
      return;
    }

    if (!name.trim() || !brand.trim() || !category.trim() || !image.trim()) {
      setErrorMessage("Please fill in all required product metadata fields (Name, Brand, Category, Image URL).");
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMessage("Offer price must be a valid number greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateAdminProductAction(id, {
        name: name.trim(),
        brand: brand.trim(),
        category: category.trim(),
        description: description.trim(),
        image: image.trim(),
        trustScore: Number(trustScore) || 90,
        status,
        store: store.trim() || undefined,
        price: numericPrice,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        url: offerUrl.trim() || undefined,
      });

      if (res.success) {
        setSuccessMessage("Product metadata and offers updated successfully. Cache purged.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to update product.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="mt-3 text-xs font-semibold text-gray-500">Loading product details...</p>
      </div>
    );
  }

  if (isBaseline) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Baseline Product is Protected</h2>
        <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
          The product <code className="font-mono font-bold text-gray-900">{id}</code> belongs to the core 52-product baseline catalog in <code className="font-mono text-gray-800">data/products.ts</code> and is strictly immutable.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            <ArrowLeft size={14} />
            <span>Return to Catalog List</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center text-gray-500 space-y-4">
        <Boxes size={36} className="mx-auto text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-xs">No admin product exists with ID &quot;{id}&quot;.</p>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-950">Edit Product</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  status === "published"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : status === "draft"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : status === "hidden"
                    ? "bg-gray-100 text-gray-700 border border-gray-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">ID: {product.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "published" && (
            <Link
              href={`/product/${product.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <ExternalLink size={14} className="text-blue-600" />
              <span>View Live Store Page</span>
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Lifecycle Status Action Bar */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Lifecycle Controls & Status Transition
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Switching status immediately revalidates cache tags and updates public search indexes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {(["draft", "published", "hidden", "archived"] as AdminProductStatus[]).map((st) => {
            const isSelected = status === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                disabled={statusLoading || isSubmitting}
                className={`rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                    : "border-gray-200 bg-white hover:bg-gray-50/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 uppercase">{st}</span>
                  {isSelected && <CheckCircle2 size={14} className="text-blue-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {st === "published"
                    ? "Live in public search & catalog"
                    : st === "draft"
                    ? "Private draft waiting review"
                    : st === "hidden"
                    ? "Hidden from public listings"
                    : "Archived & retired"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSaveForm} className="space-y-6">
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Tag size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Product Metadata</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">Product Name / Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Brand *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
              >
                <option value="Shoes">Shoes</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Watches">Watches</option>
                <option value="Bags">Bags</option>
                <option value="Beauty">Beauty</option>
                <option value="Jackets">Jackets</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">Primary Image URL *</label>
              <div className="flex gap-3">
                <input
                  type="url"
                  required
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                />
                {image && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="Preview"
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">Product Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Trust Score */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Trust Score (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={trustScore}
                onChange={(e) => setTrustScore(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Primary Offer Manager */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Store size={18} className="text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Store Offer Details</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Store / Retailer Name</label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Offer Price (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Original Price / MRP */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Original Price / MRP (₹)</label>
              <input
                type="number"
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="Optional MRP"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Store Product URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">Store Product URL</label>
              <input
                type="url"
                value={offerUrl}
                onChange={(e) => setOfferUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Submit & Cancel Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/admin/products"
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
          >
            Cancel & Back
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || statusLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
