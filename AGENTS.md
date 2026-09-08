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

## Creative library and owner realism selection

Start content work from iCloud `عمل/تجارة/Calapres/Ai-Work/المحتوى`, not Shopify's media subset
or old Downloads locations. Verify actual access and inspect the current owner folders first.
Consolidation must MOVE existing originals, never create a copied media library. The owner has
authorized moving content from both Ai-Work and the project `مكرر` archive; this move is complete.
The mistaken copy folder was deleted first. Use the private iCloud move ledger for historical paths.
Use actual current files; do not restore absent files from old manifests or delete historical
duplicate originals without separate authorization.
Under [decision 0042](decisions/0042-owner-curated-content-realism-folders.md), only Abdulrahman
classifies files into `أصيل` (closer to reality/visually convincing) and
`محتوى غير مرغوب به` (excluded from creative selection; preserve, do not delete).
Root-level content is unclassified. These owner selections guide realism; they do not certify
photographic provenance, manufacturing accuracy or publication approval. Preserve original files
and do not reintroduce an excluded image under another filename. Save new deliverables in Ai-Work.

## Binding architecture

Calapres is Shopify-native and owner-curated:

    Owner approval -> Shopify draft -> review -> Shopify publication

Shopify Admin is the operational product system. No external database, authentication service,
storage service, product queue, or supplier feed is part of the approved architecture.

Supabase is retired and prohibited as a Calapres dependency. Do not add its SDK, environment
variables, migrations, functions, storage, authentication, queues, MCP reads, or product records.
Do not restore the retired React application or the retired synchronization code from Git history.

n8n is not a source of truth. Decision 0008 permits only the bounded Optix customer-service
architecture with Calapres as the first isolated pilot. It may operate against approved Shopify
facts and brand-scoped support data with a narrow, reversible scope. Any other future n8n use
requires a separate recorded decision.

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

## Calapres creative tool restriction — owner amendment 2026-09-06

Use Magnific exclusively for image generation and editing. Do not use ChatGPT built-in image
generation or silently substitute another provider. If Magnific is unavailable, report the blocker.
For accessory accuracy and the current bridal refinement, follow decision 0025 and the existing
bridal concepts record. Approval of a concept is not publication or manufacturing approval.

## Reference examples before creative generation — owner approval 2026-09-06

Follow [decision 0038](decisions/0038-require-reference-examples-before-image-generation.md) for all future Calapres image work:
select a published image-plus-prompt example with model/settings/reference provenance, verify actual
reference delivery to Magnific, and run a bounded test before expansion. Default to one pilot and
at most one targeted correction; stop repeated failures. Reuse successful recorded tests without
redundant paid trials. Keep photographic plausibility, product fidelity and owner acceptance distinct.
Save the tested prompt, inputs, settings, output and cost for reuse. Magnific only; no new publication,
funding, account binding, subscriptions or schedules are authorized by this workflow.
