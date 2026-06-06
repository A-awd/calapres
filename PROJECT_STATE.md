# Calapres Project State

Living operational state snapshot. The durable authoritative context is `AGENTS.md`;
this file tracks runtime/operational state for the supplier -> Supabase -> Shopify pipeline.

## n8n runtime (Claude domain)

- n8n Cloud: `kunads90.app.n8n.cloud`
- Canonical supplier->Supabase->Shopify flow: `Vsf1Epd3ssfbw10i` — "Calapres: Nawadir Dior -> Supabase -> Shopify"
- Model: fragrance **parent + variant** via `calapres_*` RPCs:
  `calapres_resolve_brand`, `calapres_upsert_fragrance_product`,
  `calapres_upsert_product_variant`, `calapres_link_supplier_product`.
  Pricing (`+100 SAR`) and `calapres_sku` are computed by DB triggers — never recomputed in n8n.
- Diagnostic flow `q2dH9AYGBu2oaPZd` ("DIAG Shopify Auth") -> to be archived.

## Credentials (stored in n8n; never echo secrets)

- Supabase: `Supabase Calapres Service Role` — id `Fy9EgJSOBnSspe4w`, type `supabaseApi` (service_role).
- Shopify: `Shopify-Calapres` — id `QLsvwO73GFsQfy0w`, type `shopifyOAuth2Api`.

## Supabase (source of truth; Codex owns schema/migrations)

- Project: `pbiiqlpgchrcgagemclt` (Calapres), region ap-southeast-2.
- Tables: `supplier_products`, `fragrance_products`, `product_variants`, `brands`, `suppliers`, `product_media`, `shopify_products`, `sync_runs`, `sync_errors`.
- Supplier ND: `90e198d9-5bf3-48e0-9e3f-b9eb818a6c0c` (code `ND`, name `nawadirdior`).

## Shopify

- Store: `unywbe-ub.myshopify.com`; Admin API `2026-04` for REST writes.

## Last run

(to be filled by the current task.)
