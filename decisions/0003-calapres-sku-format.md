# 0003 — Calapres SKU format

Date: 2026-07-27
Status: Accepted

## Decision

New product variants receive `CAL-P<n>`, where `n` comes from `public.calapres_sku_seq`, starting
at 100001.

The SKU is issued once by `calapres_prepare_product_variant` and is immutable. Any update that
attempts to change an existing `calapres_sku` is silently reverted to the original value at the
trigger level.

The retired supplier format `CAL-ND-P<supplier_id>` is rejected on insert with an explicit error.

## Why not keep a supplier segment

The old format encoded a supplier code and the supplier's own product id. Both are meaningless in
an owner-curated catalog and would keep a retired dependency alive inside the primary identifier.

## Existing SKUs

1819 legacy variants keep their `CAL-ND-*` SKUs unchanged. Rewriting them would break Shopify
variant matching, historical orders, and accounting continuity.
