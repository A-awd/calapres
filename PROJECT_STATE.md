# Calapres Project State

Last updated: 2026-06-06 by Codex on `integration/claude-codex`.

## Live Architecture

```text
Supplier -> n8n -> Supabase -> Shopify
Supabase -> n8n -> Higgsfield -> Supabase -> Shopify
```

Supabase is the source of truth for product identity, pricing, media state, and Shopify sync IDs.
Shopify is the sales channel. n8n runtime execution belongs to Claude Code.

## Live Links

- GitHub: `https://github.com/A-awd/calapres`
- Supabase project: `https://pbiiqlpgchrcgagemclt.supabase.co`
- Supabase project ref: `pbiiqlpgchrcgagemclt`
- Shopify store: `unywbe-ub.myshopify.com`
- n8n: `https://kunads90.app.n8n.cloud`
- Current supplier: `nawadirdior.sa`

## Git State

- Current branch: `integration/claude-codex`
- Branch purpose: shared integration for Supabase schema, sync-supporting code, docs, and handoffs.
- Base command-center commit before this handoff: `f3d752a93f5535fe80b0664011281b88a779fc9a`
- Claude model branch adopted for schema: local `claude/wizardly-feynman-HTS2T` at `926030fd3847502a2e9db961379e03d433332322`
- The Claude branch's fragrance migration is already present unchanged on `integration/claude-codex`.
- n8n contract proof commits pushed before this state refresh:
  - `626d710e27cc7f40fba358e3ad3bf6ed33849bab` `docs: add n8n fragrance contract`
  - `a2247e029b71561e662daea28d1d002c314c00be` `docs: close n8n contract workboard`

## Live Supabase State

Applied live migrations:

- `20260604133026` `product_data_lake_foundation`
- `20260604182745` `fragrance_variant_model`
- `20260606170335` `n8n_fragrance_contract`

Local migration files:

- `supabase/migrations/20260604000001_image_pipeline.sql`
- `supabase/migrations/20260604000002_product_data_lake.sql`
- `supabase/migrations/20260604000003_fragrance_variant_model.sql`
- `supabase/migrations/20260606170000_n8n_fragrance_contract.sql`

Confirmed live public tables, all with RLS enabled:

- `suppliers`
- `brands`
- `supplier_products`
- `fragrance_products`
- `product_variants`
- `product_media`
- `shopify_products`
- `image_generation_jobs`
- `generated_assets`
- `sync_runs`
- `sync_errors`

Fragrance identity is enforced by:

```sql
CREATE UNIQUE INDEX fragrance_products_identity_idx
ON public.fragrance_products
USING btree (brand_id, normalized_name, COALESCE(concentration, ''::text));
```

## Product Rules

- Parent fragrance: `fragrance_products`.
- Purchasable child: `product_variants`.
- Raw supplier row: `supplier_products`.
- Raw row links: `supplier_products.fragrance_product_id` and `supplier_products.product_variant_id`.
- Variant source link: `product_variants.supplier_product_uuid`.
- Calapres SKU: `CAL-<SUPPLIER_CODE>-P<SUPPLIER_PRODUCT_ID_DIGITS>`.
- Selling price: supplier current/discounted price + 100 SAR.
- Compare-at price: supplier original price + 100 SAR only when original is greater than current; otherwise null.

## n8n Contract

Root handoff file: `CLAUDE_N8N_HANDOFF.md`.

Database RPCs now available for Claude Code/n8n:

- `calapres_resolve_brand`
- `calapres_upsert_fragrance_product`
- `calapres_upsert_product_variant`
- `calapres_link_supplier_product`

## Next

1. Claude Code should wire live n8n to the RPC contract in `CLAUDE_N8N_HANDOFF.md`.
2. Claude Code should run one real product injection through n8n and report the resulting Supabase IDs.
3. Codex should review any schema mismatch found by that runtime pass before broader sync.
