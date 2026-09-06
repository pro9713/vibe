import type { StoreOffer } from "../data/types.ts";

export type AdminProductStatus = "draft" | "published" | "hidden" | "archived";

export type AffiliateType = "none" | "amazon_tag" | "query_param" | "custom_url";

export interface AdminRetailer {
  id: string;
  name: string;
  website: string;
  logo?: string;
  trusted: boolean;
  trustScore: number;
  affiliateType: AffiliateType;
  affiliateParam?: string;
  affiliateValue?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  trustScore: number;
  status: AdminProductStatus;
  sourceUrl?: string;
  offers: StoreOffer[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductInput {
  id?: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  image: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  trustScore?: number;
  status?: AdminProductStatus;
  sourceUrl?: string;
  store: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  url: string;
  availability?: boolean;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  image?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  trustScore?: number;
  status?: AdminProductStatus;
  sourceUrl?: string;
  store?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  url?: string;
  availability?: boolean;
}

export interface CreateRetailerInput {
  id?: string;
  name: string;
  website: string;
  logo?: string;
  trusted?: boolean;
  trustScore?: number;
  affiliateType?: AffiliateType;
  affiliateParam?: string;
  affiliateValue?: string;
  isActive?: boolean;
}

export interface UpdateRetailerInput extends Partial<CreateRetailerInput> {
  id: string;
}
