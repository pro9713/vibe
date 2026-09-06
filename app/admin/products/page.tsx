"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getAdminProductsAction,
  toggleAdminProductStatusAction,
  deleteAdminProductAction,
} from "@/app/admin/actions";
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
} from "lucide-react";

export default function AdminProductsListPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  const handleStatusToggle = async (id: string, newStatus: AdminProductStatus) => {
    setActionLoadingId(id);
    try {
      await toggleAdminProductStatusAction(id, newStatus);
      await fetchProducts();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this product?")) {
      return;
    }
    setActionLoadingId(id);
    try {
      await deleteAdminProductAction(id);
      await fetchProducts();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">Managed Products</h1>
          <p className="mt-1 text-xs text-gray-500">
            {products.length} custom product{products.length === 1 ? "" : "s"} in database
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95"
        >
          <PackagePlus size={16} />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or brand..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-xs text-gray-900 outline-none focus:border-blue-500"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Shoes">Shoes</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Watches">Watches</option>
              <option value="Bags">Bags</option>
              <option value="Beauty">Beauty</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="hidden">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Boxes size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No products found matching filters.</p>
            <p className="mt-1 text-xs">Try adjusting your search criteria or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Store & Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
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
                          <p className="text-[10px] text-gray-400 truncate">{prod.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-gray-700">{prod.category}</td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">
                        ₹{(prod.offers[0]?.price || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {prod.offers[0]?.store || "Store"}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          prod.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : prod.status === "draft"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {prod.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Status Toggle Action */}
                        {prod.status !== "published" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(prod.id, "published")}
                            disabled={actionLoadingId === prod.id}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            title="Publish product to live store"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(prod.id, "hidden")}
                            disabled={actionLoadingId === prod.id}
                            className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 transition"
                            title="Hide from public store"
                          >
                            Hide
                          </button>
                        )}

                        {prod.status === "published" && (
                          <Link
                            href={`/product/${prod.id}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-900 transition"
                            title="View public product page"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(prod.id)}
                          disabled={actionLoadingId === prod.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 transition"
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
