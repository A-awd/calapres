# Calapres Agent Rules

This is the permanent coordination file for every AI agent working on Calapres.

## Permanent Rules

1. Read `AGENTS.md`, `PROJECT_STATE.md`, and `WORKBOARD.md` at session start, in that order.
2. Do not scan the whole repo unless the task requires it.
3. Use GitHub as the shared memory and meeting point.
4. Keep markdown files as lightweight project memory, not secrets storage.
5. Never put secrets, tokens, API keys, customer data, or private credentials in chat or markdown.
6. No agent may say work is done unless the work is committed and pushed.
7. Use branches to prevent conflicts; one agent per branch at a time.
8. If a file or system is locked in `WORKBOARD.md`, do not touch it.
9. Report conflicts before changing anything.
10. Do not delete products, records, migrations, or generated assets unless the owner explicitly approves.
11. Supabase is the source of truth for product data; Shopify is only the sales channel.
12. Pricing rule: Calapres selling price is supplier current or discounted price plus 100 SAR.
13. Discount rule: when supplier original price is greater than current price, `compare_at_price = supplier_original_price + 100`; otherwise `compare_at_price = null`.
14. SKU rule: Shopify variant SKU must be `calapres_sku` in the format `CAL-<SUPPLIER_CODE>-P<SUPPLIER_PRODUCT_ID_DIGITS>`; keep `supplier_sku` separate for traceability.

## Roles

### ChatGPT / Claude Chat

- Strategic brains.
- Analyze reports and decide the next move.
- Write prompts and instructions for executors.
- Do not make runtime changes unless explicitly connected to the right tool and asked.

### Codex

- Executor for GitHub repo work.
- Owns Supabase schema, migrations, sync-supporting code, tests, docs, and handoff files.
- Uses commits, branches, tests, and CI as proof of work.
- Must not execute n8n runtime unless explicitly possible, safe, and requested.
- Must not perform Shopify theme/runtime work; that belongs to Claude Code on the correct branch.

### Claude Code

- Executor for n8n workflows, Shopify runtime checks, Higgsfield runtime, live workflow execution, and credentials inside tools.
- Handles live automation and runtime wiring.
- Must not redesign database architecture unless explicitly requested.

### Owner

- Makes browser-based decisions.
- Does not need Terminal access.
- Should receive concise reports and single-click links whenever possible.

## Branch Strategy

- `main` = stable source of truth.
- `integration/claude-codex` = shared integration branch for sync, Supabase, n8n-supporting code, docs, and handoffs.
- `codex/<task-name>` = Codex task branch.
- `claude/<task-name>` = Claude Code task branch.
- `shopify-theme` = Shopify theme only.

Theme work only happens on `shopify-theme`.
Theme work must not touch `sync/`, Supabase migrations, or n8n workflow code.
Supabase, sync-supporting code, and n8n handoff docs use the integration flow.

## Product Model

- `supplier_products` preserves raw supplier rows and source URLs.
- `brands` stores canonical brand identities.
- `fragrance_products` is the canonical parent fragrance table.
- `product_variants` stores purchasable sizes, testers, and gift sets.
- `product_media` stores supplier, generated, Shopify, or manual media references.
- `image_generation_jobs` stores future image generation work.
- `shopify_products` exists for Shopify sync/audit records, while canonical variant IDs live on `product_variants`.

## Completion Standard

Work is complete only when:

- Required files or systems are updated.
- Relevant checks have been run or a clear reason is documented.
- Changes are committed.
- Changes are pushed to GitHub.
- Any needed handoff is recorded in `WORKBOARD.md` or `HANDOFFS.md`.
