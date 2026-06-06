# Calapres Project State

_Last updated: 2026-06-06_

## Infrastructure

| Component | Value |
|-----------|-------|
| Supabase project | `pbiiqlpgchrcgagemclt` |
| Shopify store | `unywbe-ub.myshopify.com` |
| n8n instance | `kunads90.app.n8n.cloud` |
| Git branch (active) | `claude/tender-goldberg-TaNKP` |

## n8n Workflows

| ID | Name | Status | Notes |
|----|------|--------|-------|
| `Vsf1Epd3ssfbw10i` | Calapres: Nawadir Dior → Supabase → Shopify | Active | Batch sync, CHUNK=100, syncOffset=160 after 3 batches |
| `tUhxKPw6u2br6JAK` | Calapres: Inject P735368737 | Active | Single-product RPC pipeline, 19 nodes |

## Credentials

| Name | ID | Type |
|------|-----|------|
| Supabase Calapres Service Role | `Fy9EgJSOBnSspe4w` | supabaseApi |
| Shopify-Calapres | `QLsvwO73GFsQfy0w` | shopifyOAuth2Api |

**Credentials bind by code via `newCredential(name, id)` — no manual UI binding needed.**
(More precisely: for HTTP Request nodes, use explicit `{ supabaseApi: { id, name } }` object in node config. `newCredential()` only works for AI/langchain subnode types.)

## Suppliers

| ID | Name | Slug |
|----|------|------|
| `90e198d9-5bf3-48e0-9e3f-b9eb818a6c0c` | Nawadirdior | nawadirdior |

## Key RPC Functions (all idempotent)

| Function | Returns | Purpose |
|----------|---------|---------|
| `calapres_resolve_brand` | uuid | Find/create brand by name_en |
| `calapres_upsert_fragrance_product` | uuid | Find/create fragrance (conflict: brand+normalized_name+concentration) |
| `calapres_upsert_product_variant` | record | Find/create variant (conflict: supplier_id+supplier_product_id) |
| `calapres_link_supplier_product` | record | UPDATE supplier_products.fragrance_product_id + product_variant_id |

## Pricing Rule

`selling_price = supplier_price + 100 SAR`

## Constraints (permanent)

- Shopify variant SKU must be `calapres_sku` (never `supplier_sku`)
- New Shopify products → status=`draft`
- Never delete any product
- Fake probe row `CAL-ND-P273109549` — do NOT delete without explicit owner approval
- n8n runtime only; no touching Supabase schema/migrations (Codex domain)

## Data Counts (as of 2026-06-06)

- supplier_products: ~160+ synced from Nawadirdior
- fragrance_products: at least 1 confirmed (`70ce39ed-...`)
- product_variants: at least 1 confirmed (`c842fe46-...`)
