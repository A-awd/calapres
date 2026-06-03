# Nawadirdior to Calapres Supplier Sync

Dependency-free JavaScript helpers for n8n Code nodes. Each `.js` file can be pasted into an n8n Code node as-is; there are no npm imports and no browser APIs.

## Files

- `parse-product.js`: `parseProduct(html)` extracts supplier product data from Salla meta tags and JSON-LD. It returns `{ name, brand, supplierPrice, supplierCompareAtPrice, availability, imageUrl, description, category, sourceUrl }` and never throws on missing fields.
- `pricing.js`: `applyPricing({ supplierPrice, supplierCompareAtPrice })` adds the exact Calapres `+100 SAR` markup and clears `compareAtPrice` when it would equal `price`.
- `inventory.js`: `mapAvailability(availability)` maps supplier state to status-only Shopify fields. It never emits numeric inventory quantities and never deletes missing supplier products.
- `build-shopify-payload.js`: `buildPayload(parsed)` assembles a Shopify product payload with title, body HTML, vendor, tags, image, and one variant. If an existing product is tagged `enriched`, the explicit guard returns only price and availability fields so the luxury presentation layer is protected.

## n8n Flow

1. HTTP Request node fetches a Nawadirdior product page HTML.
2. Code node with `parse-product.js` calls `parseProduct($json.html)` or `parseProduct($json.body)`.
3. Code node with `pricing.js` can call `applyPricing(parsed)` if pricing is needed separately.
4. Code node with `inventory.js` can call `mapAvailability(parsed.availability)` for status-only stock sync.
5. Code node with `build-shopify-payload.js` calls `buildPayload(parsed)` and sends the returned object to Shopify.

## Enriched Product Guard

Pass the current Shopify product tags into `buildPayload` as `existingTags` or `existingProduct.tags`.

```js
const payload = buildPayload({
  ...parsed,
  existingProduct: shopifyProduct
});
```

When `enriched` is present, the returned `{ product: ... }` body excludes `title`, `body_html`, images, SEO/metafields, vendor, and tags. Only price and availability fields are emitted, so Higgsfield-created luxury descriptions and imagery stay untouched.
