# Calapres — Project State

Authoritative current state. Pairs with `AGENTS.md` (durable architecture/rules).
Last updated: 2026-06-07 by Claude.

## Architecture (unchanged, non-negotiable)
Supplier (nawadirdior.sa) → n8n → **Supabase (source of truth)** → n8n → Shopify (sales channel only, DRAFT until approved). Shopify is never the data source.

## Live infra
- Supabase project: `pbiiqlpgchrcgagemclt`
- Shopify store: `unywbe-ub.myshopify.com` (Admin API `2025-01`)
- n8n Cloud: `kunads90.app.n8n.cloud`
- ND supplier_id (Supabase): `90e198d9-5bf3-48e0-9e3f-b9eb818a6c0c`
- Credentials (n8n): Shopify `QLsvwO73GFsQfy0w` (Shopify-Calapres), Supabase `Fy9EgJSOBnSspe4w` (Supabase Calapres Service Role), Higgsfield `G31rYKMmDk8hyh2G`, Anthropic `T1FNCvGAN3hZm9Ly`.

## 🔴 INCIDENT (2026-06-04 → 06-07): Shopify duplicate explosion
- The hourly workflow **`s7QvXm1lyQxPHOfF` ("Calapres — Recurring Supplier Sync")** wrote Supplier→Shopify **bypassing Supabase**, and its existing-product lookup was broken: it queried `tag:imported-nader-dior OR tag:supplier-id-pXXX` with `first:25`, so the broad tag (now 16k+ products) crowded out the specific match → lookup returned "not found" → it **created a new duplicate every run**.
- Result: products tagged `imported-nader-dior` grew from **18** (legacy, pre-06-03) to **~16,800** (6,772 active + ≥10,000 draft). Sampled supplier-ids each had **7–8 identical copies**. Catalog is only ~3,155.

### Actions taken (this session)
1. ✅ **Deactivated `s7QvXm1lyQxPHOfF`** (the bypass writer). Must stay **permanently off**.
2. ✅ Seeded Supabase `shopify_products` from the 97 already-synced `supplier_products` (is_enriched=false). 97 rows.
3. ✅ Built + launched **`YEoLTXDRL3NMvcIo` ("Calapres — Dedup Archive Duplicates")**, owner-approved **reversible archive** (status=ARCHIVED), keep one canonical per supplier-id (enriched else oldest). Re-runnable (skips already-archived). First run = execution `3969`; archiving confirmed (40+ archived). **Wall time ~45+ min** due to Shopify GraphQL cost throttling.

## Supabase data (as of 2026-06-07)
- `suppliers`=1, `brands`=1
- `supplier_products`=100 (97 priced+synced, 3 junk/no-price), `product_media`=162 (all source='supplier')
- `shopify_products`=97 (is_enriched=false)
- `fragrance_products`=1, `product_variants`=1 (Aramis test via tUhxKPw6u2br6JAK)
- `sync_runs`, `sync_errors`: dedup run logs to sync_runs on completion

## n8n workflows
- `Vsf1Epd3ssfbw10i` "Nawadir Dior → Supabase → Shopify" — **inactive**. Canonical crawl→Supabase→Shopify. ⚠️ Its "Build Shopify Lookup"/"Shopify Lookup Existing" use the SAME broken broad-OR query — **must be switched to the precise single-tag lookup** (`products(first:1, query:"tag:supplier-id-pXXX")`, the pattern proven in `tUhxKPw6u2br6JAK`) before any push. Also flat product model; should adopt the parent+variant RPC path.
- `tUhxKPw6u2br6JAK` "Inject P735368737" — **inactive**, PROVEN go-forward template: RPCs `calapres_resolve_brand`/`upsert_fragrance_product`/`upsert_product_variant`/`link_supplier_product` → fragrance parent + size variant → Shopify draft → patch IDs back. Uses correct precise lookup.
- `YEoLTXDRL3NMvcIo` "Dedup Archive Duplicates" — **active run in progress** (manual). Reversible.
- `N4L7C67CgPTRmVLC` "Seed Existing Drafts" — legacy, writes to an n8n dataTable (superseded by Supabase `shopify_products` seed). Do not use.
- `s7QvXm1lyQxPHOfF` "Recurring Supplier Sync" — **DEACTIVATED, keep off permanently.**

## Pricing / SKU / inventory rules (enforced)
- selling_price = supplier_price + 100 SAR. Discount: compare_at = original+100, price = discounted+100; never compare_at == price (else null).
- calapres_sku = `CAL-ND-P<id>` (DB trigger, set once). Shopify variant.sku = calapres_sku. supplier_sku stays in Supabase / `supplier.sku` metafield only.
- in_stock→active/continue, out_of_stock/missing→draft/deny. **Never delete** anything; missing→draft+out_of_stock.
- Enriched guard: products tagged `enriched` get price+availability only; never overwrite content unless force_update=true.

## Pending (next, in order)
1. Let dedup `YEoLTXDRL3NMvcIo` finish (re-run until `status:archived` stabilizes and non-archived ≈ distinct catalog). Verify counts.
2. **Re-point Supabase** `supplier_products.shopify_product_id` + `shopify_products.shopify_product_id` to the surviving canonical (the seeded 97 point at now-archived duplicates).
3. **Fix the canonical pipeline lookup** (precise single supplier-id tag) and adopt the `tUhxKPw6u2br6JAK` parent+variant path.
4. **Complete supplier pull** 100 → ~3,155 into Supabase (supplier_products + product_media; junk-safe; never delete).
5. **Push only genuinely-new** products as DRAFT via the idempotent pipeline (match→update canonical, create only new). Do not touch live status of existing canonicals without approval.
