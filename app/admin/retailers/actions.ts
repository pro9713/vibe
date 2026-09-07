"use server";

import { createAdminSupabaseClient } from "../../../lib/supabase/admin.ts";
import { assertAdminSession } from "../../../lib/admin/auth.ts";
import {
  type AdminRetailer,
  type UpsertRetailerPayload,
  type RetailerBadgeTier,
  validateRetailerPayload,
  clampTrustScore,
  getBadgeLabelForTier,
} from "../../../lib/admin/types.ts";

export interface RetailerActionResult {
  success: boolean;
  retailer?: AdminRetailer;
  error?: string;
}

// In-memory store for development / local testing
const inMemoryRetailers = new Map<string, AdminRetailer>();

// Seed default verified partner retailers for testing
function seedDefaultRetailers(): void {
  if (inMemoryRetailers.size > 0) return;

  const defaults: AdminRetailer[] = [
    {
      id: "amazon-india",
      name: "Amazon India",
      website: "https://www.amazon.in",
      logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
      trusted: true,
      trustScore: 92,
      badgeTier: "verified_marketplace",
      badgeLabel: "Marketplace Assured",
      affiliateType: "amazon_tag",
      affiliateParam: "tag",
      affiliateValue: "vibe-assoc-21",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "myntra",
      name: "Myntra",
      website: "https://www.myntra.com",
      logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Myntra_logo.png",
      trusted: true,
      trustScore: 95,
      badgeTier: "authorized_dealer",
      badgeLabel: "Authorized Dealer",
      affiliateType: "query_param",
      affiliateParam: "aff_id",
      affiliateValue: "vibe_myntra",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "nike-india",
      name: "Nike India Direct",
      website: "https://www.nike.com/in",
      logo: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
      trusted: true,
      trustScore: 100,
      badgeTier: "official_brand",
      badgeLabel: "Official Brand Direct",
      affiliateType: "none",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "nykaa",
      name: "Nykaa",
      website: "https://www.nykaa.com",
      logo: "https://upload.wikimedia.org/wikipedia/commons/0/00/Nykaa_Logo.svg",
      trusted: true,
      trustScore: 94,
      badgeTier: "authorized_dealer",
      badgeLabel: "Authorized Dealer",
      affiliateType: "query_param",
      affiliateParam: "utm_source",
      affiliateValue: "vibe",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const r of defaults) {
    inMemoryRetailers.set(r.id, r);
  }
}

// Initial seed
seedDefaultRetailers();

export async function getInMemoryAdminRetailers(): Promise<AdminRetailer[]> {
  return Array.from(inMemoryRetailers.values());
}

export async function clearInMemoryAdminRetailers(): Promise<void> {
  inMemoryRetailers.clear();
}

/**
 * Normalizes website URL to full HTTPS protocol.
 */
function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Generates a clean slug for retailer identifiers.
 */
function generateRetailerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}



/**
 * Safe revalidation helper for retailer updates.
 */
async function triggerRetailerRevalidation() {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/retailers");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
  } catch {
    // Non-Next runtime
  }
}

/**
 * Server Action to fetch all partner retailers.
 */
export async function getAdminRetailersAction(userOverride?: any): Promise<AdminRetailer[]> {
  await assertAdminSession(userOverride);
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return Array.from(inMemoryRetailers.values());
  }

  try {
    const { data, error } = await supabase
      .from("admin_retailers")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      return Array.from(inMemoryRetailers.values());
    }

    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      website: r.website,
      logo: r.logo,
      trusted: r.trusted !== false,
      trustScore: clampTrustScore(r.trust_score, 85),
      badgeTier: r.badge_tier || "trusted_retailer",
      badgeLabel: r.badge_label || getBadgeLabelForTier(r.badge_tier),
      affiliateType: r.affiliate_type || "none",
      affiliateParam: r.affiliate_param,
      affiliateValue: r.affiliate_value,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return Array.from(inMemoryRetailers.values());
  }
}

/**
 * Server Action to create or update an Admin Retailer.
 * Validates payload, bounds trust score (1-100), checks session, and stores record.
 */
export async function upsertAdminRetailerAction(
  payload: UpsertRetailerPayload,
  userOverride?: any
): Promise<RetailerActionResult> {
  // 1. Authorization check
  await assertAdminSession(userOverride);

  // 2. Validation check
  const validation = validateRetailerPayload(payload);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const cleanUrl = normalizeWebsiteUrl(payload.website);
  const retailerId = payload.id ? payload.id.trim() : generateRetailerSlug(payload.name);
  const trustScore = clampTrustScore(payload.trustScore, 85);
  const badgeTier = payload.badgeTier || (trustScore >= 98 ? "official_brand" : trustScore >= 90 ? "authorized_dealer" : "trusted_retailer");
  const badgeLabel = payload.badgeLabel || getBadgeLabelForTier(badgeTier);

  const retailer: AdminRetailer = {
    id: retailerId,
    name: payload.name.trim(),
    website: cleanUrl,
    logo: payload.logo?.trim() || undefined,
    trusted: payload.trusted !== false,
    trustScore,
    badgeTier,
    badgeLabel,
    affiliateType: payload.affiliateType || "none",
    affiliateParam: payload.affiliateParam?.trim() || undefined,
    affiliateValue: payload.affiliateValue?.trim() || undefined,
    isActive: payload.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    // In-memory fallback
    const existing = inMemoryRetailers.get(retailerId);
    retailer.createdAt = existing?.createdAt || new Date().toISOString();
    inMemoryRetailers.set(retailerId, retailer);
    await triggerRetailerRevalidation();
    return { success: true, retailer };
  }

  try {
    const { error } = await supabase.from("admin_retailers").upsert({
      id: retailer.id,
      name: retailer.name,
      website: retailer.website,
      logo: retailer.logo,
      trusted: retailer.trusted,
      trust_score: retailer.trustScore,
      badge_tier: retailer.badgeTier,
      badge_label: retailer.badgeLabel,
      affiliate_type: retailer.affiliateType,
      affiliate_param: retailer.affiliateParam,
      affiliate_value: retailer.affiliateValue,
      is_active: retailer.isActive,
      updated_at: retailer.updatedAt,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    inMemoryRetailers.set(retailerId, retailer);
    await triggerRetailerRevalidation();
    return { success: true, retailer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save retailer." };
  }
}

/**
 * Server Action to toggle a retailer's active/inactive status.
 */
export async function toggleRetailerActiveAction(
  retailerId: string,
  isActive: boolean,
  userOverride?: any
): Promise<RetailerActionResult> {
  await assertAdminSession(userOverride);

  if (!retailerId) {
    return { success: false, error: "Retailer ID is required." };
  }

  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    const mem = inMemoryRetailers.get(retailerId);
    if (!mem) {
      return { success: false, error: "Retailer not found." };
    }
    mem.isActive = isActive;
    mem.updatedAt = new Date().toISOString();
    inMemoryRetailers.set(retailerId, mem);
    await triggerRetailerRevalidation();
    return { success: true, retailer: mem };
  }

  try {
    const { error } = await supabase
      .from("admin_retailers")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", retailerId);

    if (error) {
      return { success: false, error: error.message };
    }

    const mem = inMemoryRetailers.get(retailerId);
    if (mem) {
      mem.isActive = isActive;
      mem.updatedAt = new Date().toISOString();
      inMemoryRetailers.set(retailerId, mem);
    }

    await triggerRetailerRevalidation();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to toggle retailer status." };
  }
}

/**
 * Server Action to delete a retailer record.
 */
export async function deleteAdminRetailerAction(
  retailerId: string,
  userOverride?: any
): Promise<RetailerActionResult> {
  await assertAdminSession(userOverride);

  if (!retailerId) {
    return { success: false, error: "Retailer ID is required." };
  }

  inMemoryRetailers.delete(retailerId);

  const supabase = createAdminSupabaseClient();
  if (supabase) {
    await supabase.from("admin_retailers").delete().eq("id", retailerId);
  }

  await triggerRetailerRevalidation();
  return { success: true };
}
