# Agent Instructions

These instructions apply equally to Claude, Codex, ChatGPT, Hermes, and every future launcher.

## Start every session

1. Open `A-awd/calapres`, confirm `main`, fetch the latest GitHub state, and inspect the working
   tree and synchronization status.
2. Read `README.md`, this file, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and `LAUNCHER.md`, plus
   relevant linked decisions.
3. Treat platform-local chats, memories, caches, generated summaries, and unpushed work as
   non-authoritative.
4. Continue the existing implementation. Do not restart completed work or recreate retired
   systems.

## Sources of truth

- GitHub `main`: approved theme code, technical documentation, decisions, and sanitized handoffs.
- Shopify: products, inventory, collections, customers, orders, markets, policies, and live store
  configuration.
- Approved Design Labs: visual direction until superseded by a recorded decision.

## Binding architecture

Calapres is Shopify-native and owner-curated:

    Owner approval -> Shopify draft -> review -> Shopify publication

Shopify Admin is the operational product system. No external database, authentication service,
storage service, product queue, or supplier feed is part of the approved architecture.

Supabase is retired and prohibited as a Calapres dependency. Do not add its SDK, environment
variables, migrations, functions, storage, authentication, queues, MCP reads, or product records.
Do not restore the retired React application or the retired synchronization code from Git history.

n8n is not a source of truth. Any future n8n use requires a new recorded decision and must operate
directly against approved Shopify data with a narrow, reversible scope.

## Product publication gate

A product may be published only after the owner approves it and the operator verifies in Shopify:

- Arabic title and accurate description.
- Vendor or brand.
- Owner-approved price.
- Explicit inventory policy and quantity.
- Approved product media.
- SEO fields.
- Collections and sales channels.

Keep incomplete products as drafts. Never invent price, inventory, media, legal identity, tax
information, or commercial terms.

## Permanently prohibited

- Supplier crawling, sitemap discovery, or automatic product discovery.
- Supplier price, inventory, image, or catalog synchronization.
- Reading or restoring Nawadir Dior or Salla supplier sources.
- Recreating a retired supplier pipeline or supplier-derived SKU generator.
- Reintroducing Supabase as a product, customer, order, authentication, storage, or queue system.
- Bulk publication, bulk deletion, or destructive catalog changes without explicit owner
  authorization.

## Legacy products and SKUs

Legacy Shopify products remain static until the owner reviews them. Do not republish, reprice,
restock, re-image, draft, or delete them automatically.

Existing SKUs are immutable. New SKUs are assigned in Shopify, must be unique, and must use the
`CAL-` prefix. Do not encode a supplier dependency in a new SKU.

## Working rules

- Inspect before modifying and preserve useful Git history.
- Use Shopify-native features whenever practical.
- Never commit credentials, customer or order data, raw conversations, unsanitized exports, or
  production secrets.
- Safe, requested implementation work should proceed without asking the owner to perform routine
  technical steps.
- Stop only for credentials, authentication, OTP or 2FA, payment authorization, domain
  verification, irreversible destruction, or a genuine commercial decision.

## End every meaningful session

1. Validate the exact change.
2. Update `STATE.md` and `HANDOFF.md`.
3. Add or update a numbered decision when architecture, scope, security posture, or policy changes.
4. Commit and push authorized work to `main`.
5. Verify the remote revision and record blockers and the next safe action.
6. Never leave durable project state only in a conversation.
