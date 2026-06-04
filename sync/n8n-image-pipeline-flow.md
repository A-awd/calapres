# n8n Image Pipeline Workflows

Three automated workflows for generating all Calapres visuals via Higgsfield.
No manual approval. Quality enforced by automated gate + auto-retry.

Supabase is the data hub. n8n reads briefs, calls Higgsfield, checks quality, writes results.

---

## Shared Design Principles

- **Bottle geometry locked**: every Higgsfield call includes `reference_images[0].role = "product_reference"` pointing at the supplier photo. This binds bottle shape to reality.
- **Auto-retry up to 3×**: on API failure or empty response, the job retries with a slightly adjusted prompt. After 3 failures the job enters `needs_review` state and the pipeline moves on.
- **No delete policy**: failed jobs are never deleted from `image_generation_jobs`. Full audit trail.
- **Enriched guard applies here too**: once a product has `product_image_status = done` in `creative_briefs`, the pipeline skips it unless the field is reset manually.

Credentials:
- Shopify OAuth2: `QLsvwO73GFsQfy0w`
- Higgsfield Header Auth: `G31rYKMmDk8hyh2G`
- Supabase service key: stored in n8n credential `Supabase Calapres` (Header Auth, `Authorization: Bearer <SERVICE_KEY>`)

n8n environment variables needed:
- `SHOPIFY_STORE_DOMAIN`: `unywbe-ub.myshopify.com`
- `SUPABASE_URL`: `https://vozaayivzggkpazehdxr.supabase.co`
- `SUPABASE_SERVICE_KEY`: (Supabase service_role key — never anon key)

---

## Workflow 1: Product Image Pipeline

Runs daily at 03:00 Riyadh time. Picks up all products whose `product_image_status = pending`.
Generates 4 shots per product (hero + 3 angles) and uploads to Shopify.

### Connections

1. `Schedule Trigger` → `Supabase: Fetch Brand Style`
2. `Supabase: Fetch Brand Style` → `Supabase: Fetch Pending Briefs`
3. `Supabase: Fetch Pending Briefs` → `Code: Filter Pending`
4. `Code: Filter Pending` → `Split Briefs`
5. `Split Briefs` → `Supabase: Mark Generating`
6. `Supabase: Mark Generating` → `Higgsfield: Hero Shot`
7. `Higgsfield: Hero Shot` → `Higgsfield: Angle RTQ`
8. `Higgsfield: Angle RTQ` → `Higgsfield: Angle Detail`
9. `Higgsfield: Angle Detail` → `Higgsfield: Angle Shelf`
10. `Higgsfield: Angle Shelf` → `Code: Run Quality Gate`
11. `Code: Run Quality Gate` → `IF: All Passed?`
12. `IF: All Passed? (true)` → `Shopify: Upload Hero Image`
13. `Shopify: Upload Hero Image` → `Shopify: Upload Gallery Images`
14. `Shopify: Upload Gallery Images` → `Supabase: Log Assets`
15. `Supabase: Log Assets` → `Supabase: Mark Done`
16. `IF: All Passed? (false)` → `IF: Max Retries?`
17. `IF: Max Retries? (false)` → `Supabase: Increment Retry` → `Split Briefs` (loop)
18. `IF: Max Retries? (true)` → `Supabase: Mark Needs Review`
19. `Supabase: Mark Done` → `Split Briefs` (continue batch)
20. `Supabase: Mark Needs Review` → `Split Briefs` (continue batch)

---

### Node 1: Schedule Trigger

- Type: `n8n-nodes-base.scheduleTrigger`
- Name: `Schedule Trigger`
- Settings:
  - Trigger Interval: `Days`
  - Days Between Triggers: `1`
  - Trigger At Hour: `3`
  - Timezone: `Asia/Riyadh`

---

### Node 2: Supabase: Fetch Brand Style

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Fetch Brand Style`
- Credentials: `Supabase Calapres` (Header Auth with `Authorization: Bearer <SERVICE_KEY>` and `apikey: <SERVICE_KEY>`)
- Settings:
  - Method: `GET`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/brand_style_config?is_active=eq.true&limit=1`
  - Headers:
    - `Content-Type`: `application/json`
    - `Prefer`: `return=representation`
  - Response Format: `JSON`

---

### Node 3: Supabase: Fetch Pending Briefs

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Fetch Pending Briefs`
- Credentials: `Supabase Calapres`
- Settings:
  - Method: `GET`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/creative_briefs?needs_product_images=eq.true&product_image_status=eq.pending&limit=50`
  - Response Format: `JSON`

---

### Node 4: Code: Filter Pending

- Type: `n8n-nodes-base.code`
- Name: `Code: Filter Pending`
- Mode: `Run Once for All Items`

```js
const brandStyleArr = $node['Supabase: Fetch Brand Style'].json;
const briefs = Array.isArray($json) ? $json : ($json.data || []);
const brandStyle = Array.isArray(brandStyleArr)
  ? brandStyleArr[0]
  : (brandStyleArr && brandStyleArr[0]) || brandStyleArr;

return briefs
  .filter(b => b.product_image_status === 'pending' && b.needs_product_images)
  .map(brief => ({
    json: { brief, brandStyle }
  }));
```

---

### Node 5: Split Briefs

- Type: `n8n-nodes-base.splitInBatches`
- Name: `Split Briefs`
- Settings:
  - Batch Size: `1`

---

### Node 6: Supabase: Mark Generating

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Mark Generating`
- Credentials: `Supabase Calapres`
- Settings:
  - Method: `PATCH`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/creative_briefs?id=eq.{{$json.brief.id}}`
  - Body: `{"product_image_status":"generating"}`
  - Response Format: `JSON`

---

### Node 7: Higgsfield: Hero Shot

- Type: `n8n-nodes-base.httpRequest`
- Name: `Higgsfield: Hero Shot`
- Credentials: `Higgsfield API ( awd-n8n )` (Header Auth, id `G31rYKMmDk8hyh2G`)
- Settings:
  - Method: `POST`
  - URL: `https://api.higgsfield.ai/v1/images/generations`
  - Body Content Type: `JSON`
  - JSON Body:

```json
{
  "model": "higgsfield-soul",
  "prompt": "={{$json.brandStyle.base_prompt_fragment}} Product: {{$json.brief.product_title}}. Brand: {{$json.brief.brand_name}}. {{$json.brief.concentration ? 'Concentration: ' + $json.brief.concentration + '.' : ''}} {{$json.brief.bottle_shape_notes || ''}} Hero angle, product perfectly centered, polished marble surface, photorealistic, main ecommerce shot.",
  "negative_prompt": "={{$json.brandStyle.negative_prompt}}",
  "aspect_ratio": "1:1",
  "resolution": "2048x2048",
  "num_outputs": 1,
  "output_format": "jpeg",
  "reference_images": [
    {
      "url": "={{$json.brief.reference_image_url}}",
      "role": "product_reference",
      "image_weight": "={{$json.brandStyle.reference_image_weight || 0.85}}"
    }
  ],
  "metadata": {
    "job_type": "product_hero",
    "brief_id": "={{$json.brief.id}}",
    "shopify_product_id": "={{$json.brief.shopify_product_id}}"
  }
}
```

> Note: Only include `reference_images` array when `$json.brief.reference_image_url` is a valid https URL. Add an IF node before this if briefs without reference images are possible.

---

### Nodes 8–10: Higgsfield: Angle RTQ / Angle Detail / Angle Shelf

Same structure as Node 7. Change only `prompt` suffix and `job_type` in metadata:

**Angle RTQ** (`product_angle_rtq`):
```
Three-quarter angle, subtle oud-inspired warm amber styling, gallery shot.
```

**Angle Detail** (`product_angle_detail`):
```
Close macro detail angle emphasizing cap, bottle silhouette, and premium glass materials.
```

**Angle Shelf** (`product_angle_shelf`):
```
Shelf-ready ecommerce angle, clean background, luxury contrast, slight left elevation.
```

---

### Node 11: Code: Run Quality Gate

- Type: `n8n-nodes-base.code`
- Name: `Code: Run Quality Gate`
- Mode: `Run Once for Each Item`

```js
// Generated source: sync/n8n-build/image-pipeline-quality.generated.js

function normalizeImages(response) {
  if (!response) return [];
  const raw = response.images || response.data || response.outputs || [];
  return raw
    .map(item => (typeof item === 'string' ? item : item && (item.url || item.src || item.uri)))
    .filter(url => typeof url === 'string' && url.startsWith('https://'));
}

function runQualityChecks(response, context) {
  const checks = {};
  const issues = [];
  const apiOk = response && !response.error;
  checks.api_ok = apiOk;
  if (!apiOk) issues.push('API error: ' + (response && response.error || 'no response'));
  const images = normalizeImages(response);
  checks.has_images = images.length > 0;
  if (!checks.has_images) issues.push('No images returned');
  const validUrls = images.filter(url => { try { new URL(url); return true; } catch { return false; } });
  checks.urls_valid = validUrls.length > 0;
  if (!checks.urls_valid) issues.push('No valid image URLs');
  checks.reference_used = !!(context && context.referenceImageUrl);
  const score = (checks.api_ok ? 40 : 0) + (checks.has_images ? 30 : 0) + (checks.urls_valid ? 20 : 0) + (checks.reference_used ? 10 : 0);
  return { passed: issues.length === 0, score, checks, issues, images: validUrls, bestImageUrl: validUrls[0] || null };
}

const brief = $node['Split Briefs'].json.brief;
const brandStyle = $node['Split Briefs'].json.brandStyle;
const heroResp   = $node['Higgsfield: Hero Shot'].json;
const rtqResp    = $node['Higgsfield: Angle RTQ'].json;
const detailResp = $node['Higgsfield: Angle Detail'].json;
const shelfResp  = $node['Higgsfield: Angle Shelf'].json;
const ctx = { referenceImageUrl: brief.reference_image_url };

const heroGate   = runQualityChecks(heroResp, ctx);
const rtqGate    = runQualityChecks(rtqResp, ctx);
const detailGate = runQualityChecks(detailResp, ctx);
const shelfGate  = runQualityChecks(shelfResp, ctx);

const allPassed = heroGate.passed && rtqGate.passed && detailGate.passed && shelfGate.passed;

return [{
  json: {
    brief,
    brandStyle,
    allPassed,
    retryCount: brief.product_image_retry_count || 0,
    heroImage:   heroGate.bestImageUrl,
    galleryImages: [rtqGate.bestImageUrl, detailGate.bestImageUrl, shelfGate.bestImageUrl].filter(Boolean),
    qualityChecks: { hero: heroGate.checks, rtq: rtqGate.checks, detail: detailGate.checks, shelf: shelfGate.checks },
    qualityIssues: [...heroGate.issues, ...rtqGate.issues, ...detailGate.issues, ...shelfGate.issues],
  }
}];
```

---

### Node 12: IF: All Passed?

- Type: `n8n-nodes-base.if`
- Name: `IF: All Passed?`
- Condition: `={{$json.allPassed}}` is `true`

---

### Node 13: Shopify: Upload Hero Image

Adds the hero image as the product's main image.

- Type: `n8n-nodes-base.httpRequest`
- Name: `Shopify: Upload Hero Image`
- Credentials: `Shopify-Calapres` (OAuth2 `QLsvwO73GFsQfy0w`)
- Settings:
  - Method: `POST`
  - URL: `=https://{{$env.SHOPIFY_STORE_DOMAIN}}/admin/api/2026-04/products/{{$json.brief.shopify_product_id}}/images.json`
  - Body:

```json
{
  "image": {
    "src": "={{$json.heroImage}}",
    "alt": "={{$json.brief.product_title + ' - كالابريز'}}",
    "position": 1
  }
}
```

---

### Node 14: Shopify: Upload Gallery Images

Uses a Code node to loop over galleryImages and send one REST call per image.

- Type: `n8n-nodes-base.code`
- Name: `Shopify: Upload Gallery Images`
- Mode: `Run Once for Each Item`

```js
// Fire parallel REST calls for gallery images (positions 2-4)
const productId = $json.brief.shopify_product_id;
const gallery = $json.galleryImages || [];
const domain = $env.SHOPIFY_STORE_DOMAIN || 'unywbe-ub.myshopify.com';
const uploaded = [];

for (let i = 0; i < gallery.length; i++) {
  const url = gallery[i];
  if (!url) continue;
  // n8n Code nodes cannot do async fetch — return job data for next HTTP node
  uploaded.push({ src: url, position: i + 2, alt: $json.brief.product_title });
}

return [{ json: { ...$json, galleryUploads: uploaded } }];
```

> **Implementation note**: For multi-image upload, use a SplitInBatches + HTTP Request pattern on the `galleryImages` array, each calling `POST /products/{id}/images.json`. The Code node above is a data-prep step.

---

### Node 15: Supabase: Log Assets

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Log Assets`
- Credentials: `Supabase Calapres`
- Settings:
  - Method: `POST`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/generated_assets`
  - Headers: `Prefer: return=minimal`
  - Body (array — one entry per image):

```json
[
  {
    "asset_type": "product_hero",
    "entity_type": "product",
    "shopify_entity_id": "={{$json.brief.shopify_product_id}}",
    "cdn_url": "={{$json.heroImage}}",
    "is_active": true
  }
]
```

---

### Node 16: Supabase: Mark Done

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Mark Done`
- Credentials: `Supabase Calapres`
- Settings:
  - Method: `PATCH`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/creative_briefs?id=eq.{{$json.brief.id}}`
  - Body: `{"product_image_status":"done","needs_product_images":false}`

---

### Node 17: IF: Max Retries?

- Type: `n8n-nodes-base.if`
- Name: `IF: Max Retries?`
- Condition: `={{$json.retryCount >= 3}}`

---

### Node 18: Supabase: Increment Retry

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Increment Retry`
- Credentials: `Supabase Calapres`
- Settings:
  - Method: `PATCH`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/creative_briefs?id=eq.{{$json.brief.id}}`
  - Body: `={"product_image_retry_count":{{$json.retryCount + 1}},"product_image_status":"pending"}`

After this node, reconnect to `Split Briefs` to pick up the same brief again in the next batch cycle. Because the workflow runs daily, the retry happens on the next day's run.

---

### Node 19: Supabase: Mark Needs Review

- Type: `n8n-nodes-base.httpRequest`
- Name: `Supabase: Mark Needs Review`
- Credentials: `Supabase Calapres`
- Settings:
  - Method: `PATCH`
  - URL: `={{$env.SUPABASE_URL}}/rest/v1/creative_briefs?id=eq.{{$json.brief.id}}`
  - Body: `{"product_image_status":"needs_review"}`

Pipeline continues to next brief — this does NOT block the run.

---

## Workflow 2: Collection Banner Pipeline

Runs weekly Sunday 03:00 Riyadh time. Generates desktop + mobile banners per collection.

### Connections

1. `Schedule Trigger (Weekly)` → `Supabase: Fetch Brand Style`
2. `Supabase: Fetch Brand Style` → `Supabase: Fetch Pending Collections`
3. `Supabase: Fetch Pending Collections` → `Split Collections`
4. `Split Collections` → `Supabase: Fetch Featured Products`
5. `Supabase: Fetch Featured Products` → `Code: Build Collection Prompts`
6. `Code: Build Collection Prompts` → `Higgsfield: Desktop Banner`
7. `Higgsfield: Desktop Banner` → `Higgsfield: Mobile Banner`
8. `Higgsfield: Mobile Banner` → `Code: Quality Gate Collection`
9. `Code: Quality Gate Collection` → `IF: Collection Passed?`
10. `IF: Collection Passed? (true)` → `Shopify GraphQL: Set Collection Image`
11. `Shopify GraphQL: Set Collection Image` → `Supabase: Mark Collection Done`
12. `IF: Collection Passed? (false)` → `Supabase: Mark Collection Needs Review`

### Node: Supabase: Fetch Pending Collections

```
GET /rest/v1/collection_briefs?banner_status=eq.pending&limit=20
```

### Node: Code: Build Collection Prompts

```js
const collection = $json;
const brandStyle = $node['Supabase: Fetch Brand Style'].json[0];
const themes = {
  oud: 'Deep oriental oud collection, dark amber incense smoke trails, rich mahogany tones.',
  oriental: 'Oriental spice collection, warm saffron and amber tones, luxurious depth.',
  floral: 'Floral perfume collection, delicate blooms, soft pastel luxury.',
  luxury: 'Luxury designer brand collection, iconic bottles, premium presentation.',
  niche: 'Niche international fragrance collection, artisan bottles, collector presentation.',
};
const themeDesc = collection.mood_override || themes[collection.collection_theme] || 'Premium fragrance collection.';
const basePrompt = brandStyle.base_prompt_fragment + ' ' + themeDesc;

return [{ json: { collection, brandStyle, desktopPrompt: basePrompt + ' Wide cinematic banner, horizontal composition.', mobilePrompt: basePrompt + ' Vertical story-ready composition, elegant stacked arrangement.' } }];
```

### Node: Higgsfield: Desktop Banner

```json
{
  "model": "higgsfield-soul",
  "prompt": "={{$json.desktopPrompt}}",
  "negative_prompt": "={{$json.brandStyle.negative_prompt}}",
  "aspect_ratio": "16:9",
  "resolution": "2048x1152",
  "num_outputs": 1,
  "output_format": "jpeg"
}
```

### Node: Shopify GraphQL: Set Collection Image

```graphql
mutation collectionUpdate($input: CollectionInput!) {
  collectionUpdate(input: $input) {
    collection { id title image { url } }
    userErrors { field message }
  }
}
```

Variables:
```json
{
  "input": {
    "id": "gid://shopify/Collection/={{$json.collection.shopify_collection_id}}",
    "image": { "src": "={{$json.desktopBannerUrl}}" }
  }
}
```

---

## Workflow 3: Ad Creative Pipeline

Runs weekly Monday 03:00 Riyadh time. Generates 3 ad formats per product flagged for ads.
Images stored in Supabase Storage (not Shopify) for Meta Ads use.

### Connections

1. `Schedule Trigger (Weekly Mon)` → `Supabase: Fetch Brand Style`
2. `Supabase: Fetch Brand Style` → `Supabase: Fetch Ad-Pending Briefs`
3. `Supabase: Fetch Ad-Pending Briefs` → `Split Ad Briefs`
4. `Split Ad Briefs` → `Higgsfield: Ad Square`
5. `Higgsfield: Ad Square` → `Higgsfield: Ad Story`
6. `Higgsfield: Ad Story` → `Higgsfield: Ad Landscape`
7. `Higgsfield: Ad Landscape` → `Code: Quality Gate Ads`
8. `Code: Quality Gate Ads` → `IF: Ads Passed?`
9. `IF: Ads Passed? (true)` → `Supabase Storage: Upload Ads`
10. `Supabase Storage: Upload Ads` → `Supabase: Log Ad Assets`
11. `Supabase: Log Ad Assets` → `Supabase: Mark Ad Done`
12. `IF: Ads Passed? (false)` → `Supabase: Mark Ad Needs Review`

### Node: Supabase Storage: Upload Ads

- Type: `n8n-nodes-base.httpRequest`
- Method: `POST`
- URL: `={{$env.SUPABASE_URL}}/storage/v1/object/ad-creatives/{{$json.brief.shopify_product_id}}/square.jpg`
- Headers:
  - `Authorization`: `Bearer {{$env.SUPABASE_SERVICE_KEY}}`
  - `Content-Type`: `image/jpeg`
- Body: `=` (image binary from Higgsfield URL — use a prior HTTP GET to fetch the binary)

> **Pattern**: Fetch image binary first with `HTTP GET {{higgsfieldUrl}}`, then POST binary to Supabase Storage.

---

## Supabase Storage Bucket Setup

Create one storage bucket for ad creatives:

```sql
insert into storage.buckets (id, name, public) values ('ad-creatives', 'ad-creatives', false);
```

Public access is off — images are delivered via signed URLs to Meta Ads manager.

---

## n8n Variables Required

| Variable | Value |
|----------|-------|
| `SHOPIFY_STORE_DOMAIN` | `unywbe-ub.myshopify.com` |
| `SUPABASE_URL` | `https://vozaayivzggkpazehdxr.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `<service_role key from Supabase dashboard>` |
| `HIGGSFIELD_IMAGE_MODEL` | `higgsfield-soul` |
| `SHOPIFY_REQUEST_DELAY_SECONDS` | `1` |

---

## Seeding creative_briefs from Shopify

After syncing products with the existing enrichment workflow, backfill `creative_briefs` rows by running this SQL once in Supabase Studio:

```sql
-- Pull enriched products from the products table or via a one-time n8n trigger
-- that queries Shopify for all enriched products and inserts into creative_briefs.
-- The n8n trigger calls:
-- GET /admin/api/2026-04/products.json?tag=enriched&fields=id,title,vendor,tags,images
-- Then inserts one row per product into creative_briefs with:
--   shopify_product_id = product.id
--   product_title = product.title
--   brand_name = product.vendor
--   reference_image_url = product.images[0].src (original supplier image)
--   needs_product_images = true
--   product_image_status = 'pending'
```

This one-time seed workflow lives in a separate manual n8n workflow: `Seed Creative Briefs`.
