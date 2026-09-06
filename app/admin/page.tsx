import React from "react";
import Link from "next/link";
import { getAdminDashboardStatsAction } from "./actions";
import {
  Boxes,
  Store,
  CheckCircle2,
  FileEdit,
  EyeOff,
  PackagePlus,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStatsAction();

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-950">
            Admin Product Manager
          </h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            Manage custom catalog items, manual store entries, and retailer integrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
          >
            <PackagePlus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Managed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Boxes size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.totalProducts}</p>
          <p className="mt-1 text-[11px] text-gray-500">Custom admin products</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Published
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.publishedCount}</p>
          <p className="mt-1 text-[11px] text-gray-500">Live in public store</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Drafts / Review
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <FileEdit size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.draftCount}</p>
          <p className="mt-1 text-[11px] text-gray-500">Pending admin review</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Retailers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Store size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.totalRetailers}</p>
          <p className="mt-1 text-[11px] text-gray-500">Configured store partners</p>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Add Product via Retailer Link</h3>
          <p className="mt-1 text-xs md:text-sm text-gray-600">
            Paste any retailer URL (Amazon, Myntra, Flipkart, Zara, etc.) to automatically detect the store and add verified product entries.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
        >
          <span>Open Product Creator</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Recent Managed Products */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-950">Recent Additions</h2>
          <Link
            href="/admin/products"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View All Products →
          </Link>
        </div>

        {stats.recentProducts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Boxes size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No custom admin products created yet.</p>
            <p className="mt-1 text-xs">
              Click &quot;Add Product&quot; to manually insert items into the extended catalog.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recentProducts.map((prod) => (
              <div
                key={prod.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-blue-600 tracking-wider">
                      {prod.brand}
                    </p>
                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                      {prod.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {prod.offers[0]?.store || "Store"} • ₹
                      {(prod.offers[0]?.price || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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

                  <Link
                    href={`/admin/products/${prod.id}/edit`}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Edit
                  </Link>

                  {prod.status === "published" && (
                    <Link
                      href={`/product/${prod.id}`}
                      target="_blank"
                      className="rounded-xl p-1.5 text-gray-400 hover:text-gray-900 transition"
                      title="View public product page"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
