import ProductCard from "./ProductCard";
import { getPublicCatalog } from "@/lib/catalog/resolver";
import { Flame } from "lucide-react";

export default async function TrendingDeals() {
  const products = await getPublicCatalog();

  return (
    <section className="py-20 md:py-28 bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-4 py-1.5 text-xs font-bold text-[#FF5126]">
            <Flame size={14} className="fill-[#FF5126] text-[#FF5126]" />
            <span>Real-Time Price Drops</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-950 sm:text-4xl md:text-5xl tracking-tight">
            Trending Fashion Deals
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            Verified lowest prices and biggest discounts across top online stores
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              brand={product.brand}
              price={`₹${product.bestDeal.price.toLocaleString("en-IN")}`}
              store={product.bestDeal.store}
              rating={product.rating}
              trustScore={product.trustScore}
              image={product.image}
              reviews={product.reviews}
            />
          ))}
        </div>
      </div>
    </section>
  );
}