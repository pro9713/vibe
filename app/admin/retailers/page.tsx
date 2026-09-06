"use client";

import React, { useState, useEffect } from "react";
import { getAdminRetailersAction, saveAdminRetailerAction } from "@/app/admin/actions";
import type { AdminRetailer, AffiliateType } from "@/lib/admin/types";
import {
  Store,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Edit2,
} from "lucide-react";

export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");
  const [trustScore, setTrustScore] = useState("85");
  const [affiliateType, setAffiliateType] = useState<AffiliateType>("none");
  const [affiliateParam, setAffiliateParam] = useState("");
  const [affiliateValue, setAffiliateValue] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setTrustScore("85");
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
    setTrustScore(String(r.trustScore));
    setAffiliateType(r.affiliateType || "none");
    setAffiliateParam(r.affiliateParam || "");
    setAffiliateValue(r.affiliateValue || "");
    setIsActive(r.isActive);
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleSaveRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !website.trim()) {
      setErrorMessage("Please enter retailer name and website URL.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveAdminRetailerAction({
        id: editingId || undefined,
        name: name.trim(),
        website: website.trim(),
        logo: logo.trim() || undefined,
        trustScore: Number(trustScore) || 85,
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
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">
            Retailer & Store Management
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Configure partner retailers, trust scores, and affiliate tracking rules.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95"
        >
          <Plus size={16} />
          <span>Add Retailer</span>
        </button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-green-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Retailers List */}
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : retailers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Store size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No custom retailers configured yet.</p>
            <p className="mt-1 text-xs">
              Click &quot;Add Retailer&quot; to configure a new store partner.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Trust Score</th>
                  <th className="py-3 px-4">Affiliate Setting</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {retailers.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{r.name}</span>
                        <span className="text-[10px] text-gray-400">({r.id})</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <a
                        href={r.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <span>{r.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink size={11} />
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <ShieldCheck size={11} />
                        <span>{r.trustScore}/100</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      {r.affiliateType !== "none" ? (
                        <span>
                          {r.affiliateType} ({r.affiliateParam}={r.affiliateValue})
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(r)}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-gray-900 transition"
                        title="Edit Retailer"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Retailer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingId ? "Edit Retailer" : "Add New Retailer"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveRetailer} className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tata CLiQ"
                    className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Website URL *</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.tatacliq.com"
                    className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Trust Score (0-100)</label>
                  <input
                    type="number"
                    value={trustScore}
                    onChange={(e) => setTrustScore(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={isActive ? "active" : "disabled"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <label className="block font-bold text-gray-900 uppercase tracking-wider text-[10px]">
                  Affiliate URL Rules
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Type</label>
                    <select
                      value={affiliateType}
                      onChange={(e) => setAffiliateType(e.target.value as AffiliateType)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none"
                    >
                      <option value="none">None</option>
                      <option value="query_param">Query Param</option>
                      <option value="amazon_tag">Amazon Tag</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Param Name</label>
                    <input
                      type="text"
                      value={affiliateParam}
                      onChange={(e) => setAffiliateParam(e.target.value)}
                      placeholder="tag or aff_id"
                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Partner ID</label>
                    <input
                      type="text"
                      value={affiliateValue}
                      onChange={(e) => setAffiliateValue(e.target.value)}
                      placeholder="pricely-21"
                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Retailer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
