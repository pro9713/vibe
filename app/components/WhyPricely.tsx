import { Search, ShieldCheck, Zap, BellRing, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function WhyPricely() {
  const features = [
    {
      icon: <Search className="text-[#FF5126]" size={26} />,
      title: "Real-Time Comparison",
      description: "Compare live prices, delivery times, and offers across Amazon, Myntra, Flipkart, Blinkit and Zepto simultaneously.",
      badge: "Instant",
    },
    {
      icon: <ShieldCheck className="text-[#1A73E8]" size={26} />,
      title: "Store Trust Engine",
      description: "Every merchant offer is scored with our deterministic Trust Engine to protect you from counterfeits and fake discounts.",
      badge: "Verified",
    },
    {
      icon: <BellRing className="text-[#FFB703]" size={26} />,
      title: "Smart Price Alerts",
      description: "Set your target price and receive instant push notifications the second a store drops the price below your target.",
      badge: "Automated",
    },
    {
      icon: <Zap className="text-emerald-400" size={26} />,
      title: "Best Deal Guarantee",
      description: "Our Deal Engine filters out-of-stock bait offers and surfaces genuine in-stock savings with price history tracking.",
      badge: "AI Powered",
    },
  ];

  return (
    <section className="bg-[#051937] py-24 md:py-32 text-white relative overflow-hidden">
      {/* Background Lighting Accents */}
      <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#FF5126]/10 blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-[#1A73E8]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-orange-400 backdrop-blur-md mb-4">
            <Sparkles size={14} className="fill-orange-400" />
            <span>Why Shoppers Love Vibe</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Smart Shopping Built for You
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-300 font-normal">
            Never pay full retail price again. Vibe automates price checking across top retailers in seconds.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-[#FF5126]/50 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-orange-500/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 transition-transform group-hover:scale-110">
                  {feature.icon}
                </div>
                <span className="rounded-full bg-white/5 border border-white/10 px-3 py-0.5 text-[10px] font-bold text-slate-300">
                  {feature.badge}
                </span>
              </div>

              <h3 className="mt-6 text-xl font-bold text-white group-hover:text-[#FF5126] transition-colors">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-400 font-normal">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 rounded-3xl border border-slate-800/80 bg-gradient-to-r from-orange-600/20 via-slate-900 to-blue-600/20 p-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <h3 className="text-xl font-bold text-white">Ready to save on your next fashion purchase?</h3>
            <p className="text-sm text-slate-400 mt-1">Start searching across top retail stores right now.</p>
          </div>
          <Link
            href="/search"
            className="mt-5 sm:mt-0 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-orange-50 hover:text-[#FF5126] shadow-lg active:scale-95"
          >
            <span>Start Comparing</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}