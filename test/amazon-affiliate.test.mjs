import test from "node:test";
import assert from "node:assert/strict";
import {
  isAmazonHost,
  isAmazonUrl,
  getAmazonAssociateTag,
  buildAmazonAffiliateUrl,
  buildAffiliateUrl,
  isAmazonOffer,
  tagAmazonOffer,
  tagAmazonOffers,
  tagProductAmazonOffers,
} from "../lib/affiliate/amazon.ts";

test("1. Amazon URL gets affiliate tag from environment variable", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const amazonIn = buildAmazonAffiliateUrl("https://www.amazon.in/dp/B0C6QW8T95");
    assert.match(amazonIn, /[\?&]tag=pricelyindia-21/);
    assert.ok(amazonIn.startsWith("https://www.amazon.in/dp/B0C6QW8T95"));

    const amazonCom = buildAmazonAffiliateUrl("https://www.amazon.com/product/xyz");
    assert.match(amazonCom, /[\?&]tag=pricelyindia-21/);

    const amznTo = buildAmazonAffiliateUrl("https://amzn.to/3xyz");
    assert.match(amznTo, /[\?&]tag=pricelyindia-21/);

    // Explicit tag override
    const overridden = buildAmazonAffiliateUrl("https://www.amazon.in", "custom-partner-20");
    assert.match(overridden, /[\?&]tag=custom-partner-20/);
    assert.doesNotMatch(overridden, /pricelyindia-21/);
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});

test("2. Non-Amazon URL remains unchanged", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const flipkartUrl = "https://www.flipkart.com/nike-shoes/p/itm12345?affid=pricely";
    assert.equal(buildAmazonAffiliateUrl(flipkartUrl), flipkartUrl);

    const myntraUrl = "https://www.myntra.com/running-shoes/nike/air-max/123/buy";
    assert.equal(buildAmazonAffiliateUrl(myntraUrl), myntraUrl);

    const ajioUrl = "https://www.ajio.com/men-sneakers/p/461234";
    assert.equal(buildAmazonAffiliateUrl(ajioUrl), ajioUrl);

    // Spoofed domain check: must not match non-Amazon domain containing "amazon" in subdomain/path
    const spoofedDomain = "https://amazon.eviltracker.com/phishing";
    assert.equal(buildAmazonAffiliateUrl(spoofedDomain), spoofedDomain);

    const fakeAmazon = "https://notamazon.com/product";
    assert.equal(buildAmazonAffiliateUrl(fakeAmazon), fakeAmazon);
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});

test("3. Existing query parameters and path are preserved safely", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const complexUrl =
      "https://www.amazon.in/Levis-Mens-Slim-Jeans-A7087-0093_Blue/dp/B0C6QW8T95?ref=sr_1_1&keywords=jeans&th=1&psc=1#customerReviews";

    const taggedUrl = buildAmazonAffiliateUrl(complexUrl);
    const parsed = new URL(taggedUrl);

    assert.equal(parsed.protocol, "https:");
    assert.equal(parsed.hostname, "www.amazon.in");
    assert.equal(
      parsed.pathname,
      "/Levis-Mens-Slim-Jeans-A7087-0093_Blue/dp/B0C6QW8T95"
    );
    assert.equal(parsed.searchParams.get("ref"), "sr_1_1");
    assert.equal(parsed.searchParams.get("keywords"), "jeans");
    assert.equal(parsed.searchParams.get("th"), "1");
    assert.equal(parsed.searchParams.get("psc"), "1");
    assert.equal(parsed.searchParams.get("tag"), "pricelyindia-21");
    assert.equal(parsed.hash, "#customerReviews");
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});

test("4. No affiliate tag is exposed in unrelated store links", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const mixedOffers = [
      {
        store: "Flipkart",
        price: 2549,
        currency: "INR",
        url: "https://www.flipkart.com/item",
        affiliateUrl: "https://www.flipkart.com/item?affid=pricely",
        availability: true,
      },
      {
        store: "Myntra",
        price: 2599,
        currency: "INR",
        url: "https://www.myntra.com/item",
        affiliateUrl: "https://www.myntra.com/item",
        availability: true,
      },
      {
        store: "AJIO",
        price: 2699,
        currency: "INR",
        url: "https://www.ajio.com/item",
        affiliateUrl: "https://www.ajio.com/item",
        availability: true,
      },
      {
        store: "Amazon",
        price: 2499,
        currency: "INR",
        url: "https://www.amazon.in/dp/B0C6QW8T95",
        affiliateUrl: "https://www.amazon.in/dp/B0C6QW8T95",
        availability: true,
      },
    ];

    const taggedOffers = tagAmazonOffers(mixedOffers);

    // Non-Amazon offers must not contain the tag anywhere
    const flipkart = taggedOffers.find((o) => o.store === "Flipkart");
    assert.ok(flipkart);
    assert.equal(flipkart.url, "https://www.flipkart.com/item");
    assert.equal(flipkart.affiliateUrl, "https://www.flipkart.com/item?affid=pricely");
    assert.doesNotMatch(flipkart.url, /tag=/);
    assert.doesNotMatch(flipkart.affiliateUrl, /tag=/);
    assert.doesNotMatch(flipkart.affiliateUrl, /pricelyindia-21/);

    const myntra = taggedOffers.find((o) => o.store === "Myntra");
    assert.ok(myntra);
    assert.equal(myntra.url, "https://www.myntra.com/item");
    assert.equal(myntra.affiliateUrl, "https://www.myntra.com/item");
    assert.doesNotMatch(myntra.url, /pricelyindia-21/);
    assert.doesNotMatch(myntra.affiliateUrl, /pricelyindia-21/);

    const ajio = taggedOffers.find((o) => o.store === "AJIO");
    assert.ok(ajio);
    assert.equal(ajio.url, "https://www.ajio.com/item");
    assert.equal(ajio.affiliateUrl, "https://www.ajio.com/item");
    assert.doesNotMatch(ajio.url, /pricelyindia-21/);
    assert.doesNotMatch(ajio.affiliateUrl, /pricelyindia-21/);

    // Amazon offer MUST contain the Associate tag
    const amazon = taggedOffers.find((o) => o.store === "Amazon");
    assert.ok(amazon);
    assert.ok(amazon.affiliateUrl);
    assert.match(amazon.affiliateUrl, /[\?&]tag=pricelyindia-21/);
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});

test("5. Tagging product Amazon offers processes product model cleanly", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    process.env.AMAZON_ASSOCIATE_TAG = "pricelyindia-21";

    const mockProduct = {
      id: "test-product",
      name: "Test Shoes",
      brand: "Nike",
      category: "Shoes",
      description: "Test description",
      image: "/test.jpg",
      rating: 4.5,
      reviews: 100,
      trustScore: 90,
      priceHistory: [],
      prices: [],
      bestDeal: { store: "Amazon", price: 2499 },
      offers: [
        {
          store: "Amazon",
          price: 2499,
          currency: "INR",
          url: "https://www.amazon.in/dp/B000000000",
          availability: true,
        },
        {
          store: "Flipkart",
          price: 2699,
          currency: "INR",
          url: "https://www.flipkart.com/item",
          availability: true,
        },
      ],
    };

    const taggedProduct = tagProductAmazonOffers(mockProduct);

    assert.equal(taggedProduct.id, "test-product");
    const amazonOffer = taggedProduct.offers.find((o) => o.store === "Amazon");
    assert.ok(amazonOffer);
    assert.match(amazonOffer.affiliateUrl || "", /tag=pricelyindia-21/);

    const flipkartOffer = taggedProduct.offers.find((o) => o.store === "Flipkart");
    assert.ok(flipkartOffer);
    assert.doesNotMatch(flipkartOffer.affiliateUrl || "", /tag=pricelyindia-21/);
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});

test("6. Gracefully handles unset AMAZON_ASSOCIATE_TAG without breaking URLs", () => {
  const originalEnv = process.env.AMAZON_ASSOCIATE_TAG;
  try {
    delete process.env.AMAZON_ASSOCIATE_TAG;

    const rawAmazonUrl = "https://www.amazon.in/dp/B0C6QW8T95?ref=sr_1_1";
    const result = buildAmazonAffiliateUrl(rawAmazonUrl);

    // Must return the URL safely without appending undefined or broken params
    assert.equal(result, rawAmazonUrl);
    assert.doesNotMatch(result, /tag=undefined/);
  } finally {
    process.env.AMAZON_ASSOCIATE_TAG = originalEnv;
  }
});

test("7. buildAffiliateUrl attaches partner tracking tags and parameters accurately", () => {
  // 1. Amazon tag via string
  const amz1 = buildAffiliateUrl("https://www.amazon.in/dp/B0C6QW8T95", "vibe-partner-21");
  assert.match(amz1, /tag=vibe-partner-21/);

  // 2. Amazon tag via options object
  const amz2 = buildAffiliateUrl("https://www.amazon.in/dp/B0C6QW8T95", {
    store: "Amazon India",
    affiliateType: "amazon_tag",
    affiliateValue: "pricely-tag-21",
  });
  assert.match(amz2, /tag=pricely-tag-21/);

  // 3. Custom partner query parameter
  const partnerUrl = buildAffiliateUrl("https://www.myntra.com/shoes/nike", {
    store: "Myntra",
    affiliateType: "query_param",
    affiliateParam: "aff_id",
    affiliateValue: "partner_456",
  });
  assert.match(partnerUrl, /aff_id=partner_456/);
  assert.ok(partnerUrl.startsWith("https://www.myntra.com/shoes/nike"));

  // 4. Safe fallback for empty/null inputs
  assert.equal(buildAffiliateUrl(null), "");
  assert.equal(buildAffiliateUrl(undefined), "");
  assert.equal(buildAffiliateUrl("https://example.com"), "https://example.com");
});
