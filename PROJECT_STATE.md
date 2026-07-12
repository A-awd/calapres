# Calapres Project State

Living operational state snapshot. The durable authoritative context is `AGENTS.md`;
this file tracks runtime/operational state for the supplier -> Supabase -> Shopify pipeline.

## n8n runtime (Claude domain)

- n8n Cloud: `kunads90.app.n8n.cloud`
- Canonical supplier->Supabase->Shopify flow: **`7avGWOyfXJVrBGV9`** — "Calapres: Nawadir Dior -> Supabase -> Shopify (RPC)" (32 nodes; Manual + Schedule "Every 6 Hours" + Error triggers).
- Model: fragrance **parent + variant** via `calapres_*` RPCs:
  `calapres_resolve_brand`, `calapres_upsert_fragrance_product`,
  `calapres_upsert_product_variant`, `calapres_link_supplier_product`.
  Pricing (`+100 SAR`) and `calapres_sku` are computed by DB triggers — never recomputed in n8n.
  Scalar-returning RPCs (`resolve_brand`, `upsert_fragrance_product`) MUST use HTTP `Response Format = Text`
  (PostgREST returns a bare UUID that is not valid JSON); TABLE-returning RPCs use JSON.
- Step order: Supplier GET → parse → `POST supplier_products` (raw, direct) → 4 `calapres_*` RPCs → Shopify lookup (Supabase map first, then tag) → Shopify PUT/POST → PATCH shopify ids back.
- Old flat-model flow `Vsf1Epd3ssfbw10i` -> **archived** (replaced by the RPC flow).
- Diagnostic flow `q2dH9AYGBu2oaPZd` ("DIAG Shopify Auth") -> **archived**.

## Credentials (stored in n8n; never echo secrets)

- Supabase: `Supabase Calapres Service Role` — id `Fy9EgJSOBnSspe4w`, type `supabaseApi` (service_role).
- Shopify: `Shopify-Calapres` — id `QLsvwO73GFsQfy0w`, type `shopifyOAuth2Api`.
- **Credentials bind by code via `newCredential(name, id)` — no manual UI binding needed.** Verified live: probe exec `3894` returned HTTP 200 from both Supabase and Shopify, and the full flow runs bind all HTTP nodes by code. (The MCP "configure manually" note only refers to auto-assignment, not explicit id binding.)

## Supabase (source of truth; Codex owns schema/migrations)

- Project: `pbiiqlpgchrcgagemclt` (Calapres), region ap-southeast-2.
- Tables: `supplier_products`, `fragrance_products`, `product_variants`, `brands`, `suppliers`, `product_media`, `shopify_products`, `sync_runs`, `sync_errors`.
- Supplier ND: `90e198d9-5bf3-48e0-9e3f-b9eb818a6c0c` (code `ND`, name `nawadirdior`).
- Triggers computing pricing/SKU: `calapres_prepare_supplier_product` (on `supplier_products`), `calapres_prepare_product_variant` (on `product_variants`), both `BEFORE INSERT OR UPDATE`.
- Identity keys: `supplier_products`/`product_variants` UNIQUE `(supplier_id, supplier_product_id)` + UNIQUE `calapres_sku`; fragrance identity `(brand_id, normalized_name, coalesce(concentration,''))`.

## Shopify

- Store: `unywbe-ub.myshopify.com` (calapres.com), currency SAR; Admin API `2026-04` for REST writes.

## Last run — 2026-07-12 (LIVE / runtime, not setup-only)

Injected one real product end-to-end via the RPC flow `7avGWOyfXJVrBGV9`.

- Test product: supplierProductId `735368737`, Aramis Classic EDT 110ml.
- Successful exec **`29163`** (27/27 active nodes success); idempotency re-run exec **`29165`** (identical IDs, Shopify PUT not create).
- RPC returns (exec 29163): resolve_brand → `386dddf2-7a6f-4a2c-9573-dc98c5b7d94d`; upsert_fragrance_product → `a16c8ce5-2f1e-46a9-ac27-abd8def2e0c3`; upsert_product_variant → `{c842fe46-4c1a-463a-bfe9-7672972373a2, CAL-ND-P735368737, 272.5, null}`; link_supplier_product → links supplier_products `32f2f461-…` to that parent+variant.
- Supabase rows (verified): `supplier_products.id=32f2f461-dc25-4507-a71a-9c7550453455`, `fragrance_product_id=a16c8ce5-…`, `product_variant_id=c842fe46-…`, `calapres_sku=CAL-ND-P735368737`, `selling_price=272.5`, `compare_at_price=null`, `size_ml=110`, `match_status=matched_variant`.
- Shopify: product `9471021515008` (status=draft), variant `48796235038976` (price 272.50, sku CAL-ND-P735368737), handle `عطر-اراميس-كلاسيك-او-دو-تواليت-110مل`. Existing enriched parent was updated (not duplicated); enriched content preserved (price/availability/SKU only).
- Idempotency after 2 runs: `brands(aramis)=1, fragrances(aramis classic)=1, variants(735368737)=1, supplier_rows=1`.
