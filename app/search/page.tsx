"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, RotateCcw, Sparkles, X, MapPin } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import VibeLoader from "../components/VibeLoader";
import { products } from "@/data/products";
import { parseSearchQuery, type DetectedToken } from "@/lib/searchParser";
import { rankProducts } from "@/lib/search/relevance";
import { useLocation } from "@/lib/location";
import type { Product } from "@/lib/data/types";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const location = useLocation();

  const queryParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const brandParam = searchParams.get("brand") || "";

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState<string>("default");
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryParam || "all");
  const [brandFilter, setBrandFilter] = useState<string>(brandParam || "all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [ignoredTokenTypes, setIgnoredTokenTypes] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Parse natural language search query
  const parsedSearch = useMemo(() => {
    return parseSearchQuery(searchQuery);
  }, [searchQuery]);

  // Active tokens after user dismissals
  const activeTokens = useMemo(() => {
    return parsedSearch.detectedTokens.filter(
      (token) => !ignoredTokenTypes.includes(token.type)
    );
  }, [parsedSearch, ignoredTokenTypes]);

  // Effective filter values balancing Smart Search NLP with explicit UI overrides
  const effectiveBrand = useMemo(() => {
    if (brandFilter !== "all") return brandFilter;
    if (ignoredTokenTypes.includes("brand")) return "all";
    return parsedSearch.brand || "all";
  }, [brandFilter, parsedSearch.brand, ignoredTokenTypes]);

  const effectiveCategory = useMemo(() => {
    if (categoryFilter !== "all") return categoryFilter;
    if (ignoredTokenTypes.includes("category")) return "all";
    return parsedSearch.category || "all";
  }, [categoryFilter, parsedSearch.category, ignoredTokenTypes]);

  const effectiveMaxPrice = useMemo(() => {
    if (ignoredTokenTypes.includes("price-max") && ignoredTokenTypes.includes("price-range")) {
      return undefined;
    }
    return parsedSearch.maxPrice;
  }, [parsedSearch.maxPrice, ignoredTokenTypes]);

  const effectiveMinPrice = useMemo(() => {
    if (ignoredTokenTypes.includes("price-min") && ignoredTokenTypes.includes("price-range")) {
      return undefined;
    }
    return parsedSearch.minPrice;
  }, [parsedSearch.minPrice, ignoredTokenTypes]);

  const effectiveSort = useMemo(() => {
    if (sortBy !== "default") return sortBy;
    if (ignoredTokenTypes.includes("intent")) return "default";
    return parsedSearch.sortIntent || "default";
  }, [sortBy, parsedSearch.sortIntent, ignoredTokenTypes]);

  // Live QuickCommerce search on explicit user search query & selected location
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setLiveProducts([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          lat: String(location.latitude ?? 19.0760),
          lon: String(location.longitude ?? 72.8777),
          platform: storeFilter !== "all" ? storeFilter : "BlinkIt",
        });

        if (location.pincode) {
          params.set("pincode", location.pincode);
        }

        const res = await fetch(`/api/quickcommerce/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            setLiveProducts(data.products);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.warn("[Search Live Fetch Error]:", err);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, storeFilter, location.pincode, location.latitude, location.longitude]);

  // Candidate pool combining live and local catalog
  const candidatePool = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of liveProducts) {
      map.set(p.id, p);
    }
    for (const p of products) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [liveProducts]);

  // Price dropdown filter mapping helper
  const parsedPriceRange = useMemo(() => {
    let min = effectiveMinPrice;
    let max = effectiveMaxPrice;

    if (priceFilter === "under2000") {
      max = max !== undefined ? Math.min(max, 2000) : 2000;
    } else if (priceFilter === "2000to3000") {
      min = min !== undefined ? Math.max(min, 2000) : 2000;
      max = max !== undefined ? Math.min(max, 3000) : 3000;
    } else if (priceFilter === "above3000") {
      min = min !== undefined ? Math.max(min, 3000) : 3000;
    }

    return { min, max };
  }, [priceFilter, effectiveMinPrice, effectiveMaxPrice]);

  // Smart Search V2 Hard Category Filtering and Deterministic Relevance Ranking
  const filteredProducts = useMemo(() => {
    return rankProducts(candidatePool, parsedSearch, {
      category: effectiveCategory !== "all" ? effectiveCategory : undefined,
      brand: effectiveBrand !== "all" ? effectiveBrand : undefined,
      minPrice: parsedPriceRange.min,
      maxPrice: parsedPriceRange.max,
      store: storeFilter !== "all" ? storeFilter : undefined,
      sortBy: effectiveSort,
    });
  }, [
    candidatePool,
    parsedSearch,
    effectiveCategory,
    effectiveBrand,
    parsedPriceRange.min,
    parsedPriceRange.max,
    storeFilter,
    effectiveSort,
  ]);

  const handleDismissToken = (token: DetectedToken) => {
    setIgnoredTokenTypes((prev) => [...prev, token.type]);
    if (token.type === "brand" && brandFilter === token.value) {
      setBrandFilter("all");
    }
    if (token.type === "category" && categoryFilter === token.value) {
      setCategoryFilter("all");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("default");
    setCategoryFilter("all");
    setBrandFilter("all");
    setPriceFilter("all");
    setStoreFilter("all");
    setIgnoredTokenTypes([]);
    router.push("/search");
  };

  const activeFiltersCount = [
    categoryFilter !== "all",
    brandFilter !== "all",
    priceFilter !== "all",
    storeFilter !== "all",
    searchQuery.trim().length > 0,
    activeTokens.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
                Explore Deals & Products
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"} available
                for real-time price comparison
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIgnoredTokenTypes([]);
                }}
                placeholder="Try 'nike shoes under 3000' or 'best watches'..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Smart Search Detected Badges */}
          {activeTokens.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 shadow-sm">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900 pr-2">
                <Sparkles size={14} className="text-blue-600 fill-blue-600" />
                Smart Search Detected:
              </span>

              {activeTokens.map((token) => (
                <span
                  key={`${token.type}-${token.value}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-xs font-bold text-gray-800 shadow-sm border border-blue-200/60"
                >
                  <span className="text-blue-600 font-semibold uppercase text-[10px]">
                    {token.type.replace("-", " ")}:
                  </span>
                  <span>{token.label}</span>
                  <button
                    type="button"
                    onClick={() => handleDismissToken(token)}
                    className="ml-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label={`Remove ${token.label} filter`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={() => setIgnoredTokenTypes(parsedSearch.detectedTokens.map((t) => t.type))}
                className="ml-auto text-xs font-semibold text-blue-700 hover:underline"
              >
                Clear Detected Filters
              </button>
            </div>
          )}

          {/* Filter Controls Bar */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Category Filter */}
                <select
                  value={effectiveCategory}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    if (e.target.value !== "all") {
                      setIgnoredTokenTypes((prev) => [...prev, "category"]);
                    }
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-100"
                >
                  <option value="all">All Categories</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Bags">Bags</option>
                  <option value="Watches">Watches</option>
                  <option value="Beauty">Beauty</option>
                </select>

                {/* Brand Filter */}
                <select
                  value={effectiveBrand}
                  onChange={(e) => {
                    setBrandFilter(e.target.value);
                    if (e.target.value !== "all") {
                      setIgnoredTokenTypes((prev) => [...prev, "brand"]);
                    }
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-100"
                >
                  <option value="all">All Brands</option>
                  <option value="Nike">Nike</option>
                  <option value="Puma">Puma</option>
                  <option value="Levi's">Levi&apos;s</option>
                  <option value="Casio">Casio</option>
                  <option value="Adidas">Adidas</option>
                  <option value="Zara">Zara</option>
                </select>

                {/* Price Filter */}
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-100"
                >
                  <option value="all">All Prices</option>
                  <option value="under2000">Under ₹2,000</option>
                  <option value="2000to3000">₹2,000 – ₹3,000</option>
                  <option value="above3000">Above ₹3,000</option>
                </select>

                {/* Store Filter */}
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-100"
                >
                  <option value="all">All Stores</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Myntra">Myntra</option>
                  <option value="AJIO">AJIO</option>
                  <option value="Flipkart">Flipkart</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Order */}
                <select
                  value={effectiveSort}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setIgnoredTokenTypes((prev) => [...prev, "intent"]);
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 shadow-sm outline-none"
                >
                  <option value="default">Sort: Recommended</option>
                  <option value="best-value">🏆 Best Value Deal</option>
                  <option value="low">Price: Low to High</option>
                  <option value="price-low">Price: Low to High (NLP)</option>
                  <option value="high">Price: High to Low</option>
                  <option value="price-high">Price: High to Low (NLP)</option>
                  <option value="rating">Highest Rated</option>
                  <option value="brand">Brand: A–Z</option>
                </select>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                    title="Reset all filters"
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Summary & Location Status Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-xs font-semibold text-gray-500">
              Showing <strong className="text-gray-900">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "product" : "products"}
            </p>

            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              <MapPin size={14} className={location.isFallback ? "text-gray-400" : "text-blue-600"} />
              <span>
                {location.isFallback ? (
                  <>
                    Default location: <strong className="text-gray-900">{location.label}</strong>{" "}
                    <span className="text-[10px] text-gray-400 font-normal">(Fallback)</span>
                  </>
                ) : (
                  <>
                    Showing prices for <strong className="text-blue-700">{location.label}</strong>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Results Grid / Empty State */}
          {filteredProducts.length === 0 ? (
            <div className="my-16 flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Search size={28} />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                No matching products found
              </h2>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                No {effectiveBrand !== "all" ? `${effectiveBrand} ` : ""}
                {effectiveCategory !== "all" ? `${effectiveCategory} ` : "products "}
                {effectiveMaxPrice ? `under ₹${effectiveMaxPrice.toLocaleString("en-IN")} ` : ""}
                were found with the active filters.
              </p>

              {/* Actionable suggestions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {effectiveMaxPrice && (
                  <button
                    type="button"
                    onClick={() => setIgnoredTokenTypes((prev) => [...prev, "price-max", "price-range"])}
                    className="rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    🔓 Remove Price Limit
                  </button>
                )}

                {effectiveBrand !== "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrandFilter("all");
                      setIgnoredTokenTypes((prev) => [...prev, "brand"]);
                    }}
                    className="rounded-xl bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    👥 Show All Brands
                  </button>
                )}

                {effectiveCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      setIgnoredTokenTypes((prev) => [...prev, "category"]);
                    }}
                    className="rounded-xl bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    📂 Show All Categories
                  </button>
                )}

                {["nike shoes under 3000", "best watches", "levi jeans", "puma sneakers"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setCategoryFilter("all");
                      setBrandFilter("all");
                      setPriceFilter("all");
                      setStoreFilter("all");
                      setIgnoredTokenTypes([]);
                    }}
                    className="rounded-xl bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    🔍 {suggestion}
                  </button>
                ))}
              </div>

              <button
                onClick={handleResetFilters}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
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
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <VibeLoader fullScreen={false} size="md" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}