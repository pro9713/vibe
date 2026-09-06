import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { isUserAdmin } from "@/lib/auth/admin";
import {
  LayoutDashboard,
  PackagePlus,
  Boxes,
  Store,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const isAdmin = await isUserAdmin(user);
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldCheck size={28} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">403 — Unauthorized Access</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your account ({user.email}) does not have administrative privileges for Vibe.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-gray-800"
            >
              <ArrowLeft size={14} />
              Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-r border-gray-200/80 bg-white p-5 flex flex-col justify-between shadow-xs">
        <div>
          {/* Logo & Admin Badge */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-gray-950">
                VIBE<span className="text-[#FF5126]">.</span>
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 border border-blue-200">
                Admin
              </span>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="mt-6 space-y-1.5">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
            >
              <LayoutDashboard size={16} className="text-gray-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
            >
              <Boxes size={16} className="text-gray-400" />
              <span>All Products</span>
            </Link>

            <Link
              href="/admin/products/new"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
            >
              <PackagePlus size={16} className="text-blue-600" />
              <span>Add Product</span>
            </Link>

            <Link
              href="/admin/retailers"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
            >
              <Store size={16} className="text-gray-400" />
              <span>Manage Retailers</span>
            </Link>
          </nav>
        </div>

        {/* User Info & Store Return */}
        <div className="pt-6 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-900 truncate">{user.email}</p>
              <p className="text-[10px] text-green-600 font-semibold">● Admin Verified</p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-gray-50 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            <span>Live Store</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
