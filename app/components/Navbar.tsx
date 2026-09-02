"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Bell, Menu, X, Search, User } from "lucide-react";
import { useState } from "react";
import { useWishlist } from "@/lib/wishlist";
import { useUnreadAlertsCount } from "@/lib/price-alerts";
import { useAuth } from "@/lib/auth/use-auth";
import LocationSelector from "./LocationSelector";

export default function Navbar() {
  const wishlist = useWishlist();
  const wishlistCount = wishlist.length;
  const unreadAlertsCount = useUnreadAlertsCount();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navCategories = [
    { label: "Men", href: "/search?category=Men" },
    { label: "Women", href: "/search?category=Women" },
    { label: "Shoes", href: "/search?category=Shoes" },
    { label: "Bags", href: "/search?category=Bags" },
    { label: "Watches", href: "/search?category=Watches" },
    { label: "Beauty", href: "/search?category=Beauty" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#F8F9FA]/90 backdrop-blur-md border-b border-gray-200/60 transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Left: Vibe 3D Logo */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex shrink-0 items-center transition-transform hover:scale-105 active:scale-95"
            aria-label="Vibe Home"
          >
            <Image
              src="/vibe-logo.svg"
              alt="Vibe"
              width={120}
              height={44}
              priority
              className="h-10 sm:h-11 w-auto object-contain"
            />
          </Link>

          {/* Center: Navigation Text Links */}
          <div className="hidden items-center justify-center gap-8 font-semibold text-gray-700 md:flex flex-1">
            <Link
              href="/search?deal=true"
              className="text-sm transition-colors hover:text-[#FF5126]"
            >
              Deals
            </Link>

            <div className="relative group">
              <Link
                href="/search"
                className="text-sm transition-colors hover:text-[#FF5126] flex items-center gap-1"
              >
                Categories
              </Link>
              <div className="absolute left-0 top-full hidden pt-2 group-hover:block z-50">
                <div className="rounded-3xl border border-gray-100 bg-white p-2.5 shadow-xl w-48">
                  {navCategories.map((cat) => (
                    <Link
                      key={cat.label}
                      href={cat.href}
                      className="block rounded-full px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-[#FF5126]"
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/wishlist"
              className="text-sm transition-colors hover:text-[#FF5126]"
            >
              Wishlist
            </Link>

            <Link
              href="/alerts"
              className="text-sm transition-colors hover:text-[#FF5126]"
            >
              Alerts
            </Link>
          </div>

          {/* Right: Minimal Utility Icons & Pills */}
          <div className="hidden items-center gap-3 md:flex shrink-0">
            {/* Location Selector */}
            <LocationSelector />

            {/* Search Icon */}
            <Link
              href="/search"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-[#1A73E8] hover:text-[#1A73E8] shadow-xs active:scale-95"
            >
              <Search size={18} />
            </Link>

            {/* Wishlist Heart Icon */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-red-400 hover:text-red-500 shadow-xs active:scale-95"
            >
              <Heart
                size={18}
                className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""}
              />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Alerts Bell Icon */}
            <Link
              href="/alerts"
              aria-label="Alerts"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-[#FF5126] hover:text-[#FF5126] shadow-xs active:scale-95"
            >
              <Bell
                size={18}
                className={unreadAlertsCount > 0 ? "fill-[#FF5126] text-[#FF5126]" : ""}
              />
              {unreadAlertsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5126] px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </Link>

            {/* Profile Avatar / Sign In */}
            {isAuthenticated && user ? (
              <Link
                href="/account"
                aria-label="Account Dashboard"
                className="flex h-10 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-[#1A73E8] transition hover:bg-blue-100 shadow-xs"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A73E8] text-[10px] font-bold text-white">
                  {user.email.slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[80px] truncate">{user.email.split("@")[0]}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                aria-label="Sign In"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-[#1A73E8] hover:text-[#1A73E8] shadow-xs active:scale-95"
              >
                <User size={18} />
              </Link>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <LocationSelector />

            <Link
              href="/alerts"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
              aria-label="View alerts"
            >
              <Bell
                size={18}
                className={unreadAlertsCount > 0 ? "fill-[#FF5126] text-[#FF5126]" : ""}
              />
              {unreadAlertsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5126] px-1 text-[10px] font-bold text-white">
                  {unreadAlertsCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200/80 py-6 md:hidden">
            <div className="flex flex-col gap-1 text-base font-semibold text-gray-800">
              <Link
                href="/search?deal=true"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2.5 font-bold text-[#FF5126]"
              >
                <span>Trending Deals</span>
              </Link>

              <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                Categories
              </p>
              {navCategories.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  onClick={closeMobileMenu}
                  className="rounded-full px-4 py-2 transition hover:bg-gray-100"
                >
                  {cat.label}
                </Link>
              ))}

              <div className="my-2 border-t border-gray-200/80 pt-3">
                <Link
                  href="/alerts"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between rounded-full px-4 py-2.5 transition hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={18} className={unreadAlertsCount > 0 ? "fill-[#FF5126] text-[#FF5126]" : "text-gray-600"} />
                    <span>Price Alerts</span>
                  </div>
                  {unreadAlertsCount > 0 && (
                    <span className="rounded-full bg-[#FF5126] px-2 py-0.5 text-xs font-bold text-white">
                      {unreadAlertsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/wishlist"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between rounded-full px-4 py-2.5 transition hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Heart size={18} className={wishlistCount > 0 ? "fill-red-500 text-red-500" : "text-gray-600"} />
                    <span>My Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                {isAuthenticated && user ? (
                  <Link
                    href="/account"
                    onClick={closeMobileMenu}
                    className="mt-3 flex items-center justify-center gap-2 w-full rounded-full bg-gray-100 py-3 text-center font-bold text-gray-800 shadow-xs"
                  >
                    <span>My Account ({user.email.split("@")[0]})</span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="mt-3 block w-full rounded-full bg-gradient-to-r from-[#FF5126] to-[#E64A19] py-3 text-center font-bold text-white shadow-md shadow-orange-500/20"
                  >
                    Sign In / Sign Up
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}