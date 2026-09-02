"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  ShieldCheck,
  Bell,
  Smartphone,
  LogOut,
  ExternalLink,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import VibeLoader from "@/app/components/VibeLoader";
import { useAuth } from "@/lib/auth/use-auth";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <VibeLoader fullScreen={false} size="md" />
        </main>
        <Footer />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 md:py-12 px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/80 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <User size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900">Your Account</h1>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 active:scale-95"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>

          {/* Account Details Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
              Account Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Mail size={14} />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email</span>
                </div>
                <p className="text-xs font-bold text-gray-900">{user?.email}</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <ShieldCheck size={14} />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Account Status</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-green-700">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span>Active & Verified</span>
                </div>
              </div>
            </div>

            {/* Multi-Device Sync Card */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/30 p-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Smartphone size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-gray-900">
                    Multi-Device Push Alerts Enabled
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Your tracked price alerts are synchronized across all authorized devices connected to this account.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href="/alerts"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <Bell size={13} />
                      <span>Manage Price Alerts</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
