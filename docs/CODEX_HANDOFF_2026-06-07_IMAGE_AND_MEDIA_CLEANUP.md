# Codex Handoff: Image Pipeline and Product Media Cleanup

Date: 2026-06-07
Branch: `codex/image-and-media-cleanup`
Live workflow for later wiring: `3IpySHSnlUzOmFVh`

## Boundary

Codex authored offline code and SQL only. Codex did not create, edit, activate, or run any n8n workflow. Codex did not touch Shopify. Codex did not write to Supabase, run migrations, or execute the product_media cleanup SQL. `PROJECT_STATE.md`, `WORKBOARD.md`, and `HANDOFFS.md` were not edited.

## Existing Bundle Gaps Found

- `image-pipeline-brief.generated.js` used a generic luxury prompt and model inherited from config, not the approved Warm Light Luxury identity.
- The prompt layer allowed dark visual language in adjacent image types and did not enforce the absolute no-dark/no-black rule.
- Reference image input was a loose `referenceImageUrl`, not selected from `product_media` where `source='supplier'`.
- Output count was one, not best-of-four.
- `image-pipeline-quality.generated.js` only checked API success, URL presence, URL shape, and reference presence.
- Quality output did not check dimensions/aspect/resolution, did not choose best-of-4, and did not map cleanly to `image_generation_jobs` and `generated_assets`.

## Updated Code Nodes

### Code: Build Higgsfield Request (Image Pipeline)

File: `sync/n8n-build/image-pipeline-brief.generated.js`
Mode: `runOnceForEachItem`

Accepted input:

- `imageGenerationJob` or `job`
- `fragranceProduct`, `fragrance_product`, `fragrance`, `supabaseProduct`, or `product`
- `productMediaRows`, `product_media`, `media`, or `productMedia`

Important input fields:

- Job: `id`, `job_type`, `fragrance_product_id`, optional `aspect_ratio`, `resolution`, `prompt_suffix`
- Fragrance/product: `id`, `brand_name`, `brand_name_en`, `name_en`, `name_ar`, `normalized_name`, `concentration`, `size_ml`, `gender_target`
- Media rows: `id`, `source`, `original_url`, optional `url`, `public_url`, `storage_url`, `position`

Reference selection:

- Selects the first valid HTTPS `product_media` row where `source='supplier'`, ordered by `position` then `id`.
- Emits `skipImageGeneration=true` and `imagePipelineStatus='needs_supplier_reference_image'` when no supplier reference exists.

Higgsfield request output:

- `higgsfieldRequest.model = "nano_banana_pro"`
- `higgsfieldRequest.count = 4`
- `higgsfieldRequest.n = 4`
- `higgsfieldRequest.prompt`
- `higgsfieldRequest.negative_prompt`
- `higgsfieldRequest.aspect_ratio`
- `higgsfieldRequest.resolution`
- `higgsfieldRequest.reference_images[0].source = "product_media"`
- `higgsfieldRequest.reference_images[0].role = "product_shape_reference"`
- `higgsfieldRequest.reference_images[0].weight = 0.92`
- `productMediaReference`
- `brief`
- `warmLightLuxury`

Visual identity:

- Name: Warm Light Luxury
- Palette: ivory, champagne, soft beige
- Accents: gold and amber
- Lighting: soft warm editorial studio light
- Style: editorial photorealistic product photography
- Absolute rule: never dark or black theme

### Code: Run Quality Gate (Image Pipeline)

File: `sync/n8n-build/image-pipeline-quality.generated.js`
Mode: `runOnceForEachItem`

Accepted input:

- `higgsfieldResponse`, `response`, or raw response object
- `higgsfieldRequest`
- `brief`
- `imageGenerationJob` or `job`

Expected Higgsfield image item fields:

- `url` or `src` or `uri` or `image_url`
- `width`/`height`, `w`/`h`, or `metadata.width`/`metadata.height`
- optional `status`, `state`, `error`, or `failed`

Concrete checks:

- API success
- images present
- HTTPS URL validity
- reference image present
- at least 4 outputs
- failed/rejected outputs are rejected individually
- dimensions present
- aspect ratio within 0.04 tolerance
- resolution at least 75% of requested resolution on both axes

Outputs:

- `qualityResult`
- `bestOfFour`
- `nextImageAction`: `publish`, `retry`, or `needs_review`
- `imageGenerationJobPatch`
- `generatedAssetsRows`

`imageGenerationJobPatch` fields:

- `id`
- `quality_status`
- `quality_score`
- `best_image_url`
- `status`
- `error_message`

`generatedAssetsRows` fields:

- `image_generation_job_id`
- `fragrance_product_id`
- `source = "higgsfield"`
- `asset_type = "product_image"`
- `original_url`
- `best_image_url`
- `quality_status`
- `quality_score`
- `is_selected`
- `sort_order`
- `raw_payload`

## Product Media Dedup SQL

File: `sync/product_media_dedup_review.sql`

Use only when live writes to `product_media` are stopped.

Run order for live agent:

1. Run the first dry-run SELECT only.
2. Review `rows_would_remove`, `products_affected`, and `duplicate_groups`.
3. Run the review-detail SELECT to inspect exact duplicate ids and keeper ids.
4. If approved, run the transaction block.
5. Leave the final `ROLLBACK` in place for the first execution review.
6. Replace `ROLLBACK` with `COMMIT` only when the returned rows match the reviewed duplicate set.

The script keeps the lowest `id` per `(supplier_product_id, original_url)` group and removes only rows with `duplicate_rank > 1`. It ignores null supplier/product URL groups and never touches non-duplicates.

## Validation

Local command:

```bash
PATH=/usr/bin:/bin:/usr/local/bin /usr/local/bin/node sync/test-image-media-cleanup.cjs
```

Expected output:

```json
{
  "fixtures": 3,
  "warm_light_request": "passed",
  "quality_best_of_4": "passed",
  "best_image_url": "https://cdn.example.test/best.png",
  "generated_assets_rows": 4
}
```

The product_media dry-run projected row count was not executed by Codex because the cleanup must be run later by the live agent after tables are cold.
