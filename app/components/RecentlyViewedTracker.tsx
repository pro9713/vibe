"use client";

import { useEffect } from "react";
import { addRecentlyViewed } from "@/lib/recently-viewed";

type RecentlyViewedTrackerProps = {
  productId: string;
};

export default function RecentlyViewedTracker({ productId }: RecentlyViewedTrackerProps) {
  useEffect(() => {
    if (productId) {
      addRecentlyViewed(productId);
    }
  }, [productId]);

  return null;
}