# Calapres — Workboard

Last updated 2026-06-07 (Claude). Full context in `PROJECT_STATE.md`.

## Done (verified, real numbers)
- [x] Deactivated runaway bypass writer `s7QvXm1lyQxPHOfF` (keep OFF permanently).
- [x] Dedup `YEoLTXDRL3NMvcIo`: scanned 17,141, **archived 14,322 duplicates** (reversible), 2,813 canonical keepers. Invariant verified (1 canonical/supplier-id). Zero deletions.
- [x] Re-pointed 97 supplier_products + 97 shopify_products to surviving canonicals.
- [x] Built + verified idempotent push `sNjYDNqXvu1o35yW` (parent+variant, precise non-archived lookup, draft-only, patch-back). Confirmed: new products = DRAFT, sku=calapres_sku, price=supplier+100.
- [x] Built supplier pull `BbIuB2zL6HIxRlYh` (Supabase-only, new supplier-ids only, junk-safe).

## EXACT snapshot (2026-06-07, pull running — exec 4042)
supplier_products **870** (climbing, ~3155 target) · product_media **657** · pushed **85** · unpushed_priced **~785** · fragrance_products **86** · product_variants **86** · shopify_products **85** · sync_errors **0** · sync_runs **1** (dedup).
- 96 SQL-re-pointed survivors cleared (shopify_product_id=NULL) → in unpushed pool for backfill via push UPDATE.

## In progress (autonomous, re-runnable)
- [~] **Pull `BbIuB2zL6HIxRlYh`** — exec 4042 running since 11:40:58 UTC, ~22/min. Restart when stopped. Done when supplier_products ≥ 3,155.
- [ ] **Push `sNjYDNqXvu1o35yW`** — waiting for pull to finish. Then run 400/batch SEQUENTIALLY (never two at once) until `shopify_product_id IS NULL AND supplier_price IS NOT NULL` = 0. Includes 96 backfill rows.

## Next (precise)
1. [ ] Finish pull → drain push to zero sequentially (push includes 96 survivor backfill).
2. [x] **96 re-pointed survivors cleared** — in unpushed pool; push UPDATE path will backfill fragrance/variant rows.
3. [ ] **Brand map deferred to enrichment** — port `sync/normalize.js` BRAND_MAP / `sync/n8n-build/fragrance-resolve.generated.js`.
4. [ ] Higgsfield images + Arabic SEO enrichment.

## Workflow IDs
- Dedup `YEoLTXDRL3NMvcIo` · Pull `BbIuB2zL6HIxRlYh` · Push `sNjYDNqXvu1o35yW` · proven template `tUhxKPw6u2br6JAK` · legacy/inactive `Vsf1Epd3ssfbw10i`, `N4L7C67CgPTRmVLC` · **`s7QvXm1lyQxPHOfF` = DEACTIVATED PERMANENTLY (never re-enable).**

## Guardrails
DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true. `s7QvXm1lyQxPHOfF` stays deactivated. Only ONE push run at a time (concurrent pushes can race-create duplicates).
