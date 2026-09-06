import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Star, CheckCircle2 } from "lucide-react";
import { getProductById } from "@/lib/data";
import { getCachedLiveProduct } from "@/lib/quickcommerce/live-product-cache";
import { tagProductAmazonOffers } from "@/lib/affiliate/amazon";
import PriceHistoryV2 from "@/app/components/PriceHistoryV2";
import RecentlyViewedTracker from "@/app/components/RecentlyViewedTracker";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import LiveStoreComparison from "@/app/components/LiveStoreComparison";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  const rawProduct = (await getProductById(id)) || getCachedLiveProduct(id);

  if (!rawProduct) {
    notFound();
  }

  const product = tagProductAmazonOffers(rawProduct);

  const prices = product.offers;
  const bestPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price)) : 0;
  const highestPrice = prices.length > 0 ? Math.max(...prices.map((p) => p.price)) : bestPrice;
  const savings = highestPrice - bestPrice;

  const lowestHistoryPrice =
    product.priceHistory && product.priceHistory.length > 0
      ? Math.min(...product.priceHistory.map((item) => item.price))
      : bestPrice;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />
      <RecentlyViewedTracker productId={product.id} />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/search?category=${encodeURIComponent(product.category)}`}
              className="hover:text-blue-600"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-900 line-clamp-1">
              {product.name}
            </span>
          </div>

          <div className="grid gap-10 lg:grid-cols-12">
            {/* Left Column: Product Image Gallery */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 space-y-6">
                <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                    className="object-contain p-4"
                  />
                  {savings > 0 && (
                    <span className="absolute left-6 top-6 rounded-full bg-red-500 px-3.5 py-1.5 text-xs font-black tracking-wide text-white shadow-md">
                      SAVE ₹{savings.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Quick Trust Highlights */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900">
                    <ShieldCheck size={18} className="text-green-600" />
                    Verified Authenticity
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5">
                      <CheckCircle2 size={16} className="text-blue-600" />
                      <span>Original Retailers Only</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5">
                      <CheckCircle2 size={16} className="text-blue-600" />
                      <span>Live Price Tracking</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details, Live Comparison, History */}
            <div className="lg:col-span-7 space-y-8">
              {/* Product Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {product.brand}
                  </span>
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    <span>{product.rating}</span>
                    <span className="text-gray-400 font-normal">
                      ({product.reviews.toLocaleString()} verified reviews)
                    </span>
                  </div>
                </div>

                <h1 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">
                  {product.name}
                </h1>

                <p className="mt-3 text-base leading-relaxed text-gray-600">
                  {product.description}
                </p>
              </div>

              {/* Live Multi-Store Comparison Component */}
              <LiveStoreComparison
                product={product}
                initialOffers={product.offers}
              />

              {/* Price History V2 Component */}
              <PriceHistoryV2 product={product} />

              {/* Amazon Affiliate Disclosure Note */}
              <div className="rounded-2xl border border-gray-200/70 bg-white/60 p-4 text-xs text-gray-500 text-center shadow-xs">
                <p>
                  As an Amazon Associate I earn from qualifying purchases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
