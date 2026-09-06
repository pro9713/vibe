"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertAdminSession } from "@/lib/auth/admin";
import { parseRetailerProductUrl } from "@/lib/admin/urlParser";
import type {
  AdminProduct,
  AdminRetailer,
  AdminProductStatus,
  CreateProductInput,
  UpdateProductInput,
  CreateRetailerInput,
  UpdateRetailerInput,
} from "@/lib/admin/types";
import { revalidatePath } from "next/cache";

// In-memory fallback stores for testing or local mode
const memoryProducts = new Map<string, AdminProduct>();
const memoryRetailers = new Map<string, AdminRetailer>();

function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `adm-${clean || "item"}-${Date.now().toString(36).slice(-4)}`;
}

/**
 * Retrieves Admin Dashboard Stats
 */
export async function getAdminDashboardStatsAction(): Promise<{
  totalProducts: number;
  publishedCount: number;
  draftCount: number;
  hiddenCount: number;
  archivedCount: number;
  totalRetailers: number;
  recentProducts: AdminProduct[];
}> {
  await assertAdminSession();
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const prods = Array.from(memoryProducts.values());
    return {
      totalProducts: prods.length,
      publishedCount: prods.filter((p) => p.status === "published").length,
      draftCount: prods.filter((p) => p.status === "draft").length,
      hiddenCount: prods.filter((p) => p.status === "hidden").length,
      archivedCount: prods.filter((p) => p.status === "archived").length,
      totalRetailers: memoryRetailers.size,
      recentProducts: prods.slice(0, 5),
    };
  }

  try {
    const { data: products } = await supabase
      .from("admin_products")
      .select(`
        id,
        name,
        brand,
        category,
        description,
        image,
        images,
        rating,
        reviews,
        trust_score,
        status,
        source_url,
        created_at,
        admin_product_offers (
          id,
          store,
          price,
          original_price,
          currency,
          url,
          affiliate_url,
          availability
        )
      `)
      .order("created_at", { ascending: false });

    const { count: retailerCount } = await supabase
      .from("admin_retailers")
      .select("*", { count: "exact", head: true });

    const items: AdminProduct[] = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description || "",
      image: p.image,
      images: Array.isArray(p.images) ? p.images : [],
      rating: Number(p.rating) || 0,
      reviews: Number(p.reviews) || 0,
      trustScore: Number(p.trust_score) || 0,
      status: p.status,
      sourceUrl: p.source_url,
      createdAt: p.created_at,
      offers: (p.admin_product_offers || []).map((o: any) => ({
        store: o.store,
        price: Number(o.price),
        originalPrice: o.original_price ? Number(o.original_price) : undefined,
        currency: o.currency || "INR",
        url: o.url,
        affiliateUrl: o.affiliate_url,
        availability: o.availability !== false,
      })),
    }));

    return {
      totalProducts: items.length,
      publishedCount: items.filter((p) => p.status === "published").length,
      draftCount: items.filter((p) => p.status === "draft").length,
      hiddenCount: items.filter((p) => p.status === "hidden").length,
      archivedCount: items.filter((p) => p.status === "archived").length,
      totalRetailers: retailerCount || 0,
      recentProducts: items.slice(0, 5),
    };
  } catch (err) {
    console.warn("[AdminDashboardStats] Error:", err);
    return {
      totalProducts: 0,
      publishedCount: 0,
      draftCount: 0,
      hiddenCount: 0,
      archivedCount: 0,
      totalRetailers: 0,
      recentProducts: [],
    };
  }
}

/**
 * Retrieves Admin Products with optional search & filter
 */
export async function getAdminProductsAction(filter?: {
  search?: string;
  category?: string;
  status?: string;
}): Promise<AdminProduct[]> {
  await assertAdminSession();
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    let list = Array.from(memoryProducts.values());
    if (filter?.status && filter.status !== "all") {
      list = list.filter((p) => p.status === filter.status);
    }
    if (filter?.category && filter.category !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    return list;
  }

  try {
    let query = supabase.from("admin_products").select(`
      id,
      name,
      brand,
      category,
      description,
      image,
      images,
      rating,
      reviews,
      trust_score,
      status,
      source_url,
      created_at,
      admin_product_offers (
        id,
        store,
        price,
        original_price,
        currency,
        url,
        affiliate_url,
        availability
      )
    `).order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }
    if (filter?.category && filter.category !== "all") {
      query = query.eq("category", filter.category);
    }
    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,brand.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description || "",
      image: p.image,
      images: Array.isArray(p.images) ? p.images : [],
      rating: Number(p.rating) || 0,
      reviews: Number(p.reviews) || 0,
      trustScore: Number(p.trust_score) || 0,
      status: p.status,
      sourceUrl: p.source_url,
      createdAt: p.created_at,
      offers: (p.admin_product_offers || []).map((o: any) => ({
        store: o.store,
        price: Number(o.price),
        originalPrice: o.original_price ? Number(o.original_price) : undefined,
        currency: o.currency || "INR",
        url: o.url,
        affiliateUrl: o.affiliate_url,
        availability: o.availability !== false,
      })),
    }));
  } catch (err) {
    console.warn("[getAdminProductsAction] Error:", err);
    return [];
  }
}

/**
 * Creates a new Product (Default status: 'draft', unverified rating: 0, trustScore: 0)
 */
export async function createAdminProductAction(input: CreateProductInput): Promise<{
  success: boolean;
  product?: AdminProduct;
  error?: string;
}> {
  const user = await assertAdminSession();

  if (!input.name || !input.brand || !input.category || !input.image || !input.store || !input.url) {
    return { success: false, error: "Please provide all required product fields." };
  }

  const urlCheck = parseRetailerProductUrl(input.url);
  if (!urlCheck.isValid) {
    return { success: false, error: urlCheck.error || "Invalid product URL." };
  }

  const productId = input.id ? input.id.trim() : generateSlug(`${input.brand}-${input.name}`);
  const status: AdminProductStatus = input.status || "draft";
  const rating = input.rating !== undefined ? Number(input.rating) : 0;
  const reviews = input.reviews !== undefined ? Number(input.reviews) : 0;
  const trustScore = input.trustScore !== undefined ? Number(input.trustScore) : 0;

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    // Check duplicate
    if (memoryProducts.has(productId)) {
      return { success: false, error: "A product with this ID already exists." };
    }

    const newProd: AdminProduct = {
      id: productId,
      name: input.name.trim(),
      brand: input.brand.trim(),
      category: input.category.trim(),
      description: (input.description || "").trim(),
      image: input.image.trim(),
      images: input.images && input.images.length > 0 ? input.images : [input.image.trim()],
      rating,
      reviews,
      trustScore,
      status,
      sourceUrl: urlCheck.normalizedUrl,
      offers: [
        {
          store: input.store.trim(),
          price: Number(input.price),
          originalPrice: input.originalPrice ? Number(input.originalPrice) : undefined,
          currency: input.currency || "INR",
          url: urlCheck.normalizedUrl,
          availability: input.availability !== false,
          lastUpdated: new Date().toISOString(),
        },
      ],
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryProducts.set(productId, newProd);
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    return { success: true, product: newProd };
  }

  try {
    // Check duplicate ID
    const { data: existing } = await supabase
      .from("admin_products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "A product with this identifier already exists." };
    }

    // Insert product
    const { error: prodErr } = await supabase.from("admin_products").insert({
      id: productId,
      name: input.name.trim(),
      brand: input.brand.trim(),
      category: input.category.trim(),
      description: (input.description || "").trim(),
      image: input.image.trim(),
      images: input.images && input.images.length > 0 ? input.images : [input.image.trim()],
      rating,
      reviews,
      trust_score: trustScore,
      status,
      source_url: urlCheck.normalizedUrl,
      created_by: user.id,
    });

    if (prodErr) {
      return { success: false, error: prodErr.message };
    }

    // Insert offer
    const { error: offerErr } = await supabase.from("admin_product_offers").insert({
      product_id: productId,
      store: input.store.trim(),
      price: Number(input.price),
      original_price: input.originalPrice ? Number(input.originalPrice) : null,
      currency: input.currency || "INR",
      url: urlCheck.normalizedUrl,
      availability: input.availability !== false,
    });

    if (offerErr) {
      return { success: false, error: offerErr.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");

    return {
      success: true,
      product: {
        id: productId,
        name: input.name.trim(),
        brand: input.brand.trim(),
        category: input.category.trim(),
        description: (input.description || "").trim(),
        image: input.image.trim(),
        images: [input.image.trim()],
        rating,
        reviews,
        trustScore,
        status,
        sourceUrl: urlCheck.normalizedUrl,
        offers: [
          {
            store: input.store.trim(),
            price: Number(input.price),
            originalPrice: input.originalPrice ? Number(input.originalPrice) : undefined,
            currency: input.currency || "INR",
            url: urlCheck.normalizedUrl,
            availability: input.availability !== false,
          },
        ],
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create product." };
  }
}

/**
 * Toggles product status (draft, published, hidden, archived)
 */
export async function toggleAdminProductStatusAction(
  id: string,
  status: AdminProductStatus
): Promise<{ success: boolean; error?: string }> {
  await assertAdminSession();
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const item = memoryProducts.get(id);
    if (item) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
      memoryProducts.set(id, item);
    }
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from("admin_products")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Deletes an admin product and associated offers
 */
export async function deleteAdminProductAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await assertAdminSession();
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    memoryProducts.delete(id);
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    return { success: true };
  }

  try {
    const { error } = await supabase.from("admin_products").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves Admin Retailers
 */
export async function getAdminRetailersAction(): Promise<AdminRetailer[]> {
  await assertAdminSession();
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return Array.from(memoryRetailers.values());
  }

  try {
    const { data } = await supabase
      .from("admin_retailers")
      .select("*")
      .order("name", { ascending: true });

    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      website: r.website,
      logo: r.logo,
      trusted: r.trusted !== false,
      trustScore: Number(r.trust_score) || 85,
      affiliateType: r.affiliate_type || "none",
      affiliateParam: r.affiliate_param,
      affiliateValue: r.affiliate_value,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    console.warn("[getAdminRetailersAction] Error:", err);
    return [];
  }
}

/**
 * Creates or updates an Admin Retailer
 */
export async function saveAdminRetailerAction(
  input: CreateRetailerInput | UpdateRetailerInput
): Promise<{ success: boolean; retailer?: AdminRetailer; error?: string }> {
  await assertAdminSession();

  if (!input.name || !input.website) {
    return { success: false, error: "Name and website are required." };
  }

  const id = input.id ? input.id.trim() : input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const supabase = createAdminSupabaseClient();

  const record: AdminRetailer = {
    id,
    name: input.name.trim(),
    website: input.website.trim(),
    logo: input.logo?.trim() || undefined,
    trusted: input.trusted !== false,
    trustScore: input.trustScore !== undefined ? Number(input.trustScore) : 85,
    affiliateType: input.affiliateType || "none",
    affiliateParam: input.affiliateParam?.trim() || undefined,
    affiliateValue: input.affiliateValue?.trim() || undefined,
    isActive: input.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  if (!supabase) {
    memoryRetailers.set(id, record);
    revalidatePath("/admin/retailers");
    return { success: true, retailer: record };
  }

  try {
    const { error } = await supabase.from("admin_retailers").upsert({
      id,
      name: record.name,
      website: record.website,
      logo: record.logo,
      trusted: record.trusted,
      trust_score: record.trustScore,
      affiliate_type: record.affiliateType,
      affiliate_param: record.affiliateParam,
      affiliate_value: record.affiliateValue,
      is_active: record.isActive,
      updated_at: record.updatedAt,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/retailers");
    return { success: true, retailer: record };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
