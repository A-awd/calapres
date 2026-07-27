# Agent Instructions

These instructions apply equally to Claude, Codex, ChatGPT, Hermes, and every future launcher.

## Start every session

1. Open the calapres repository and confirm the target branch and latest GitHub commit.
2. Read README.md, this file, STATE.md, HANDOFF.md, and relevant entries in DECISIONS.md.
3. Use ai-operating-system only for global rules; calapres operational memory belongs here.
4. Treat platform-local chats, memories, caches, and local copies as non-authoritative until reconciled with GitHub.

## Working rules

- Preserve useful code and Git history.
- Store only sanitized, project-specific context in this repository.
- Never commit credentials, customer or order data, raw conversations, unsanitized exports, or production secrets.
- Do not change live Shopify, Supabase, automation, hosting, repository settings, or other production state without explicit authorization.
- Prefer the latest approved GitHub state when sources conflict, and record durable resolutions in DECISIONS.md.

## End every meaningful session

Update STATE.md and HANDOFF.md, add a decision when one was made, then commit and push the approved work when authorized. Leave the next action precise enough for another launcher to continue without relying on platform memory.

## Canonical authority and entry contract

GitHub is the only permanent source of truth for approved, sanitized project state. Platform-local memory, chat history, launcher text, caches, and unpushed work are non-authoritative.

At session start, read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and `LAUNCHER.md`, plus relevant linked decisions and workflows. Continue only from the latest verified GitHub branch and commit.

## Required One Brain synchronization contract

Before work, every supported agent must verify the canonical remote `A-awd/calapres`, inspect the working tree, current branch, latest local commit, latest GitHub commit, and synchronization state, then continue only from the latest verified GitHub state. Read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and `LAUNCHER.md`, plus relevant linked decisions, workflows, and security guidance.

After meaningful work, validate the exact change; update `STATE.md` and `HANDOFF.md`; update `DECISIONS.md` when a durable decision is made; record blockers, risks, and unfinished or unpushed work; commit and push when authorized; and verify that GitHub contains the reported revision. If push is unavailable or unauthorized, record the exact unpushed state and do not claim durable completion.

GitHub is the only permanent authority. Platform memory, chat history, launcher text, caches, local scratch files, and unpushed work are non-authoritative. Never leave GitHub behind the conversation.

<!-- Append this block to the end of AGENTS.md. Nothing above it needs to change. -->

## Binding architecture — Calapres is an owner-curated catalog

Effective 2026-07-27, per `decisions/0002-retire-nawadir-dior.md`.

    Owner-selected products -> Supabase -> n8n -> Shopify

Supabase is the canonical product database. n8n is the only orchestration layer. Shopify is a sales
channel only.

### Permanently prohibited

Supplier crawling. Sitemap or catalog discovery. Automatic product discovery of any kind. Supplier
price synchronization. Supplier stock synchronization. Supplier image ingestion. Reconciliation
against any external store. Any read of `nawadirdior.sa`, `salla`, or their CDNs. Any write to the
`archive` schema. Recreating a `CAL-ND-*` SKU. Rewriting an existing `calapres_sku`.

### Required before any product reaches Shopify

`ready_for_shopify = true`, which the database enforces and which requires a title, a brand,
`lifecycle_status = 'approved'`, a named `approved_by`, at least one variant with
`pricing_status = 'approved'` and a positive `selling_price`, and at least one image with
`image_status = 'approved'`.

`public.shopify_sync_queue` is the only authorized push source. Never push from any other query.

### Legacy products

Products with `origin = 'legacy_supplier'` are a frozen static catalog. Never republish, reprice,
restock, re-image, bulk-Draft, or delete them automatically. They change only through an explicit,
recorded owner decision taken from `public.legacy_product_review`.

### Pricing

There is no automatic pricing rule. `cost_price`, `selling_price`, and `compare_at_price` are set
by the owner. `gross_margin` is derived. Any future automatic rule requires a new numbered decision
before it may be implemented.
