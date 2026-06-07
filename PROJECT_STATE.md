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

## Supabase data (live snapshot 2026-06-07, mid-drain)
- supplier_products **511 and climbing → ~3,155** (3 junk no-price kept, never deleted)
- product_media **573** (all source='supplier')
- shopify_products **127** · fragrance_products **32** · product_variants **32**
- pushed (shopify_product_id set): **127** · needs_review: **30** · sync_errors: **0** · sync_runs: 1 (dedup)

## Rules enforced
- price = supplier+100; discount → compare_at=original+100, price=discounted+100; compare_at≠price else null. selling_price/compare_at computed by `calapres_upsert_product_variant`.
- calapres_sku `CAL-ND-P<id>` = Shopify variant.sku. supplier_sku stays in Supabase only.
- in_stock→continue, out_of_stock→deny. DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true.

## Pending / next
1. **Finish the pull** (`BbIuB2zL6HIxRlYh`) → all ~3,155 supplier-ids in Supabase. Re-runnable.
2. **Drain the push** (`sNjYDNqXvu1o35yW`) sequentially, 400/run, until `shopify_product_id is null and supplier_price is not null` = 0. UPDATEs match survivors; CREATEs make new drafts.
3. **needs_review brands:** push flags products whose brand isn't extractable from the Arabic title (no brand map) as needs_review and uses vendor placeholder "نوادر ديور". Brand/variant-merge refinement = enrichment step (port `sync/normalize.js` BRAND_MAP into the push's Compute Facts, or use generated `fragrance-resolve.generated.js`).
4. **97 re-pointed survivors** have shopify IDs but no fragrance_products/product_variants rows (they were SQL-re-pointed, not run through the push RPC chain). Backfill by clearing their shopify_product_id and re-running the push, or a one-off RPC pass.
5. Image generation (Higgsfield) + Arabic SEO enrichment remain (supplier images are temporary).
