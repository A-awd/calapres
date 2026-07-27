# calapres

`calapres` is the canonical One Brain repository for the Calapres perfume-commerce project.
GitHub is the only permanent source of truth for approved code, documentation, decisions, and
operational state. `main` is the only canonical branch.

## What Calapres is

An Arabic-first luxury and niche perfume storefront in Riyadh, selling on Shopify.

## Architecture

    Owner-selected products
        -> Supabase   (canonical product database)
        -> n8n        (the only orchestration layer)
        -> Shopify    (sales channel only)

Products are created manually by the owner and published only after explicit approval. There is no
supplier crawler, no supplier synchronization, no external pricing or inventory feed, and no
automatic product discovery. This is binding — see `decisions/0002-retire-nawadir-dior.md`.

## Operating documents

- [AGENTS.md](AGENTS.md) — binding instructions for every AI launcher.
- [STATE.md](STATE.md) — current approved state and next action.
- [HANDOFF.md](HANDOFF.md) — continuity notes for the next session.
- [DECISIONS.md](DECISIONS.md) — decision index.
- [LAUNCHER.md](LAUNCHER.md) — vendor-neutral session protocol.
- [Nawadir Dior retirement inventory](docs/nawadir-dior-retirement-inventory.md) — what was
  disabled, archived, or retained, and why.

## Data model

Canonical tables in Supabase `public`:

`brands` · `fragrance_products` · `product_variants` · `product_media` · `shopify_products` ·
`image_generation_jobs` · `generated_assets`

Views:

- `shopify_sync_queue` — the only authorized Supabase to Shopify push source.
- `shopify_reconciliation` — Supabase against Shopify. Never against any supplier.
- `legacy_product_review` — inherited supplier products awaiting an owner decision.

The `archive` schema holds frozen supplier history. It is read-only and not exposed through the
API. Never write to it and never feed it into any active flow.

## Product intake

    select public.calapres_create_product('اسم المنتج', 'Brand', 'awd');
    select public.calapres_add_variant('<product_id>', '100ml', 690, 100, 420);

A product reaches Shopify only when `ready_for_shopify = true`, which the database refuses unless
the product has a title, a brand, `lifecycle_status = 'approved'`, a named approver, at least one
variant with an approved selling price, and at least one approved image.

## SKU

New products use `CAL-P<n>`, issued once from `calapres_sku_seq` and immutable thereafter.
The retired `CAL-ND-*` format is blocked at the database level. Existing `CAL-ND-*` SKUs on legacy
products are preserved and must never be rewritten.

## Security boundary

Live credentials, customer data, order data, and unsanitized platform exports are out of scope for
this repository. A full-history secret audit on 2026-07-27 found no exposed service key or access
token. See `STATE.md`.
