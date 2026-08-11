# 0008 — Adopt the Optix multi-brand customer-service architecture

Date: 2026-08-11

Status: Accepted for design and a Calapres-only pilot

## Decision

Adopt the operating model documented in
[`docs/optix-customer-service-architecture.md`](../docs/optix-customer-service-architecture.md):

- one private Owner Agent interface;
- one shared customer-service reasoning and routing core;
- isolated brand knowledge, customer context, channels, credentials, and Shopify adapters;
- an incident ledger and explicit approval gates for sensitive actions and durable knowledge;
- Calapres as the first and only authorized pilot.

The preferred initial Owner Agent interface is private and text-first. Voice input is optional and
may be added later without changing the architecture. WhatsApp is not the only internal control
channel or source of truth.

## n8n authorization

This decision provides the new recorded decision required by decision 0006 for a bounded future
n8n workflow. n8n may be used for customer-message routing, approved knowledge retrieval, reply
drafting, variable delay, incident management, owner review, and read-only access to approved live
Shopify facts.

n8n remains prohibited from becoming a product source, catalog queue, supplier pipeline, external
approval database, or replacement for Shopify. Product publication, inventory or price changes,
theme changes, payment actions, refunds, cancellations, address changes, customer-facing
activation, and onboarding another brand remain separately gated.

## Security and isolation

Every operation must resolve an exact `brand_id` before reading knowledge, selecting credentials,
or sending a reply. An ambiguous or mismatched brand, inbox, customer, store, or credential must
stop the run. Secrets remain in the credential vault and must not appear in GitHub, prompts,
persisted workflow data, or logs; authentication headers are injected from credential references
at execution time.

## Consequences

- Improvements to the shared core can benefit every onboarded brand.
- A new brand is added through configuration, isolated credentials, knowledge, testing, and owner
  activation rather than by copying the complete agent.
- A connector failure can be disabled per brand without stopping other brands.
- The owner manages exceptions and summaries instead of reviewing every message.
- No production bot or customer-facing channel is declared operational by this decision; each
  connector and end-to-end flow still requires live validation.
