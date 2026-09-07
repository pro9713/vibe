"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackagePlus,
  Boxes,
  Store,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { AdminSignOutButton } from "./AdminSignOutButton";

interface AdminNavProps {
  userEmail: string;
  adminRole?: string;
  children: React.ReactNode;
}

export function AdminNav({ userEmail, adminRole = "admin", children }: AdminNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      isActive: pathname === "/admin",
    },
    {
      name: "All Products",
      href: "/admin/products",
      icon: Boxes,
      isActive: pathname === "/admin/products" || (pathname.startsWith("/admin/products/") && !pathname.startsWith("/admin/products/new")),
    },
    {
      name: "Add Product",
      href: "/admin/products/new",
      icon: PackagePlus,
      isActive: pathname.startsWith("/admin/products/new"),
    },
    {
      name: "Retailers",
      href: "/admin/retailers",
      icon: Store,
      isActive: pathname.startsWith("/admin/retailers"),
    },
  ];

  const roleLabel = adminRole === "super_admin" ? "Super Admin" : "Admin";

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row">
      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-gray-200/80 bg-white px-5 py-3.5 shadow-xs">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-gray-950">
            VIBE<span className="text-[#FF5126]">.</span>
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 border border-blue-200">
            {roleLabel}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] z-40 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border-b border-gray-200 p-5 space-y-5 shadow-xl">
            <nav className="space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition ${
                      item.isActive
                        ? "bg-blue-50 text-blue-700 font-extrabold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={item.isActive ? "text-blue-600" : "text-gray-400"}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-gray-900 truncate">{userEmail}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck size={10} />
                    <span>{roleLabel} Verified</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  <span>Live Store</span>
                  <ExternalLink size={12} />
                </Link>
                <AdminSignOutButton className="w-full py-2.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-gray-200/80 bg-white p-5 flex-col justify-between shadow-xs sticky top-0 h-screen">
        <div>
          {/* Brand & Role Pill */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-black tracking-tight text-gray-950 group-hover:text-blue-600 transition">
                VIBE<span className="text-[#FF5126]">.</span>
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 border border-blue-200">
                {roleLabel}
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    item.isActive
                      ? "bg-blue-50 text-blue-700 font-extrabold shadow-2xs"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                  }`}
                >
                  <Icon
                    size={16}
                    className={item.isActive ? "text-blue-600" : "text-gray-400"}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Badge, Store Link & Sign Out */}
        <div className="pt-6 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-2xs">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-900 truncate" title={userEmail}>
                {userEmail}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck size={10} />
                <span>{roleLabel} Verified</span>
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 bg-gray-50 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
            >
              <span>View Main Store</span>
              <ExternalLink size={12} />
            </Link>

            <AdminSignOutButton className="w-full" />
          </div>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 p-5 md:p-10 overflow-y-auto">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
