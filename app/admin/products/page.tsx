"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  getAdminProductsAction,
  updateProductStatusAction,
  deleteAdminProductAction,
} from "@/app/admin/products/actions";
import type { AdminProduct, AdminProductStatus } from "@/lib/admin/types";
import {
  Search,
  PackagePlus,
  ExternalLink,
  Trash2,
  Boxes,
  Loader2,
  CheckCircle2,
  EyeOff,
  FileEdit,
  Archive,
  ArrowUpDown,
  Filter,
  RefreshCw,
  AlertCircle,
  ExternalLink as LinkIcon,
  Tag,
} from "lucide-react";

const STATUS_TABS: { label: string; value: string; badgeColor: string }[] = [
  { label: "All Items", value: "all", badgeColor: "bg-gray-100 text-gray-700" },
  { label: "Drafts", value: "draft", badgeColor: "bg-amber-100 text-amber-800" },
  { label: "Published", value: "published", badgeColor: "bg-emerald-100 text-emerald-800" },
  { label: "Hidden", value: "hidden", badgeColor: "bg-gray-200 text-gray-800" },
  { label: "Archived", value: "archived", badgeColor: "bg-red-100 text-red-800" },
];

export default function AdminProductsListPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getAdminProductsAction({
        search: search.trim() || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setProducts(data);
    } catch (err) {
      console.warn("[AdminProducts] Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleStatusChange = async (id: string, newStatus: AdminProductStatus) => {
    setActionLoadingId(id);
    setStatusMessage(null);
    try {
      const res = await updateProductStatusAction(id, newStatus);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Product status updated to ${newStatus.toUpperCase()}. Catalog caches purged.`,
        });
        await fetchProducts();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to update product status.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred while updating status.",
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this custom product? Baseline catalog products cannot be deleted.")) {
      return;
    }
    setActionLoadingId(id);
    setStatusMessage(null);
    try {
      const res = await deleteAdminProductAction(id);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Product successfully deleted.",
        });
        await fetchProducts();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to delete product.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to delete product.",
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Compute counts for status tabs from current product list
  const getTabCount = (tabValue: string) => {
    if (tabValue === "all") return products.length;
    return products.filter((p) => p.status === tabValue).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">Catalog Management</h1>
          <p className="mt-1 text-xs text-gray-500">
            Lifecycle controls, verification, and offer management for database-backed products.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchProducts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            title="Refresh product list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95"
          >
            <PackagePlus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200/80">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>{tab.label}</span>
              {statusFilter === "all" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : tab.badgeColor
                  }`}
                >
                  {getTabCount(tab.value)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter & Search Controls */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, brand, or SKU..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
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
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={28} className="animate-spin text-blue-600" />
            <p className="mt-2 text-xs font-semibold text-gray-500">Loading catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Boxes size={36} className="mx-auto mb-2 opacity-40 text-gray-400" />
            <p className="text-sm font-bold text-gray-800">No products found</p>
            <p className="mt-1 text-xs text-gray-500">
              No items match your selected status or filter criteria.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
              >
                <PackagePlus size={14} />
                <span>Create New Product</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Offer & Store</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Trust Score</th>
                  <th className="py-3.5 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((prod) => {
                  const offer = prod.offers?.[0];
                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="h-full w-full object-contain p-1"
                            />
                          </div>
                          <div className="max-w-xs">
                            <p className="font-black uppercase text-blue-600 text-[10px] tracking-wider">
                              {prod.brand}
                            </p>
                            <p className="font-bold text-gray-900 truncate">{prod.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono truncate">{prod.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-800">{prod.category}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">
                          ₹{(offer?.price || 0).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {offer?.store || "Store"}
                          {prod.offers?.length > 1 && (
                            <span className="ml-1 text-blue-600 font-bold">
                              (+{prod.offers.length - 1})
                            </span>
                          )}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            prod.status === "published"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : prod.status === "draft"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : prod.status === "hidden"
                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {prod.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                          <span className="font-mono text-[11px] font-bold">
                            {prod.trustScore || 90}/100
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Lifecycle Status Dropdown/Buttons */}
                          {prod.status !== "published" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(prod.id, "published")}
                              disabled={actionLoadingId === prod.id}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200/60"
                              title="Publish Live (instantly clears cache for search)"
                            >
                              Publish
                            </button>
                          )}

                          {prod.status === "published" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(prod.id, "hidden")}
                              disabled={actionLoadingId === prod.id}
                              className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 transition"
                              title="Hide from public catalog"
                            >
                              Hide
                            </button>
                          )}

                          {prod.status !== "draft" && prod.status !== "archived" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(prod.id, "draft")}
                              disabled={actionLoadingId === prod.id}
                              className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition border border-amber-200/60"
                              title="Move back to draft"
                            >
                              Draft
                            </button>
                          )}

                          {prod.status !== "archived" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(prod.id, "archived")}
                              disabled={actionLoadingId === prod.id}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 transition"
                              title="Archive product"
                            >
                              <Archive size={14} />
                            </button>
                          )}

                          {/* Edit Details Link */}
                          <Link
                            href={`/admin/products/${prod.id}/edit`}
                            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs"
                            title="Edit full product metadata and offers"
                          >
                            <FileEdit size={14} />
                          </Link>

                          {/* Public View Link if Published */}
                          {prod.status === "published" && (
                            <Link
                              href={`/product/${prod.id}`}
                              target="_blank"
                              className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 transition"
                              title="View public product page"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          )}

                          {/* Permanent Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(prod.id)}
                            disabled={actionLoadingId === prod.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 transition"
                            title="Permanently delete from database"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
