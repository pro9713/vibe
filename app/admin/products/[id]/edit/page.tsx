"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminProductsAction, toggleAdminProductStatusAction } from "@/app/admin/actions";
import type { AdminProduct, AdminProductStatus } from "@/lib/admin/types";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Boxes,
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
  const [status, setStatus] = useState<AdminProductStatus>("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const all = await getAdminProductsAction();
        const found = all.find((p) => p.id === id);
        if (found) {
          setProduct(found);
          setStatus(found.status);
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
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await toggleAdminProductStatusAction(id, newStatus);
      if (res.success) {
        setStatus(newStatus);
        setSuccessMessage(`Product status updated to ${newStatus}.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.error || "Failed to update status.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error updating status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
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
    <div className="space-y-6 max-w-4xl">
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
            <h1 className="text-2xl font-black text-gray-950">Edit Product</h1>
            <p className="text-xs text-gray-500">ID: {product.id}</p>
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

      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain p-2"
            />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
              {product.brand}
            </span>
            <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-500 mt-1">
              Category: <strong className="text-gray-700">{product.category}</strong> • Price:{" "}
              <strong className="text-gray-900">
                ₹{(product.offers[0]?.price || 0).toLocaleString("en-IN")}
              </strong>{" "}
              on {product.offers[0]?.store || "Store"}
            </p>
          </div>
        </div>

        {/* Status Lifecycle Management */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
            Product Lifecycle Status
          </label>
          <div className="grid gap-3 sm:grid-cols-4">
            {(["draft", "published", "hidden", "archived"] as AdminProductStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                disabled={isSubmitting}
                className={`rounded-2xl border p-3 text-left transition ${
                  status === st
                    ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <p className="text-xs font-bold text-gray-900 capitalize">{st}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {st === "published"
                    ? "Live in public store"
                    : st === "draft"
                    ? "Pending review"
                    : st === "hidden"
                    ? "Invisible to public"
                    : "Archived record"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Source Retailer Link */}
        {product.sourceUrl && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold text-gray-700">Source Retailer URL</p>
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline break-all mt-1 block"
            >
              {product.sourceUrl}
            </a>
          </div>
        )}

        <div className="pt-4 flex items-center justify-between border-t border-gray-100">
          <Link
            href="/admin/products"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to List
          </Link>
          {status === "published" && (
            <Link
              href={`/product/${product.id}`}
              target="_blank"
              className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
            >
              View Public Page →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
