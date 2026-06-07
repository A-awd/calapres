# Calapres — Project State

Authoritative current state. Pairs with `AGENTS.md` (durable architecture/rules).
Last updated: 2026-06-07 (session 4) by Claude.

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
- **`BbIuB2zL6HIxRlYh` "Supplier Pull (Supabase)"** — crawls full sitemap, processes only supplier-ids not yet in Supabase, upserts supplier_products + product_media (source=supplier). Junk-safe, never deletes. **STALLED at 1,822** — nawadirdior.sa sitemap returning HTTP 403 to crawler. Re-run when supplier site lifts the block.
- **`sNjYDNqXvu1o35yW` "Push New Products (Draft)"** — **ACTIVE, SELF-DRIVING (every 5 min)**. Schedule trigger fires every 5 min. Supabase distributed lock (sync_runs push_batch row) prevents any overlap — if a run is active the next trigger skips. Idempotent: reads 400 unpushed priced rows, calapres RPCs (brand/fragrance/variant/link), precise lookup `tag:supplier-id-pXXX AND -status:archived first:1` → UPDATE survivor or CREATE draft → patch IDs back. Auto-exits with no work when unpushed_priced = 0. Will self-drain remaining 534 rows.
- `tUhxKPw6u2br6JAK` "Inject P735368737" — proven single-product template (inactive).
- `Vsf1Epd3ssfbw10i` — legacy crawl+push, inactive, broken broad-OR lookup. Superseded; do not run.
- `N4L7C67CgPTRmVLC` — legacy dataTable seed, superseded.
- `s7QvXm1lyQxPHOfF` — **DEACTIVATED permanently.**

## Supabase data (EXACT snapshot 2026-06-07 session 4)
- supplier_products **1,822** (pull stalled — supplier 403 gap: ~1,822 pulled vs ~2,903 Shopify canonicals, ~1,081 missing; re-pull when supplier lifts 403)
- product_media **657** (all source='supplier')
- shopify_products **1,285** · fragrance_products/product_variants populated by push
- pushed (shopify_product_id set): **1,285** · unpushed priced: **534**
- sync_errors: **0**

## Rules enforced
- price = supplier+100; discount → compare_at=original+100, price=discounted+100; compare_at≠price else null. selling_price/compare_at computed by `calapres_upsert_product_variant`.
- calapres_sku `CAL-ND-P<id>` = Shopify variant.sku. supplier_sku stays in Supabase only.
- in_stock→continue, out_of_stock→deny. DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true.

## Pending / next
1. **[SELF-DRIVING]** Push `sNjYDNqXvu1o35yW` runs every 5 min, sequential-locked. Will drain 534 remaining rows to 0. No manual intervention needed.
2. **Re-pull when supplier 403 lifts** — re-run `BbIuB2zL6HIxRlYh` to add the ~1,081 missing products; then push will pick them up automatically.
3. **Brand map deferred to enrichment** — port `sync/normalize.js` BRAND_MAP to reduce needs_review.
4. Image generation (Higgsfield) + Arabic SEO enrichment remain (supplier images are temporary).
