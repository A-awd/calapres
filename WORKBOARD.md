# Calapres — Workboard

Last updated 2026-06-07 (Claude). Full context in `PROJECT_STATE.md`.

## Done (verified, real numbers)
- [x] Deactivated runaway bypass writer `s7QvXm1lyQxPHOfF` (keep OFF permanently).
- [x] Dedup `YEoLTXDRL3NMvcIo`: scanned 17,141, **archived 14,322 duplicates** (reversible), 2,813 canonical keepers. Invariant verified (1 canonical/supplier-id). Zero deletions.
- [x] Re-pointed 97 supplier_products + 97 shopify_products to surviving canonicals.
- [x] Built + verified idempotent push `sNjYDNqXvu1o35yW` (parent+variant, precise non-archived lookup, draft-only, patch-back). Confirmed: new products = DRAFT, sku=calapres_sku, price=supplier+100.
- [x] Built supplier pull `BbIuB2zL6HIxRlYh` (Supabase-only, new supplier-ids only, junk-safe).

## In progress (autonomous, re-runnable)
- [~] **Pull** running → supplier_products 511→~3,155. Re-run to finish.
- [~] **Push** draining → 127 pushed, ~381 unpushed (grows as pull adds). Re-run 400/batch **sequentially** (never two at once) until unpushed=0.

## Next
- [ ] Drain pull then push to completion (real numbers: unpushed=0).
- [ ] Backfill fragrance/variant rows for the 97 SQL-re-pointed survivors.
- [ ] Brand extraction (BRAND_MAP) to cut needs_review (currently ~30) — enrichment step.
- [ ] Higgsfield images + Arabic SEO enrichment (supplier images temporary).

## Guardrails
DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true. `s7QvXm1lyQxPHOfF` stays deactivated. Only ONE push run at a time (concurrent pushes can race-create duplicates).
