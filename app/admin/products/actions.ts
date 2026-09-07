"use server";

import { createAdminSupabaseClient } from "../../../lib/supabase/admin.ts";
import { assertAdminSession } from "../../../lib/admin/auth.ts";
import { parseRetailerUrl } from "../../../lib/admin/url-parser.ts";
import { products as local52Products } from "../../../data/products.ts";
import {
  invalidatePublicCatalogCache,
  isBaselineProductId,
} from "../../../lib/catalog/resolver.ts";
import {
  invalidateDatabaseProductCache,
  registerInMemoryAdminProduct,
  clearInMemoryAdminProducts as clearDbProviderInMemoryAdminProducts,
} from "../../../lib/data/providers/database-product.provider.ts";
import {
  type AdminProduct,
  type AdminProductStatus,
  type StoreOffer,
  type CreateProductPayload,
  type UpdateProductPayload,
  validateProductPayload,
} from "../../../lib/admin/types.ts";
import type { RetailerBadgeTier } from "../../../types/catalog.ts";
import { createProduct, type Product } from "../../../lib/data/types.ts";

export type { CreateProductPayload, UpdateProductPayload };

export interface ProductActionResult {
  success: boolean;
  productId?: string;
  product?: AdminProduct;
  error?: string;
}

export type CreateProductResult = ProductActionResult;

// In-memory product cache for local testing / mock mode
const inMemoryProducts = new Map<string, AdminProduct>();

function syncProductToProvider(prod: AdminProduct): void {
  registerInMemoryAdminProduct(
    createProduct({
      id: prod.id,
      name: prod.name,
      brand: prod.brand,
      category: prod.category,
      description: prod.description,
      image: prod.image,
      rating: prod.rating,
      reviews: prod.reviews,
      trustScore: prod.trustScore,
      offers: prod.offers,
      priceHistory: [],
    }),
    prod.status
  );
}

export async function getInMemoryAdminProducts(): Promise<AdminProduct[]> {
  return Array.from(inMemoryProducts.values());
}

export async function clearInMemoryAdminProducts(): Promise<void> {
  inMemoryProducts.clear();
  clearDbProviderInMemoryAdminProducts();
  invalidatePublicCatalogCache();
  invalidateDatabaseProductCache();
}



/**
 * Generates a URL-friendly unique slug for admin products.
 */
function generateProductSlug(brand: string, name: string): string {
  const cleanBrand = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 35);
  const rand = Math.random().toString(36).slice(2, 6);
  return `adm-${cleanBrand}-${cleanName}-${rand}`.replace(/--+/g, "-");
}

/**
 * Safe revalidation helper for cache purging and Next.js ISR tag/path updates.
 */
async function triggerImmediateRevalidation(productId?: string) {
  // 1. Immediately invalidate in-memory catalog caches
  invalidatePublicCatalogCache();
  invalidateDatabaseProductCache();

  // 2. Next.js cache revalidation
  try {
    const { revalidatePath, revalidateTag } = await import("next/cache");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    if (productId) {
      revalidatePath(`/admin/products/${productId}`);
      revalidatePath(`/product/${productId}`);
    }
    try {
      (revalidateTag as any)("catalog");
    } catch {
      // Ignore if tags unsupported
    }
  } catch {
    // Non-Next runtime
  }
}

/**
 * Server Action to create a new Admin Managed Product and its initial offer.
 * Enforces server-side admin authentication and default 'draft' lifecycle status.
 */
export async function createAdminProductAction(
  payload: CreateProductPayload,
  userOverride?: any
): Promise<CreateProductResult> {
  // 1. Assert Admin Authorization
  const session = await assertAdminSession(userOverride);

  // 2. Validate Input Payload
  const validation = validateProductPayload(payload);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  // 3. Sanitize URL deterministically (zero scraping)
  const parsedUrl = parseRetailerUrl(payload.url);
  const cleanUrl = parsedUrl.cleanUrl || payload.url.trim();
  const detectedStore = payload.store?.trim() || parsedUrl.retailerName || "Store";

  // 4. Default Status is strictly 'draft' unless explicitly published
  const status: AdminProductStatus = payload.status === "published" ? "published" : "draft";

  // 5. Strictly no synthetic ratings/reviews
  const rating = 0;
  const reviews = 0;
  const trustScore = payload.trustScore ? Math.min(100, Math.max(1, Number(payload.trustScore))) : 90;

  // 6. Generate unique product ID
  const productId = generateProductSlug(payload.brand, payload.name);

  const images = payload.images && payload.images.length > 0 ? payload.images : [payload.image.trim()];

  const newProduct: AdminProduct = {
    id: productId,
    name: payload.name.trim(),
    brand: payload.brand.trim(),
    category: payload.category.trim(),
    description: (payload.description || "").trim(),
    image: payload.image.trim(),
    images,
    rating,
    reviews,
    trustScore,
    status,
    sourceUrl: cleanUrl,
    offers: [
      {
        store: detectedStore,
        price: Number(payload.price),
        originalPrice: payload.originalPrice ? Number(payload.originalPrice) : undefined,
        currency: payload.currency || "INR",
        url: cleanUrl,
        availability: payload.availability !== false,
        lastUpdated: new Date().toISOString(),
      },
    ],
    createdBy: session.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    // Local / In-memory storage fallback
    inMemoryProducts.set(productId, newProduct);
    syncProductToProvider(newProduct);
    await triggerImmediateRevalidation(productId);
    return { success: true, productId, product: newProduct };
  }

  try {
    // Check if ID exists
    const { data: existing } = await supabase
      .from("admin_products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "A product with this identifier already exists." };
    }

    // Insert Product into admin_products
    const { error: prodErr } = await supabase.from("admin_products").insert({
      id: productId,
      name: newProduct.name,
      brand: newProduct.brand,
      category: newProduct.category,
      description: newProduct.description,
      image: newProduct.image,
      images: newProduct.images,
      rating,
      reviews,
      trust_score: trustScore,
      status,
      source_url: cleanUrl,
      created_by: session.id,
    });

    if (prodErr) {
      return { success: false, error: prodErr.message };
    }

    // Insert Offer into admin_product_offers
    const { error: offerErr } = await supabase.from("admin_product_offers").insert({
      product_id: productId,
      store: detectedStore,
      price: Number(payload.price),
      original_price: payload.originalPrice ? Number(payload.originalPrice) : null,
      currency: payload.currency || "INR",
      url: cleanUrl,
      availability: payload.availability !== false,
    });

    if (offerErr) {
      // Rollback product insertion if offer failed
      await supabase.from("admin_products").delete().eq("id", productId);
      return { success: false, error: offerErr.message };
    }

    inMemoryProducts.set(productId, newProduct);
    syncProductToProvider(newProduct);

    await triggerImmediateRevalidation(productId);

    return { success: true, productId, product: newProduct };
  } catch (err: any) {
    console.error("[CreateProductAction] Exception:", err);
    return { success: false, error: err?.message || "Failed to create product." };
  }
}

/**
 * Server Action to update an Admin Product's lifecycle status (draft, published, hidden, archived).
 * Directly rejects modifying baseline 52 products and immediately purges catalog caches.
 */
export async function updateProductStatusAction(
  productId: string,
  newStatus: AdminProductStatus,
  userOverride?: any
): Promise<ProductActionResult> {
  // 1. Assert Admin Authorization
  await assertAdminSession(userOverride);

  if (!productId || typeof productId !== "string") {
    return { success: false, error: "Product ID is required." };
  }

  const validStatuses: AdminProductStatus[] = ["draft", "published", "hidden", "archived"];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: `Invalid status '${newStatus}'. Must be draft, published, hidden, or archived.` };
  }

  // 2. Guardrail Check: Direct rejection of mutating baseline 52 catalog items
  if (isBaselineProductId(productId)) {
    return {
      success: false,
      error: "Baseline catalog products are immutable and cannot be modified by admin actions.",
    };
  }

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    // In-memory fallback
    const mem = inMemoryProducts.get(productId);
    if (!mem) {
      return { success: false, error: "Product not found." };
    }
    mem.status = newStatus;
    mem.updatedAt = new Date().toISOString();
    inMemoryProducts.set(productId, mem);
    syncProductToProvider(mem);

    await triggerImmediateRevalidation(productId);
    return { success: true, productId, product: mem };
  }

  try {
    const { data, error } = await supabase
      .from("admin_products")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Product not found in database." };
    }

    // Sync in-memory map
    const mem = inMemoryProducts.get(productId);
    if (mem) {
      mem.status = newStatus;
      mem.updatedAt = new Date().toISOString();
      inMemoryProducts.set(productId, mem);
      syncProductToProvider(mem);
    }

    await triggerImmediateRevalidation(productId);

    return { success: true, productId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update status." };
  }
}

/**
 * Server Action to update an existing Admin Managed Product's metadata and offers.
 */
export async function updateAdminProductAction(
  productId: string,
  payload: UpdateProductPayload,
  userOverride?: any
): Promise<ProductActionResult> {
  // 1. Assert Admin Authorization
  await assertAdminSession(userOverride);

  if (!productId || typeof productId !== "string") {
    return { success: false, error: "Product ID is required." };
  }

  // 2. Guardrail Check: Baseline 52 products are immutable
  if (isBaselineProductId(productId)) {
    return {
      success: false,
      error: "Baseline catalog products are immutable and cannot be modified by admin actions.",
    };
  }

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    // In-memory update
    const mem = inMemoryProducts.get(productId);
    if (!mem) {
      return { success: false, error: "Product not found." };
    }

    if (payload.name) mem.name = payload.name.trim();
    if (payload.brand) mem.brand = payload.brand.trim();
    if (payload.category) mem.category = payload.category.trim();
    if (payload.description !== undefined) mem.description = payload.description.trim();
    if (payload.image) mem.image = payload.image.trim();
    if (payload.trustScore !== undefined) mem.trustScore = Number(payload.trustScore);
    if (payload.status) mem.status = payload.status;
    mem.updatedAt = new Date().toISOString();

    if (payload.price !== undefined && mem.offers && mem.offers.length > 0) {
      mem.offers[0].price = Number(payload.price);
      if (payload.store) mem.offers[0].store = payload.store.trim();
      if (payload.originalPrice !== undefined) mem.offers[0].originalPrice = Number(payload.originalPrice);
      if (payload.url) mem.offers[0].url = payload.url.trim();
      mem.offers[0].lastUpdated = new Date().toISOString();
    }

    inMemoryProducts.set(productId, mem);
    syncProductToProvider(mem);
    await triggerImmediateRevalidation(productId);
    return { success: true, productId, product: mem };
  }

  try {
    const updateObj: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name) updateObj.name = payload.name.trim();
    if (payload.brand) updateObj.brand = payload.brand.trim();
    if (payload.category) updateObj.category = payload.category.trim();
    if (payload.description !== undefined) updateObj.description = payload.description.trim();
    if (payload.image) updateObj.image = payload.image.trim();
    if (payload.trustScore !== undefined) updateObj.trust_score = Number(payload.trustScore);
    if (payload.status) updateObj.status = payload.status;

    const { error: prodErr } = await supabase
      .from("admin_products")
      .update(updateObj)
      .eq("id", productId);

    if (prodErr) {
      return { success: false, error: prodErr.message };
    }

    // Update associated offer if price or store is specified
    if (payload.price !== undefined || payload.store !== undefined || payload.originalPrice !== undefined) {
      const offerUpdate: Record<string, any> = {
        last_updated: new Date().toISOString(),
      };
      if (payload.price !== undefined) offerUpdate.price = Number(payload.price);
      if (payload.store) offerUpdate.store = payload.store.trim();
      if (payload.originalPrice !== undefined) offerUpdate.original_price = Number(payload.originalPrice);
      if (payload.url) offerUpdate.url = payload.url.trim();

      await supabase
        .from("admin_product_offers")
        .update(offerUpdate)
        .eq("product_id", productId);
    }

    // Sync in-memory map
    const mem = inMemoryProducts.get(productId);
    if (mem) {
      if (payload.name) mem.name = payload.name.trim();
      if (payload.brand) mem.brand = payload.brand.trim();
      if (payload.category) mem.category = payload.category.trim();
      if (payload.status) mem.status = payload.status;
      inMemoryProducts.set(productId, mem);
      syncProductToProvider(mem);
    }

    await triggerImmediateRevalidation(productId);
    return { success: true, productId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update product." };
  }
}

/**
 * Server Action to fetch all Admin Managed Products for the management list.
 */
export async function getAdminProductsAction(
  filter?: {
    search?: string;
    category?: string;
    status?: string;
  },
  userOverride?: any
): Promise<AdminProduct[]> {
  await assertAdminSession(userOverride);
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    let list = Array.from(inMemoryProducts.values());
    if (filter?.status && filter.status !== "all") {
      list = list.filter((p) => p.status === filter.status);
    }
    if (filter?.category && filter.category !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    return list;
  }

  try {
    let query = supabase
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
        updated_at,
        admin_product_offers (
          id,
          store,
          price,
          original_price,
          currency,
          url,
          affiliate_url,
          availability,
          last_updated
        )
      `)
      .order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }
    if (filter?.category && filter.category !== "all") {
      query = query.eq("category", filter.category);
    }

    const { data, error } = await query;
    if (error || !data) {
      return Array.from(inMemoryProducts.values());
    }

    let items: AdminProduct[] = data.map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description || "",
      image: p.image,
      images: Array.isArray(p.images) ? p.images : [p.image],
      rating: Number(p.rating) || 0,
      reviews: Number(p.reviews) || 0,
      trustScore: Number(p.trust_score) || 0,
      status: p.status,
      sourceUrl: p.source_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      offers: (p.admin_product_offers || []).map((o: any) => ({
        store: o.store,
        price: Number(o.price),
        originalPrice: o.original_price ? Number(o.original_price) : undefined,
        currency: o.currency || "INR",
        url: o.url,
        affiliateUrl: o.affiliate_url,
        availability: o.availability !== false,
        lastUpdated: o.last_updated,
      })),
    }));

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      items = items.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }

    return items;
  } catch {
    return Array.from(inMemoryProducts.values());
  }
}

/**
 * Server Action to fetch a single Admin Product by ID for the edit page.
 */
export async function getAdminProductByIdAction(
  productId: string,
  userOverride?: any
): Promise<AdminProduct | null> {
  await assertAdminSession(userOverride);

  if (!productId) return null;

  const mem = inMemoryProducts.get(productId);
  if (mem) {
    return mem;
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
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
        updated_at,
        admin_product_offers (
          id,
          store,
          price,
          original_price,
          currency,
          url,
          affiliate_url,
          availability,
          last_updated
        )
      `)
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      brand: data.brand,
      category: data.category,
      description: data.description || "",
      image: data.image,
      images: Array.isArray(data.images) ? data.images : [data.image],
      rating: Number(data.rating) || 0,
      reviews: Number(data.reviews) || 0,
      trustScore: Number(data.trust_score) || 0,
      status: data.status,
      sourceUrl: data.source_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      offers: (data.admin_product_offers || []).map((o: any) => ({
        store: o.store,
        price: Number(o.price),
        originalPrice: o.original_price ? Number(o.original_price) : undefined,
        currency: o.currency || "INR",
        url: o.url,
        affiliateUrl: o.affiliate_url,
        availability: o.availability !== false,
        lastUpdated: o.last_updated,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Server Action to delete or archive an Admin Product.
 */
export async function deleteAdminProductAction(
  productId: string,
  userOverride?: any
): Promise<ProductActionResult> {
  await assertAdminSession(userOverride);

  if (isBaselineProductId(productId)) {
    return {
      success: false,
      error: "Baseline catalog products are immutable and cannot be deleted.",
    };
  }

  inMemoryProducts.delete(productId);
  clearDbProviderInMemoryAdminProducts();
  for (const p of inMemoryProducts.values()) {
    syncProductToProvider(p);
  }

  const supabase = createAdminSupabaseClient();
  if (supabase) {
    await supabase.from("admin_products").delete().eq("id", productId);
  }

  await triggerImmediateRevalidation(productId);
  return { success: true, productId };
}
