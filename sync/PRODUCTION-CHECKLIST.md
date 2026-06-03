# Calapres Supplier Sync Production Checklist

Use this checklist when the Shopify storefront is open and the n8n workflows are ready to run against the live shop.

## 1. Required n8n Credentials

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

## 2. Required n8n Variables

1. `SHOPIFY_SHOP_DOMAIN`
   - Example: `calapres.myshopify.com`
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

## 3. Local Validation Before n8n Import

1. Run syntax checks:
   - `node --check sync/crawl-supplier.js`
   - `node --check sync/parse-product.js`
   - `node --check sync/pricing.js`
   - `node --check sync/inventory.js`
   - `node --check sync/build-shopify-payload.js`
   - `node --check sync/shopify-client.js`
   - `node --check sync/reconcile.js`
   - `node --check sync/validate-shopify-shape.js`
   - `node --check sync/run-local-dry.js`
   - `node --check sync/__tests__/run-tests.js`

2. Run offline tests:
   - `node sync/__tests__/run-tests.js`

3. Run the first-20 offline dry run:
   - `node sync/run-local-dry.js`

4. Inspect `sync/dry-run-output.json`:
   - Confirm `generatedPayloads` is `20`.
   - Confirm `reconcilePlan` includes create/update/out-of-stock/skip-enriched buckets.
   - Confirm `shopifyRequests.actionRequests` contains the REST request bodies to review.
   - Confirm `payloads[].action` is `create_or_update` for real supplier products.
   - Confirm stale supplier pages use `skip_missing_supplier_page`.
   - Confirm payload tags include `imported-nader-dior`.
   - Confirm source metafields include `supplier.source_url` and `supplier.product_id`.
   - Confirm no payload contains customer data or Shopify credentials.

## 4. n8n Recurring Sync Import

1. Create the recurring workflow from `sync/n8n-sync-flow.md`.
2. Paste each helper file into the matching n8n Code node:
   - `sync/crawl-supplier.js`
   - `sync/parse-product.js`
   - `sync/pricing.js`
   - `sync/inventory.js`
   - `sync/build-shopify-payload.js`
   - `sync/shopify-client.js`
   - `sync/reconcile.js`
   - `sync/validate-shopify-shape.js`
3. Configure all Shopify HTTP Request nodes with credential id `QLsvwO73GFsQfy0w`.
4. Set all Shopify request URLs to use `{{$vars.SHOPIFY_SHOP_DOMAIN}}`.
5. Set the Split In Batches node to batch size `1`.
6. Keep the one-second Wait node before every Shopify write.
7. Confirm product matching checks both:
   - `supplier.source_url` metafield.
   - `imported-nader-dior` plus `supplier-id-p<id>` tags.
8. Confirm missing supplier products are marked draft/out of stock and are never deleted.

## 5. n8n Enrichment Import

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

## 6. Go-Live Sequence

1. Open the Shopify storefront and confirm Admin API access still works.
2. Run the recurring sync manually with a limit of 5 supplier products.
3. Verify in Shopify Admin:
   - Product titles are correct.
   - Vendor is correct.
   - Price is supplier price plus 100 SAR.
   - Discounted products have compare-at price plus 100 SAR.
   - Tags include `imported-nader-dior`, `supplier:nawadirdior`, and `supplier-id-p<id>`.
   - Supplier metafields are present.
4. Run the enrichment workflow manually for one new product.
5. Verify the enriched product:
   - Has generated images.
   - Has Arabic SEO fields.
   - Has the `enriched` tag.
6. Re-run recurring sync for that enriched product.
7. Verify price and inventory update while title, description, images, and SEO stay unchanged.
8. Enable the recurring Schedule Trigger.
9. Monitor the first full run:
   - Products created.
   - Products updated.
   - Missing products drafted/out of stock.
   - Shopify HTTP errors.
   - Higgsfield HTTP errors.
10. Leave deletion disabled permanently for supplier-missing products.

## 7. Rollback

1. Disable both n8n workflows.
2. In Shopify Admin, filter products by `imported-nader-dior`.
3. Revert only the affected imported products if needed.
4. Do not delete products automatically; draft them while diagnosing.
