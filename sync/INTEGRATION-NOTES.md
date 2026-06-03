# Calapres Shopify Sync Integration Notes

These notes define the exact field mapping and API contract for wiring the supplier sync into n8n while the storefront remains closed.

## 1. Pre-Sync Setup

Run this before the first recurring sync. The live store has 18 imported products, split across `imported-nader-dior` and `مستورد-نوادر-ديور`. The existing imported products do not yet have `supplier.source_url`, `supplier.product_id`, or `supplier-id-p<id>` matching data. Skipping this setup can make the first recurring sync create duplicates.

1. Create product metafield definitions using `sync/setup-metafield-definitions.js`.
   - Create `supplier.source_url`.
   - Create `supplier.product_id`.
   - Both definitions use `single_line_text_field`.
   - Both definitions use owner type `PRODUCT`.
   - Both definitions set `pin: true`.
   - Both definitions set Admin API access to `MERCHANT_READ_WRITE`.
   - Both definitions enable `capabilities.adminFilterable.enabled`.

2. Backfill the 18 existing imported products using `sync/backfill-existing-products.js` and `sync/backfill-map.json`.
   - Use the audited brand/name/concentration/size map; do not infer supplier URLs from Shopify descriptions or metafields because those fields are clean/empty on the live store.
   - Add only `supplier.source_url`, `supplier.product_id`, `imported-nader-dior`, and `supplier-id-p<id>`.
   - Preserve the existing Arabic imported tag `مستورد-نوادر-ديور` on products that already have it.
   - Do not write price, images, description, status, vendor, inventory, or SEO.
   - Review `needsManualMatch[]` before executing any backfill request.
   - Review `notFoundAtSupplier[]` separately; those rows get no backfill writes and are handled by the recurring missing-supplier draft/out-of-stock path.

3. Run one offline dry run and inspect `sync/dry-run-output.json`.
   - `preSyncSetup.metafieldDefinitionRequests` shows the two definition-create requests.
   - `preSyncSetup.backfillPlan` shows matched and manual-review products.
   - `preSyncSetup.duplicateRiskBeforeBackfill` shows why the setup must run first.
   - `preSyncSetup.postBackfillReconcilePlan` must show `toCreate: 0` for high/medium-confidence existing products.
   - `preSyncSetup.notFoundAtSupplier` must list only deliberate `not_found` map rows.

## 2. Shopify Admin API Surface

The recurring sync uses:

- GraphQL Admin API for reads and pagination.
- GraphQL Admin API for metafield definition creation and `metafieldsSet` backfill writes.
- REST Admin API for product create/update writes.
- `sync/shopify-client.js` for all request-shape construction.
- `sync/validate-shopify-shape.js` before any REST write payload is trusted.

Default Admin API version in code: `2026-04`.

## 3. Supplier Field to Shopify Field Mapping

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
| supplier marker | `product.tags` | Adds `supplier:nawadirdior` for recurring create/full-update payloads. |
| Salla product id | `product.tags` | Adds `supplier-id-p<id>`. |
| `sourceUrl` | `product.metafields[].namespace=supplier,key=source_url` | Type: `single_line_text_field`. |
| Salla product id | `product.metafields[].namespace=supplier,key=product_id` | Type: `single_line_text_field`. |

The sync never writes:

- `inventory_quantity`
- `inventoryQuantity`
- deletion flags
- Shopify customer data
- secrets or credential values

## 4. Enriched Guard Contract

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

## 5. Product Matching

Use both match paths:

1. `supplier.source_url` metafield equals the Nawadirdior product URL.
2. `supplier-id-p<id>` tag equals the Salla product id parsed from `/p<digits>`.

`sync/shopify-client.js` builds a lookup GraphQL query using:

- `metafields.supplier.source_url:"<sourceUrl>"`
- `tag:"supplier-id-p<id>"`
- Imported fallback query `tag:imported-nader-dior OR tag:مستورد-نوادر-ديور`

The response includes `supplier.source_url`, `supplier.product_id`, tags, status, and first variant fields so `sync/reconcile.js` can decide the action offline.

When listing imported products, use exactly `tag:imported-nader-dior OR tag:مستورد-نوادر-ديور`. Canonical writes continue to add the English `imported-nader-dior` tag.

## 6. Reconcile Action Plan

`sync/reconcile.js` returns:

- `toCreate`: valid supplier products with no existing imported Shopify product.
- `toUpdate`: existing products needing full update, or enriched products needing price/availability-only update.
- `toMarkOutOfStock`: imported Shopify products missing from the supplier crawl; these are drafted and never deleted.
- `toSkipEnriched`: enriched products with no price or availability change.
- `unchanged`: products already current, duplicate supplier ids, malformed supplier products, or already-drafted missing products.

Supplier-missing products auto-return when they reappear because a matching supplier product moves them back through `toUpdate`.

## 7. Required n8n Credentials

1. `Shopify-Calapres OAuth2`
   - Credential id: `QLsvwO73GFsQfy0w`
   - Used by Shopify Admin GraphQL and REST HTTP Request nodes.

2. `Higgsfield API ( awd-n8n )`
   - Header Auth credential id: `G31rYKMmDk8hyh2G`
   - Used only by the one-time enrichment workflow.

## 8. Required n8n Variables

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

## 9. Offline Verification Path

Run:

```bash
for file in sync/*.js sync/__tests__/*.js; do node --check "$file"; done
node sync/__tests__/run-tests.js
node sync/run-local-dry.js
```

Then inspect `sync/dry-run-output.json`:

- `payloads[]` shows parsed supplier data and per-product reconcile bucket.
- `preSyncSetup.metafieldDefinitionRequests` shows GraphQL `metafieldDefinitionCreate` request bodies.
- `preSyncSetup.backfillPlan` shows exact metafield/tag backfill requests and manual-review flags.
- `reconcilePlan` shows the complete action plan.
- `shopifyRequests.lookupFirst20[]` shows GraphQL lookup request shapes.
- `shopifyRequests.actionRequests` shows REST create/update/out-of-stock request shapes.
