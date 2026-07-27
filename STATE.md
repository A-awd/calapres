# Project State

## Current phase

Owner-curated catalog. The Nawadir Dior supplier architecture has been retired.

## Approved architecture

Owner-selected products -> Supabase (canonical) -> n8n (orchestration) -> Shopify (sales channel only).

There is no supplier crawler, no supplier synchronization, no supplier pricing feed, no supplier
inventory feed, no supplier image feed, and no automatic product discovery. A product exists only
because the owner created and approved it.

## Verified live state — 2026-07-27

### n8n

- Eleven supplier workflows deactivated and archived. Archiving in n8n is reversible and preserves
  the full definition, so this is a backup and a retirement in one step.
- Zero active Calapres workflows remain.
- Zero Shopify webhook subscriptions exist, so no external event can recreate a supplier product.

### Supabase (`pbiiqlpgchrcgagemclt`)

- `suppliers`, `supplier_products`, `sync_runs`, `sync_errors` moved to a read-only `archive`
  schema. PostgREST exposes `public` only, so there is no longer any API path that can write
  supplier data.
- Every foreign key from the active catalog to the supplier tables was dropped. `product_media`,
  `shopify_products`, `image_generation_jobs`, and `generated_assets` were relinked to
  `fragrance_products` / `product_variants` first. 2996 of 3001 media rows relinked cleanly; the
  five orphans are listed for review.
- `calapres_prepare_product_variant` replaced. The fixed `+100 SAR` markup and the `CAL-ND-P<id>`
  SKU generator are gone.
- New SKUs are `CAL-P<n>` from `calapres_sku_seq`. Existing SKUs are immutable and unchanged.
- Owner-curated model added: lifecycle, publication, approval, authenticity, cost price,
  pricing status, gross margin, Calapres-owned inventory vocabulary, versioned media.
- Manual intake: `calapres_create_product` and `calapres_add_variant`.
- `shopify_sync_queue` is the only authorized push source and structurally excludes legacy
  supplier products. It currently returns 0 rows, which is correct — no owner-curated product
  has been approved yet.

### Shopify (`unywbe-ub.myshopify.com`)

- Untouched by design. 2497 products remain published and selling.
- 2815 active, 1829 draft, 318 active-but-unpublished.
- Every active product originates from the retired supplier pipeline. There are zero
  owner-original active products. They are held as a static catalog pending owner review.

## Security status — resolved

The previously unverified credential concern is now closed with evidence. A full-history scan
across all branches found exactly one JWT, and it carries `role=anon` for Supabase project
`vozaayivzggkpazehdxr`, which is an unrelated legacy Lovable project. No `service_role` key,
Shopify token, GitHub token, AWS key, or Anthropic key was ever committed. Every other match was
the repository's own secret-detection regex in `sync/tools/secret-scan.js`.

Rotation is therefore not required. `.env` must still be removed from Git tracking because it is
listed in `.gitignore` yet remains tracked.

## Next action

Owner review of `public.legacy_product_review` (1819 rows) to decide keep / replace / retire per
product, then create the first owner-curated products through the manual intake path.

## Constraints

Never reconnect any Nawadir Dior source. Never publish a product whose `ready_for_shopify` is not
true. Never change an existing `calapres_sku`. Never permanently delete legacy products, media, or
archived history without explicit written authorization.
