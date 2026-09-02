"use client";

import {
  Shirt,
  ShoppingBag,
  Footprints,
  Watch,
  Sparkles,
  Luggage,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function Categories() {
  const router = useRouter();

  const categories = [
    { name: "Men", subtitle: "Jeans, Shirts & Casuals", icon: <Shirt size={32} />, color: "from-blue-500/10 to-indigo-500/10 text-[#1A73E8] group-hover:bg-[#1A73E8]" },
    { name: "Women", subtitle: "Dresses, Tops & Ethnic", icon: <ShoppingBag size={32} />, color: "from-rose-500/10 to-pink-500/10 text-rose-600 group-hover:bg-rose-600" },
    { name: "Shoes", subtitle: "Sneakers, Running & Boots", icon: <Footprints size={32} />, color: "from-orange-500/10 to-amber-500/10 text-[#FF5126] group-hover:bg-[#FF5126]" },
    { name: "Bags", subtitle: "Backpacks, Handbags & Totes", icon: <Luggage size={32} />, color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 group-hover:bg-emerald-600" },
    { name: "Watches", subtitle: "Analog, Digital & Smart", icon: <Watch size={32} />, color: "from-amber-500/10 to-yellow-500/10 text-[#FFB703] group-hover:bg-[#FFB703]" },
    { name: "Beauty", subtitle: "Skincare, Fragrance & Makeup", icon: <Sparkles size={32} />, color: "from-purple-500/10 to-fuchsia-500/10 text-purple-600 group-hover:bg-purple-600" },
  ];

  const handleCategoryClick = (category: string) => {
    router.push(`/search?category=${encodeURIComponent(category)}`);
  };

  return (
    <section className="bg-white py-20 md:py-28 border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF5126]">
            Curated Collections
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-gray-950 sm:text-4xl">
            Shop by Category
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            Compare prices and verified deals across top fashion categories
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => handleCategoryClick(category.name)}
              className="group flex flex-col items-center rounded-3xl border border-gray-100 bg-[#F8F9FA] p-7 text-center shadow-xs transition-all duration-300 hover:-translate-y-2 hover:bg-white hover:border-orange-200 hover:shadow-xl active:scale-95 cursor-pointer"
            >
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${category.color} transition-all duration-300 group-hover:text-white group-hover:shadow-md`}>
                {category.icon}
              </div>

              <h3 className="mt-5 text-base font-bold text-gray-900 group-hover:text-[#FF5126] transition-colors">
                {category.name}
              </h3>

              <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                {category.subtitle}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}