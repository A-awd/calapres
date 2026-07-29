# 0003 — Calapres SKU format

Date: 2026-07-27

Status: Accepted as amended by decision 0006 on 2026-07-29.

## Decision

Existing Shopify SKUs are immutable.

New product variants receive a unique owner-approved SKU directly in Shopify. New SKUs must use
the `CAL-` prefix and must not encode a supplier dependency. The SKU is assigned once and must not
be changed after orders, inventory, or integrations depend on it.

The former database sequence and database trigger used to issue `CAL-P<n>` values are retired.
`CAL-P<n>` may remain on existing products, but no external database is required to create a new
SKU.

## Existing SKUs

Historical `CAL-ND-*` and other existing SKUs remain unchanged. Rewriting them could break Shopify
variant matching, historical orders, inventory, and accounting continuity.
