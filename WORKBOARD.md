# Calapres — Workboard

Active task tracking. Last updated 2026-06-07 (Claude). See `PROJECT_STATE.md` for full context.

## In progress
- [~] **Dedup archive of Shopify duplicates** — workflow `YEoLTXDRL3NMvcIo`, run `3969` executing. Reversible (status=ARCHIVED), keep one canonical/supplier-id (enriched else oldest). ~14k to archive, ~45+ min, re-runnable. Verify to completion: re-run until `tag:imported-nader-dior AND status:archived` stops growing and non-archived ≈ ~3,155 distinct.

## Done (this session)
- [x] Deactivated runaway bypass writer `s7QvXm1lyQxPHOfF` (Supplier→Shopify, no Supabase). Keep OFF permanently.
- [x] Diagnosed duplicate explosion: 18 → ~16,800 imported products, 7–8 copies each (root cause = broken broad-OR lookup in s7Qv).
- [x] Seeded Supabase `shopify_products` (97 rows, is_enriched=false) from already-synced `supplier_products`.
- [x] Built dedup workflow `YEoLTXDRL3NMvcIo` (bulk export → group → reversible archive, self-throttled, re-runnable) and launched it (owner-approved).

## Next (blocked on dedup completing)
- [ ] Re-point `supplier_products.shopify_product_id` + `shopify_products.shopify_product_id` to surviving canonical (seeded 97 point at archived dups).
- [ ] Fix canonical pipeline `Vsf1Epd3ssfbw10i` lookup → precise `tag:supplier-id-pXXX` (first:1); adopt parent+variant RPC path from `tUhxKPw6u2br6JAK`.
- [ ] Complete supplier pull 100 → ~3,155 into Supabase (supplier_products + product_media; junk-safe; never delete).
- [ ] Push only genuinely-new as DRAFT (match→update canonical, create only new). No live-status changes to existing canonicals without approval.
- [ ] Log every run to `sync_runs` and every error to `sync_errors`.

## Guardrails (do not violate)
- DRAFT only; never publish to customers. Never delete (missing→draft/out_of_stock). Never overwrite enriched content unless force_update=true. `s7QvXm1lyQxPHOfF` stays deactivated.
