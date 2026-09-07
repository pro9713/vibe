import React from "react";
import Link from "next/link";
import { getAdminDashboardStatsAction } from "./actions";
import {
  Boxes,
  Store,
  CheckCircle2,
  FileEdit,
  PackagePlus,
  ArrowRight,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStatsAction();

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-950">
              Admin Overview
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            Manage custom catalog items, verify incoming retailer feeds, and monitor store integrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/retailers"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs md:text-sm font-bold text-gray-700 shadow-xs transition hover:bg-gray-50 hover:text-gray-950"
          >
            <Store size={15} className="text-purple-600" />
            <span>Retailers</span>
          </Link>

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Managed */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Total DB Items
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Boxes size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.totalProducts}</p>
          <p className="mt-1 text-[11px] text-gray-500">Custom catalog entries</p>
        </div>

        {/* Published */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Published
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.publishedCount}</p>
          <p className="mt-1 text-[11px] text-gray-500">Live in public catalog</p>
        </div>

        {/* Drafts Waiting Review */}
        <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-white p-5 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Drafts / Review
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <FileEdit size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.draftCount}</p>
          <p className="mt-1 text-[11px] text-amber-700/80 font-medium">Pending admin verification</p>
        </div>

        {/* Active Retailers */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Retailers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Store size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.totalRetailers}</p>
          <p className="mt-1 text-[11px] text-gray-500">Configured partners</p>
        </div>

        {/* Store Offers */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Offers Count
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Tag size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{stats.totalOffers || 0}</p>
          <p className="mt-1 text-[11px] text-gray-500">Live store links</p>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600" />
            <h3 className="text-base font-bold text-gray-900">Add Product via Direct Retailer Link</h3>
          </div>
          <p className="mt-1 text-xs md:text-sm text-gray-600 max-w-2xl">
            Paste product URLs from Amazon India, Myntra, Nykaa, AJIO, Tata CLiQ Luxury, or Nike India to clean tracking parameters and attach live store offers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            <span>Open Product Creator</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Drafts Waiting for Review (If any exist) */}
      {stats.draftProducts && stats.draftProducts.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <h2 className="text-base font-bold text-gray-950">Drafts Waiting for Review</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {stats.draftProducts.length} Pending
              </span>
            </div>
            <Link
              href="/admin/products?status=draft"
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              View All Drafts →
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {stats.draftProducts.map((prod) => (
              <div
                key={prod.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                      {prod.brand}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      {prod.offers[0]?.store || "Store"} • ₹
                      {(prod.offers[0]?.price || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    DRAFT
                  </span>
                  <Link
                    href={`/admin/products/${prod.id}/edit`}
                    className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-2xs"
                  >
                    Review & Publish
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Managed Products */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes size={16} className="text-gray-500" />
            <h2 className="text-base font-bold text-gray-950">Recent Catalog Additions</h2>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View All Products ({stats.totalProducts}) →
          </Link>
        </div>

        {stats.recentProducts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Boxes size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-gray-600">No custom admin products created yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Click &quot;Add Product&quot; to insert items into the extended catalog.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
              >
                <PackagePlus size={14} />
                <span>Create First Product</span>
              </Link>
            </div>
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
                      {prod.offers.length > 1 && (
                        <span className="ml-1.5 rounded-sm bg-gray-100 px-1 py-0.2 text-[10px] text-gray-600 font-medium">
                          +{prod.offers.length - 1} more
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
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
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
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
