# Calapres — Workboard

Last updated 2026-06-07 (Claude). Full context in `PROJECT_STATE.md`.

## Done (verified, real numbers)
- [x] Deactivated runaway bypass writer `s7QvXm1lyQxPHOfF` (keep OFF permanently).
- [x] Dedup `YEoLTXDRL3NMvcIo`: scanned 17,141, **archived 14,322 duplicates** (reversible), 2,813 canonical keepers. Invariant verified (1 canonical/supplier-id). Zero deletions.
- [x] Re-pointed 97 supplier_products + 97 shopify_products to surviving canonicals.
- [x] Built + verified idempotent push `sNjYDNqXvu1o35yW` (parent+variant, precise non-archived lookup, draft-only, patch-back). Confirmed: new products = DRAFT, sku=calapres_sku, price=supplier+100.
- [x] Built supplier pull `BbIuB2zL6HIxRlYh` (Supabase-only, new supplier-ids only, junk-safe).

## EXACT snapshot (2026-06-07, mid-drain)
supplier_products **595** · product_media **657** (source=supplier) · pushed **181** · unpushed priced **411** · fragrance_products **86** · product_variants **86** · shopify_products **181** · needs_review **83** · sync_errors **0** · sync_runs **1**.

## In progress (autonomous, re-runnable)
- [~] **Pull `BbIuB2zL6HIxRlYh`** running → supplier_products 595→~3,155. Re-run to finish.
- [~] **Push `sNjYDNqXvu1o35yW`** draining → 181 pushed, 411 unpushed (grows as pull adds). Re-run 400/batch **sequentially** (never two at once — concurrent pushes race-create dups) until `shopify_product_id is null and supplier_price is not null` = 0.

## Next (precise)
1. [ ] Finish pull, then **drain push to zero sequentially**.
2. [ ] Backfill fragrance_products/product_variants for the **97** SQL-re-pointed survivors (clear their shopify_product_id, re-run push; or one-off RPC pass).
3. [ ] **Brand map deferred to enrichment** — port `sync/normalize.js` BRAND_MAP (or use `sync/n8n-build/fragrance-resolve.generated.js`) to cut needs_review (now 83) and merge sizes into shared parents.
4. [ ] Higgsfield images + Arabic SEO enrichment (supplier images are temporary).

## Workflow IDs
- Dedup `YEoLTXDRL3NMvcIo` · Pull `BbIuB2zL6HIxRlYh` · Push `sNjYDNqXvu1o35yW` · proven template `tUhxKPw6u2br6JAK` · legacy/inactive `Vsf1Epd3ssfbw10i`, `N4L7C67CgPTRmVLC` · **`s7QvXm1lyQxPHOfF` = DEACTIVATED PERMANENTLY (never re-enable).**

## Guardrails
DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never change live status of survivors. Never overwrite enriched content unless force_update=true. `s7QvXm1lyQxPHOfF` stays deactivated. Only ONE push run at a time (concurrent pushes can race-create duplicates).
