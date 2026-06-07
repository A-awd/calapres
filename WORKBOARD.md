# Calapres — Workboard

Last updated 2026-06-07 session 4 (Claude). Full context in `PROJECT_STATE.md`.

## Done (verified, real numbers)
- [x] Deactivated runaway bypass writer `s7QvXm1lyQxPHOfF` (keep OFF permanently).
- [x] Dedup `YEoLTXDRL3NMvcIo`: scanned 17,141, **archived 14,322 duplicates** (reversible), 2,813 canonical keepers. Invariant verified (1 canonical/supplier-id). Zero deletions.
- [x] Re-pointed 97 supplier_products + 97 shopify_products to surviving canonicals.
- [x] Built + verified idempotent push `sNjYDNqXvu1o35yW` (parent+variant, precise non-archived lookup, draft-only, patch-back). Confirmed: new products = DRAFT, sku=calapres_sku, price=supplier+100.
- [x] Built supplier pull `BbIuB2zL6HIxRlYh` (Supabase-only, new supplier-ids only, junk-safe).
- [x] Push `sNjYDNqXvu1o35yW` converted to **self-driving** (Schedule trigger every 5 min, Supabase distributed lock for sequential-only execution). Active + published.
- [x] Pushed **1,285** products to Shopify (drafts). Backfill of 96 cleared survivors handled via UPDATE path.

## EXACT snapshot (2026-06-07 session 4)
supplier_products **1,822** (pull stalled — supplier 403 gap) · product_media **657** · pushed **1,285** · unpushed_priced **534** · sync_errors **0**.
- Pull ceiling: nawadirdior.sa returning HTTP 403 to crawler. ~1,081 products missing vs ~2,903 Shopify canonicals. Re-pull when supplier lifts block.
- Push: self-driving every 5 min, sequential-locked. Will drain 534 → 0 automatically.

## In progress (autonomous)
- [~] **Push `sNjYDNqXvu1o35yW`** — ACTIVE, fires every 5 min, Supabase lock prevents overlap. Draining 534 remaining unpushed rows. No manual action needed.

## Blocked (waiting on external)
- **Pull `BbIuB2zL6HIxRlYh`** — stalled. nawadirdior.sa sitemap returning HTTP 403. Re-run manually when supplier site lifts block (target ~3,155; currently 1,822).

## Next (after push drains to 0)
1. [ ] Re-pull when supplier 403 lifts → push will pick up new products automatically.
2. [ ] **Brand map deferred to enrichment** — port `sync/normalize.js` BRAND_MAP / `sync/n8n-build/fragrance-resolve.generated.js`.
3. [ ] Higgsfield images + Arabic SEO enrichment.

## Workflow IDs
- Dedup `YEoLTXDRL3NMvcIo` · Pull `BbIuB2zL6HIxRlYh` · Push `sNjYDNqXvu1o35yW` (ACTIVE self-driving) · proven template `tUhxKPw6u2br6JAK` · legacy/inactive `Vsf1Epd3ssfbw10i`, `N4L7C67CgPTRmVLC` · **`s7QvXm1lyQxPHOfF` = DEACTIVATED PERMANENTLY (never re-enable).**

## Guardrails
DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true. `s7QvXm1lyQxPHOfF` stays deactivated. Push lock (sync_runs push_batch) ensures only ONE run at a time — never bypass it.
