import Navbar from "./components/Navbar";
import Categories from "./components/Categories";
import TrendingDeals from "./components/TrendingDeals";
import WhyPricely from "./components/WhyPricely";
import Footer from "./components/Footer";
import Brands from "./components/Brands";
import Hero from "./components/Hero";
import RecentlyViewed from "./components/RecentlyViewed";
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
     <Hero />

      <Categories />

<Brands />
<TrendingDeals />
<RecentlyViewed />
<WhyPricely />

<Footer />
    </main>
  );
}