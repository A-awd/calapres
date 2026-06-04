# Nawadirdior to Calapres Supplier Sync

Dependency-free JavaScript helpers and generated n8n Code-node bundles. GitHub is the source of truth: edit `sync/` source files, run `node sync/build-n8n-nodes.js`, then Claude deploys generated artifacts from `sync/n8n-build/`.

## Files

- `parse-product.js`: `parseProduct(html)` extracts supplier product data from Salla meta tags and JSON-LD. It returns `{ name, brand, supplierPrice, supplierCompareAtPrice, availability, imageUrl, description, category, sourceUrl }` and never throws on missing fields.
- `config.js`: authoritative constants for store domain, API versions, tags, markup, chunk size, credential ids, namespaces, supplier sitemap, and collection map.
- `crawl-supplier.js`: `crawlSupplierProducts()` reads `https://nawadirdior.sa/sitemap.xml`, follows nested sitemaps, extracts every product URL matching `/<slug>/p<digits>`, preserves Arabic/encoded slugs safely, and dedupes by Salla product id.
- `sync-state.js`: persisted-offset chunking and new/existing selectors for 300-product catalog drain runs.
- `pricing.js`: `applyPricing({ supplierPrice, supplierCompareAtPrice })` adds the exact Calapres `+100 SAR` markup and clears `compareAtPrice` when it would equal `price`.
- `inventory.js`: `mapAvailability(availability)` maps supplier state to status-only Shopify fields. It never emits numeric inventory quantities and never deletes missing supplier products.
- `build-shopify-payload.js`: `buildPayload(parsed)` assembles a Shopify product payload with title, body HTML, vendor, tags, image, and one variant. If an existing product is tagged `enriched`, the explicit guard returns only price and availability fields so the luxury presentation layer is protected.
- `shopify-client.js`: pure Shopify Admin GraphQL/REST request-shape builder for lookup, create, update, pagination, tag reads, and offline execution tests.
- `reconcile.js`: pure action planner returning `{ toCreate, toUpdate, toMarkOutOfStock, toSkipEnriched, unchanged }`.
- `validate-shopify-shape.js`: REST Admin field-name guard for every product payload the sync writes.
- `normalize.js`: brand, concentration, size, gender, and title cleanup.
- `categorize.js`: Calapres collection handle mapping from normalized product signals.
- `enrich/`: pure Higgsfield prompt, Arabic SEO, and enriched payload helpers.
- `report.js`: run summary JSON/Markdown renderer; schema is in `report-schema.md`.
- `build-n8n-nodes.js`: deterministic n8n Code-node bundler.
- `n8n-build/`: generated, dependency-inlined Code-node bundles plus `manifest.json` deploy contract for Claude.
- `tools/`: doc lint, secret scan, and generated-output checks used by CI.
- `setup-metafield-definitions.js`: pure GraphQL `metafieldDefinitionCreate` request-shape builder for `supplier.source_url` and `supplier.product_id`.
- `backfill-existing-products.js`: pure planner that matches existing imported Shopify products to supplier products and emits tag/metafield-only backfill requests.
- `run-local-dry.js`: offline first-20 dry run using saved fixtures only. It writes `dry-run-output.json` with payloads, reconcile plan, and exact Shopify request bodies. It never writes to Shopify.
- `n8n-sync-flow.md`: complete recurring sync workflow spec, including crawl, parse, pricing, availability, matching, create/update, and missing-product out-of-stock handling.
- `n8n-enrich-flow.md`: complete one-time enrichment workflow spec using Higgsfield images plus protected Arabic SEO/presentation updates.
- `PRODUCTION-CHECKLIST.md`: ordered operations checklist for credentials, variables, validation, monitoring, and rollback.
- `INTEGRATION-NOTES.md`: Shopify field mapping, enriched guard contract, product matching, and n8n wiring notes.
- `fixtures/`: real Nawadirdior sitemap and product-page samples used for offline tests and dry runs.
- `__tests__/run-tests.js`: dependency-free Node test runner using `node:assert`.

## Live Status

- Storefront is open on `unywbe-ub.myshopify.com`.
- Shopify metafield definitions `supplier.source_url` and `supplier.product_id` exist and are admin-filterable.
- All 18 legacy imported products are backfilled with `supplier.product_id`; current manual/unmatched/not-found backfill counts are 0.
- The recurring n8n sync workflow is built and has run live successfully.
- New imported products land as draft for review.

## Data Flow

Live setup is complete: `setup-metafield-definitions -> backfill-existing-products -> dry-run duplicate check` has already run for the 18 legacy imports. Recurring sync now drains the supplier catalog in 300-product chunks: `sitemap.xml -> computeChunk(offset) -> crawl item sourceUrl/supplierProductId -> HTTP GET -> parseProduct(html, crawl context) -> canCreate guard -> applyPricing/mapAvailability -> lookup existing -> buildPayload -> validateShopifyProductShape -> shopify-client request shapes -> n8n HTTP Request nodes`. New imported products land as draft for review, enriched products route through a price/availability-only guard, and supplier-missing products are drafted out of stock instead of deleted.

## Generated n8n Bundles

```bash
node sync/build-n8n-nodes.js
node sync/tools/check-generated.js
```

Claude deploys from `sync/n8n-build/manifest.json` and the generated `*.generated.js` files. Do not hand-edit generated files.

## Local Validation

Run the syntax checks, offline tests, and first-20 dry run before importing or changing n8n workflows:

```bash
for file in sync/*.js sync/__tests__/*.js; do node --check "$file"; done
find sync -name '*.js' -print0 | xargs -0 -n1 node --check
node sync/__tests__/run-tests.js
node sync/run-local-dry.js
node sync/tools/doc-lint.js
node sync/tools/secret-scan.js
node sync/tools/check-generated.js
```

The dry run writes `sync/dry-run-output.json` and `sync/reports/sample-run.md`. It should report 20 generated payloads, setup/backfill audit requests, 18 high-confidence legacy matches with 0 manual/unmatched/not-found rows, a reconcile plan, and Shopify request bodies. A stale supplier sitemap entry may be marked `skip_missing_supplier_page`; that is expected and prevents homepage redirect HTML from becoming a Shopify product.

## n8n Flow

1. Code node from `sync/n8n-build/crawl.generated.js` calls `crawlSupplierProducts()`, chunks by persisted offset, and emits one item per supplier product URL in the current chunk.
2. HTTP Request node fetches each Nawadirdior product page HTML.
3. Code node from `parse.generated.js` calls `parseProduct(html, { sourceUrl, supplierProductId })`.
4. Code node with `pricing.js` can call `applyPricing(parsed)` if pricing is needed separately.
5. Code node with `inventory.js` can call `mapAvailability(parsed.availability)` for status-only stock sync.
6. Code node with `reconcile.js` calls `reconcile(supplierProducts, shopifyProducts)` to decide create/update/out-of-stock/skip actions.
7. Code node with `build-shopify-payload.js` calls `buildPayload(parsed)` for the selected action.
8. Code node with `validate-shopify-shape.js` calls `assertValidShopifyProductShape(payload)` before writes.
9. Code node with `shopify-client.js` builds the exact Admin REST/GraphQL request object for the next HTTP Request node.

## Enriched Product Guard

Pass the current Shopify product tags into `buildPayload` as `existingTags` or `existingProduct.tags`.

```js
const payload = buildPayload({
  ...parsed,
  existingProduct: shopifyProduct
});
```

When `enriched` is present, the returned `{ product: ... }` body excludes `title`, `body_html`, images, SEO/metafields, vendor, and tags. Only price and availability fields are emitted, so Higgsfield-created luxury descriptions and imagery stay untouched.
