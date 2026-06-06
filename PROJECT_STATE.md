# Calapres Project State

## Project

Calapres is a luxury perfume Shopify store focused on niche fragrances, oud, incense, and burners.

## Architecture

Current product sync architecture:

```text
Supplier -> n8n -> Supabase -> Shopify
```

Later image architecture:

```text
Supabase -> n8n -> Higgsfield -> Supabase -> Shopify
```

## Live Systems

- Supabase: `https://pbiiqlpgchrcgagemclt.supabase.co`
- Shopify: `unywbe-ub.myshopify.com`
- n8n: `https://kunads90.app.n8n.cloud`
- Current supplier: `nawadirdior.sa`

## Product Model

Current product model:

- Fragrance parent products.
- Product variants for sizes, testers, gift sets, and supplier-specific purchasable rows.

## Fixed Business Rules

- `price = supplier price + 100 SAR`.
- `supplier_sku` is stored separately for traceability.
- Shopify variant SKU uses `calapres_sku`.
- Never delete products.
- No bulk Higgsfield generation until image style is approved.

## Branches

- `main` is stable source of truth.
- `integration/claude-codex` is shared integration.
- `shopify-theme` is Shopify theme only.
- `codex/<task-name>` is for Codex task branches.
- `claude/<task-name>` is for Claude Code task branches.

## Next 3 Priorities

1. Apply and verify the fragrance variant model migration in live Supabase when approved for runtime work.
2. Have Claude Code update live n8n from generated bundles and record the handoff.
3. Continue Shopify theme polish on `shopify-theme`, without touching sync or Supabase code.
