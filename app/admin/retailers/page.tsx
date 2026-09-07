"use client";

import React, { useState, useEffect } from "react";
import {
  getAdminRetailersAction,
  upsertAdminRetailerAction,
  toggleRetailerActiveAction,
  deleteAdminRetailerAction,
} from "./actions";
import {
  type AdminRetailer,
  type AffiliateType,
  type RetailerBadgeTier,
  getBadgeLabelForTier,
} from "@/lib/admin/types";
import {
  Store,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Sparkles,
  Link as LinkIcon,
  Tag,
  Building2,
  Layers,
  Award,
} from "lucide-react";

const BADGE_TIER_CONFIG: Record<
  RetailerBadgeTier,
  {
    label: string;
    trustScore: number;
    badgeStyle: string;
    description: string;
  }
> = {
  official_brand: {
    label: "Official Brand Direct",
    trustScore: 100,
    badgeStyle:
      "bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 text-purple-800 border-purple-200/80 shadow-2xs",
    description: "First-party brand direct store with 100% manufacturer warranty.",
  },
  authorized_dealer: {
    label: "Authorized Dealer",
    trustScore: 95,
    badgeStyle: "bg-blue-50 text-blue-800 border-blue-200 shadow-2xs",
    description: "Certified distributor / licensed authorized retail partner.",
  },
  verified_marketplace: {
    label: "Marketplace Assured",
    trustScore: 88,
    badgeStyle: "bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs",
    description: "Major multi-vendor marketplace with buyer protection guarantee.",
  },
  trusted_retailer: {
    label: "Trusted Retailer",
    trustScore: 85,
    badgeStyle: "bg-teal-50 text-teal-800 border-teal-200 shadow-2xs",
    description: "Vetted independent retail merchant with verified stock fulfillment.",
  },
  standard: {
    label: "Standard Partner",
    trustScore: 70,
    badgeStyle: "bg-gray-100 text-gray-700 border-gray-200 shadow-2xs",
    description: "Standard web merchant undergoing regular price and stock audits.",
  },
};

export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");
  const [trustScore, setTrustScore] = useState(85);
  const [badgeTier, setBadgeTier] = useState<RetailerBadgeTier>("trusted_retailer");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [affiliateType, setAffiliateType] = useState<AffiliateType>("none");
  const [affiliateParam, setAffiliateParam] = useState("");
  const [affiliateValue, setAffiliateValue] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRetailers = async () => {
    setLoading(true);
    try {
      const data = await getAdminRetailersAction();
      setRetailers(data);
    } catch (err) {
      console.warn("[AdminRetailers] Error loading retailers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName("");
    setWebsite("");
    setLogo("");
    setTrustScore(85);
    setBadgeTier("trusted_retailer");
    setBadgeLabel("Trusted Retailer");
    setAffiliateType("none");
    setAffiliateParam("");
    setAffiliateValue("");
    setIsActive(true);
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (r: AdminRetailer) => {
    setEditingId(r.id);
    setName(r.name);
    setWebsite(r.website);
    setLogo(r.logo || "");
    setTrustScore(r.trustScore || 85);
    const tier = r.badgeTier || "trusted_retailer";
    setBadgeTier(tier);
    setBadgeLabel(r.badgeLabel || getBadgeLabelForTier(tier));
    setAffiliateType(r.affiliateType || "none");
    setAffiliateParam(r.affiliateParam || "");
    setAffiliateValue(r.affiliateValue || "");
    setIsActive(r.isActive);
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleBadgeTierChange = (tier: RetailerBadgeTier) => {
    setBadgeTier(tier);
    const config = BADGE_TIER_CONFIG[tier];
    if (config) {
      setTrustScore(config.trustScore);
      setBadgeLabel(config.label);
    }
  };

  const handleSaveRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !website.trim()) {
      setErrorMessage("Please enter retailer name and website URL.");
      return;
    }

    const clampedScore = Math.min(100, Math.max(1, Number(trustScore) || 85));

    setIsSubmitting(true);
    try {
      const res = await upsertAdminRetailerAction({
        id: editingId || undefined,
        name: name.trim(),
        website: website.trim(),
        logo: logo.trim() || undefined,
        trustScore: clampedScore,
        badgeTier,
        badgeLabel: badgeLabel.trim() || getBadgeLabelForTier(badgeTier),
        affiliateType,
        affiliateParam: affiliateParam.trim() || undefined,
        affiliateValue: affiliateValue.trim() || undefined,
        isActive,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to save retailer.");
      } else {
        setSuccessMessage(`Retailer ${editingId ? "updated" : "added"} successfully.`);
        setShowModal(false);
        await fetchRetailers();
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setToggleLoadingId(id);
    try {
      const res = await toggleRetailerActiveAction(id, !currentStatus);
      if (res.success) {
        setRetailers((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r))
        );
      }
    } catch (err) {
      console.warn("[ToggleActive] Error:", err);
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDeleteRetailer = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this retailer record?")) return;
    try {
      const res = await deleteAdminRetailerAction(id);
      if (res.success) {
        setRetailers((prev) => prev.filter((r) => r.id !== id));
        setSuccessMessage("Retailer removed successfully.");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.warn("[DeleteRetailer] Error:", err);
    }
  };

  // Filtered list
  const filteredRetailers = retailers.filter((r) => {
    const matchQuery =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.website.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "all" || r.badgeTier === tierFilter;
    return matchQuery && matchTier;
  });

  const activeCount = retailers.filter((r) => r.isActive).length;
  const officialCount = retailers.filter((r) => r.badgeTier === "official_brand").length;
  const avgTrust =
    retailers.length > 0
      ? Math.round(retailers.reduce((sum, r) => sum + (r.trustScore || 85), 0) / retailers.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">
            Partner Retailers & Authenticity Tiers
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Configure merchant trustworthiness, verification badge tiers, and outbound affiliate parameters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95"
        >
          <Plus size={16} />
          <span>Add Partner Store</span>
        </button>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Total Partners
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Store size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{retailers.length}</p>
          <p className="mt-1 text-[11px] text-gray-500">Configured merchants</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Active Integrations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{activeCount}</p>
          <p className="mt-1 text-[11px] text-gray-500">Live for price comparisons</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Official Brands
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Award size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{officialCount}</p>
          <p className="mt-1 text-[11px] text-gray-500">Tier 1 Brand Direct</p>
        </div>

        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Avg Trust Score
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck size={16} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-950">{avgTrust}/100</p>
          <p className="mt-1 text-[11px] text-gray-500">Authenticity baseline</p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search retailers by name or domain..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Authenticity Tiers</option>
              <option value="official_brand">Official Brand Direct (100)</option>
              <option value="authorized_dealer">Authorized Dealer (95)</option>
              <option value="verified_marketplace">Marketplace Assured (88)</option>
              <option value="trusted_retailer">Trusted Retailer (85)</option>
              <option value="standard">Standard Partner (70)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Retailers List / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="mt-2 text-xs font-semibold text-gray-500">Loading partner stores...</p>
        </div>
      ) : filteredRetailers.length === 0 ? (
        <div className="rounded-3xl border border-gray-200/80 bg-white p-16 text-center shadow-xs">
          <Building2 size={36} className="mx-auto mb-2 opacity-40 text-gray-400" />
          <p className="text-sm font-bold text-gray-800">No partner retailers found</p>
          <p className="mt-1 text-xs text-gray-500">
            Try adjusting your search query or add a new verified store.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRetailers.map((r) => {
            const tier = r.badgeTier || "trusted_retailer";
            const tierMeta = BADGE_TIER_CONFIG[tier] || BADGE_TIER_CONFIG.trusted_retailer;

            return (
              <div
                key={r.id}
                className={`rounded-3xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  r.isActive ? "border-gray-200/80 bg-white" : "border-gray-200 bg-gray-50/60 opacity-80"
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Store Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                        {r.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.logo}
                            alt={r.name}
                            className="h-full w-full object-contain p-1.5"
                          />
                        ) : (
                          <Store size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{r.name}</h3>
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600 transition"
                        >
                          <span className="truncate max-w-[160px]">
                            {r.website.replace(/^https?:\/\//, "")}
                          </span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(r.id, r.isActive)}
                      disabled={toggleLoadingId === r.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        r.isActive ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                      title={r.isActive ? "Deactivate store" : "Activate store"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          r.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Authenticity Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[11px] font-bold ${tierMeta.badgeStyle}`}
                    >
                      <ShieldCheck size={13} className="shrink-0" />
                      <span>{r.badgeLabel || tierMeta.label}</span>
                    </span>
                    <p className="mt-1 text-[10px] text-gray-400 leading-snug">
                      {tierMeta.description}
                    </p>
                  </div>

                  {/* Trust Score Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-gray-500">Trust Score</span>
                      <span className="font-mono text-gray-900">{r.trustScore || 85}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (r.trustScore || 85) >= 95
                            ? "bg-purple-600"
                            : (r.trustScore || 85) >= 90
                            ? "bg-blue-600"
                            : (r.trustScore || 85) >= 80
                            ? "bg-teal-600"
                            : "bg-gray-400"
                        }`}
                        style={{ width: `${Math.min(100, r.trustScore || 85)}%` }}
                      />
                    </div>
                  </div>

                  {/* Affiliate Model Tag */}
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <Tag size={12} className="text-gray-400" />
                    <span>
                      Affiliate:{" "}
                      <strong className="text-gray-700 capitalize">
                        {r.affiliateType?.replace("_", " ") || "None"}
                      </strong>
                    </span>
                    {r.affiliateParam && (
                      <span className="rounded-sm bg-gray-100 px-1 font-mono text-[9px] text-gray-600">
                        {r.affiliateParam}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      r.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {r.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(r)}
                      className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs"
                      title="Edit retailer parameters"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRetailer(r.id)}
                      className="rounded-xl border border-gray-200 bg-white p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition shadow-2xs"
                      title="Delete retailer record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for Add / Edit Retailer */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-gray-950">
                  {editingId ? "Edit Partner Retailer" : "Add New Partner Store"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveRetailer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Store Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700">Retailer / Store Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nike India, Ajio, Nykaa"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Website URL */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700">Store Website URL *</label>
                  <input
                    type="text"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.example.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Logo URL */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Authenticity Tier Selector */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700">Authenticity Badge Tier</label>
                  <select
                    value={badgeTier}
                    onChange={(e) => handleBadgeTierChange(e.target.value as RetailerBadgeTier)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                  >
                    <option value="official_brand">Official Brand Direct (Trust 100)</option>
                    <option value="authorized_dealer">Authorized Dealer (Trust 95)</option>
                    <option value="verified_marketplace">Marketplace Assured (Trust 88)</option>
                    <option value="trusted_retailer">Trusted Retailer (Trust 85)</option>
                    <option value="standard">Standard Partner (Trust 70)</option>
                  </select>
                </div>

                {/* Live Badge Preview */}
                <div className="sm:col-span-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Live Badge Preview</span>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {BADGE_TIER_CONFIG[badgeTier]?.description}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[11px] font-bold ${BADGE_TIER_CONFIG[badgeTier]?.badgeStyle}`}
                  >
                    <ShieldCheck size={13} />
                    <span>{badgeLabel || BADGE_TIER_CONFIG[badgeTier]?.label}</span>
                  </span>
                </div>

                {/* Custom Trust Score (Bounded 1-100) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    Trust Score (1-100): <span className="font-mono text-blue-600">{trustScore}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={trustScore}
                    onChange={(e) => setTrustScore(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Active Status Checkbox */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Enable store in catalog offers
                  </label>
                </div>

                {/* Affiliate Model Configuration */}
                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700">Affiliate Model</label>
                  <select
                    value={affiliateType}
                    onChange={(e) => setAffiliateType(e.target.value as AffiliateType)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                  >
                    <option value="none">None / Direct Traffic</option>
                    <option value="amazon_tag">Amazon Associates Tag (tag=...)</option>
                    <option value="query_param">Standard Query Parameter (aff_id, utm_source, etc.)</option>
                    <option value="custom_url">Custom Redirect Template</option>
                  </select>
                </div>

                {affiliateType !== "none" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">
                        {affiliateType === "amazon_tag" ? "Parameter Name (tag)" : "Param Key"}
                      </label>
                      <input
                        type="text"
                        value={affiliateParam}
                        onChange={(e) => setAffiliateParam(e.target.value)}
                        placeholder={affiliateType === "amazon_tag" ? "tag" : "aff_id"}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">Tracking Partner Value</label>
                      <input
                        type="text"
                        value={affiliateValue}
                        onChange={(e) => setAffiliateValue(e.target.value)}
                        placeholder="e.g. vibe-21"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Retailer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
