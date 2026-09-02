import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import VibeLoadingProvider from "./components/VibeLoadingProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe — Live Multi-Store Fashion Price Comparison & Deal Tracker",
  description:
    "Find the best fashion deals before you buy. Compare live prices across Amazon, Myntra, Flipkart, Blinkit, Zepto, and top retailers in real-time.",
  keywords: [
    "Vibe",
    "fashion price comparison",
    "shoe price check",
    "sneakers deals",
    "price tracker",
    "live deals",
    "deal tracker",
  ],
  openGraph: {
    title: "Vibe — Live Multi-Store Fashion Price Comparison",
    description:
      "Find the best fashion deals before you buy. Real-time price comparison across leading retailers.",
    type: "website",
    locale: "en_IN",
    siteName: "Vibe",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-gray-900 selection:bg-[#FF5126]/20 selection:text-[#FF5126]">
        <VibeLoadingProvider>
          {children}
        </VibeLoadingProvider>
      </body>
    </html>
  );
}

