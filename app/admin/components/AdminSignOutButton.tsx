"use client";

import React, { useState } from "react";
import { signOutUser } from "@/lib/auth";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminSignOutButtonProps {
  className?: string;
  variant?: "button" | "icon" | "dropdown-item";
  showLabel?: boolean;
}

export function AdminSignOutButton({
  className = "",
  variant = "button",
  showLabel = true,
}: AdminSignOutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signOutUser();
      router.push("/login?redirect=/admin");
      router.refresh();
    } catch {
      window.location.href = "/login?redirect=/admin";
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleSignOut}
        disabled={loading}
        title="Sign Out"
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition disabled:opacity-50 ${className}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition active:scale-95 disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <LogOut size={14} />
      )}
      {showLabel && <span>{loading ? "Signing out..." : "Sign Out"}</span>}
    </button>
  );
}
