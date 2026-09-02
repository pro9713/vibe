"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Sparkles } from "lucide-react";
import { products } from "@/data/products";
import { useRecentlyViewed, removeRecentlyViewed } from "@/lib/recently-viewed";

export default function RecentlyViewed() {
  const recentIds = useRecentlyViewed();

  const recentProducts = recentIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is (typeof products)[number] => Boolean(product));

  if (recentProducts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-gray-100 bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Sparkles size={14} />
              <span>Browsing History</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Recently Viewed
            </h2>
            <p className="mt-1 text-gray-500">
              Quickly jump back into items you were recently comparing
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {recentProducts.map((product) => (
            <div
              key={product.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeRecentlyViewed(product.id);
                }}
                className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100"
                title="Remove from recently viewed"
                aria-label="Remove item"
              >
                <X size={14} />
              </button>

              <Link href={`/product/${product.id}`} className="block">
                <div className="relative h-36 w-full overflow-hidden rounded-xl bg-gray-50">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    {product.brand}
                  </p>
                  <h3 className="mt-0.5 line-clamp-1 text-sm font-bold text-gray-900 group-hover:text-blue-600">
                    {product.name}
                  </h3>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-base font-extrabold text-gray-900">
                      ₹{product.bestDeal.price.toLocaleString("en-IN")}
                    </p>
                    <span className="text-[11px] font-medium text-gray-500">
                      {product.bestDeal.store}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}