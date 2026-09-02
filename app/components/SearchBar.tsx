"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { products } from "@/data/products";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const suggestions = products.filter((product) => {
    const search = query.trim().toLowerCase();
    if (!search) return false;
    return (
      product.name.toLowerCase().includes(search) ||
      product.brand.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search)
    );
  });

  const handleSearch = () => {
    const search = query.trim();
    if (!search) return;
    router.push(`/search?q=${encodeURIComponent(search)}`);
  };

  const handleSuggestionClick = (id: string) => {
    setQuery("");
    router.push(`/product/${id}`);
  };

  return (
    <div className="relative w-full">
      <div className="flex w-full items-center rounded-full border border-gray-200 bg-white p-2 pl-7 shadow-sm transition-all focus-within:border-[#1A73E8] focus-within:ring-4 focus-within:ring-[#1A73E8]/10 hover:border-gray-300">
        <input
          type="text"
          value={query}
          placeholder="Search for Nike shoes, Levi's jeans..."
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm md:text-base text-gray-900 placeholder:text-gray-400 outline-none font-medium"
        />

        <button
          type="button"
          onClick={handleSearch}
          aria-label="Search"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1A73E8] text-white shadow-md shadow-blue-500/25 transition hover:bg-[#1557B0] active:scale-95 cursor-pointer"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Search Suggestions */}
      {query.trim() && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl p-2">
          {suggestions.slice(0, 5).map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSuggestionClick(product.id)}
              className="flex w-full items-center justify-between rounded-full px-5 py-3 text-left transition hover:bg-orange-50/60 cursor-pointer"
            >
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {product.name}
                </p>
                <p className="text-xs text-gray-500">
                  {product.brand} · <span className="text-[#FF5126] font-semibold">{product.category}</span>
                </p>
              </div>

              <span className="font-bold text-[#1A73E8] text-sm">
                ₹{product.bestDeal.price.toLocaleString("en-IN")}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {query.trim() && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-3 rounded-3xl border border-gray-100 bg-white px-6 py-4 text-sm text-gray-500 shadow-2xl">
          No products found matching &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}