"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { signUpUser } from "@/lib/auth";
import { getAnonymousClientId } from "@/lib/client-push";
import { syncWithCloud } from "@/lib/wishlist";
import { syncAlertsWithCloud } from "@/lib/price-alerts";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await signUpUser(email, password);

      if (!res.success) {
        setError(res.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      // Check if email confirmation is required by Supabase
      if (res.needsConfirmation) {
        setNeedsConfirmation(true);
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

      setSuccess(true);
      setTimeout(() => {
        router.push("/account");
      }, 1500);
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
                <Sparkles size={24} />
              </div>
              <h1 className="text-2xl font-black text-gray-900">
                Create your Vibe Account
              </h1>
              <p className="mt-1.5 text-xs text-gray-500">
                Sync price alerts and tracked deals across all your devices
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-xs font-semibold text-red-700">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {needsConfirmation ? (
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-1">
                  <Mail size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Check your email to confirm your Vibe account.
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We sent a confirmation link to <span className="font-semibold text-gray-900">{email}</span>. Please click the link to activate your account and start tracking deals.
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                  >
                    <span>Return to Login</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : success ? (
              <div className="text-center py-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Account Created!</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Redirecting you to your account...
                </p>
              </div>
            ) : (
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
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
