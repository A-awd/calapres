# n8n One-Time Enrichment Flow

This workflow upgrades newly imported products into the protected luxury presentation layer. After enrichment, the product receives the `enriched` tag; recurring sync then updates only price and availability.

Live status: storefront is open on `unywbe-ub.myshopify.com`, the recurring sync workflow is built and has run live successfully, and new imported products land as `draft` before enrichment/review.

API version note: documented standard is Admin API `2026-04`. The deployed live n8n flow currently uses `2025-01` and works; use `2026-04` for newly built or rebuilt nodes.

Generated artifact note: Claude deploys enrichment Code nodes from `sync/n8n-build/enrich-prompt.generated.js`, `sync/n8n-build/enrich-seo.generated.js`, and `sync/n8n-build/enrich-payload.generated.js`. These are generated from `sync/enrich/` and are authoritative.

Credentials:

- Shopify-Calapres OAuth2 credential: `QLsvwO73GFsQfy0w`
- Higgsfield Header Auth credential: `Higgsfield API ( awd-n8n )`, id `G31rYKMmDk8hyh2G`

## Connections

1. `Manual Trigger` or `Schedule Trigger` -> `Shopify Admin GraphQL: Find Unenriched Imports`
2. `Shopify Admin GraphQL: Find Unenriched Imports` -> `Code: Keep Products Without enriched`
3. `Code: Keep Products Without enriched` -> `Split Products`
4. `Split Products` -> `HTTP Request: Higgsfield Generate Images`
5. `HTTP Request: Higgsfield Generate Images` -> `Code: Build Arabic SEO`
6. `Code: Build Arabic SEO` -> `Code: Build Enriched Payload`
7. `Code: Build Enriched Payload` -> `Shopify Admin REST: Update Enriched Product`
8. `Shopify Admin REST: Update Enriched Product` -> `Split Products` continue

## Node 1: Manual Trigger

- Type: `n8n-nodes-base.manualTrigger`
- Name: `Manual Trigger`
- Use this for first launch and QA.

Optional recurring alternative:

- Type: `n8n-nodes-base.scheduleTrigger`
- Name: `Schedule Trigger`
- Settings:
  - Trigger Interval: `Days`
  - Days Between Triggers: `1`
  - Timezone: `Asia/Riyadh`

## Node 2: Shopify Admin GraphQL: Find Unenriched Imports

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin GraphQL: Find Unenriched Imports`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `POST`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'unywbe-ub.myshopify.com'}}/admin/api/2026-04/graphql.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body:

```json
{
  "query": "query ImportedProductsForEnrichment { products(first: 100, query: \"(tag:imported-nader-dior OR tag:مستورد-نوادر-ديور) -tag:enriched\") { nodes { id legacyResourceId title handle vendor tags descriptionHtml onlineStoreUrl metafield(namespace: \"supplier\", key: \"source_url\") { value } featuredImage { url altText } images(first: 5) { nodes { url altText } } variants(first: 1) { nodes { id legacyResourceId price compareAtPrice } } } } }"
}
```

If more than 100 products need enrichment, add cursor pagination before scaling the live workflow beyond the first page.

## Node 3: Code: Keep Products Without enriched

- Type: `n8n-nodes-base.code`
- Name: `Code: Keep Products Without enriched`
- Mode: `Run Once for All Items`
- JavaScript:

```js
const products = $json.data?.products?.nodes || [];
return products
  .filter((product) => !(product.tags || []).map((tag) => tag.toLowerCase()).includes('enriched'))
  .map((product) => ({
    json: {
      product,
      sourceUrl: product.metafield?.value || '',
      baseImageUrl: product.featuredImage?.url || product.images?.nodes?.[0]?.url || '',
      productId: product.legacyResourceId || product.id,
      variantId: product.variants?.nodes?.[0]?.legacyResourceId || product.variants?.nodes?.[0]?.id || ''
    }
  }));
```

## Node 4: Split Products

- Type: `n8n-nodes-base.splitInBatches`
- Name: `Split Products`
- Settings:
  - Batch Size: `1`

## Node 5: HTTP Request: Higgsfield Generate Images

- Type: `n8n-nodes-base.httpRequest`
- Name: `HTTP Request: Higgsfield Generate Images`
- Credentials:
  - Authentication: `Generic Credential Type`
  - Credential Type: `Header Auth`
  - Credential Name: `Higgsfield API ( awd-n8n )`
  - Credential ID: `G31rYKMmDk8hyh2G`
- Settings:
  - Method: `POST`
  - URL: `https://api.higgsfield.ai/v1/images/generations`
  - Response Format: `JSON`
  - Send Headers: `true`
  - Headers:
    - `Content-Type`: `application/json`
    - `Accept`: `application/json`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body:

```json
{
  "model": "higgsfield-soul",
  "prompt": "=Luxury ecommerce hero photography for {{$json.product.title}} by {{$json.product.vendor || 'Calapres'}}. Elegant Saudi premium perfume boutique style, ivory marble, warm champagne light, refined shadows, no text, no logos, no people, product centered, high-end fragrance campaign, photorealistic.",
  "negative_prompt": "low quality, blurry, distorted bottle, extra labels, fake text, watermark, hands, faces, clutter",
  "aspect_ratio": "1:1",
  "resolution": "2048x2048",
  "num_outputs": 4,
  "output_format": "jpeg",
  "reference_images": [
    {
      "url": "={{$json.baseImageUrl}}",
      "role": "product_reference"
    }
  ],
  "metadata": {
    "source": "calapres-n8n-enrichment",
    "shopify_product_id": "={{$json.productId}}",
    "supplier_source_url": "={{$json.sourceUrl}}"
  }
}
```

Expected response shape from this node:

```json
{
  "images": [
    { "url": "https://..." },
    { "url": "https://..." }
  ]
}
```

If the Higgsfield account returns a different wrapper, map it in the next Code node; keep the request shape above as the workflow contract.

## Node 6: Code: Build Arabic SEO

- Type: `n8n-nodes-base.code`
- Name: `Code: Build Arabic SEO`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Generated source: sync/n8n-build/enrich-seo.generated.js
const seo = buildArabicSeo($json.product || $node['Split Products'].json.product);

return {
  json: {
    ...$json,
    arabicSeo: seo
  }
};
```

## Node 7: Code: Build Enriched Payload

- Type: `n8n-nodes-base.code`
- Name: `Code: Build Enriched Payload`
- Mode: `Run Once for Each Item`
- JavaScript:

```js
// Generated source: sync/n8n-build/enrich-payload.generated.js
const payload = buildEnrichPayload({
  product: $node['Split Products'].json.product,
  generatedImages: $json.images || $json.data?.images || $json.outputs,
  productId: $node['Split Products'].json.productId
});

return { json: { ...$json, payload, productId: payload.product.id } };
```

## Node 8: Shopify Admin REST: Update Enriched Product

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify Admin REST: Update Enriched Product`
- Credentials:
  - Authentication: `Predefined Credential Type`
  - Credential Type: `Shopify OAuth2 API`
  - Credential ID: `QLsvwO73GFsQfy0w`
- Settings:
  - Method: `PUT`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN || 'unywbe-ub.myshopify.com'}}/admin/api/2026-04/products/{{$json.productId}}.json`
  - Response Format: `JSON`
  - Send Body: `true`
  - Body Content Type: `JSON`
  - JSON Body: `={{$json.payload}}`
