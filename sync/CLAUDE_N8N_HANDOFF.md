# Claude n8n Handoff: Supabase Product Data Lake

This is the deploy contract for Claude. Codex builds source, tests, generated Code-node bundles, and SQL. Claude deploys in n8n.

## Workflow 1

- Name: `Calapres: Nawadir Dior -> Supabase -> Shopify`
- Purpose: drain Nawadir Dior supplier products in chunks, upsert every valid product into Supabase, then create/update Shopify from the returned Supabase row.
- Data input: supplier product page URLs from `https://nawadirdior.sa/sitemap.xml`.
- Data output:
  - `supplier_products` upserted in Supabase (raw supplier landing row; raw data preserved)
  - `fragrance_products` parent upserted (one per fragrance: brand + normalized name + concentration)
  - `product_variants` child upserted (size / tester / gift set), linked to the parent and the raw supplier row
  - `product_media` rows for original supplier images
  - Shopify product create/update request built from the fragrance parent + its variants
  - `sync_runs` and `sync_errors` audit rows

## Fragrance Parent + Variant Model

Supabase is a luxury fragrance catalog, not a flat supplier mirror.

- `supplier_products` stays the raw supplier landing table. Never delete; raw payload preserved in `raw_payload`.
- `fragrance_products` is the canonical PARENT. One row per fragrance (e.g. Aramis Classic EDT).
- `product_variants` are the CHILDREN. 50ml / 100ml / 110ml / tester / gift set each become a variant of the same parent.
- Resolution (`sync/match-fragrance.js`):
  - HIGH confidence (brand + normalized fragrance name both resolved) -> attach as a variant of the existing parent, or create the parent once. The DB identity index `(brand_id, normalized_name, coalesce(concentration,''))` guarantees no duplicate parent.
  - LOW confidence (missing brand or unresolvable name) -> set `supplier_products.match_status='needs_review'` and SKIP the fragrance/variant upsert. Never merge a low-confidence guess.
- `calapres_sku` lives on `product_variants` (one supplier product = one variant = one SKU): `CAL-ND-P<supplier_product_id>`. It is the ONLY Shopify variant `sku`. `supplier_sku` is stored separately for traceability.
- Shopify mapping: one Shopify product per fragrance parent, one Shopify variant per `product_variants` row, option name `Size`, value = `size_label`.
- Enrichment fields on `fragrance_products` (family, accords, notes, ratings, season/occasion, luxury copy, SEO) are filled only by the enrichment pass, never by the recurring supplier sync. `verified=false` unless the fact comes from an official brand / manual trusted source.

## Credentials

- Shopify-Calapres / id `QLsvwO73GFsQfy0w`
- Higgsfield API ( awd-n8n ) / id `G31rYKMmDk8hyh2G`
- Supabase Calapres Service Role / to be created manually in n8n

Never paste Supabase service role key into code, chat, or GitHub. Store it only in the n8n Supabase credential or n8n credential vault.

## Supabase HTTP

- Base URL: `https://pbiiqlpgchrcgagemclt.supabase.co/rest/v1`
- Auth headers:
  - `Authorization: Bearer <Supabase service role credential value>`
  - `apikey: <Supabase service role credential value>`
  - `Content-Type: application/json`
- Upsert headers:
  - `Prefer: resolution=merge-duplicates,return=representation`

## Node Order

1. Schedule Trigger
2. Code: `Crawl Supplier URLs` from `sync/n8n-build/crawl.generated.js`
3. Split in Batches, one product URL at a time
4. Wait 1 second
5. HTTP GET supplier product page
6. Code: `Code: parseProduct` from `sync/n8n-build/parse.generated.js`
7. Code: `Code: Normalize Supplier Product` from `sync/n8n-build/normalize-supplier.generated.js`
8. Code: `Code: applyPricing` from `sync/n8n-build/pricing.generated.js`
9. Code: `Code: Build Supabase Upsert Payload` from `sync/n8n-build/supabase-upsert.generated.js`
10. HTTP POST Supabase `/supplier_products?on_conflict=supplier_id,supplier_product_id`
10a. Code: `Code: Resolve Fragrance Parent` from `sync/n8n-build/fragrance-resolve.generated.js`. Emits `fragranceRecord`, `matchStatus`, `matchConfidence`, and `skipFragranceUpsert`.
10b. HTTP POST Supabase `/fragrance_products` with `fragranceRecord` (return=representation). Skip when `skipFragranceUpsert=true` (low confidence). For the parent upsert, match an existing parent by `brand_name`+`normalized_name`+`concentration` first; insert only when none exists, so parents are never duplicated.
10c. Code: `Code: Build Variant Upsert Payload` from `sync/n8n-build/variant-upsert.generated.js`. Uses the returned `fragrance_products.id` and the `supplier_products.id`.
10d. HTTP POST Supabase `/product_variants?on_conflict=supplier_id,supplier_product_id` with `productVariantBody`.
10e. HTTP PATCH Supabase `/supplier_products?id=eq.<id>` with `fragrance_product_id`, `product_variant_id`, `match_status`, `match_confidence` from the resolve node (link the raw row to the parent/variant it resolved into).
11. Code: `Code: Build Product Media Rows` from `sync/n8n-build/product-media.generated.js`
12. Code: `Code: Build Product Media Lookup` from `sync/n8n-build/product-media-lookup.generated.js`
13. HTTP GET Supabase path from `productMediaLookupPath`
14. Code: `Code: Filter Product Media Rows` from `sync/n8n-build/product-media-filter.generated.js`
15. HTTP POST Supabase `/product_media` using `productMediaInsertRows`; skip when `skipProductMediaInsert=true`
16. Code: `Code: mapAvailability` from `sync/n8n-build/availability.generated.js`
17. Code: `Code: Build Shopify Lookup` from `sync/n8n-build/buildLookup.generated.js`
18. Shopify Admin GraphQL lookup existing product
19. Code: `Code: Select Existing Product` from `sync/n8n-build/selectExisting.generated.js`
20. Code: `Code: Build Shopify Payload From Supabase` from `sync/n8n-build/shopify-from-supabase.generated.js` (legacy single-row path; still valid for the 18 backfilled products). For the upgraded model, group `product_variants` by `fragrance_product_id` and use `Code: Build Shopify Product From Fragrance` from `sync/n8n-build/shopify-from-fragrance.generated.js` to emit one Shopify product with one variant per size (option `Size`, variant `sku` = `calapres_sku`).
21. Validate payload output; skip if `skipWrite=true`
22. Shopify Admin REST create or update product
23. Code: `Code: Build Supabase Shopify Sync Payload` from `sync/n8n-build/supabase-shopify-sync.generated.js`
24. HTTP PATCH Supabase `/supplier_products?id=eq.<supabaseProduct.id>` with `supplierProductPatch`
25. HTTP POST Supabase `/shopify_products?on_conflict=supplier_product_id` with `shopifyProductUpsertBody`
26. On any node error: Code `Code: Build Sync Error Row` from `sync/n8n-build/sync-error.generated.js`, then POST `/sync_errors`

Product media is intentionally guarded in n8n because `product_media` has no uniqueness constraint on `supplier_product_id + source + original_url`. Always query existing supplier media for the Supabase product first and insert only `productMediaInsertRows` from the filter node.

## One-Product Test

1. Keep Schedule Trigger disabled and run manually.
2. Set n8n variable `CALAPRES_SYNC_LIMIT=1`.
3. Prefer the known proof product by setting `CALAPRES_TEST_PRODUCT_ID=735368737`. If the sitemap ever omits that id, set `CALAPRES_TEST_PRODUCT_URL` to the exact supplier product page URL instead.
4. Keep the Split in Batches limit at `1` as a second guard.
5. Run the workflow manually.
6. Confirm one `supplier_products` row has:
   - `supplier_product_id`
   - `supplier_sku` if supplier exposes it
   - `selling_price = supplier_price + 100`
   - `compare_at_price = supplier_original_price + 100` only when discounted
   - `fragrance_product_id`, `product_variant_id`, and `match_status` populated (or `match_status='needs_review'` when low confidence)
6a. Confirm one `fragrance_products` parent row (brand + `normalized_name` + concentration) and one `product_variants` child row with:
   - `calapres_sku` like `CAL-ND-P<id>` (this is the Shopify variant sku, never `supplier_sku`)
   - `size_ml` / `size_label`, `is_tester`/`is_gift_set` as applicable
   - `selling_price`/`compare_at_price` matching the rules above
6b. Run a second size of the SAME fragrance and confirm it attaches as a new `product_variants` row under the SAME `fragrance_products` parent (no duplicate parent).
7. Confirm `product_media` has supplier image rows.
8. Stop before bulk loops. Do not trigger Higgsfield generation.
9. If Shopify write is enabled for the test, create/update only that one product.
10. Confirm `shopify_products` has exactly one mapping row for the tested Supabase product.

## Workflow 2

- Name: `Calapres: Supabase Image Jobs -> Higgsfield -> Supabase -> Shopify`
- Purpose: process pending image jobs only after product prompt style is approved.
- Input: Supabase `image_generation_jobs` where `status='pending'`.
- Output:
  - Higgsfield generated main image
  - two generated marketing images
  - `generated_assets` rows
  - `product_media` rows marked `higgsfield`
  - Shopify media upload only after successful generation and quality gate

## Image Workflow Order

1. Manual or scheduled trigger only after style approval
2. Supabase list pending `image_generation_jobs`
3. Split one job at a time
4. Code: `Code: Build Higgsfield Request (Image Pipeline)`
5. HTTP Request Higgsfield generate
6. Code: `Code: Run Quality Gate (Image Pipeline)`
7. If passed, write `generated_assets` and `product_media`
8. Upload new Shopify media
9. Only after upload succeeds, mark Supabase upload status `uploaded_to_shopify`

## What Not To Do

- Do not use Shopify as source of truth.
- Do not read supplier URL from Shopify product description.
- Do not use `supplier_sku` as Shopify variant SKU.
- Do not write numeric inventory.
- Do not delete Shopify products or old Shopify images.
- Do not overwrite enriched product title, description, images, vendor, tags, or SEO.
- Do not bulk-generate Higgsfield images before prompt style approval.
- Do not hand-edit generated n8n Code nodes. Regenerate with `node sync/build-n8n-nodes.js`.
