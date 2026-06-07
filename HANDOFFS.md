# Calapres — Handoffs

Chronological handoff log. Newest first. See `PROJECT_STATE.md` / `WORKBOARD.md`.

## 2026-06-07 — Claude — Duplicate incident contained; dedup running; pull/push deferred

**Context handed in:** Task assumed ~324 existing Shopify products and asked to prevent duplicates, resolve a conflicting sync, complete the supplier pull (100→full catalog) and push drafts.

**What I found instead:** A live duplicate explosion. `tag:imported-nader-dior` products went from 18 (legacy) to **~16,800** (6,772 active + ≥10,000 draft) between 06-04 and 06-07, **7–8 copies per supplier-id**. Cause = hourly workflow `s7QvXm1lyQxPHOfF` writing Supplier→Shopify (bypassing Supabase) with a broken broad-OR existing-product lookup that never matched, so it created a new copy every run. The "canonical" `Vsf1Epd3ssfbw10i` shares the same broken lookup.

**Owner decisions (via question):** (1) **Archive** duplicates reversibly (not delete), keep one canonical per supplier-id (enriched else oldest). (2) Fix lookup + seed `shopify_products`, then **pause** — do NOT push new products until dedup is done.

**What I did:**
1. Deactivated `s7QvXm1lyQxPHOfF` (stops new duplicates). Keep OFF permanently.
2. Seeded `shopify_products` (97 rows, is_enriched=false) from synced `supplier_products`.
3. Built + launched dedup workflow **`YEoLTXDRL3NMvcIo`** — Shopify bulk-export → group by supplier-id → keep canonical → archive the rest in self-throttled aliased GraphQL batches (40/req, 9s wait, ~5 mutations/s ceiling). Re-runnable (skips already-archived). Run `3969`; first batches archived OK.

**State at handoff:** Dedup still running (~45+ min, not finished this session). Supplier pull and Shopify push NOT done (correctly blocked on a clean base + lookup fix per owner's "then pause" choice). The later instruction to "resume on the clean base" arrived before the base was clean — do not treat dedup/lookup-fix as complete.

**Next agent, do in order:**
1. Re-run `YEoLTXDRL3NMvcIo` until `tag:imported-nader-dior AND status:archived` stops growing; confirm non-archived ≈ ~3,155 distinct. Check `sync_runs` for the dedup summary row.
2. Re-point Supabase `shopify_product_id`/`shopify_variant_id`/`shopify_handle` (in `supplier_products` and `shopify_products`) to the surviving canonical per supplier-id — the seeded 97 point at now-archived duplicates.
3. Fix `Vsf1Epd3ssfbw10i` lookup to precise `tag:supplier-id-pXXX` (first:1) and adopt the proven parent+variant RPC path from `tUhxKPw6u2br6JAK`.
4. Complete supplier pull 100→~3,155 (supplier_products + product_media, source='supplier'; skip no-price/no-id; never delete).
5. Push only genuinely-new as DRAFT; match→update canonical, create only new. No live-status changes without approval. Log to sync_runs/sync_errors.

**Watch out:** Shopify `productsCount` caps at 10,000 (`AT_LEAST`); use per-supplier-id counts or `status:archived/active` (EXACT) to measure progress. Never delete. DRAFT only.

## 2026-06-07 (later) — Claude — Dedup complete; pull+push built, verified, draining

**Done since last entry:**
- Dedup `YEoLTXDRL3NMvcIo` completed: scanned 17,141 imported products, archived 14,322 duplicates (reversible status=ARCHIVED), 2,813 canonical keepers across 2,794 supplier-ids. Invariant holds (1 non-archived canonical per supplier-id). Zero deletions.
- Re-pointed 97 supplier_products + 97 shopify_products from archived dups to surviving canonicals (SQL).
- Built `BbIuB2zL6HIxRlYh` (Supabase-only supplier pull, new supplier-ids only, junk-safe) — running, drains to ~3,155.
- Built + fixed + verified `sNjYDNqXvu1o35yW` (idempotent parent+variant push). First version had a bug (two consecutive Supabase writes; the 2nd lost context after a return=minimal HTTP node wiped $json) → fixed by merging to one "Extract Shopify IDs" node referenced by name from both writes. Verified live: new products are DRAFT, sku=CAL-ND-P<id>, price=supplier+100, correct tags + supplier.product_id metafield, inventory_policy by availability. Precise lookup `tag:supplier-id-pXXX AND -status:archived` confirmed to match survivors (UPDATE) so no new duplicates.

**State at handoff (mid-drain, real):** supplier_products 511→~3,155 (pull running); pushed 127; fragrance_products/product_variants 32; shopify_products 127; needs_review 30; sync_errors 0.

**Next agent:**
1. Re-run pull `BbIuB2zL6HIxRlYh` until all supplier-ids are in Supabase.
2. Re-run push `sNjYDNqXvu1o35yW` (400/batch, SEQUENTIAL — never two pushes concurrently, they race-create dups) until `shopify_product_id is null and supplier_price is not null` = 0.
3. Backfill fragrance/variant rows for the 97 SQL-re-pointed survivors (clear their shopify_product_id and re-run push, or one-off RPC pass).
4. Add BRAND_MAP brand extraction (port `sync/normalize.js` or use `sync/n8n-build/fragrance-resolve.generated.js`) to reduce needs_review and enable real parent+variant size-merging.

**Watch out:** Shopify productsCount caps at 10,000 (AT_LEAST) — use per-supplier-id or status counts (EXACT). Never delete. DRAFT only. brand_name in supplier_products is often the store name ("متجر نوادر ديور"); push ignores it and flags needs_review.
