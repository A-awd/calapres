# calapres

`calapres` is the canonical repository for the Calapres Arabic-first Shopify store.
GitHub is the permanent source of truth for approved theme code, documentation, decisions, and
sanitized operational state. `main` is the only canonical branch.

## Architecture

Calapres is Shopify-native:

    Owner approval
        -> Shopify Admin (products, inventory, collections, orders, customers)
        -> Shopify sales channels and Agentic discovery

    GitHub main
        -> Shopify theme source
        -> reviewed theme deployment

Shopify is the operational source of truth for the live store. This repository is the technical
source of truth for the theme and project governance.

There is no external product database, authentication service, storage service, catalog queue, or
supplier synchronization layer in the approved architecture. Supabase was retired by owner
decision on 2026-07-29 and must not be reintroduced. n8n is not a product source. Decision 0008
permits only a bounded, Calapres-first customer-service orchestration layer; every other n8n use
still requires a separate recorded decision. Decision 0011 permits a dedicated transactional
customer-service state boundary for opaque replay, job, incident, approval, and audit records only;
it is not a product database, does not reintroduce Supabase, and remains source-only until an owner-
approved managed PostgreSQL provider passes live validation.
Decision 0018 makes the existing Chatwoot Captain assistant the active prelaunch responder on the
three social inboxes and keeps the failed n8n responder unpublished. It adds no paid service and
does not change Shopify's authority. Decision 0019 records the later Chatwoot upgrade and permits
one small, independently removable n8n bridge per Captain external feature. The first bridge reads
bounded order facts from Shopify. Decision 0020 adds a second isolated bridge whose output contract
is limited to an active product title, its canonical Shopify online-store URL, status, and a safe
clarification. Its first Playground acceptance returned no link. It adds no price, stock, discount,
bundle, customer, order, send, or write capability. Captain remains the only customer-facing
responder, every future capability requires its own named and bounded owner approval, and the old
all-purpose n8n responder remains unpublished.

## Product workflow

1. Create or import the product as a draft in Shopify.
2. Verify the Arabic title, vendor or brand, description, price, inventory policy and quantity,
   media, SEO, collections, and sales-channel eligibility.
3. Record the owner's approval.
4. Publish directly from Shopify to the approved sales channels.
5. Verify the storefront and Shopify Catalog result.

Draft status is the pre-publication gate. No external database record or queue is required.

## Theme layout

The Shopify theme is contained in:

- `assets/`
- `config/`
- `layout/`
- `locales/`
- `sections/`
- `snippets/`
- `templates/`

The retired React application, former product/supplier database migrations, edge functions, and
supplier synchronization code are not part of the current tree. Their history remains recoverable
from Git. The separately governed customer-service PostgreSQL candidate lives only under
`n8n/postgres/` and cannot hold product authority or raw customer payloads.

## Operating documents

- [AGENTS.md](AGENTS.md) — binding instructions for every AI launcher.
- [STATE.md](STATE.md) — current approved state and next action.
- [HANDOFF.md](HANDOFF.md) — continuity notes for the next session.
- [DECISIONS.md](DECISIONS.md) — decision index.
- [LAUNCHER.md](LAUNCHER.md) — vendor-neutral session protocol.
- [Optix Customer Service Architecture](docs/optix-customer-service-architecture.md) — approved
  multi-brand support design with Calapres as the first isolated pilot.
- [Calapres customer-service operations](docs/calapres-customer-service-operations.md) — no-send
  runtime, failure, recovery, retention, and promotion gates.

## SKU policy

Existing Shopify SKUs are preserved. New SKUs are assigned directly in Shopify, must be unique,
must use the `CAL-` prefix, and must not be changed after orders or integrations depend on them.
There is no database sequence or automatic supplier-derived SKU generator.

## Security boundary

Never commit credentials, customer data, order data, production exports, or platform secrets.
Do not query, modify, or delete any retired external database merely because historical code once
referenced it. External data disposal is a separate irreversible action requiring exact owner
authorization.
