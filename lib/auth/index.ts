import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  createdAt?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}

export interface AuthSession {
  accessToken?: string;
  user: AuthUser;
}

// Local mock storage for browser testing when Supabase credentials are in development/local fallback mode
const MOCK_USER_STORAGE_KEY = "pricely-mock-auth-user";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("placeholder"));
}

/**
 * Gets the current authenticated user on the client (Browser).
 */
export async function getClientUser(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;

  if (!isSupabaseConfigured()) {
    const raw = window.localStorage.getItem(MOCK_USER_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      return {
        id: user.id,
        email: user.email || "",
        createdAt: user.created_at,
        appMetadata: user.app_metadata,
        userMetadata: user.user_metadata,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Client-side Sign Up.
 */
export async function signUpUser(email: string, password: string): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
  needsConfirmation?: boolean;
}> {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  if (!isSupabaseConfigured()) {
    const mockUser: AuthUser = {
      id: `usr_${Math.random().toString(36).slice(2, 10)}`,
      email: email.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser));
      window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: mockUser }));
    }
    return { success: true, user: mockUser };
  }

  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        createdAt: data.user.created_at,
      };
      return {
        success: true,
        user: authUser,
        needsConfirmation: !data.session,
      };
    }

    return { success: false, error: "Sign up could not be completed." };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error during sign up." };
  }
}

/**
 * Client-side Sign In.
 */
export async function signInUser(email: string, password: string): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password) {
    return { success: false, error: "Please enter your password." };
  }

  if (!isSupabaseConfigured()) {
    const mockUser: AuthUser = {
      id: `usr_${Math.random().toString(36).slice(2, 10)}`,
      email: email.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser));
      window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: mockUser }));
    }
    return { success: true, user: mockUser };
  }

  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: "Invalid email or password." };
    }

    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        createdAt: data.user.created_at,
      };
      return { success: true, user: authUser };
    }

    return { success: false, error: "Sign in failed." };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error during sign in." };
  }
}

/**
 * Client-side Sign Out.
 */
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore error
    }
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: null }));
  }
}
