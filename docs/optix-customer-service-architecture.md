# معمارية خدمة العملاء لـ "أوبتيكس" / Optix Customer Service Architecture

Status: Approved design; Calapres observation runtime authorized by decision 0010

Date: 2026-08-11

## Purpose

This document preserves the approved future operating model for customer service across brands
managed under the Optix portfolio. `Optix` is used here as the portfolio and architecture label;
this document does not assert that it is the legal entity that owns any specific brand.

The system should let the owner supervise many brands through one private conversational interface
while keeping every brand's customer data, policies, knowledge, channels, store credentials, and
actions isolated.

Calapres is the first and only authorized pilot. No other brand account, store, channel, credential,
or customer data may be connected until that brand is separately onboarded and approved.

## Pre-implementation decision gate

Before creating the Calapres pilot, complete a read-only live audit and record one implementation
decision covering all of the following:

- whether Chatwoot AgentBot/AI is used as the channel handoff surface or omitted in favor of a
  single n8n-controlled responder;
- where the reasoning runtime executes and how the system prevents Chatwoot and n8n from producing
  two replies for the same customer event;
- webhook verification, event deduplication, batching, delay cancellation, retry, status, and
  owner-handoff behavior;
- durable storage for the Brand Registry, knowledge versions, incidents, approvals, correlation
  and idempotency keys, and audit history;
- the exact boundary between Chatwoot conversation state, n8n orchestration state, Shopify live
  facts, and the durable support-data store.

Chatwoot message history and n8n execution history alone must not be treated as the durable
knowledge or incident source of truth. Supabase remains prohibited by decision 0006; introducing
any other persistent service requires a separate recorded architecture decision. Until this gate
is closed, no customer-service workflow may be activated or allowed to send a customer message.

## Operating model

    Customer channels for each brand
        -> brand-specific inbox and connector
        -> central n8n router carrying brand_id and conversation_id
        -> shared Customer Service Core
        -> brand-scoped knowledge and live Shopify tools
        -> customer reply or private owner review

    Private Owner Agent
        -> cross-brand read-only summaries and questions
        -> incident alerts that need an owner decision
        -> explicit approval for sensitive actions or durable knowledge

The owner sees one assistant. Internally, the system is modular: one shared reasoning and routing
core, a separate adapter for every brand and channel, and isolated knowledge and credentials for
each store.

Decision 0010 fixes the implementation shape: each brand owns a thin public edge with its static
credentials and final side-effect gate. An immutable Core release is a private internal
sub-workflow with no public webhook, external credential, or customer-send node. The phrase
"central router" describes shared internal logic, not one public workflow that mixes every brand's
credentials. A new Core release is evaluated and adopted brand by brand instead of being edited in
place for all brands.

## Core components

### 1. Brand Registry

Every event must resolve to one active brand before any knowledge lookup, reply, or store action.
The registry stores non-secret configuration only:

- `brand_id` and display label;
- operating status: `disabled`, `test`, or `live`;
- Chatwoot inbox and channel mappings;
- Shopify store reference and credential reference;
- knowledge namespace;
- supported languages and tone;
- response-delay policy;
- escalation thresholds;
- owner-notification rules.

Secrets and tokens remain in an approved credential vault. They must never appear in this file,
the Brand Registry, persisted workflow data, Git history, logs, or AI prompts. Authentication
headers are injected at execution time from credential references and are never passed as ordinary
workflow items.

### 2. Shared Customer Service Core

The shared core performs the work that should improve once for every brand:

- deduplication and conversation batching;
- intent, urgency, sentiment, and risk classification;
- brand-scoped retrieval from approved knowledge;
- grounded reply drafting;
- confidence gating;
- variable, natural operational delay;
- escalation and incident creation;
- response and outcome logging.

It must fail closed when the brand, inbox, credential, or customer context is ambiguous. It must
never guess which store or brand an action belongs to.

### 3. Brand and channel adapters

Each Shopify store, Chatwoot inbox, WhatsApp number, Instagram account, TikTok account, and email
inbox keeps its own identifiers and credentials. n8n may call a small brand adapter or sub-workflow
with a fixed credential, but the Customer Service Core is not duplicated.

Adding a future brand should require only:

1. creating its Brand Registry entry;
2. connecting its isolated credentials and inboxes;
3. loading and approving its policies and knowledge;
4. running an isolated test suite;
5. moving the brand from `test` to `live` after owner approval.

### 4. Owner Agent and incident ledger

The owner does not need to read every customer message. The system should operate by exception:

- immediate alerts for security, payment, legal, privacy, widespread service, and severe-customer
  incidents;
- queued review for ordinary refunds, complaints, policy exceptions, and unknown answers;
- daily summaries for sales, orders, refunds, unresolved incidents, and missing knowledge;
- weekly summaries for repeated questions, assistant errors, and proposed policy improvements.

Every escalated issue becomes a durable incident containing an incident ID, brand, channel,
conversation reference, order reference when applicable, severity, summary, proposed response,
decision, timestamps, and outcome. The conversational interface is a remote control; it is not the
incident database or source of truth.

The approved first owner interface is text-first. A private Telegram bot is the preferred initial
remote because it supports private text, buttons, and optional voice input without making Meta a
single point of failure. Voice notes may be added later as an input convenience; the assistant may
continue to reply in text. Sensitive actions always require a structured written confirmation.

WhatsApp may be evaluated later as an optional notification mirror, but it is not the canonical
internal command channel or the only way to reach the owner.

## Knowledge governance

Knowledge is isolated by `brand_id` and versioned. An owner answer does not automatically become a
permanent policy. The owner controls reuse through four commands or their interface equivalents:

- `reply only` — use the answer for the current customer case;
- `approve` — reply and publish a new approved knowledge version;
- `approve until` — approve with an expiry date;
- `correct` — supersede an earlier version without deleting its history.

Every durable knowledge record carries its brand, source, approver, approval date, effective date,
expiry date when applicable, and the version it supersedes.

The system separates:

- live facts such as order, payment, inventory, and tracking state, which must be read from the
  operational source at request time;
- approved policies such as shipping coverage, return periods, and compensation rules;
- one-case exceptions, which must never become global policy automatically.

## Authority levels

- `A0 — read only`: sales summaries, order lookup, tracking, and inventory lookup.
- `A1 — approved reply`: respond from verified brand knowledge without changing an external
  system.
- `A2 — owner approval`: refunds, cancellations, compensation, address or order changes, policy
  exceptions, complaints, and durable knowledge updates.
- `A3 — mandatory stop`: fraud, payment disputes, legal threats, privacy requests, security events,
  public crises, or any action above a separately approved value threshold.

No financial, destructive, publishing, billing, credential, or ownership action may be executed
from an ambiguous voice transcription or an unconfirmed AI recommendation.

## Customer experience

The assistant speaks in the brand's voice rather than impersonating a named employee. It may use a
short variable operational delay so replies do not feel mechanically instantaneous. It must not
lie if directly asked about its nature, and it must retain a clear path to owner review.

When an owner decision is required, the customer should receive a truthful holding response such
as "I will verify the details and return to you" rather than a fabricated answer or a visible
internal workflow explanation.

## Reliability and measurement

Each execution carries at minimum `brand_id`, `conversation_id`, and a unique correlation ID.
Queues, retries, rate limits, error handling, and disable switches are isolated per brand so a
failure in one connector does not stop or contaminate other brands.

The primary scaling metric is owner interruptions per 100 customer conversations. Supporting
metrics include autonomous-resolution rate, incorrect-answer rate, reopened conversations,
escalations by reason, time to owner decision, customer sentiment after resolution, and knowledge
gaps created or closed.

## Calapres pilot boundary

The first implementation must use Calapres only and begin in observation or test mode. It may read
approved Shopify data and draft replies, but it may not publish products, change inventory or
prices, modify the live theme, issue refunds, cancel orders, update addresses, send customer-facing
messages, or activate another brand without the exact approvals required for those actions.

This customer-service architecture does not alter decision 0006's Shopify-native product model.
Shopify remains the operational source of truth; n8n is an orchestration layer, not a product,
customer, order, or policy source of truth.
