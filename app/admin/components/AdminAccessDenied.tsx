import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { AdminSignOutButton } from "./AdminSignOutButton";

interface AdminAccessDeniedProps {
  email?: string;
}

export function AdminAccessDenied({ email }: AdminAccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/70 p-6">
      <div className="max-w-md w-full rounded-3xl border border-red-200/80 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50">
          <ShieldAlert size={32} />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-gray-950">
          Access Denied
        </h1>

        <p className="mt-2 text-sm font-semibold text-gray-700">
          Admin Privileges Required
        </p>

        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          {email ? (
            <>
              Your account (<span className="font-semibold text-gray-800">{email}</span>) does not have authorization to view the Admin Product & Retailer Manager.
            </>
          ) : (
            "Your current session does not have administrative permissions for this portal."
          )}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-gray-800 shadow-xs"
          >
            <Home size={14} />
            <span>Return to Store</span>
          </Link>

          <AdminSignOutButton className="w-full sm:w-auto" />
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-[11px] text-gray-400">
            Need access? Contact your workspace administrator to request an admin invite.
          </p>
        </div>
      </div>
    </div>
  );
}
