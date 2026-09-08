import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanProductTitle,
  parseHtmlMetadata,
  fetchProductMetadata,
  fetchRemoteProductMetadata,
} from "../fetch-metadata.ts";
import { parseRetailerUrl } from "../url-parser.ts";
import { fetchProductMetadataAction } from "../../../app/admin/products/actions.ts";

test("1. Metadata Parser - cleans retailer title noise", () => {
  assert.equal(
    cleanProductTitle("Apple iPhone 15 (128 GB) - Black : Amazon.in: Electronics"),
    "Apple iPhone 15 (128 GB) - Black"
  );
  assert.equal(
    cleanProductTitle("Nike Air Force 1 '07 Sneakers | Myntra"),
    "Nike Air Force 1 '07 Sneakers"
  );
  assert.equal(
    cleanProductTitle("Levi's Men 501 Original Fit Jeans | AJIO"),
    "Levi's Men 501 Original Fit Jeans"
  );
  assert.equal(
    cleanProductTitle("Minimalist 10% Niacinamide Serum | Nykaa"),
    "Minimalist 10% Niacinamide Serum"
  );
});

test("2. Metadata Parser - extracts OpenGraph, Twitter Cards, and Meta tags from HTML", () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sony WH-1000XM5 Wireless Headphones : Amazon.in</title>
        <meta property="og:title" content="Sony WH-1000XM5 Wireless Noise Cancelling Headphones" />
        <meta property="og:image" content="https://m.media-amazon.com/images/I/61+ElDEs-SL._SL1500_.jpg" />
        <meta property="og:description" content="Industry Leading noise cancellation with two processors and 8 microphones." />
        <meta property="og:price:amount" content="29990" />
      </head>
      <body></body>
    </html>
  `;

  const parsedUrl = parseRetailerUrl("https://www.amazon.in/dp/B09XS7JWHH");
  const extracted = parseHtmlMetadata(sampleHtml, parsedUrl);

  assert.equal(extracted.title, "Sony WH-1000XM5 Wireless Noise Cancelling Headphones");
  assert.equal(extracted.image, "https://m.media-amazon.com/images/I/61+ElDEs-SL._SL1500_.jpg");
  assert.equal(extracted.description, "Industry Leading noise cancellation with two processors and 8 microphones.");
  assert.equal(extracted.price, 29990);
  assert.equal(extracted.sku, "B09XS7JWHH");
  assert.equal(extracted.store, "Amazon India");
});

test("3. Metadata Parser - extracts Schema.org JSON-LD Product schema", () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Nike Dunk Low Retro",
            "image": "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/b1bcbca4-e853-4df7-b329-5be3c61ee057/dunk-low-retro-shoe-66RG.png",
            "description": "Created for the hardwood but taken to the streets.",
            "sku": "DD1391-100",
            "brand": {
              "@type": "Brand",
              "name": "Nike"
            },
            "offers": {
              "@type": "Offer",
              "price": "8295",
              "priceCurrency": "INR"
            }
          }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const parsedUrl = parseRetailerUrl("https://www.nike.com/in/t/dunk-low-retro-shoe-66RG/DD1391-100");
  const extracted = parseHtmlMetadata(sampleHtml, parsedUrl);

  assert.equal(extracted.title, "Nike Dunk Low Retro");
  assert.equal(extracted.brand, "Nike");
  assert.equal(extracted.sku, "DD1391-100");
  assert.equal(extracted.price, 8295);
  assert.equal(extracted.currency, "INR");
  assert.ok(extracted.image?.includes("static.nike.com"));
});

test("4. Metadata Parser - extracts Twitter cards when OpenGraph is absent", () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="twitter:title" content="Adidas Ultraboost Light Running Shoes" />
        <meta name="twitter:image" content="https://assets.adidas.com/images/w_600,f_auto,q_auto/ultraboost.jpg" />
        <meta name="twitter:description" content="Experience epic energy with the new Ultraboost Light." />
        <meta itemprop="price" content="18999" />
      </head>
      <body></body>
    </html>
  `;

  const parsedUrl = parseRetailerUrl("https://www.adidas.co.in/ultraboost-light/HQ6351.html");
  const extracted = parseHtmlMetadata(sampleHtml, parsedUrl);

  assert.equal(extracted.title, "Adidas Ultraboost Light Running Shoes");
  assert.equal(extracted.image, "https://assets.adidas.com/images/w_600,f_auto,q_auto/ultraboost.jpg");
  assert.equal(extracted.price, 18999);
});

test("5. Metadata Parser - handles invalid URLs gracefully without crashing", async () => {
  const res = await fetchProductMetadata("invalid-url-not-http");
  assert.equal(res.success, false);
  assert.equal(res.isFetched, false);
  assert.ok(res.message);
});

test("6. Server Action - fetchProductMetadataAction respects Admin Session", async () => {
  // Authorized admin user
  const adminUser = {
    id: "admin-user-1",
    email: "admin@pricely.in",
    user_metadata: { role: "admin" },
  };

  const res = await fetchProductMetadataAction("https://www.amazon.in/dp/B0CHX1W1XY", adminUser as any);
  assert.ok(res);
  assert.equal(res.store, "Amazon India");
  assert.equal(res.sku, "B0CHX1W1XY");
});
