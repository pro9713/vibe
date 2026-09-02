"use client";

import { useEffect, useState } from "react";
import { getClientUser, signOutUser, type AuthUser } from "./index";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const u = await getClientUser();
      if (isMounted) {
        setUser(u);
        setLoading(false);
      }
    }

    loadUser();

    // Listen to custom auth events
    const handleAuthChange = (e: CustomEvent<AuthUser | null>) => {
      if (isMounted) {
        setUser(e.detail);
      }
    };

    window.addEventListener("auth-state-changed", handleAuthChange as EventListener);

    // Listen to Supabase auth state change if active
    const supabase = createBrowserSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: unknown, session: { user?: { id: string; email?: string; created_at?: string } } | null) => {
      if (isMounted) {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            createdAt: session.user.created_at,
          });
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener("auth-state-changed", handleAuthChange as EventListener);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
  };

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    signOut: handleSignOut,
  };
}
