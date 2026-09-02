"use client";

import Image from "next/image";
import { Heart, Star, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toggleWishlist, useWishlist } from "@/lib/wishlist";

type ProductCardProps = {
  id: string;
  name: string;
  brand: string;
  price: string;
  store: string;
  rating: number;
  reviews: number;
  trustScore: number;
  image: string;
};

export default function ProductCard({
  id,
  name,
  brand,
  price,
  store,
  rating,
  reviews,
  trustScore,
  image,
}: ProductCardProps) {
  const wishlist = useWishlist();
  const liked = wishlist.includes(id);
  const priceNumber = Number(price.replace(/[₹,]/g, "")) || 0;

  const valueScore =
    trustScore * 0.4 +
    rating * 10 * 0.3 +
    Math.max(0, 100 - priceNumber / 50) * 0.2 +
    Math.min(reviews / 100, 100) * 0.1;

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(id);
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-100 bg-white p-3 shadow-xs transition-all duration-300 hover:-translate-y-2 hover:border-orange-200/80 hover:shadow-xl">
      {/* Top Media Area */}
      <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-[#F8F9FA]">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
        />

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-md transition hover:scale-110 active:scale-95 border border-gray-100 cursor-pointer"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={18}
            className={`transition-colors ${
              liked ? "fill-red-500 text-red-500" : "text-gray-500 hover:text-red-500"
            }`}
          />
        </button>

        {/* Best Value / Deal Tag */}
        {valueScore >= 75 && trustScore >= 85 ? (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-[#FF5126] px-3.5 py-1 text-[11px] font-extrabold text-white shadow-xs">
            🔥 Best Value
          </span>
        ) : (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-[#1A73E8] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs">
            Top Deal
          </span>
        )}
      </div>

      {/* Details Area */}
      <div className="flex flex-1 flex-col justify-between p-4 pt-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#FF5126]">
              {brand}
            </span>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                trustScore >= 90
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : trustScore >= 80
                  ? "bg-blue-50 text-[#1A73E8] border border-blue-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <ShieldCheck size={11} />
              <span>{trustScore}/100</span>
            </span>
          </div>

          <h3 className="mt-2 line-clamp-1 text-base font-bold text-gray-950 group-hover:text-[#FF5126] transition-colors">
            {name}
          </h3>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500">
            <div className="flex items-center gap-0.5 text-[#FFB703] font-bold">
              <Star size={14} className="fill-[#FFB703] text-[#FFB703]" />
              <span>{rating}</span>
            </div>
            <span>·</span>
            <span>{reviews.toLocaleString()} reviews</span>
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-3.5">
            <div>
              <p className="text-2xl font-black text-gray-950 tracking-tight">
                {price}
              </p>
              <p className="text-[11px] font-medium text-gray-500">
                Cheapest on <span className="font-bold text-gray-800">{store}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href={`/product/${id}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-950 py-3 text-xs font-bold text-white transition hover:bg-[#1A73E8] active:scale-[0.98] shadow-xs"
          >
            <span>Compare Prices</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}