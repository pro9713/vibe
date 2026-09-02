import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Brands() {
  const brands = [
    { name: "Nike", tag: "Sneakers & Apparel" },
    { name: "Adidas", tag: "Sportswear & Streetwear" },
    { name: "Puma", tag: "Lifestyle & Running" },
    { name: "Levi's", tag: "Authentic Denim" },
    { name: "Casio", tag: "Vintage & Digital Watches" },
    { name: "Zara", tag: "Contemporary Style" },
    { name: "H&M", tag: "Everyday Fashion" },
    { name: "Allen Solly", tag: "Smart Casuals" },
  ];

  return (
    <section className="border-b border-gray-100 bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
            Top Fashion Labels
          </span>
          <h2 className="mt-2 text-3xl font-black text-gray-900 sm:text-4xl">
            Featured Brands
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Compare prices across the world&apos;s leading fashion &amp; lifestyle brands
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          {brands.map((brand) => (
            <Link
              key={brand.name}
              href={`/search?brand=${encodeURIComponent(brand.name)}`}
              className="group flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-stone-50/50 p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:bg-white hover:shadow-lg active:scale-95"
            >
              <span className="text-lg sm:text-xl font-black text-gray-900 transition-colors group-hover:text-orange-600">
                {brand.name}
              </span>
              <span className="mt-1 text-xs text-gray-500 line-clamp-1">
                {brand.tag}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-600 opacity-0 transition-opacity group-hover:opacity-100">
                <span>View Deals</span>
                <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}