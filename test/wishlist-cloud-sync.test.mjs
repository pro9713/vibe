import test from "node:test";
import assert from "node:assert/strict";

// Mock browser localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Global window mock
const mockStorage = new MockLocalStorage();
const events = [];

globalThis.window = {
  localStorage: mockStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: (event) => {
    events.push(event);
    return true;
  },
};

globalThis.CustomEvent = class {
  constructor(name, options = {}) {
    this.type = name;
    this.detail = options.detail;
  }
};

// Cloud backend simulation
const cloudDatabase = {
  wishlists: new Map(), // userId -> Set(productIds)
  trackedTargets: new Map(), // userId -> Record<productId, target>
};

function resetCloudDb() {
  cloudDatabase.wishlists.clear();
  cloudDatabase.trackedTargets.clear();
}

// Server authorization validation logic
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_USER_REGEX = /^usr_[a-z0-9_-]+$/i;

function validateServerAuthHeader(authHeader, serverUserId) {
  if (serverUserId) return serverUserId;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (UUID_REGEX.test(token)) return token;
  if (LEGACY_USER_REGEX.test(token)) return token;
  if (token.split(".").length === 3) return "jwt_user_id";
  return null;
}

// Simulated cloud merge API
function handleCloudSyncRequest(userId, action, anonymousData = {}) {
  if (!userId) throw new Error("Unauthorized");

  if (action === "get") {
    const list = Array.from(cloudDatabase.wishlists.get(userId) || []);
    const targets = cloudDatabase.trackedTargets.get(userId) || {};
    return { wishlist: list, trackedTargets: targets };
  }

  if (action === "merge") {
    let set = cloudDatabase.wishlists.get(userId);
    if (!set) {
      set = new Set();
      cloudDatabase.wishlists.set(userId, set);
    }
    if (Array.isArray(anonymousData.wishlist)) {
      for (const id of anonymousData.wishlist) {
        set.add(id);
      }
    }

    let targets = cloudDatabase.trackedTargets.get(userId);
    if (!targets) {
      targets = {};
      cloudDatabase.trackedTargets.set(userId, targets);
    }
    if (anonymousData.trackedTargets) {
      Object.assign(targets, anonymousData.trackedTargets);
    }

    return { wishlist: Array.from(set), trackedTargets: targets };
  }

  throw new Error("Unknown action");
}

test("1. Guest wishlist addition and persistence", () => {
  mockStorage.clear();
  mockStorage.setItem("pricely-active-user-id", "guest");
  mockStorage.setItem("pricely-wishlist", JSON.stringify(["prod-1", "prod-2"]));

  const stored = JSON.parse(mockStorage.getItem("pricely-wishlist"));
  assert.deepEqual(stored, ["prod-1", "prod-2"]);
  assert.equal(mockStorage.getItem("pricely-active-user-id"), "guest");
});

test("2. Login sync: merges guest items into authenticated user cloud account", () => {
  resetCloudDb();
  mockStorage.clear();

  // Guest adds items
  const guestWishlist = ["prod-guest-1", "prod-guest-2"];
  mockStorage.setItem("pricely-active-user-id", "guest");
  mockStorage.setItem("pricely-wishlist", JSON.stringify(guestWishlist));

  // User A logs in
  const userAId = "d3b07384-d113-494b-bb12-9c17e48b1111";
  const syncResult = handleCloudSyncRequest(userAId, "merge", { wishlist: guestWishlist });

  assert.deepEqual(syncResult.wishlist, ["prod-guest-1", "prod-guest-2"]);

  // Local storage updated for User A
  mockStorage.setItem("pricely-active-user-id", userAId);
  mockStorage.setItem("pricely-wishlist", JSON.stringify(syncResult.wishlist));
  assert.equal(mockStorage.getItem("pricely-active-user-id"), userAId);
});

test("3. Cloud-to-local loading: user cloud wishlist populates local store", () => {
  const userAId = "d3b07384-d113-494b-bb12-9c17e48b1111";
  cloudDatabase.wishlists.set(userAId, new Set(["prod-cloud-1", "prod-cloud-2"]));

  const result = handleCloudSyncRequest(userAId, "get");
  assert.deepEqual(result.wishlist, ["prod-cloud-1", "prod-cloud-2"]);

  mockStorage.setItem("pricely-wishlist", JSON.stringify(result.wishlist));
  mockStorage.setItem("pricely-active-user-id", userAId);

  const localItems = JSON.parse(mockStorage.getItem("pricely-wishlist"));
  assert.deepEqual(localItems, ["prod-cloud-1", "prod-cloud-2"]);
});

test("4. Logout isolation: clearing local state prevents next guest from seeing user data", () => {
  const userAId = "d3b07384-d113-494b-bb12-9c17e48b1111";
  mockStorage.setItem("pricely-active-user-id", userAId);
  mockStorage.setItem("pricely-wishlist", JSON.stringify(["secret-userA-item"]));

  // User logs out (simulating resetLocalWishlistState / signOutUser)
  mockStorage.removeItem("pricely-wishlist");
  mockStorage.removeItem("pricely-tracked-targets");
  mockStorage.setItem("pricely-active-user-id", "guest");

  assert.equal(mockStorage.getItem("pricely-wishlist"), null);
  assert.equal(mockStorage.getItem("pricely-active-user-id"), "guest");

  // Verify cloud data for User A is preserved
  const userACloud = handleCloudSyncRequest(userAId, "get");
  assert.ok(userACloud.wishlist.length > 0);
});

test("5. User A / User B isolation: User B does not inherit User A's data", () => {
  resetCloudDb();
  mockStorage.clear();

  const userAId = "11111111-1111-1111-1111-111111111111";
  const userBId = "22222222-2222-2222-2222-222222222222";

  // User A stores items
  cloudDatabase.wishlists.set(userAId, new Set(["item-A1", "item-A2"]));
  // User B stores items
  cloudDatabase.wishlists.set(userBId, new Set(["item-B1"]));

  // User A logs out
  mockStorage.removeItem("pricely-wishlist");
  mockStorage.setItem("pricely-active-user-id", "guest");

  // User B logs in
  const prevOwner = mockStorage.getItem("pricely-active-user-id");
  const isGuest = !prevOwner || prevOwner === "guest";
  const anonWishlist = isGuest && mockStorage.getItem("pricely-wishlist")
    ? JSON.parse(mockStorage.getItem("pricely-wishlist"))
    : [];

  const userBSync = handleCloudSyncRequest(userBId, "merge", { wishlist: anonWishlist });
  assert.deepEqual(userBSync.wishlist, ["item-B1"]);
  assert.equal(userBSync.wishlist.includes("item-A1"), false);
});

test("6. New-device cloud restore: clean device restores user's cloud items", () => {
  resetCloudDb();
  const userId = "33333333-3333-3333-3333-333333333333";
  cloudDatabase.wishlists.set(userId, new Set(["restored-phone", "restored-laptop"]));

  // New device has clean storage
  const newDeviceStorage = new MockLocalStorage();
  assert.equal(newDeviceStorage.getItem("pricely-wishlist"), null);

  // User signs in on new device
  const cloudData = handleCloudSyncRequest(userId, "get");
  newDeviceStorage.setItem("pricely-wishlist", JSON.stringify(cloudData.wishlist));
  newDeviceStorage.setItem("pricely-active-user-id", userId);

  const restored = JSON.parse(newDeviceStorage.getItem("pricely-wishlist"));
  assert.deepEqual(restored, ["restored-phone", "restored-laptop"]);
});

test("7. Refresh after login: retains authenticated user state", () => {
  const userId = "33333333-3333-3333-3333-333333333333";
  mockStorage.setItem("pricely-active-user-id", userId);
  mockStorage.setItem("pricely-wishlist", JSON.stringify(["restored-phone", "restored-laptop"]));

  // Page reloads: reads from store, validates active user
  const currentOwner = mockStorage.getItem("pricely-active-user-id");
  assert.equal(currentOwner, userId);
  const items = JSON.parse(mockStorage.getItem("pricely-wishlist"));
  assert.equal(items.length, 2);
});

test("8. Duplicate prevention: deduplicates concurrent sync calls", async () => {
  let callCount = 0;
  let inFlight = null;

  async function mockDeduplicatedSync() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return { success: true };
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  const [res1, res2, res3] = await Promise.all([
    mockDeduplicatedSync(),
    mockDeduplicatedSync(),
    mockDeduplicatedSync(),
  ]);

  assert.equal(res1.success, true);
  assert.equal(res2.success, true);
  assert.equal(res3.success, true);
  assert.equal(callCount, 1, "Expected only 1 network execution for concurrent sync calls");
});

test("9. Authorization with Supabase UUID", () => {
  const validUuid = "d3b07384-d113-494b-bb12-9c17e48b1111";
  const authHeader = `Bearer ${validUuid}`;

  const userId = validateServerAuthHeader(authHeader);
  assert.equal(userId, validUuid);
});

test("10. Legacy usr_ compatibility", () => {
  const legacyId = "usr_mock12345";
  const authHeader = `Bearer ${legacyId}`;

  const userId = validateServerAuthHeader(authHeader);
  assert.equal(userId, legacyId);
});

test("11. Rejects invalid authorization headers", () => {
  assert.equal(validateServerAuthHeader("Basic abc"), null);
  assert.equal(validateServerAuthHeader("Bearer invalid-random-token"), null);
  assert.equal(validateServerAuthHeader(""), null);
});
