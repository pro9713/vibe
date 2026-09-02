"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowRight } from "lucide-react";
import { products } from "@/data/products";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useWishlist, clearWishlist, syncWithCloud } from "@/lib/wishlist";
import { getClientUser } from "@/lib/auth";

export default function WishlistPage() {
  const wishlist = useWishlist();

  useEffect(() => {
    let mounted = true;

    async function loadCloudWishlist() {
      const user = await getClientUser();
      if (user?.id && mounted) {
        syncWithCloud(user.id).catch(() => {});
      }
    }

    loadCloudWishlist();

    const handleAuthChange = (e: Event) => {
      const user = (e as CustomEvent).detail;
      if (user?.id && mounted) {
        syncWithCloud(user.id).catch(() => {});
      }
    };

    window.addEventListener("auth-state-changed", handleAuthChange);
    return () => {
      mounted = false;
      window.removeEventListener("auth-state-changed", handleAuthChange);
    };
  }, []);

  const wishlistProducts = products.filter((product) =>
    wishlist.includes(product.id)
  );

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
                <Heart size={14} className="fill-red-500 text-red-500" />
                <span>Saved Collections</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                My Wishlist
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor prices and deals for all your saved fashion items
              </p>
            </div>

            {wishlistProducts.length > 0 && (
              <button
                type="button"
                onClick={() => clearWishlist()}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-red-50 hover:text-red-600 sm:self-auto"
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {wishlistProducts.length === 0 ? (
            <div className="my-16 flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Heart size={32} />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold text-gray-900">
                Your wishlist is empty
              </h2>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Tap the heart icon on any product card while browsing to save it and track real-time price drops.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/search?category=Shoes"
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  👟 Browse Shoes
                </Link>
                <Link
                  href="/search?category=Men"
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  👕 Men&apos;s Fashion
                </Link>
                <Link
                  href="/search?category=Women"
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  👗 Women&apos;s Fashion
                </Link>
              </div>

              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <span>Discover Trending Deals</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="mt-10">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {wishlistProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    brand={product.brand}
                    price={`₹${product.bestDeal.price.toLocaleString("en-IN")}`}
                    store={product.bestDeal.store}
                    rating={product.rating}
                    reviews={product.reviews}
                    trustScore={product.trustScore}
                    image={product.image}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}