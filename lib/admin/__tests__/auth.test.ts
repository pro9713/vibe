import test from "node:test";
import assert from "node:assert/strict";
import {
  isEmailAdmin,
  isUserAdmin,
  getAdminSession,
  assertAdminSession,
} from "../auth.ts";

test("1. Admin Auth - Email verification", () => {
  assert.equal(isEmailAdmin("admin@pricely.in"), true);
  assert.equal(isEmailAdmin("owner@pricely.in"), true);
  assert.equal(isEmailAdmin("admin@subdomain.pricely.in"), true);
  assert.equal(isEmailAdmin("user@example.com"), false);
  assert.equal(isEmailAdmin(null), false);
  assert.equal(isEmailAdmin(undefined), false);
});

test("2. Admin Auth - isUserAdmin accepts both admin and super_admin roles", async () => {
  const superAdminUser = {
    id: "user-super-1",
    email: "super@pricely.in",
    app_metadata: { role: "super_admin" },
  };

  const adminUser = {
    id: "user-admin-1",
    email: "staff@pricely.in",
    user_metadata: { role: "admin" },
  };

  const regularUser = {
    id: "user-reg-1",
    email: "regular@gmail.com",
    user_metadata: { role: "authenticated" },
  };

  assert.equal(await isUserAdmin(superAdminUser as any), true, "super_admin role should pass isUserAdmin");
  assert.equal(await isUserAdmin(adminUser as any), true, "admin role should pass isUserAdmin");
  assert.equal(await isUserAdmin(regularUser as any), false, "regular authenticated user should fail isUserAdmin");
  assert.equal(await isUserAdmin(null), false, "null user should fail isUserAdmin");
});

test("3. Admin Auth - assertAdminSession rejects unauthorized and non-admin users", async () => {
  // Null session
  await assert.rejects(
    async () => {
      await assertAdminSession(null);
    },
    { message: /UNAUTHORIZED: Authentication required/ }
  );

  // Non-admin user
  const normalUser = {
    id: "user-norm-1",
    email: "shopper@domain.com",
    user_metadata: { role: "authenticated" },
  };

  await assert.rejects(
    async () => {
      await assertAdminSession(normalUser as any);
    },
    { message: /FORBIDDEN: Administrative privileges required/ }
  );
});

test("4. Admin Auth - assertAdminSession returns valid AdminSession for admin / super_admin", async () => {
  const superAdmin = {
    id: "user-super-2",
    email: "admin@pricely.in",
    user_metadata: { role: "super_admin" },
  };

  const session = await assertAdminSession(superAdmin as any);
  assert.ok(session);
  assert.equal(session.user.id, "user-super-2");
  assert.equal(session.user.email, "admin@pricely.in");
});

test("5. Admin Auth - assertAdminSession in development returns mock super_admin when no session", async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = "development";
    const devSession = await assertAdminSession();
    assert.ok(devSession);
    assert.equal(devSession.role, "super_admin");
    assert.equal(devSession.email, "admin@pricely.in");
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
  }
});
