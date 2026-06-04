# Calapres Sync Architecture

## Boundary

- Codex builds and tests `sync/` source, generated n8n Code-node bundles, docs, and CI.
- Claude deploys generated artifacts into live n8n.
- No code in this folder deletes Shopify products or writes numeric inventory quantities.
- Offline tests and dry runs must work without Shopify, n8n, Higgsfield, or supplier network access.

## Source of Truth

- `config.js`: store domain, API versions, markup, chunk size, tags, namespaces, credential ids, supplier constants, and collection map.
- `n8n-build/manifest.json`: deploy contract for Claude.
- `n8n-build/*.generated.js`: paste-ready Code-node bundles generated from source helpers.

## Recurring Sync Flow

1. `crawl-supplier.js` reads the supplier sitemap.
2. `sync-state.js` drains the catalog in `CHUNK_SIZE=300` chunks using a persisted offset.
3. `parse-product.js` parses fetched HTML with crawl `sourceUrl` and `supplierProductId` carried through.
4. `pricing.js` applies the configured strategy, defaulting to supplier price + 100 SAR.
5. `inventory.js` maps supplier availability to status-only inventory.
6. `shopify-client.js` builds lookup/list/write request shapes.
7. `reconcile.js` chooses create/update/draft/skip buckets.
8. `build-shopify-payload.js` assembles REST payloads and blocks creates without price or numeric supplier id.
9. `validate-shopify-shape.js` rejects forbidden fields, customer data, secrets, deletion flags, and enriched-guard violations.
10. `report.js` emits run summary JSON/Markdown.

## Enrichment Flow

1. `enrich/prompt.js` creates brand-aware Higgsfield prompt payloads.
2. `enrich/seo.js` creates RTL Arabic SEO and varied luxury description HTML.
3. `enrich/build-enrich-payload.js` puts generated images first, appends original images, caps images at 6, writes SEO metafields, and adds `enriched`.
4. Recurring sync sees `enriched` and writes only price/availability.

## Generated Artifacts

Run:

```bash
node sync/build-n8n-nodes.js
node sync/tools/check-generated.js
```

Generated files are committed so the live n8n flow is reproducible from GitHub, not hand-built memory.

## CI Guards

`.github/workflows/sync-ci.yml` runs syntax checks, the offline test suite, dry run, doc lint, secret scan, and generated-output check when `sync/**` or `.github/**` changes.
