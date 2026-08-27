# Decision Index

Durable Calapres decisions live in the `decisions` directory. GitHub `main` is the authoritative
decision record.

## Active decisions

- [0001 — Adopt the One Brain repository foundation](decisions/0001-one-brain-foundation.md)
- [0002 — Retire Nawadir Dior and adopt an owner-curated catalog](decisions/0002-retire-nawadir-dior.md)
  — supplier retirement remains permanent; its former database architecture is superseded by
  decision 0006.
- [0003 — Calapres SKU format](decisions/0003-calapres-sku-format.md) — existing SKU immutability
  remains active; database-issued SKUs are superseded by decision 0006.
- [0004 — `main` is the single canonical branch](decisions/0004-single-canonical-branch.md)
- [0006 — Retire Supabase and adopt Shopify-native operations](decisions/0006-retire-supabase.md)
- [0007 — Publish an isolated Calapres ownership-proof site](decisions/0007-publish-ownership-proof-site.md)
- [0008 — Adopt the Optix multi-brand customer-service architecture](decisions/0008-optix-customer-service-architecture.md)
  — approved for design and a Calapres-only pilot; n8n remains an orchestration layer and every
  brand's knowledge, credentials, customer context, and store adapter stay isolated.
- [0009 — Adopt a multi-brand ownership-evidence registry](decisions/0009-adopt-multibrand-ownership-evidence-registry.md)
  — repeat the successful permanent ownership-proof pattern for each future verified brand while
  keeping Calapres as the only active implementation.
- [0010 — Adopt the Calapres customer-service runtime](decisions/0010-adopt-calapres-customer-service-runtime.md)
  — use a Calapres brand edge plus an immutable credential-free Core, direct structured LLM calls,
  a separate private Shopify index, a private no-write Owner Review Desk, scoped operational
  tables, channel-aware delay, signed-request replay protection, and a no-send observation gate;
  Captain and AgentBot do not respond and pre-activation row projections are non-persistable.
- [0011 — Require transactional customer-service state](decisions/0011-require-transactional-customer-service-state.md)
  — keep n8n Data Tables as no-send previews rather than atomic authority; require a provider-neutral
  exactly-one-winner contract backed later by an owner-approved, dedicated managed PostgreSQL
  boundary before durable internal observation or customer egress. The contract also governs a
  bounded four-inbox Chatwoot reconciliation scan and per-conversation cursor without claiming
  complete discovery, and separates signed-webhook, reconciliation, and owner database roles. No
  provider or database is created by this decision, and Supabase remains prohibited.
- [0015 — Adopt the governed Calapres response library and scope gate](decisions/0015-adopt-governed-calapres-responder.md)
  — keep one existing responder and send path; select customer replies only from versioned
  Calapres knowledge or exact Shopify read-only capabilities, and redirect external questions.
  Its fixed grammar as the primary understanding layer is superseded by decision 0016.
- [0016 — Adopt a grounded support agent with isolated brand packs](decisions/0016-adopt-grounded-support-agent.md)
  — use the existing restricted model only for strict semantic classification, validate its output
  deterministically, read live Shopify facts through bounded brand-filtered queries, and render
  replies from an isolated brand pack without web search or cross-brand access. Its requirement for
  deterministic customer-visible prose is superseded by decision 0017.
- [0017 — Adopt grounded natural response composition](decisions/0017-adopt-grounded-natural-response-composer.md)
  — preserve deterministic facts and send controls, but express each grounded draft through a
  context-aware natural composer with strict output parsing and deterministic hallucination checks.
- [0018 — Adopt Chatwoot Captain for the prelaunch customer-service pilot](decisions/0018-adopt-chatwoot-captain-prelaunch-pilot.md)
  — make the existing Captain assistant the only automatic responder on WhatsApp, Instagram, and
  TikTok and keep the failed n8n responder unpublished. Its former plan/tool restriction is
  superseded by decision 0019.
- [0019 — Adopt isolated Captain external-tool bridges](decisions/0019-adopt-isolated-captain-external-tool-bridges.md)
  — keep Captain as the only responder, permit one small independently removable n8n bridge per
  external feature, and adopt the first read-only Shopify order bridge without claiming a carrier
  connection, order-number lookup, Shopify write, or proven real matched-order response.
- [0020 — Adopt a Captain product-link bridge and concise-response policy](decisions/0020-adopt-captain-product-link-bridge-and-concise-replies.md)
  — add a second independently removable, title-and-canonical-link-only Shopify bridge; keep reply
  length and live-product-fact boundaries as two separate Captain guidelines; wait for the customer
  after silence; and record that the first Playground acceptance failed because the bridge returned
  `not_found` with no URL while Captain separately did not follow its returned safe clarification.

## Superseded decisions

- [0005 — Agentic discovery cannot bypass catalog governance](decisions/0005-agentic-catalog-governance.md)
  — superseded by decision 0006.

Add a numbered decision when scope, architecture, security posture, source authority, or operating
policy changes.
