"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { signInUser } from "@/lib/auth";
import { getAnonymousClientId } from "@/lib/client-push";
import { syncWithCloud } from "@/lib/wishlist";
import { syncAlertsWithCloud } from "@/lib/price-alerts";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "auth_callback") {
        setError("Email verification link was invalid or expired. Please sign in or request a new link.");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await signInUser(email, password);

      if (!res.success) {
        if (res.isEmailUnconfirmed) {
          setError("Please confirm your email before signing in.");
        } else {
          setError(res.error || "Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      // Link anonymous client identity
      const anonId = getAnonymousClientId();
      if (anonId && res.user?.id) {
        fetch("/api/account/link-anonymous", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${res.user.id}`,
          },
          body: JSON.stringify({ anonymousClientId: anonId }),
        }).catch(() => {});
      }

      // Sync anonymous wishlist and tracked targets to user cloud account
      if (res.user?.id) {
        syncWithCloud(res.user.id).catch(() => {});
        syncAlertsWithCloud(res.user.id).catch(() => {});
      }

      router.push("/account");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 md:p-10 shadow-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                <LogIn size={24} />
              </div>
              <h1 className="text-2xl font-black text-gray-900">
                Welcome back
              </h1>
              <p className="mt-1.5 text-xs text-gray-500">
                Sign in to your Vibe account to manage alerts and tracked deals
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-xs font-semibold text-red-700">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-bold text-blue-600 hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
