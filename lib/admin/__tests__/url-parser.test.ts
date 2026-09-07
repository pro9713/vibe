import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRetailerUrl,
  isValidProductUrl,
  cleanTrackingParams,
  findRetailerByHostname,
  SUPPORTED_RETAILERS,
} from "../url-parser.ts";

test("1. URL Parser - Amazon India URLs and ASIN extraction", () => {
  const rawAmazonUrl =
    "https://www.amazon.in/Apple-iPhone-15-128-GB/dp/B0CHX1W1XY/ref=sr_1_1?crid=12345&keywords=iphone+15&qid=1690000000&sprefix=iphone%2Caps%2C200&sr=8-1&utm_source=google&utm_medium=cpc&gclid=EAIaIQobChMI123";

  const parsed = parseRetailerUrl(rawAmazonUrl);

  assert.equal(parsed.isValid, true);
  assert.equal(parsed.domain, "amazon.in");
  assert.equal(parsed.retailerKey, "amazon_in");
  assert.equal(parsed.retailerName, "Amazon India");
  assert.equal(parsed.isAmazon, true);
  assert.equal(parsed.isSupportedRetailer, true);
  assert.equal(parsed.productId, "B0CHX1W1XY");
  assert.equal(parsed.canonicalUrl, "https://www.amazon.in/dp/B0CHX1W1XY");

  // Verify tracking parameters are completely stripped
  assert.equal(parsed.cleanUrl.includes("utm_source"), false);
  assert.equal(parsed.cleanUrl.includes("gclid"), false);
  assert.equal(parsed.cleanUrl.includes("qid"), false);
  assert.equal(parsed.cleanUrl.includes("crid"), false);
  assert.equal(parsed.cleanUrl.includes("sprefix"), false);
});

test("2. URL Parser - Amazon gp/product and short link formats", () => {
  const gpUrl = "https://amazon.in/gp/product/B08L5VJYV7?tag=pricely-21";
  const parsedGp = parseRetailerUrl(gpUrl);

  assert.equal(parsedGp.isValid, true);
  assert.equal(parsedGp.productId, "B08L5VJYV7");
  assert.equal(parsedGp.canonicalUrl, "https://www.amazon.in/dp/B08L5VJYV7");
  assert.equal(parsedGp.cleanUrl.includes("tag="), false);

  const shortUrl = "https://amzn.in/d/abc1234";
  const parsedShort = parseRetailerUrl(shortUrl);
  assert.equal(parsedShort.isValid, true);
  assert.equal(parsedShort.isAmazon, true);
  assert.equal(parsedShort.domain, "amzn.in");
  assert.equal(parsedShort.retailerKey, "amazon_in");
});

test("3. URL Parser - Myntra URLs and Style ID extraction", () => {
  const myntraUrl =
    "https://www.myntra.com/casual-shoes/nike/nike-men-white-air-force-1-sneakers/12345678/buy?utm_source=facebook&utm_medium=cpc&utm_campaign=dpa&fbclid=IwAR123";

  const parsed = parseRetailerUrl(myntraUrl);

  assert.equal(parsed.isValid, true);
  assert.equal(parsed.domain, "myntra.com");
  assert.equal(parsed.retailerKey, "myntra");
  assert.equal(parsed.retailerName, "Myntra");
  assert.equal(parsed.isAmazon, false);
  assert.equal(parsed.isSupportedRetailer, true);
  assert.equal(parsed.productId, "12345678");
  assert.equal(parsed.cleanUrl.includes("utm_source"), false);
  assert.equal(parsed.cleanUrl.includes("fbclid"), false);
});

test("4. URL Parser - Nykaa and Nykaa Man URLs", () => {
  const nykaaUrl =
    "https://www.nykaa.com/kay-beauty-matte-lipstick/p/897654?utm_source=google&gclid=Test1234&_ga=GA1.2.3.4";

  const parsedNykaa = parseRetailerUrl(nykaaUrl);

  assert.equal(parsedNykaa.isValid, true);
  assert.equal(parsedNykaa.domain, "nykaa.com");
  assert.equal(parsedNykaa.retailerKey, "nykaa");
  assert.equal(parsedNykaa.retailerName, "Nykaa");
  assert.equal(parsedNykaa.productId, "897654");
  assert.equal(parsedNykaa.cleanUrl.includes("gclid"), false);
  assert.equal(parsedNykaa.cleanUrl.includes("_ga"), false);

  const nykaaManUrl = "https://www.nykaaman.com/beardo-hair-growth-oil/p/54321";
  const parsedMan = parseRetailerUrl(nykaaManUrl);
  assert.equal(parsedMan.isValid, true);
  assert.equal(parsedMan.domain, "nykaaman.com");
  assert.equal(parsedMan.retailerKey, "nykaa");
  assert.equal(parsedMan.retailerName, "Nykaa");
  assert.equal(parsedMan.productId, "54321");
});

test("5. URL Parser - AJIO URLs and Product Code extraction", () => {
  const ajioUrl =
    "https://www.ajio.com/puma-men-sneakers/p/460783921_black?utm_source=gads&utm_medium=cpc&msclkid=msclk1234";

  const parsed = parseRetailerUrl(ajioUrl);

  assert.equal(parsed.isValid, true);
  assert.equal(parsed.domain, "ajio.com");
  assert.equal(parsed.retailerKey, "ajio");
  assert.equal(parsed.retailerName, "AJIO");
  assert.equal(parsed.productId, "460783921_black");
  assert.equal(parsed.cleanUrl.includes("msclkid"), false);
  assert.equal(parsed.cleanUrl.includes("utm_medium"), false);
});

test("6. URL Parser - Tata CLiQ Luxury & Tata CLiQ URLs", () => {
  const luxuryUrl =
    "https://luxury.tatacliq.com/armani-exchange-mens-watch/p-mp00000001928374?utm_source=newsletter";

  const parsedLuxury = parseRetailerUrl(luxuryUrl);

  assert.equal(parsedLuxury.isValid, true);
  assert.equal(parsedLuxury.domain, "luxury.tatacliq.com");
  assert.equal(parsedLuxury.retailerKey, "tatacliq_luxury");
  assert.equal(parsedLuxury.retailerName, "Tata CLiQ Luxury");
  assert.equal(parsedLuxury.productId, "mp00000001928374");
  assert.equal(parsedLuxury.cleanUrl.includes("utm_source"), false);

  const regularTataUrl = "https://www.tatacliq.com/tissot-prx-watch/p-mp00000009876543";
  const parsedTata = parseRetailerUrl(regularTataUrl);
  assert.equal(parsedTata.isValid, true);
  assert.equal(parsedTata.domain, "tatacliq.com");
  assert.equal(parsedTata.retailerKey, "tatacliq");
  assert.equal(parsedTata.retailerName, "Tata CLiQ");
  assert.equal(parsedTata.productId, "mp00000009876543");
});

test("7. URL Parser - Nike India URLs", () => {
  const nikeInUrl =
    "https://www.nike.com/in/t/air-force-1-07-shoes-WrLlWX/CW2288-111?cp=987654321_search_&_gl=1*abc*";

  const parsedNike = parseRetailerUrl(nikeInUrl);

  assert.equal(parsedNike.isValid, true);
  assert.equal(parsedNike.domain, "nike.com");
  assert.equal(parsedNike.retailerKey, "nike_in");
  assert.equal(parsedNike.retailerName, "Nike India");
  assert.equal(parsedNike.productId, "CW2288-111");
  assert.equal(parsedNike.cleanUrl.includes("_gl"), false);
});

test("8. URL Parser - Additional supported retailers and generic websites", () => {
  const fkUrl = "https://www.flipkart.com/sony-wh-1000xm5/p/itm123456?pid=ACCG5XYZ987654";
  const parsedFk = parseRetailerUrl(fkUrl);
  assert.equal(parsedFk.isValid, true);
  assert.equal(parsedFk.retailerKey, "flipkart");
  assert.equal(parsedFk.productId, "ACCG5XYZ987654");

  const genericUrl = "https://example-boutique.in/products/handcrafted-bag?promo=spring";
  const parsedGeneric = parseRetailerUrl(genericUrl);
  assert.equal(parsedGeneric.isValid, true);
  assert.equal(parsedGeneric.domain, "example-boutique.in");
  assert.equal(parsedGeneric.retailerKey, "generic");
  assert.equal(parsedGeneric.retailerName, "example-boutique.in");
  assert.equal(parsedGeneric.isSupportedRetailer, false);
});

test("9. URL Parser - Validation and Error handling for invalid inputs", () => {
  assert.equal(isValidProductUrl(""), false);
  assert.equal(isValidProductUrl("not a url"), false);
  assert.equal(isValidProductUrl("ftp://files.example.com/item"), false);
  assert.equal(isValidProductUrl("https://valid-domain.com/item"), true);

  const emptyParse = parseRetailerUrl("");
  assert.equal(emptyParse.isValid, false);
  assert.equal(emptyParse.error, "Product URL is required.");

  const noHttpParse = parseRetailerUrl("amazon.in/dp/B0CHX1W1XY");
  assert.equal(noHttpParse.isValid, false);
  assert.equal(noHttpParse.error, "URL must begin with http:// or https://");

  const badUrl = parseRetailerUrl("https://");
  assert.equal(badUrl.isValid, false);
  assert.equal(badUrl.error, "Invalid URL format.");
});

test("10. Zero Scraping & Deterministic Guarantee", () => {
  // Verify that cleanTrackingParams and parseRetailerUrl execute purely synchronously and deterministically
  const testUrl = "https://www.amazon.in/dp/B09V4B688K?utm_source=twitter&utm_medium=social";
  const start = performance.now();
  const parsed = parseRetailerUrl(testUrl);
  const duration = performance.now() - start;

  assert.equal(parsed.isValid, true);
  assert.equal(parsed.productId, "B09V4B688K");
  assert.ok(duration < 50, "Execution must be instantaneous and local without network requests");
});
