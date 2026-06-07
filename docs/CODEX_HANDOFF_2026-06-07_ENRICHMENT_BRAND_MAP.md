# Codex Handoff: Offline Enrichment Brand Map

Date: 2026-06-07
Branch: `codex/enrichment-brand-map`
Live workflow for later wiring: `vNnk9ivt8HqCOZfu`

## Boundary

Codex built code-only artifacts. Codex did not create, edit, activate, or run any n8n workflow. Codex did not touch Shopify. Codex did not write to Supabase or run migrations. `PROJECT_STATE.md`, `WORKBOARD.md`, and `HANDOFFS.md` were not edited.

Supabase read access was not used. Offline tests use bounded fixtures from real Nawadir Dior supplier sitemap product titles.

## New Code Nodes

### Code: Resolve Brand + Parent Name (Offline Enrichment)

File: `sync/n8n-build/brand-normalize.generated.js`
Mode: `runOnceForEachItem`
External imports: none

Input fields accepted:

- `title`, `name`, `product_title_ar`, or `product_title_en`
- `brand`, `brand_name`, or `vendor`
- optional `concentration`, `size`, `size_ml`, `sizeMl`, `gender`, `gender_target`, `is_tester`, `is_gift_set`

Important behavior:

- If `brand`, `brand_name`, or `vendor` equals the store name `متجر نوادر ديور` / `نوادر ديور` / `nawadir dior`, it is ignored.
- The real canonical brand is extracted from the product title.
- The output brand record is shaped for the existing brands-table resolver by canonical names, not by arbitrary scraped vendor text.

Output fields:

- `brand_name`, `brand_name_en`, `brand_name_ar`, `brand_slug`
- `brand_lookup.rpc = "calapres_resolve_brand"`
- `brand_lookup.params.p_name_en`
- `brand_lookup.params.p_name_ar`
- `normalized_name`
- `canonical_name_en`
- `canonical_name_ar`
- `concentration`
- `size_ml`
- `gender_target`
- `is_tester`
- `is_gift_set`
- `size_label`
- `variant_title`
- `needs_review`
- `review_reason`
- `enrichment_brand_map.ignored_store_brand`
- `enrichment_brand_map.brand`
- `enrichment_brand_map.normalized_name`

Expected downstream use:

1. Run this node before any parent-fragrance upsert or enrichment prompt.
2. Use `brand_lookup.params` with `calapres_resolve_brand`.
3. Use resolved `brand_id` plus `normalized_name` plus `concentration` for the `fragrance_products` identity path.
4. If `needs_review=true`, do not auto-create the parent.

### Code: Build Anthropic Fragrance Enrichment (Offline)

File: `sync/n8n-build/enrichment-anthropic.generated.js`
Mode: `runOnceForEachItem`
External imports: none

Input fields accepted:

- Flat `fragrance_products` fields, or `fragrance_product` object
- `brand_name_en`, `brand_name_ar`, `normalized_name`, `canonical_name_en`, `canonical_name_ar`
- optional `concentration`, `gender_target`, `size_ml`, `supplier_title`, `supplier_description`, `tags`
- optional `force_update`
- optional later response field: `anthropic_response`, `anthropic_output`, `enrichment_response`, or `llm_response`

Guard behavior:

- If `is_enriched=true` or protected enriched columns already contain content, the node returns `enrichment_status="skipped_existing_enrichment"` and `fragrance_product_update=null`.
- Set `force_update=true` to bypass that guard.
- Protected columns are `description_ar`, `description_en`, `seo_title_ar`, `seo_title_en`, `seo_description_ar`, `seo_description_en`, and `seo_keywords`.

Prompt-only output:

- `should_call_anthropic=true`
- `enrichment_status="prompt_ready"`
- `anthropic_prompt.system`
- `anthropic_prompt.user`
- `anthropic_prompt.response_format="json_object"`
- `anthropic_prompt.target_columns`

Parsed-response output:

- `should_call_anthropic=false`
- `enrichment_status="enriched_ready"` when JSON parses and required fields exist
- `parsed_enrichment`
- `fragrance_product_update`
- `fragrance_product_update_contract`

`fragrance_product_update` maps to these `fragrance_products` columns:

- `description_ar`
- `description_en`
- `seo_title_ar`
- `seo_title_en`
- `seo_description_ar`
- `seo_description_en`
- `seo_keywords`
- `tags`
- `is_enriched=true`
- `enrichment_status="enriched"`
- `enriched_at`

Tag behavior:

- Existing tags are preserved.
- Parsed model tags are added.
- `enriched` is added only when a parsed enrichment payload is valid.

## Validation

Command:

```bash
node sync/test-enrichment-brand-map.cjs
```

Result:

```json
{
  "fixture_count": 54,
  "brand_extraction": {
    "before": "0/54",
    "before_percent": 0,
    "after": "54/54",
    "after_percent": 100
  },
  "size_parse": {
    "after": "36/36",
    "after_percent": 100
  },
  "needs_review_projection": {
    "current": 30,
    "sample_before": "54/54",
    "sample_after": "1/54",
    "projected_after": 1,
    "projected_reduction": 29
  }
}
```

The single projected remaining review is a real generic supplier-title case where the title has a brand but no stable fragrance parent name after removing sample/category noise.
