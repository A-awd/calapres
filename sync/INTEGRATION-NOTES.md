# Calapres Shopify Sync Integration Notes

These notes define the exact field mapping and API contract for the Calapres data lake sync. Supabase is now the product source of truth; Shopify is only the sales channel.

## Live Status (Verified)

- Storefront is open on `unywbe-ub.myshopify.com`.
- Supabase project URL is `https://pbiiqlpgchrcgagemclt.supabase.co`.
- New source-of-truth path is `nawadirdior.sa -> n8n -> Supabase -> Shopify`.
- Shopify metafield definitions `supplier.source_url` and `supplier.product_id` exist, are pinned, and are admin-filterable.
- All 18 legacy imports are backfilled with `supplier.product_id`; `needsManualMatch`, `notFoundAtSupplier`, and unmatched counts are 0.
- The recurring sync workflow is built and has run live successfully. It created real draft products with supplier price + 100 SAR, `supplier:nawadirdior`, `supplier-id-p<id>`, and `supplier.source_url`.
- New imported products land as `draft` for review.
- Documented Admin API standard is `2026-04`; the deployed live n8n flow currently uses `2025-01`, and both versions are confirmed working.

## 1. Live Setup and Backfill State

The previous pre-sync setup is complete. Keep this section as the audit record and replay guide if live metadata is ever removed.

1. Product metafield definitions are already created.
   - `supplier.source_url`
   - `supplier.product_id`
   - Both definitions use `single_line_text_field`.
   - Both definitions use owner type `PRODUCT`.
   - Both definitions set `pin: true`.
   - Both definitions set Admin API access to `MERCHANT_READ_WRITE`.
   - Both definitions enable `capabilities.adminFilterable.enabled`.

2. The 18 existing imported products are backfilled.
   - Backfill source: `sync/backfill-existing-products.js` with `sync/backfill-map.json`.
   - All 18 map entries are high-confidence.
   - `needsManualMatch[]` count is 0.
   - `notFoundAtSupplier[]` count is 0.
   - Backfilled writes were limited to `supplier.source_url`, `supplier.product_id`, canonical `imported-nader-dior`, and `supplier-id-p<id>`.
   - The Arabic imported tag `مستورد-نوادر-ديور` remains preserved on legacy products that already had it.
   - Backfill never writes price, images, description, status, vendor, inventory, or SEO.

3. Run an offline dry run after code or workflow edits and inspect `sync/dry-run-output.json`.
   - `preSyncSetup.metafieldDefinitionRequests` shows the two definition-create requests.
   - `preSyncSetup.backfillPlan.summary.totalExisting` must be `18`.
   - `preSyncSetup.backfillPlan.summary.needsManualMatch` must be `0`.
   - `preSyncSetup.backfillPlan.summary.notFoundAtSupplier` must be `0`.
   - `preSyncSetup.postBackfillReconcilePlan` must show `toCreate: 0` for the 18 existing backfilled products.

## 2. Shopify Admin API Surface

The sync system uses:

- GraphQL Admin API for reads and pagination.
- GraphQL Admin API for setup/audit request shapes such as metafield definition creation and `metafieldsSet` backfill writes.
- REST Admin API for product create/update writes.
- `sync/shopify-client.js` for all request-shape construction.
- `sync/validate-shopify-shape.js` before any REST write payload is trusted.
- `sync/build-n8n-nodes.js` to generate dependency-inlined Code-node bundles from source.

Default Admin API version in code and documentation: `2026-04`.

Note: the deployed live n8n flow currently uses Admin API `2025-01` and works; keep `2026-04` as the standard for rebuilt or newly documented nodes.

Generated-node contract: use `sync/n8n-build/manifest.json` and `sync/n8n-build/*.generated.js` for Claude deployment. Do not hand-build Code-node logic in n8n.

## 3. Supplier Field to Supabase to Shopify Mapping

Supplier data is first upserted into `supplier_products`. Shopify payloads are built from that Supabase row.

| Supplier or Sync Field | Shopify REST Admin Field | Notes |
| --- | --- | --- |
| `name` | `product.title` | Only written for new or non-enriched products. |
| `description` | `product.body_html` | Plain text is escaped and wrapped in paragraphs. Trusted simple HTML is preserved. |
| `brand` | `product.vendor` | Falls back to `Nawadirdior`. |
| `supplierPrice` | Supabase `supplier_products.supplier_price`, then `product.variants[0].price` | Calapres rule: supplier price plus 100 SAR. |
| `supplierCompareAtPrice` | Supabase `supplier_products.supplier_original_price`, then `product.variants[0].compare_at_price` | Calapres rule: supplier compare-at plus 100 SAR; cleared when equal to price. |
| `supplierSku` | Supabase `supplier_products.supplier_sku`, Shopify metafield `supplier.sku` | Never Shopify variant SKU. |
| generated `calapres_sku` | Shopify `product.variants[0].sku` | Format `CAL-ND-P<id>` for Nawadir Dior. |
| `availability` | `product.status` | New imported products land as `draft` for review; `out_of_stock` or supplier-missing also becomes `draft`. Existing in-stock products may be active when intentionally published. |
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

3. `Supabase Calapres Service Role`
   - Create manually in n8n.
   - Store the service role key only inside n8n credentials.
   - Used by Supabase REST nodes for `supplier_products`, `product_media`, `image_generation_jobs`, `generated_assets`, `sync_runs`, and `sync_errors`.

## 8. Required n8n Variables

1. `SHOPIFY_STORE_DOMAIN`
   - Example: `unywbe-ub.myshopify.com`

2. `SUPPLIER_SITEMAP_URL`
   - Value: `https://nawadirdior.sa/sitemap.xml`

3. `SUPPLIER_NAME`
   - Value: `nawadirdior`

4. `SHOPIFY_REQUEST_DELAY_SECONDS`
   - Value: `1`

5. `HIGGSFIELD_IMAGE_MODEL`
   - Example: `higgsfield-soul`

6. `SUPABASE_URL`
   - Value: `https://pbiiqlpgchrcgagemclt.supabase.co`

7. `SUPABASE_SUPPLIER_ID`
   - UUID of the `suppliers` row for Nawadir Dior after migration is applied.

## 9. Offline Verification Path

Run:

```bash
for file in sync/*.js sync/__tests__/*.js; do node --check "$file"; done
node sync/__tests__/run-tests.js
node sync/build-n8n-nodes.js
node sync/run-local-dry.js
node sync/tools/doc-lint.js
node sync/tools/secret-scan.js
node sync/tools/check-generated.js
```

Then inspect `sync/dry-run-output.json`:

- `payloads[]` shows parsed supplier data and per-product reconcile bucket.
- `preSyncSetup.metafieldDefinitionRequests` shows GraphQL `metafieldDefinitionCreate` request bodies.
- `preSyncSetup.backfillPlan` shows exact metafield/tag backfill requests and confirms 18 high-confidence, 0 manual-review, 0 not-found rows.
- `reconcilePlan` shows the complete action plan.
- `shopifyRequests.lookupFirst20[]` shows GraphQL lookup request shapes.
- `shopifyRequests.actionRequests` shows REST create/update/out-of-stock request shapes.
