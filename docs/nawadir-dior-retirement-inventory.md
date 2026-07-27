# Nawadir Dior retirement inventory — 2026-07-27

Every item below was verified against the live system, not inferred from documentation.

## n8n — disabled and archived

Archiving in n8n preserves the complete workflow definition and is reversible, so it serves as both
the final backup and the retirement. Nothing was deleted.

| Workflow | ID | Previous purpose | Action |
|---|---|---|---|
| Calapres — Push New Products (Draft) | `sNjYDNqXvu1o35yW` | The only active workflow. Schedule every 5 min, pushed 400 supplier-derived products per run to Shopify. | Deactivated, then archived |
| Calapres — Recurring Supplier Sync | `s7QvXm1lyQxPHOfF` | Sitemap crawl, +100 SAR pricing, draft creation | Archived |
| Calapres — Supplier Pull (Supabase) | `BbIuB2zL6HIxRlYh` | Full sitemap crawl into `supplier_products` | Archived |
| Calapres — Supplier Sync | `qZP7gkDGXb0o4HhI` | Price and availability sync from supplier | Archived |
| Calapres — Supplier Access Probe | `W72xf2pT9mFx5mNb` | Probed `nawadirdior.sa` robots/sitemap | Archived |
| Calapres: Nawadir Dior -> Supabase -> Shopify (RPC) | `7avGWOyfXJVrBGV9` | Full supplier RPC pipeline | Archived |
| Calapres — Sync POC | `cXniOB8iFfKWTDV4` | Supplier page fetch, +100 pricing proof | Archived |
| Calapres — Seed Existing Drafts | `N4L7C67CgPTRmVLC` | Seeded state from supplier URLs | Archived |
| Calapres: Inject P735368737 | `tUhxKPw6u2br6JAK` | Single supplier product injection | Archived |
| Calapres — Enrich | `FvuwLg05QL87A5tg` | Enrichment using supplier images | Archived |
| Calapres — Dedup Archive Duplicates | `YEoLTXDRL3NMvcIo` | Deduplicated `imported-nader-dior` products | Archived |

## n8n — retained, all inactive, none supplier-facing

| Workflow | ID | Why retained |
|---|---|---|
| Calapres — Connection Test | `RHGnYTseGm1a4MwB` | Shopify credential check only |
| Calapres — Brand Token Audit | `HDhkz1r22nwMekmf` | Read-only Shopify audit, writes nothing |
| Calapres — Catalog Normalize and Publish | `h8XCi3Sjsne4TFZL` | Shopify-only brand and SEO normalization. Must remain inactive so it never republishes. |
| Calapres — Publish Queue Uploader | `dlaIu141Dc1zKPYR` | Shopify-only publisher. Must remain inactive — automatic republishing is prohibited. |
| Calapres — Brand Backfill (Supabase) | `HfaEyMCSd4dv6wsC` | Brand resolution on the canonical table |
| Calapres — Enrich (AI Catalog-wide) | `vNnk9ivt8HqCOZfu` | Shopify to Claude to Shopify. No supplier access. Inactive. |
| Calapres: Product Image Pipeline | `3IpySHSnlUzOmFVh` | Higgsfield generation. Inactive pending image-style approval. |
| Calapres — Style Samples | `58usEQ0UOJFzZ2Hw` | References one supplier image as a style reference. Inactive. Rewrite the reference before any future use. |
| Calapres — Higgsfield Endpoint Probe | `svCjXObuFsP3sV6T` | Temporary diagnostic |

Credentials: none removed. `Shopify-Calapres` (`QLsvwO73GFsQfy0w`), `Higgsfield API (awd-n8n)`
(`G31rYKMmDk8hyh2G`), and `Supabase Calapres Service Role` (`Fy9EgJSOBnSspe4w`) are all still
required by the new architecture. No supplier-only credential ever existed — the supplier was read
over plain HTTP with no authentication.

Webhooks: Shopify reports zero webhook subscriptions, so no external event can recreate a product.

## Supabase — archived

Moved to the read-only `archive` schema, not exposed through PostgREST:

`suppliers` (1) · `supplier_products` (1822) · `sync_runs` (1776) · `sync_errors` (7145)

## Supabase — dependencies removed

- Nine foreign keys from `public` to `suppliers` / `supplier_products` dropped.
- Supplier columns renamed to `legacy_*` in `product_variants`, `product_media`,
  `shopify_products`, `image_generation_jobs`, `generated_assets`.
- `calapres_link_supplier_product` and `calapres_upsert_product_variant` dropped — the supplier RPC
  surface no longer exists.
- `calapres_prepare_product_variant` rewritten: no `+100 SAR`, no `CAL-ND` SKU, no supplier lookup.

Retained deliberately: the `legacy_*` columns and the `CAL-ND-*` SKUs on 1819 existing variants.
Removing them would break Shopify variant matching, historical orders, and accounting continuity.

## Shopify — untouched by design

2815 active, 2497 published, 1829 draft, 318 active-but-unpublished. Every active product
originates from the retired pipeline; there are zero owner-original active products. They remain a
static, non-syncing catalog pending owner review via `public.legacy_product_review`.

## Guards proven to fire

1. Creating a `CAL-ND-*` SKU is rejected at insert.
2. Ingesting a `nawadirdior` or `cdn.salla` image URL is rejected at insert.
3. `ready_for_shopify = true` is rejected unless title, brand, approval, an approved price, and an
   approved image all exist.
4. `shopify_sync_queue` excludes `origin = 'legacy_supplier'` structurally, so no legacy product can
   enter a sync run even if every other flag were flipped.
