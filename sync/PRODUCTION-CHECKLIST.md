# Calapres Supplier Sync Production Checklist

Use this checklist to maintain, verify, and safely operate the live supplier sync against the open Shopify storefront.

## Live Status (Verified)

- Storefront is open on `unywbe-ub.myshopify.com`.
- Shopify metafield definitions `supplier.source_url` and `supplier.product_id` exist, are pinned, and are admin-filterable.
- All 18 legacy imports are backfilled with `supplier.product_id`; `needsManualMatch`, `notFoundAtSupplier`, and unmatched counts are 0.
- The recurring sync workflow is built and has run live successfully. It created real draft products with supplier price + 100 SAR, `supplier:nawadirdior`, `supplier-id-p<id>`, and `supplier.source_url`.
- New imported products land as `draft` for review.
- Documented Admin API standard is `2026-04`; the deployed live n8n flow currently uses `2025-01`, and both versions are confirmed working.

## 1. Live Setup State: Verify Before Changes

1. Shopify product metafield definitions are already created.
   - `supplier.source_url`
   - `supplier.product_id`
   - Confirm both are `single_line_text_field`.
   - Confirm both are owner type `PRODUCT`.
   - Confirm both are pinned.
   - Confirm both have Admin access `MERCHANT_READ_WRITE`.
   - Confirm both have `adminFilterable.enabled: true`.

2. The 18 existing imported products are already backfilled.
   - Audit with `sync/backfill-existing-products.js` and `sync/backfill-map.json`.
   - Confirm Shopify reads use `tag:imported-nader-dior OR tag:مستورد-نوادر-ديور`.
   - Confirm every legacy product has `supplier.product_id`.
   - Confirm every matched product has `supplier.source_url`.
   - Confirm every matched product has `supplier-id-p<id>`.
   - Confirm the canonical `imported-nader-dior` tag exists where needed.
   - Preserve the Arabic tag `مستورد-نوادر-ديور` on the seven Arabic-tagged products.
   - Do not write price, images, description, status, vendor, inventory, or SEO.
   - Current `needsManualMatch[]` count is `0`.
   - Current `notFoundAtSupplier[]` count is `0`.

3. Confirm duplicate prevention before workflow edits or reruns.
   - Run `node sync/run-local-dry.js`.
   - Confirm `preSyncSetup.backfillPlan.summary.totalExisting` is `18`.
   - Confirm `preSyncSetup.backfillPlan.summary.needsManualMatch` is `0`.
   - Confirm `preSyncSetup.backfillPlan.summary.notFoundAtSupplier` is `0`.
   - Confirm `preSyncSetup.postBackfillReconcilePlan.toCreate` is `0` for the 18 existing backfilled products.

## 2. Required n8n Credentials

1. Shopify Admin OAuth2 credential:
   - Name: `Shopify-Calapres OAuth2`
   - Credential id: `QLsvwO73GFsQfy0w`
   - Required scopes: product read/write, product variant read/write, metafield read/write.
   - Verify with a GraphQL request for one product before enabling writes.

2. Higgsfield Header Auth credential:
   - Name: `Higgsfield API ( awd-n8n )`
   - Credential id: `G31rYKMmDk8hyh2G`
   - Auth type: Header Auth.
   - Header name should match Higgsfield account requirements, normally `Authorization`.
   - Header value should be the active Higgsfield API key or bearer token.

## 3. Required n8n Variables

1. `SHOPIFY_STORE_DOMAIN`
   - Example: `unywbe-ub.myshopify.com`
   - Do not use `calapres.com` unless Shopify Admin API calls for that host are confirmed.

2. `SUPPLIER_SITEMAP_URL`
   - Value: `https://nawadirdior.sa/sitemap.xml`

3. `SUPPLIER_NAME`
   - Value: `nawadirdior`

4. `SHOPIFY_REQUEST_DELAY_SECONDS`
   - Value: `1`
   - Keeps Shopify Admin calls at one request per second.

5. `HIGGSFIELD_IMAGE_MODEL`
   - Value used by the enrichment workflow, for example `higgsfield-soul`.

## 4. Local Validation Before n8n Edits or Re-Import

1. Run syntax checks:
   - `find sync -name '*.js' -print0 | xargs -0 -n1 node --check`

2. Run offline tests:
   - `node sync/__tests__/run-tests.js`

3. Run the first-20 offline dry run:
   - `node sync/run-local-dry.js`

4. Generate and verify n8n Code-node bundles:
   - `node sync/build-n8n-nodes.js`
   - `node sync/tools/check-generated.js`

5. Run docs and secret guards:
   - `node sync/tools/doc-lint.js`
   - `node sync/tools/secret-scan.js`

6. Inspect `sync/dry-run-output.json` and `sync/reports/sample-run.md`:
   - Confirm `generatedPayloads` is `20`.
   - Confirm `preSyncSetup.metafieldDefinitionRequests` contains `source_url` and `product_id`.
   - Confirm `preSyncSetup.backfillPlan.summary.totalExisting` is `18`.
   - Confirm `preSyncSetup.backfillPlan.summary.needsManualMatch` is `0`.
   - Confirm `preSyncSetup.backfillPlan.summary.notFoundAtSupplier` is `0`.
   - Confirm `reconcilePlan` includes create/update/out-of-stock/skip-enriched buckets.
   - Confirm `shopifyRequests.actionRequests` contains the REST request bodies to review.
   - Confirm `payloads[].action` is `create_or_update` for real supplier products.
   - Confirm stale supplier pages use `skip_missing_supplier_page`.
   - Confirm payload tags include `imported-nader-dior`.
   - Confirm source metafields include `supplier.source_url` and `supplier.product_id`.
   - Confirm no payload contains customer data or Shopify credentials.

## 5. n8n Recurring Sync Import

The recurring workflow is already built and has run live successfully. Use this section when editing, rebuilding, or re-importing it.

1. Maintain source helpers in GitHub, then run `node sync/build-n8n-nodes.js`.
2. Claude deploys Code nodes from `sync/n8n-build/*.generated.js` using `sync/n8n-build/manifest.json`.
3. Setup/audit helpers `sync/setup-metafield-definitions.js` and `sync/backfill-existing-products.js` are not recurring-flow nodes.
4. Configure all Shopify HTTP Request nodes with credential id `QLsvwO73GFsQfy0w`.
5. Set all Shopify request URLs to use `{{$env.SHOPIFY_STORE_DOMAIN}}` or the verified fallback `unywbe-ub.myshopify.com`.
6. Persist and advance the catalog offset from generated crawl output; wrap to `0` at catalog end.
7. Keep the one-second Wait node before every Shopify write.
8. Confirm product matching checks both:
   - `supplier.source_url` metafield.
   - `supplier-id-p<id>` tags.
   - Imported-products query `tag:imported-nader-dior OR tag:مستورد-نوادر-ديور`.
9. Confirm missing supplier products are marked draft/out of stock and are never deleted.

## 6. n8n Enrichment Import

1. Create the enrichment workflow from `sync/n8n-enrich-flow.md`.
2. Configure Shopify HTTP Request nodes with credential id `QLsvwO73GFsQfy0w`.
3. Configure the Higgsfield HTTP Request node with Header Auth credential id `G31rYKMmDk8hyh2G`.
4. Confirm the Higgsfield request body generates:
   - One luxury hero image.
   - Additional product imagery.
   - Arabic SEO title and meta description.
   - Original Arabic luxury description.
5. Confirm the Shopify update appends the `enriched` tag.
6. Confirm enriched products are excluded from future presentation overwrites by `buildPayload`.

## 7. Live Operation Sequence

1. Confirm the open Shopify storefront and Admin API access still work.
2. Verify the 18 existing imported products still have supplier metafields and supplier-id tags.
3. Confirm `sync/backfill-map.json` remains 18 high-confidence matches with 0 unmatched rows.
4. If a future map introduces low-confidence/unmatched rows, leave those rows untouched until manually matched.
5. Run the recurring sync manually with a limit of 5 supplier products after workflow edits.
6. Verify in Shopify Admin:
   - Product titles are correct.
   - Vendor is correct.
   - Price is supplier price plus 100 SAR.
   - Discounted products have compare-at price plus 100 SAR.
   - New imported products are draft for review.
   - Tags include `imported-nader-dior`, `supplier:nawadirdior`, and `supplier-id-p<id>`.
   - Supplier metafields are present.
7. Run the enrichment workflow manually for one new product.
8. Verify the enriched product:
   - Has generated images.
   - Has Arabic SEO fields.
   - Has the `enriched` tag.
9. Re-run recurring sync for that enriched product.
10. Verify price and inventory update while title, description, images, and SEO stay unchanged.
11. Enable or re-enable the recurring Schedule Trigger after QA.
12. Monitor the next full run after changes:
   - Products created.
   - Products updated.
   - Missing products drafted/out of stock.
   - Shopify HTTP errors.
   - Higgsfield HTTP errors.
13. Leave deletion disabled permanently for supplier-missing products.

## 8. Rollback

1. Disable both n8n workflows.
2. In Shopify Admin, filter products by `tag:imported-nader-dior OR tag:مستورد-نوادر-ديور`.
3. Revert only the affected imported products if needed.
4. Do not delete products automatically; draft them while diagnosing.
