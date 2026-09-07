import React from "react";
import { redirect } from "next/navigation";
import { assertAdminSession } from "@/lib/admin/auth";
import { AdminNav } from "./components/AdminNav";
import { AdminAccessDenied } from "./components/AdminAccessDenied";
import { getServerUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await assertAdminSession();

    return (
      <AdminNav
        userEmail={session.user.email || ""}
        adminRole={session.role}
      >
        {children}
      </AdminNav>
    );
  } catch (error: any) {
    // Re-throw Next.js internal redirect errors so redirect() works properly
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }

    const message = error?.message || "";

    // 401 Unauthorized: Not logged in -> redirect to login
    if (message.includes("UNAUTHORIZED")) {
      redirect("/login?redirect=/admin");
    }

    // 403 Forbidden: Logged in as non-admin -> show Access Denied
    if (message.includes("FORBIDDEN")) {
      let email = "";
      try {
        const user = await getServerUser();
        email = user?.email || "";
      } catch {
        // Ignore
      }
      return <AdminAccessDenied email={email} />;
    }

    // Default fallback: If session fails due to unauthenticated state, redirect to login
    redirect("/login?redirect=/admin");
  }
}
