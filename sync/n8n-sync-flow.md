# n8n Recurring Supplier Sync Flow

This workflow keeps Calapres Shopify products aligned with Nawadirdior Salla products. It never deletes Shopify products. Supplier items missing from the latest crawl are marked out of stock.

Pre-sync requirement: before this recurring workflow is enabled, run the setup from `sync/setup-metafield-definitions.js` and `sync/backfill-existing-products.js`. The live store currently has 18 imported products split across two imported-tag conventions: `imported-nader-dior` and `مستورد-نوادر-ديور`. Those products need `supplier.source_url` / `supplier.product_id` definitions and supplier-id tags backfilled from `sync/backfill-map.json`, otherwise the first recurring sync can create duplicates.

Implementation note: keep Shopify decision logic and request bodies centralized in `sync/reconcile.js`, `sync/build-shopify-payload.js`, `sync/validate-shopify-shape.js`, and `sync/shopify-client.js`. In n8n, Code nodes should call those helpers and pass the returned request objects to HTTP Request nodes instead of hand-building Shopify field names.

Credential:

- Shopify-Calapres OAuth2 credential: `QLsvwO73GFsQfy0w`

Recommended Shopify store domain variable:

- n8n environment variable `SHOPIFY_STORE_DOMAIN=calapres.myshopify.com`

## Connections

1. `Schedule Trigger` -> `Crawl Supplier URLs`
2. `Crawl Supplier URLs` -> `Split Product URLs`
3. `Split Product URLs` -> `Wait: Product Rate Limit`
4. `Wait: Product Rate Limit` -> `HTTP GET Supplier Product`
5. `HTTP GET Supplier Product` -> `Code: parseProduct`
6. `Code: parseProduct` -> `Code: applyPricing`
7. `Code: applyPricing` -> `Code: mapAvailability`
8. `Code: mapAvailability` -> `Code: Build Shopify Lookup`
9. `Code: Build Shopify Lookup` -> `Shopify Admin GraphQL: Lookup Existing`
10. `Shopify Admin GraphQL: Lookup Existing` -> `Code: Select Existing Product`
11. `Code: Select Existing Product` -> `Code: buildPayload`
12. `Code: buildPayload` -> `IF: Existing Product?`
13. `IF: Existing Product?` true -> `Shopify Admin REST: Update Product`
14. `IF: Existing Product?` false -> `Shopify Admin REST: Create Product`
15. both Shopify write nodes -> `Split Product URLs` continue
16. `Split Product URLs` done output -> `Shopify Admin GraphQL: List Imported Products`
17. `Shopify Admin GraphQL: List Imported Products` -> `Code: Find Missing Supplier Products`
18. `Code: Find Missing Supplier Products` -> `Split Missing Products`
19. `Split Missing Products` -> `Wait: Missing Rate Limit`
20. `Wait: Missing Rate Limit` -> `Code: buildPayload Missing`
21. `Code: buildPayload Missing` -> `Shopify Admin REST: Mark Missing Out Of Stock`
22. `Shopify Admin REST: Mark Missing Out Of Stock` -> `Split Missing Products` continue

## Node 1: Schedule Trigger

- Type: `n8n-nodes-base.scheduleTrigger`
- Name: `Schedule Trigger`
- Settings:
  - Trigger Interval: `Hours`
  - Hours Between Triggers: `6`
  - Timezone: store timezone, e.g. `Asia/Riyadh`

## Node 2: Crawl Supplier URLs

- Type: `n8n-nodes-base.code`
- Name: `Crawl Supplier URLs`
- Mode: `Run Once for All Items`
- JavaScript:

```js
// Paste sync/crawl-supplier.js above this line.
const urls = await crawlSupplierProducts({
  sitemapUrl: 'https://nawadirdior.sa/sitemap.xml'
});

return urls.map((sourceUrl) => ({
  json: {
    sourceUrl,
    supplierProductId: productIdFromUrl(sourceUrl),
    seenInCurrentCrawl: true
  }
}));
```

## Node 3: Split Product URLs

- Type: `n8n-nodes-base.splitInBatches`
- Name: `Split Product URLs`
- Settings:
  - Batch Size: `1`
  - Options: `Reset: false`

## Node 4: Wait: Product Rate Limit

- Type: `n8n-nodes-base.wait`
- Name: `Wait: Product Rate Limit`
- Settings:
  - Resume: `After Time Interval`
  - Amount: `1`
  - Unit: `Seconds`
- Purpose: keep Shopify/Admin calls at or below 1 request per second.

## Node 5: HTTP GET Supplier Product

- Type: `n8n-nodes-base.httpRequest`
- Name: `HTTP GET Supplier Product`
- Settings:
  - Method: `GET`
  - URL: `={{$json.sourceUrl}}`
  - Response Format: `String`
  - Full Response: `false`
  - Follow Redirect: `true`
  - Timeout: `30000`
  - Headers:
    - `User-Agent`: `Calapres Supplier Sync/1.0`
    - `Accept`: `text/html,application/xhtml+xml`

## Node 6: Code: parseProduct

- Type: `n8n-nodes-base.code`
- Name: `Code: parseProduct`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Paste sync/parse-product.js above this line.
const html = $json.body || $json.data || $json.html || $json;
const parsed = parseProduct(String(html || ''));
parsed.sourceUrl = parsed.sourceUrl || $node['Split Product URLs'].json.sourceUrl;
parsed.supplierProductId = parsed.supplierProductId || $node['Split Product URLs'].json.supplierProductId;

return {
  json: {
    ...$node['Split Product URLs'].json,
    parsed
  }
};
```

## Node 7: Code: applyPricing

- Type: `n8n-nodes-base.code`
- Name: `Code: applyPricing`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Paste sync/pricing.js above this line.
const pricing = applyPricing($json.parsed);
return {
  json: {
    ...$json,
    parsed: {
      ...$json.parsed,
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice
    }
  }
};
```

## Node 8: Code: mapAvailability

- Type: `n8n-nodes-base.code`
- Name: `Code: mapAvailability`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Paste sync/inventory.js above this line.
const inventory = mapAvailability($json.parsed.availability);
return {
  json: {
    ...$json,
    parsed: {
      ...$json.parsed,
      inventory
    }
  }
};
```

## Node 9: Code: Build Shopify Lookup

- Type: `n8n-nodes-base.code`
- Name: `Code: Build Shopify Lookup`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
const sourceUrl = $json.parsed.sourceUrl || $json.sourceUrl;
const idMatch = String(sourceUrl || '').match(/\/p(\d+)(?=$|[/?#])/);
const supplierProductId = $json.supplierProductId || (idMatch ? idMatch[1] : '');
const supplierIdTag = supplierProductId ? `supplier-id-p${supplierProductId}` : '';
const importedQuery = 'tag:imported-nader-dior OR tag:مستورد-نوادر-ديور';
const query = supplierIdTag
  ? `${importedQuery} OR tag:${supplierIdTag}`
  : importedQuery;

return {
  json: {
    ...$json,
    lookup: {
      sourceUrl,
      supplierProductId,
      supplierIdTag,
      query
    }
  }
};
```

## Node 10: Shopify Admin GraphQL: Lookup Existing

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin GraphQL: Lookup Existing`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `POST`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'calapres.myshopify.com'}}/admin/api/2025-01/graphql.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body:

```json
{
  "query": "query LookupProduct($query: String!) { products(first: 25, query: $query) { nodes { id legacyResourceId title handle tags sourceUrlMetafield: metafield(namespace: \"supplier\", key: \"source_url\") { value } productIdMetafield: metafield(namespace: \"supplier\", key: \"product_id\") { value } variants(first: 1) { nodes { id legacyResourceId } } } } }",
  "variables": {
    "query": "={{$json.lookup.query}}"
  }
}
```

## Node 11: Code: Select Existing Product

- Type: `n8n-nodes-base.code`
- Name: `Code: Select Existing Product`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
const sourceUrl = $node['Code: Build Shopify Lookup'].json.lookup.sourceUrl;
const supplierProductId = $node['Code: Build Shopify Lookup'].json.lookup.supplierProductId;
const supplierIdTag = $node['Code: Build Shopify Lookup'].json.lookup.supplierIdTag;
const nodes = $json.data?.products?.nodes || [];
const exact = nodes.find((product) => product.sourceUrlMetafield?.value === sourceUrl);
const byProductId = nodes.find((product) => {
  const value = String(product.productIdMetafield?.value || '').replace(/^p/i, '');
  return supplierProductId && value === String(supplierProductId);
});
const bySupplierTag = nodes.find((product) => supplierIdTag && (product.tags || []).includes(supplierIdTag));
const product = exact || byProductId || bySupplierTag || null;
const variant = product?.variants?.nodes?.[0] || null;

return {
  json: {
    ...$node['Code: Build Shopify Lookup'].json,
    existingProduct: product
      ? {
          id: product.legacyResourceId || product.id,
          graphqlId: product.id,
          title: product.title,
          handle: product.handle,
          tags: product.tags || [],
          variants: variant ? [{ id: variant.legacyResourceId || variant.id, graphqlId: variant.id }] : []
        }
      : null
  }
};
```

## Node 12: Code: buildPayload

- Type: `n8n-nodes-base.code`
- Name: `Code: buildPayload`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Paste sync/build-shopify-payload.js above this line.
const parsed = {
  ...$json.parsed,
  existingProduct: $json.existingProduct,
  existingTags: $json.existingProduct?.tags || []
};
const payload = buildPayload(parsed);

return {
  json: {
    ...$json,
    payload,
    productId: payload.product.id || null
  }
};
```

## Node 13: IF: Existing Product?

- Type: `n8n-nodes-base.if`
- Name: `IF: Existing Product?`
- Settings:
  - Conditions:
    - Value 1: `={{$json.productId}}`
    - Operation: `Is Not Empty`

## Node 14: Shopify Admin REST: Update Product

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin REST: Update Product`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `PUT`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'calapres.myshopify.com'}}/admin/api/2025-01/products/{{$json.productId}}.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body: `={{$json.payload}}`

## Node 15: Shopify Admin REST: Create Product

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin REST: Create Product`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `POST`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'calapres.myshopify.com'}}/admin/api/2025-01/products.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body: `={{$json.payload}}`

## Node 16: Shopify Admin GraphQL: List Imported Products

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin GraphQL: List Imported Products`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `POST`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'calapres.myshopify.com'}}/admin/api/2025-01/graphql.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body:

```json
{
  "query": "query ImportedProducts { products(first: 250, query: \"tag:imported-nader-dior OR tag:مستورد-نوادر-ديور\") { nodes { id legacyResourceId title tags status metafield(namespace: \"supplier\", key: \"source_url\") { value } variants(first: 1) { nodes { id legacyResourceId } } } } }"
}
```

If more than 250 imported products exist, duplicate this node with cursor pagination before production launch.

## Node 17: Code: Find Missing Supplier Products

- Type: `n8n-nodes-base.code`
- Name: `Code: Find Missing Supplier Products`
- Mode: `Run Once for All Items`
- JavaScript:

```js
const crawlItems = $items('Crawl Supplier URLs');
const seenUrls = {};
for (const item of crawlItems) seenUrls[item.json.sourceUrl] = true;

const imported = $items('Shopify Admin GraphQL: List Imported Products')[0]?.json?.data?.products?.nodes || [];
const missing = imported.filter((product) => {
  const sourceUrl = product.metafield?.value;
  return sourceUrl && !seenUrls[sourceUrl];
});

return missing.map((product) => ({
  json: {
    parsed: {
      sourceUrl: product.metafield.value,
      supplierPrice: null,
      supplierCompareAtPrice: null,
      availability: 'missing'
    },
    existingProduct: {
      id: product.legacyResourceId || product.id,
      graphqlId: product.id,
      title: product.title,
      tags: product.tags || [],
      variants: (product.variants?.nodes || []).map((variant) => ({
        id: variant.legacyResourceId || variant.id,
        graphqlId: variant.id
      }))
    }
  }
}));
```

## Node 18: Split Missing Products

- Type: `n8n-nodes-base.splitInBatches`
- Name: `Split Missing Products`
- Settings:
  - Batch Size: `1`

## Node 19: Wait: Missing Rate Limit

- Type: `n8n-nodes-base.wait`
- Name: `Wait: Missing Rate Limit`
- Settings:
  - Resume: `After Time Interval`
  - Amount: `1`
  - Unit: `Seconds`

## Node 20: Code: buildPayload Missing

- Type: `n8n-nodes-base.code`
- Name: `Code: buildPayload Missing`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Paste sync/build-shopify-payload.js above this line.
const payload = buildPayload({
  ...$json.parsed,
  existingProduct: $json.existingProduct,
  existingTags: $json.existingProduct.tags || ['imported-nader-dior']
});
return {
  json: {
    ...$json,
    payload,
    productId: payload.product.id
  }
};
```

## Node 21: Shopify Admin REST: Mark Missing Out Of Stock

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin REST: Mark Missing Out Of Stock`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `PUT`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'calapres.myshopify.com'}}/admin/api/2025-01/products/{{$json.productId}}.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body: `={{$json.payload}}`
