# Claude Code n8n Handoff: One Product Injection

Status: ready for Claude Code runtime wiring. Codex prepared Supabase schema, live RPCs, and docs only. Codex did not execute n8n or Shopify runtime.

## Contract

Pipeline:

```text
Supplier raw row -> supplier_products -> brands -> fragrance_products -> product_variants -> Shopify
```

Supabase is the source of truth. Shopify receives one product per fragrance parent and one variant per purchasable size/tester/gift set.

Use the Supabase service-role credential inside the n8n tool. Do not use anon/authenticated keys for these writes.

## Step 0: Resolve Supplier

Current supplier:

```sql
select id, code, name
from public.suppliers
where code = 'ND'
limit 1;
```

Use returned `suppliers.id` as `supplier_id`.

## Step 1: Upsert Raw Supplier Product

Upsert one raw supplier row into `public.supplier_products`.

Required columns:

- `supplier_id`
- `supplier_name`
- `supplier_product_id`
- `supplier_source_url`
- `raw_payload`

Recommended columns:

- `supplier_sku`
- `supplier_slug`
- `product_title_ar`
- `product_title_en`
- `product_description_ar`
- `product_description_en`
- `brand_name`
- `category`
- `product_type`
- `gender_target`
- `size_ml`
- `concentration`
- `supplier_price`
- `supplier_original_price`
- `currency`
- `availability_status`
- `last_seen_at`

Use `supplier_price` as the supplier current/discounted price. Use `supplier_original_price` only when the supplier exposes an original pre-discount price.

Conflict key:

```text
(supplier_id, supplier_product_id)
```

Return:

- `supplier_products.id` as `supplier_product_uuid`
- `supplier_products.calapres_sku`
- `supplier_products.selling_price`
- `supplier_products.compare_at_price`

The table trigger calculates raw-row pricing and `calapres_sku`. The canonical Shopify variant SKU still comes from `product_variants.calapres_sku`.

## Step 2: Resolve Brand

RPC:

```text
calapres_resolve_brand(
  p_name_en text,
  p_name_ar text,
  p_slug text,
  p_metadata jsonb
) returns uuid
```

Call with the best available supplier brand name. If only one language exists, put it in `p_name_en` and preserve the raw value in `p_metadata`.

Return value is `brand_id`.

## Step 3: Match or Insert Parent Fragrance

Identity key:

```text
(brand_id, normalized_name, coalesce(concentration, ''))
```

RPC:

```text
calapres_upsert_fragrance_product(
  p_brand_id uuid,
  p_normalized_name text,
  p_concentration text,
  p_brand_name text,
  p_canonical_name_ar text,
  p_canonical_name_en text,
  p_gender_target text,
  p_confidence_score numeric,
  p_raw_enrichment_payload jsonb
) returns uuid
```

Return value is `fragrance_product_id`.

Do not create a second parent when the same brand, normalized fragrance name, and concentration already exist. Add a variant instead.

## Step 4: Upsert Variant

RPC:

```text
calapres_upsert_product_variant(
  p_fragrance_product_id uuid,
  p_supplier_id uuid,
  p_supplier_product_uuid uuid,
  p_supplier_product_id text,
  p_supplier_sku text,
  p_size_ml integer,
  p_size_label text,
  p_variant_title text,
  p_is_tester boolean,
  p_is_gift_set boolean,
  p_supplier_price numeric,
  p_supplier_original_price numeric,
  p_availability_status text,
  p_raw_payload jsonb
) returns table (
  product_variant_id uuid,
  calapres_sku text,
  selling_price numeric,
  compare_at_price numeric
)
```

Variant conflict key:

```text
(supplier_id, supplier_product_id)
```

Pricing rules are trigger-enforced:

- `selling_price = p_supplier_price + 100`
- when `p_supplier_original_price > p_supplier_price`, `compare_at_price = p_supplier_original_price + 100`
- when original and current prices are equal, `compare_at_price = null`

SKU rule:

```text
CAL-<SUPPLIER_CODE>-P<SUPPLIER_PRODUCT_ID_DIGITS>
```

Example: supplier `ND`, supplier product `12345` => `CAL-ND-P12345`.

Allowed `availability_status` values:

- `in_stock`
- `out_of_stock`
- `unknown`

## Step 5: Link Raw Row to Parent and Variant

RPC:

```text
calapres_link_supplier_product(
  p_supplier_product_uuid uuid,
  p_fragrance_product_id uuid,
  p_product_variant_id uuid,
  p_match_status text,
  p_match_confidence numeric
) returns table (
  supplier_product_uuid uuid,
  fragrance_product_id uuid,
  product_variant_id uuid,
  calapres_sku text
)
```

Use:

- `p_match_status = 'matched_variant'` for successful matching
- `p_match_status = 'created_fragrance'` only when a new parent was created
- `p_match_status = 'needs_review'` for low-confidence cases

This writes:

- `supplier_products.fragrance_product_id`
- `supplier_products.product_variant_id`
- `supplier_products.match_status`
- `supplier_products.match_confidence`
- `product_variants.supplier_product_uuid`

## Step 6: Product Media

Use `public.product_media`.

Important columns:

- `supplier_product_id` = `supplier_products.id` UUID, not supplier numeric text ID
- `media_type`
- `source`
- `original_url`
- `generated_url`
- `shopify_cdn_url`
- `supabase_storage_path`
- `alt_text`
- `position`
- `is_primary`
- `is_active`
- `upload_status`

Allowed `source` values:

- `supplier`
- `higgsfield`
- `shopify`
- `manual`

## Step 7: Build Shopify Payload

Group variants by parent:

```sql
select fp.id as fragrance_product_id,
       fp.canonical_name_ar,
       fp.canonical_name_en,
       fp.brand_name,
       fp.normalized_name,
       fp.concentration,
       pv.id as product_variant_id,
       pv.size_ml,
       pv.size_label,
       pv.variant_title,
       pv.calapres_sku,
       pv.selling_price,
       pv.compare_at_price,
       pv.availability_status
from public.fragrance_products fp
join public.product_variants pv
  on pv.fragrance_product_id = fp.id
where fp.id = :fragrance_product_id
order by pv.size_ml nulls last, pv.variant_title nulls last;
```

Create/update one Shopify product for the fragrance parent.

Create/update one Shopify variant for each `product_variants` row:

- Shopify variant SKU = `product_variants.calapres_sku`
- Shopify variant price = `product_variants.selling_price`
- Shopify compare-at price = `product_variants.compare_at_price`
- Shopify option label = `size_label` or `size_ml`

If a supplier product is out of stock or removed from the latest crawl:

- set/keep `product_variants.availability_status = 'out_of_stock'`
- set Shopify inventory policy/behavior to deny sale for that variant
- if all parent variants are out of stock or removed, set the Shopify product status to draft
- never delete Supabase rows and never delete Shopify products unless the owner explicitly approves

## Step 8: Store Shopify IDs Back in Supabase

Canonical variant sync columns:

- `product_variants.shopify_product_id`
- `product_variants.shopify_variant_id`
- `product_variants.shopify_sync_status`

Optional raw/audit columns:

- `supplier_products.shopify_product_id`
- `supplier_products.shopify_variant_id`
- `supplier_products.shopify_handle`
- `supplier_products.shopify_sync_status`
- `shopify_products.supplier_product_id`
- `shopify_products.shopify_product_id`
- `shopify_products.shopify_variant_id`
- `shopify_products.shopify_handle`
- `shopify_products.shopify_status`
- `shopify_products.sync_status`
- `shopify_products.raw_payload`

For the luxury fragrance model, `product_variants` is the canonical place for Shopify variant IDs.

## Do Not

- Do not rebuild the database model from scratch.
- Do not bypass the identity key.
- Do not merge low-confidence fragrance matches automatically.
- Do not put supplier SKU into Shopify SKU.
- Do not delete products, variants, media, migrations, or generated assets without owner approval.
