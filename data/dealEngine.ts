import { trustedStores } from "./stores.ts";
import type { StoreOffer } from "./products.ts";

export interface BestTrustedDeal extends StoreOffer {
  trustScore: number;
}

export interface DealAnalysis {
  bestPrice: number;
  highestPrice: number;
  averagePrice: number;
  savings: number;
  discountFromAverage: number;
  dealLabel: string;
}

/**
 * Determines the best trusted deal by evaluating retailer trust score and offered price.
 */
export function getBestTrustedDeal(offers: StoreOffer[]): BestTrustedDeal | null {
  if (!offers || offers.length === 0) {
    return null;
  }

  // Filter available offers if availability flag is present
  const validOffers = offers.filter((o) => o.availability !== false);
  const candidateOffers = validOffers.length > 0 ? validOffers : offers;

  let bestDeal: BestTrustedDeal | null = null;

  for (const offer of candidateOffers) {
    const store = trustedStores.find(
      (s) => s.name.toLowerCase() === offer.store.toLowerCase()
    );

    // Ignore stores that are explicitly untrusted
    if (!store || !store.trusted) {
      continue;
    }

    const currentDeal: BestTrustedDeal = {
      ...offer,
      trustScore: store.trustScore,
    };

    // First trusted candidate
    if (!bestDeal) {
      bestDeal = currentDeal;
      continue;
    }

    // Lower price wins
    if (currentDeal.price < bestDeal.price) {
      bestDeal = currentDeal;
      continue;
    }

    // Same price -> higher trust score wins
    if (
      currentDeal.price === bestDeal.price &&
      currentDeal.trustScore > bestDeal.trustScore
    ) {
      bestDeal = currentDeal;
    }
  }

  return bestDeal;
}

/**
 * Calculates marketplace price statistics, savings, and deal rating.
 */
export function analyzeDeals(offers: StoreOffer[]): DealAnalysis {
  if (!offers || offers.length === 0) {
    return {
      bestPrice: 0,
      highestPrice: 0,
      averagePrice: 0,
      savings: 0,
      discountFromAverage: 0,
      dealLabel: "➖ Normal Price",
    };
  }

  const prices = offers.map((o) => o.price);
  const bestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice =
    prices.reduce((sum, p) => sum + p, 0) / prices.length;

  const savings = highestPrice - bestPrice;
  const discountFromAverage =
    averagePrice > 0
      ? Math.round(((averagePrice - bestPrice) / averagePrice) * 100)
      : 0;

  const dealLabel =
    discountFromAverage >= 20
      ? "🔥 Great Deal"
      : discountFromAverage >= 10
      ? "💰 Good Price"
      : discountFromAverage < 0
      ? "⚠️ Higher Than Usual"
      : "➖ Normal Price";

  return {
    bestPrice,
    highestPrice,
    averagePrice,
    savings,
    discountFromAverage,
    dealLabel,
  };
}

/**
 * Returns the lowest priced offer regardless of trust score.
 */
export function getCheapestOffer(offers: StoreOffer[]): StoreOffer | null {
  if (!offers || offers.length === 0) return null;
  const available = offers.filter((o) => o.availability !== false);
  const pool = available.length > 0 ? available : offers;

  return pool.reduce((cheapest, curr) =>
    curr.price < cheapest.price ? curr : cheapest
  );
}