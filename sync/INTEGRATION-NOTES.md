# Calapres Shopify Sync Integration Notes

These notes define the exact field mapping and API contract for wiring the supplier sync into n8n while the storefront remains closed.

## 1. Shopify Admin API Surface

The recurring sync uses:

- GraphQL Admin API for reads and pagination.
- REST Admin API for product create/update writes.
- `sync/shopify-client.js` for all request-shape construction.
- `sync/validate-shopify-shape.js` before any REST write payload is trusted.

Default Admin API version in code: `2026-04`.

## 2. Supplier Field to Shopify Field Mapping

| Supplier or Sync Field | Shopify REST Admin Field | Notes |
| --- | --- | --- |
| `name` | `product.title` | Only written for new or non-enriched products. |
| `description` | `product.body_html` | Plain text is escaped and wrapped in paragraphs. Trusted simple HTML is preserved. |
| `brand` | `product.vendor` | Falls back to `Nawadirdior`. |
| `supplierPrice` | `product.variants[0].price` | Calapres rule: supplier price plus 100 SAR. |
| `supplierCompareAtPrice` | `product.variants[0].compare_at_price` | Calapres rule: supplier compare-at plus 100 SAR; cleared when equal to price. |
| `availability` | `product.status` | `in_stock` becomes `active`; `out_of_stock` or supplier-missing becomes `draft`. |
| `availability` | `product.variants[0].inventory_policy` | `in_stock` becomes `continue`; `out_of_stock` or supplier-missing becomes `deny`. |
| `imageUrl` | `product.images[0].src` | Only written for new or non-enriched products. |
| fixed import marker | `product.tags` | Adds `imported-nader-dior`. |
| supplier marker | `product.tags` | Adds `supplier:nawadirdior`. |
| Salla product id | `product.tags` | Adds `supplier-id-p<id>`. |
| `sourceUrl` | `product.metafields[].namespace=supplier,key=source_url` | Type: `single_line_text_field`. |
| Salla product id | `product.metafields[].namespace=supplier,key=product_id` | Type: `single_line_text_field`. |

The sync never writes:

- `inventory_quantity`
- `inventoryQuantity`
- deletion flags
- Shopify customer data
- secrets or credential values

## 3. Enriched Guard Contract

When an existing Shopify product has the exact tag `enriched`, recurring sync may write only:

- `product.id`
- `product.status`
- `product.variants[0].id`
- `product.variants[0].price`
- `product.variants[0].compare_at_price`
- `product.variants[0].inventory_policy`

It must not write:

- `product.title`
- `product.body_html`
- `product.vendor`
- `product.tags`
- `product.images`
- `product.metafields`
- SEO metafields

This keeps Higgsfield imagery, Arabic SEO, and luxury descriptions intact while still allowing price and availability to stay current.

## 4. Product Matching

Use both match paths:

1. `supplier.source_url` metafield equals the Nawadirdior product URL.
2. `supplier-id-p<id>` tag equals the Salla product id parsed from `/p<digits>`.

`sync/shopify-client.js` builds a lookup GraphQL query using:

- `metafields.supplier.source_url:"<sourceUrl>"`
- `tag:"supplier-id-p<id>"`

The response includes `supplier.source_url`, `supplier.product_id`, tags, status, and first variant fields so `sync/reconcile.js` can decide the action offline.

## 5. Reconcile Action Plan

`sync/reconcile.js` returns:

- `toCreate`: valid supplier products with no existing imported Shopify product.
- `toUpdate`: existing products needing full update, or enriched products needing price/availability-only update.
- `toMarkOutOfStock`: imported Shopify products missing from the supplier crawl; these are drafted and never deleted.
- `toSkipEnriched`: enriched products with no price or availability change.
- `unchanged`: products already current, duplicate supplier ids, malformed supplier products, or already-drafted missing products.

Supplier-missing products auto-return when they reappear because a matching supplier product moves them back through `toUpdate`.

## 6. Required n8n Credentials

1. `Shopify-Calapres OAuth2`
   - Credential id: `QLsvwO73GFsQfy0w`
   - Used by Shopify Admin GraphQL and REST HTTP Request nodes.

2. `Higgsfield API ( awd-n8n )`
   - Header Auth credential id: `G31rYKMmDk8hyh2G`
   - Used only by the one-time enrichment workflow.

## 7. Required n8n Variables

1. `SHOPIFY_SHOP_DOMAIN`
   - Example: `calapres.myshopify.com`

2. `SUPPLIER_SITEMAP_URL`
   - Value: `https://nawadirdior.sa/sitemap.xml`

3. `SUPPLIER_NAME`
   - Value: `nawadirdior`

4. `SHOPIFY_REQUEST_DELAY_SECONDS`
   - Value: `1`

5. `HIGGSFIELD_IMAGE_MODEL`
   - Example: `higgsfield-soul`

## 8. Offline Verification Path

Run:

```bash
for file in sync/*.js sync/__tests__/*.js; do node --check "$file"; done
node sync/__tests__/run-tests.js
node sync/run-local-dry.js
```

Then inspect `sync/dry-run-output.json`:

- `payloads[]` shows parsed supplier data and per-product reconcile bucket.
- `reconcilePlan` shows the complete action plan.
- `shopifyRequests.lookupFirst20[]` shows GraphQL lookup request shapes.
- `shopifyRequests.actionRequests` shows REST create/update/out-of-stock request shapes.
