# Calapres — Project State

Authoritative current state. Pairs with `AGENTS.md` (durable architecture/rules).
Last updated: 2026-06-07 by Claude.

## Architecture (non-negotiable)
Supplier (nawadirdior.sa) → n8n → **Supabase (source of truth)** → n8n → Shopify (sales channel, DRAFT until approved). Shopify is never the data source.

## Live infra
- Supabase project `pbiiqlpgchrcgagemclt` · ND supplier_id `90e198d9-5bf3-48e0-9e3f-b9eb818a6c0c`
- Shopify `unywbe-ub.myshopify.com` (Admin API `2025-01`) · n8n Cloud `kunads90.app.n8n.cloud`
- n8n creds: Shopify `QLsvwO73GFsQfy0w` (Shopify-Calapres), Supabase `Fy9EgJSOBnSspe4w` (Supabase Calapres Service Role), Higgsfield `G31rYKMmDk8hyh2G`, Anthropic `T1FNCvGAN3hZm9Ly`.

## 🔴 INCIDENT (06-04→06-07): Shopify duplicate explosion — CONTAINED + DEDUPED
- Cause: hourly `s7QvXm1lyQxPHOfF` wrote Supplier→Shopify (bypassing Supabase) with a broken broad-OR lookup → created a fresh duplicate every run. Imported products went 18 → ~16,800 (7–8 copies/supplier-id).
- **Resolved:** `s7QvXm1lyQxPHOfF` DEACTIVATED (keep off permanently). Dedup run archived duplicates reversibly.
- Dedup result (sync_runs): scanned **17,141**, archived **14,322** duplicates (status=ARCHIVED, reversible, zero deletions), **2,813 canonical keepers** across 2,794 supplier-ids. Invariant verified: non-archived ≈ distinct supplier-id (1 canonical each).

## n8n workflows (current)
- **`YEoLTXDRL3NMvcIo` "Dedup Archive Duplicates"** — re-runnable. Bulk-export → keep 1 canonical/supplier-id (enriched else oldest) → archive rest. DONE (run 3969). Re-run if archived count ever grows.
- **`BbIuB2zL6HIxRlYh` "Supplier Pull (Supabase)"** — crawls full sitemap, processes only supplier-ids not yet in Supabase, upserts supplier_products + product_media (source=supplier). Junk-safe, never deletes. RUNNING / re-runnable to finish the ~3,155 catalog.
- **`sNjYDNqXvu1o35yW` "Push New Products (Draft)"** — idempotent. Reads unpushed priced supplier_products (400/run), calapres RPCs (brand/fragrance/variant/link), **precise lookup `tag:supplier-id-pXXX AND -status:archived` first:1** → UPDATE survivor (price/sku/availability only) or CREATE draft (parent + size variant, sku=calapres_sku, supplier image, tags, metafields) → patch IDs to supplier_products + shopify_products. Logs sync_errors. VERIFIED (drafts confirmed status=draft, correct sku/price). Re-run 400/batch to drain (sequential only — never two pushes at once: dup-create race).
- `tUhxKPw6u2br6JAK` "Inject P735368737" — proven single-product template (inactive).
- `Vsf1Epd3ssfbw10i` — legacy crawl+push, inactive, broken broad-OR lookup. Superseded by the pull+push pair above; do not run as-is.
- `N4L7C67CgPTRmVLC` — legacy dataTable seed, superseded.
- `s7QvXm1lyQxPHOfF` — **DEACTIVATED permanently.**

## Supabase data (EXACT live snapshot 2026-06-07, pull running)
- supplier_products **870** and climbing → ~3,155 (pull execution 4042 running, ~22/min)
- product_media **657** (all 657 source='supplier'; grows with pull)
- shopify_products **85** · fragrance_products **86** · product_variants **86**
- pushed (shopify_product_id set): **85** · unpushed priced: **~785** (840 cleared; 96 survivors cleared for backfill)
- sync_errors: **0** · sync_runs: **1** (dedup only; pull log pending execution complete)
- **96 SQL-re-pointed survivors cleared** (shopify_product_id set to NULL, sync_status=pending) → will be backfilled via push UPDATE path (their Shopify products have supplier-id tags confirmed)

## Rules enforced
- price = supplier+100; discount → compare_at=original+100, price=discounted+100; compare_at≠price else null. selling_price/compare_at computed by `calapres_upsert_product_variant`.
- calapres_sku `CAL-ND-P<id>` = Shopify variant.sku. supplier_sku stays in Supabase only.
- in_stock→continue, out_of_stock→deny. DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true.

## Pending / next
1. **[IN PROGRESS]** Finish pull `BbIuB2zL6HIxRlYh` (exec 4042, running since 11:40:58 UTC, ~22/min, restarting when it stops until supplier_products ≥ 3,155).
2. **Drain push** `sNjYDNqXvu1o35yW` sequentially (400/run) until `shopify_product_id is null and supplier_price is not null` = 0. Includes the 96 survivor backfill rows (cleared). UPDATE existing survivors; CREATE new drafts only.
3. **needs_review brands:** brand map deferred to enrichment — log needs_review and keep moving.
4. Image generation (Higgsfield) + Arabic SEO enrichment remain (supplier images are temporary).
