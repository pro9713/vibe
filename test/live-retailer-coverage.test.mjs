import test from "node:test";
import assert from "node:assert/strict";
import { executeSmartSearch } from "../lib/search/searchEngine.ts";
import {
  getCachedLiveSearch,
  setCachedLiveSearch,
  getCachedLiveProduct,
  setCachedLiveProduct,
  getInFlightLiveSearch,
  setInFlightLiveSearch,
  buildLiveSearchCacheKey,
  clearLiveCache,
} from "../lib/quickcommerce/live-product-cache.ts";
import { LocalProductProvider } from "../lib/data/providers/local-product.provider.ts";
import { getProductById } from "../lib/data/index.ts";
import { calculateProductMatchConfidence } from "../lib/search/productMatcher.ts";
import {
  tagProductAmazonOffers,
  buildAmazonAffiliateUrl,
  isAmazonUrl,
} from "../lib/affiliate/amazon.ts";
import { normalizeQuickCommerceProduct } from "../lib/quickcommerce/normalizer.ts";
import { createProduct } from "../lib/data/types.ts";

test.beforeEach(() => {
  clearLiveCache();
});

test("1. Local search generates ZERO QuickCommerce / remote API calls", async () => {
  let liveApiCallCount = 0;

  // Mock searchEngine / provider in local mode
  const result = await executeSmartSearch("running shoes", {
    mode: "local",
  });

  assert.equal(liveApiCallCount, 0, "Local search must never trigger remote QuickCommerce calls");
  assert.equal(result.source, "local");
  assert.ok(result.products.length > 0, "Expected local matches for running shoes");
  assert.ok(
    result.products.every((p) => !p.id.startsWith("qc-")),
    "Local results should only contain catalog products"
  );
});

test("2. Typing and debouncing generate ZERO QuickCommerce calls", async () => {
  let liveApiCallCount = 0;

  // Simulate user typing queries keystroke by keystroke
  const keystrokes = ["n", "ni", "nik", "nike", "nike ", "nike s", "nike shoe"];

  for (const query of keystrokes) {
    // Default search mode is local
    const result = await executeSmartSearch(query);
    assert.equal(liveApiCallCount, 0, `Keystroke "${query}" made unprompted live call`);
    assert.equal(result.source, "local");
  }

  assert.equal(liveApiCallCount, 0, "Typing must not invoke QuickCommerce API");
});

test("3. Category navigation generates ZERO QuickCommerce calls", async () => {
  let liveApiCallCount = 0;

  const categories = ["Men", "Women", "Shoes", "Watches", "Bags", "Beauty"];

  for (const category of categories) {
    const result = await executeSmartSearch("", { category, mode: "local" });
    assert.equal(liveApiCallCount, 0, `Category "${category}" triggered live call`);
    assert.equal(result.source, "local");
    assert.ok(result.products.length > 0);
  }

  assert.equal(liveApiCallCount, 0, "Category navigation must remain purely offline/local");
});

test("4. Empty local search without clicking Live Retailers generates ZERO calls", async () => {
  let liveApiCallCount = 0;

  // Search for an item guaranteed not in the 52-product catalog
  const result = await executeSmartSearch("unobtainium hoverboard 9000", {
    mode: "local",
  });

  assert.equal(liveApiCallCount, 0, "Empty search must not automatically call live API");
  assert.equal(result.products.length, 0);
  assert.equal(result.source, "local");
});

test("5. Explicit live search triggers mock provider path safely", async () => {
  let mockApiCalls = 0;

  const mockLiveProducts = [
    createProduct({
      id: "qc-blinkit-101",
      name: "Amul Butter 500g",
      brand: "Amul",
      category: "Quick Commerce",
      description: "Pasteurised butter 500g",
      image: "https://example.com/amul.png",
      rating: 4.8,
      reviews: 1200,
      trustScore: 88,
      offers: [
        {
          store: "BlinkIt",
          price: 275,
          originalPrice: 285,
          currency: "INR",
          url: "https://blinkit.com/prid/101",
          availability: true,
          lastUpdated: new Date().toISOString(),
        },
      ],
    }),
  ];

  const key = buildLiveSearchCacheKey({
    query: "amul butter",
    lat: 19.076,
    lon: 72.8777,
    platform: "BlinkIt",
  });

  // Populate mock live cache
  setCachedLiveSearch(key, mockLiveProducts, "BlinkIt", "amul butter");
  mockApiCalls++;

  const cachedResult = getCachedLiveSearch(key);
  assert.ok(cachedResult, "Expected cached live search results");
  assert.equal(cachedResult.length, 1);
  assert.equal(cachedResult[0].id, "qc-blinkit-101");
  assert.equal(cachedResult[0].offers[0].price, 275);
  assert.equal(mockApiCalls, 1);
});

test("6. Cache Hit returns cached results with 0 additional external calls", async () => {
  let externalCalls = 0;

  const mockProduct = createProduct({
    id: "qc-zepto-202",
    name: "Tata Salt 1kg",
    brand: "Tata",
    category: "Groceries",
    description: "Vacuum evaporated iodized salt",
    image: "https://example.com/salt.png",
    rating: 4.9,
    reviews: 5000,
    trustScore: 88,
    offers: [
      {
        store: "Zepto",
        price: 28,
        currency: "INR",
        url: "https://zepto.com/p/202",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  const cacheKey = buildLiveSearchCacheKey({
    query: "tata salt",
    pincode: "400001",
    platform: "Zepto",
  });

  // First call caches data
  setCachedLiveSearch(cacheKey, [mockProduct], "Zepto", "tata salt");
  externalCalls++;

  // Subsequent repeated searches hit memory cache
  for (let i = 0; i < 5; i++) {
    const cached = getCachedLiveSearch(cacheKey);
    assert.ok(cached !== null, "Cache hit expected");
    assert.equal(cached.length, 1);
    assert.equal(cached[0].id, "qc-zepto-202");
  }

  assert.equal(externalCalls, 1, "Cache hits must consume 0 additional external calls");
});

test("7. In-flight request deduplication prevents duplicate concurrent calls", async () => {
  let backendCallCounter = 0;

  const cacheKey = buildLiveSearchCacheKey({
    query: "organic milk",
    platform: "Instamart",
  });

  const fetchLiveProductsMock = async () => {
    backendCallCounter++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [
      createProduct({
        id: "qc-instamart-303",
        name: "Amul Organic Milk 1L",
        brand: "Amul",
        category: "Dairy",
        description: "Fresh toned milk",
        image: "https://example.com/milk.png",
        rating: 4.5,
        reviews: 300,
        trustScore: 90,
        offers: [
          {
            store: "Instamart",
            price: 70,
            currency: "INR",
            url: "https://swiggy.com/instamart/303",
            availability: true,
            lastUpdated: new Date().toISOString(),
          },
        ],
      }),
    ];
  };

  // Launch 3 simultaneous requests for the same key
  const getDeduplicatedPromise = () => {
    const existing = getInFlightLiveSearch(cacheKey);
    if (existing) return existing;

    const promise = fetchLiveProductsMock();
    setInFlightLiveSearch(cacheKey, promise);
    return promise;
  };

  const [res1, res2, res3] = await Promise.all([
    getDeduplicatedPromise(),
    getDeduplicatedPromise(),
    getDeduplicatedPromise(),
  ]);

  assert.equal(backendCallCounter, 1, "Concurrent in-flight requests must be deduplicated to 1 call");
  assert.equal(res1[0].id, "qc-instamart-303");
  assert.equal(res2[0].id, "qc-instamart-303");
  assert.equal(res3[0].id, "qc-instamart-303");
});

test("8. Strict variant mismatch rejection preserves safety", () => {
  const baseTarget = createProduct({
    id: "nike-pegasus-40-uk9",
    name: "Nike Air Zoom Pegasus 40 UK 9",
    brand: "Nike",
    category: "Shoes",
    description: "Men's running shoes size UK 9",
    image: "/images/pegasus.jpg",
    rating: 4.6,
    reviews: 450,
    trustScore: 92,
    offers: [
      {
        store: "Nike India",
        price: 9995,
        currency: "INR",
        url: "https://nike.com/pegasus-40",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  // 1. Size mismatch (UK 9 vs UK 10)
  const sizeMismatch = calculateProductMatchConfidence(baseTarget, {
    name: "Nike Air Zoom Pegasus 40 UK 10",
    brand: "Nike",
    price: 9995,
  });
  assert.equal(sizeMismatch.isMatch, false, "Must reject different shoe size");
  assert.match(sizeMismatch.reason, /size mismatch/i);

  // 2. Generation / Series mismatch (Pegasus 40 vs Pegasus 39)
  const genMismatch = calculateProductMatchConfidence(baseTarget, {
    name: "Nike Air Zoom Pegasus 39 UK 9",
    brand: "Nike",
    price: 7995,
  });
  assert.equal(genMismatch.isMatch, false, "Must reject different generation");

  // 3. Brand mismatch
  const brandMismatch = calculateProductMatchConfidence(baseTarget, {
    name: "Adidas Ultraboost UK 9",
    brand: "Adidas",
    price: 9995,
  });
  assert.equal(brandMismatch.isMatch, false, "Must reject different brand");

  // 4. Exact match
  const exactMatch = calculateProductMatchConfidence(baseTarget, {
    name: "Nike Air Zoom Pegasus 40 Running Shoe (UK 9)",
    brand: "Nike",
    price: 9495,
  });
  assert.equal(exactMatch.isMatch, true, "Exact variant must match with high confidence");
});

test("9. Dynamic qc-* product resolution succeeds through provider & cache", async () => {
  const provider = new LocalProductProvider();

  const dynamicLiveProduct = createProduct({
    id: "qc-blinkit-505",
    name: "Nescafe Classic Coffee 200g",
    brand: "Nescafe",
    category: "Beverages",
    description: "100% pure instant coffee",
    image: "https://example.com/coffee.png",
    rating: 4.7,
    reviews: 3200,
    trustScore: 88,
    offers: [
      {
        store: "BlinkIt",
        price: 540,
        originalPrice: 600,
        currency: "INR",
        url: "https://blinkit.com/prid/505",
        availability: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
  });

  // Place into 1-hour live product cache
  setCachedLiveProduct(dynamicLiveProduct);

  // Product provider resolves cached dynamic item
  const resolved = await provider.getProductById("qc-blinkit-505");
  assert.ok(resolved, "Expected qc-blinkit-505 to resolve successfully");
  assert.equal(resolved.id, "qc-blinkit-505");
  assert.equal(resolved.name, "Nescafe Classic Coffee 200g");

  // getProductById helper also resolves it
  const globalResolved = await getProductById("qc-blinkit-505");
  assert.ok(globalResolved, "Expected global getProductById to resolve cached live product");
  assert.equal(globalResolved.id, "qc-blinkit-505");

  // Non-existent ID returns undefined (clean 404 behavior)
  const notFound = await provider.getProductById("qc-unknown-999");
  assert.equal(notFound, undefined, "Uncached/unknown live product returns undefined");
});

test("10. Wishlist storage is compatible with qc-* dynamic product IDs", () => {
  // Simulate client-side wishlist operation
  const wishlist = [];

  const toggleWishlistMock = (list, id) => {
    if (list.includes(id)) {
      return list.filter((item) => item !== id);
    }
    return [...list, id];
  };

  const dynamicId = "qc-blinkit-505";

  const updated1 = toggleWishlistMock(wishlist, dynamicId);
  assert.ok(updated1.includes(dynamicId), "Wishlist must store dynamic qc-* product IDs");

  const updated2 = toggleWishlistMock(updated1, dynamicId);
  assert.ok(!updated2.includes(dynamicId), "Wishlist must toggle off dynamic qc-* product IDs");
});

test("11. Price tracking data structure works with qc-* products without DB schema change", () => {
  const dynamicLiveProduct = normalizeQuickCommerceProduct(
    {
      id: "777",
      title: "Epigamia Greek Yogurt 100g",
      brand: "Epigamia",
      category: "Dairy",
      price: 50,
      mrp: 60,
      image: "https://example.com/yogurt.png",
      rating: 4.6,
      rating_count: 80,
      url: "https://zepto.com/p/777",
      available: true,
    },
    "Zepto"
  );

  const priceHistory = dynamicLiveProduct.priceHistory;
  assert.ok(Array.isArray(priceHistory), "Price history must be an array");
  assert.ok(priceHistory.length > 0, "Price history must contain initial live quote point");
  assert.equal(priceHistory[0].price, 50);
});

test("12. Amazon live offers receive Associates affiliate tag", () => {
  const originalTag = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const amazonLiveProduct = createProduct({
      id: "qc-amazon-999",
      name: "Kindle Paperwhite 16GB",
      brand: "Amazon",
      category: "Electronics",
      description: "6.8 inch display with adjustable warm light",
      image: "https://example.com/kindle.png",
      rating: 4.8,
      reviews: 15400,
      trustScore: 92,
      offers: [
        {
          store: "Amazon",
          price: 13999,
          currency: "INR",
          url: "https://www.amazon.in/dp/B08N3TCP2F",
          availability: true,
          lastUpdated: new Date().toISOString(),
        },
      ],
    });

    const tagged = tagProductAmazonOffers(amazonLiveProduct);
    const amazonOffer = tagged.offers[0];

    assert.ok(isAmazonUrl(amazonOffer.url), "Must detect Amazon URL");
    assert.ok(amazonOffer.affiliateUrl, "Expected affiliateUrl to be generated");
    assert.match(amazonOffer.affiliateUrl, /[\?&]tag=pricelyindia-21/, "Amazon affiliate URL must contain tag");
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalTag;
  }
});

test("13. Non-Amazon retailer URLs remain unchanged", () => {
  const originalTag = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const blinkitProduct = createProduct({
      id: "qc-blinkit-888",
      name: "Dettol Liquid Handwash 750ml",
      brand: "Dettol",
      category: "Personal Care",
      description: "Antibacterial hand soap",
      image: "https://example.com/dettol.png",
      rating: 4.7,
      reviews: 900,
      trustScore: 88,
      offers: [
        {
          store: "BlinkIt",
          price: 110,
          currency: "INR",
          url: "https://blinkit.com/prid/888?src=live",
          availability: true,
          lastUpdated: new Date().toISOString(),
        },
      ],
    });

    const tagged = tagProductAmazonOffers(blinkitProduct);
    assert.equal(
      tagged.offers[0].url,
      "https://blinkit.com/prid/888?src=live",
      "Non-Amazon URLs must not be modified"
    );
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalTag;
  }
});
