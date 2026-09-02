"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldCheck, Tag, ArrowRight } from "lucide-react";
import SearchBar from "./SearchBar";

interface HeroSlide {
  id: string;
  category: string;
  productName: string;
  brand: string;
  headline: string;
  subtitle: string;
  startingPrice: number;
  originalPrice?: number;
  image?: string;
  ctaText: string;
  categoryUrl: string;
  badge: string;
  stores: string[];
}

const slides: HeroSlide[] = [
  {
    id: "shoes-air-max",
    category: "Shoes",
    productName: "Nike Air Max 270",
    brand: "Nike",
    headline: "Step Into Verified Deals",
    subtitle: "Compare live quotes across Amazon, Myntra, Blinkit & Flipkart in real-time.",
    startingPrice: 2499,
    originalPrice: 3499,
    image: "/images/products/nike-air-max.png",
    ctaText: "Explore Shoes",
    categoryUrl: "/search?category=Shoes",
    badge: "30% Below Average",
    stores: ["Amazon", "Myntra", "AJIO", "Flipkart"],
  },
  {
    id: "jeans-levis",
    category: "Men",
    productName: "Levi's 501 Original Fit",
    brand: "Levi's",
    headline: "Iconic Denim at Lowest Price",
    subtitle: "Authentic heavyweight denim with multi-store price history tracking.",
    startingPrice: 1499,
    originalPrice: 2599,
    image: "/images/products/levis-501.jpg",
    ctaText: "Explore Denim",
    categoryUrl: "/search?category=Men",
    badge: "Lowest Recorded Price",
    stores: ["AJIO", "Amazon", "Flipkart"],
  },
  {
    id: "watches-casio",
    category: "Watches",
    productName: "Casio Vintage Digital",
    brand: "Casio",
    headline: "Retro Style, Maximum Savings",
    subtitle: "Timeless vintage aesthetics verified across top authorized retailers.",
    startingPrice: 2999,
    originalPrice: 3995,
    image: "/images/products/casio-watch.jpg",
    ctaText: "Explore Watches",
    categoryUrl: "/search?category=Watches",
    badge: "Best Trusted Winner",
    stores: ["Flipkart", "Amazon", "Myntra"],
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  const slide = slides[currentSlide];

  return (
    <div className="bg-[#F8F9FA] pt-8 pb-16 md:pt-12 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 2-COLUMN HERO GRID (1 col mobile, 2 col lg) */}
        <div className="grid items-center gap-12 lg:grid-cols-2 mb-16">
          {/* Left Column: Heavy Bold Typography & Search Bar */}
          <div className="flex flex-col items-start">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl leading-[1.15]">
              Find the best <br />
              <span className="text-[#FF5126]">fashion deals</span> <br />
              before you buy.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-lg leading-relaxed font-normal">
              Compare live prices across trusted fashion stores, find better deals, and set price alerts.
            </p>

            {/* Pill Search Module */}
            <div className="mt-8 w-full max-w-xl">
              <SearchBar />
            </div>
          </div>

          {/* Right Column: Rounded-3xl Product Showcase Frame */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-lg h-80 sm:h-96 rounded-3xl bg-gradient-to-tr from-stone-100 via-amber-50/50 to-stone-100 p-8 flex items-center justify-center shadow-xs border border-stone-200/80 overflow-hidden">
              {/* Product Showcase Composition */}
              <div className="relative w-full h-full flex items-center justify-around">
                {/* Shoes */}
                <div className="relative w-48 h-48 z-20 transition-transform duration-500 hover:scale-110 drop-shadow-xl">
                  <Image
                    src="/images/products/nike-air-max.png"
                    alt="Fashion Shoes"
                    fill
                    sizes="(max-width: 768px) 192px, 220px"
                    className="object-contain"
                  />
                </div>

                {/* Denim & Accessories */}
                <div className="relative w-36 h-52 z-10 opacity-95 transition-transform duration-500 hover:scale-105 drop-shadow-md">
                  <Image
                    src="/images/products/levis-501.jpg"
                    alt="Fashion Denim"
                    fill
                    sizes="(max-width: 768px) 144px, 170px"
                    className="object-contain rounded-2xl"
                  />
                </div>
              </div>

              {/* Verified Trust Pill */}
              <div className="absolute bottom-5 left-5 z-30 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 shadow-md border border-gray-100 flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
                <span className="text-xs font-bold text-gray-800">Live Multi-Store Deals</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO DEAL SHOWCASE PANEL */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative overflow-hidden rounded-3xl bg-[#051937] p-8 md:p-12 text-white shadow-2xl border border-slate-800"
        >
          {/* Subtle Ambient Lighting */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#FF5126]/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#1A73E8]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid items-center gap-8 md:grid-cols-12">
            {/* Left Content */}
            <div className="flex flex-col items-start md:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-orange-400 border border-white/10">
                  {slide.category}
                </span>
                <span className="rounded-full bg-[#FF5126] px-3.5 py-1 text-xs font-bold text-white shadow-sm">
                  🔥 {slide.badge}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl md:text-5xl leading-tight text-white">
                {slide.headline}
              </h2>

              <p className="mt-3 text-sm text-slate-300 sm:text-base max-w-lg leading-relaxed font-normal">
                {slide.subtitle}
              </p>

              {/* Price & Deal Snapshot */}
              <div className="mt-6 flex flex-wrap items-baseline gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Best Price Found</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    ₹{slide.startingPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                {slide.originalPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{slide.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-bold text-green-300">
                  <Tag size={12} />
                  <span>Save ₹{((slide.originalPrice || 0) - slide.startingPrice).toLocaleString("en-IN")}</span>
                </span>
              </div>

              {/* Stores Checked */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <ShieldCheck size={14} className="text-[#1A73E8]" />
                <span>Comparing offers on:</span>
                <div className="flex flex-wrap gap-1.5">
                  {slide.stores.map((store) => (
                    <span key={store} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
                      {store}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href={slide.categoryUrl}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF5126] to-[#E64A19] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:scale-105 active:scale-95"
              >
                <span>{slide.ctaText}</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Right Media Area */}
            <div className="relative flex items-center justify-center md:col-span-5">
              <div className="relative h-64 w-64 sm:h-72 sm:w-72 md:h-80 md:w-80 transition-transform duration-500 hover:scale-105">
                {slide.image && (
                  <Image
                    src={slide.image}
                    alt={slide.productName}
                    fill
                    priority
                    sizes="(max-width: 768px) 256px, 320px"
                    className="object-contain drop-shadow-2xl"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Carousel Arrows */}
          <button
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 transition hover:bg-white/20 active:scale-90 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next Slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 transition hover:bg-white/20 active:scale-90 cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>

          {/* Carousel Dots */}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? "w-8 bg-[#FF5126]" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}