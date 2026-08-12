# 0010 — Adopt the Calapres customer-service runtime

Date: 2026-08-11

Status: Accepted for an observation-only Calapres implementation

## Context

Decision 0008 approved the Optix multi-brand operating model but required a live audit and a
separate implementation decision before any workflow was created or activated. The audit is now
complete for the current Calapres Chatwoot account and n8n instance.

Confirmed Chatwoot state:

- account `179973` has one verified administrator/agent named `خدمة عملاء كالابريز`;
- that agent is online and automatic offline marking is disabled;
- the four target inboxes are Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and email
  `128326`;
- inbox `128028` is a website inbox and is outside this pilot until separately validated;
- no account webhook, AgentBot, automation rule, Dialogflow integration, or Chatwoot OpenAI
  integration is active;
- Captain assistant `Calapres Assistant` exists with stored FAQ/document material but is not
  connected to an inbox and therefore cannot reply;
- the current Chatwoot plan is Startups with one seat.

Confirmed n8n state:

- there is no customer-service, Chatwoot, WhatsApp, Optix Core, or AI Agent workflow;
- all existing workflows named Calapres are inactive and unrelated to customer service;
- the current personal project mixes unrelated activities and brands, so it is not an acceptable
  long-term isolation boundary;
- no Chatwoot credential exists;
- the saved `Shopify-Calapres` credential has a historical successful test but its recorded scopes
  do not include `read_customers`;
- one existing Calapres product-state Data Table belongs to the paused catalog/product work and
  must not be reused;
- no customer identity, incident, approval, audit, batching, or idempotency table exists.

## Decision

Build a Calapres-only observation runtime in n8n using a thin brand edge and a versioned shared
core. The implementation is not a second Chatwoot bot and has no customer egress in this phase.

### Runtime topology

1. `Calapres | Customer Service Edge v1` is the only public entry surface. It owns the Calapres
   inbox allowlist, webhook verification, normalization, operational state, brand-scoped
   credentials, live-source calls, delay, cancellation checks, incident creation, and the final
   egress gate.
2. `Optix | Customer Service Core v1` is a private sub-workflow. It has no public webhook, channel
   credential, store credential, customer-send node, or authority to modify an external system.
   It validates the envelope, applies common intent/risk/authority rules, and validates structured
   classification and draft results.
3. The LLM is called directly and structurally from the Calapres edge with a fixed Calapres-scoped
   credential. n8n AI Agent, autonomous tools, chat memory, Captain, and AgentBot are not used.
   The model never receives a send credential or permission to select a store or brand.
4. Only the Calapres edge may eventually send. In observation mode the egress branch is absent or
   hard-disabled and the result is an internal draft/audit record only.
5. Core releases become immutable when their first observation or live release is approved. Before
   that activation boundary, an inactive and unpublished candidate may be corrected in place while
   its source and live shell are kept synchronized and the full validation suite is rerun. After
   approval, a future `Core v2` is created beside `v1`, evaluated in shadow mode, and adopted brand
   by brand; an approved Core workflow is never edited in place for every brand.
6. The channel delay and post-delay recheck remain inside the Calapres edge. After a future webhook
   response, the Wait may retain only the strict identifier/control contract; it must not retain a
   message body, sender value, attachment, model candidate, or draft.
7. `Calapres | Shopify Order Index v1` is a separate private workflow because Shopify event
   verification and reconciliation are a different root ingress and retry lifecycle. It is not a
   second brain. The observation release accepts only keyed fingerprints and opaque Shopify
   references, maps them explicitly to the isolated table columns, and performs no write.
8. `Calapres | Owner Review Desk v1` is a separate private sub-workflow because owner commands are
   a different trust domain from customer ingress. Its inactive observation release has no public
   webhook, credential, external call, Data Table node, model, customer send, or knowledge publish
   action. It validates and previews decisions only; caller policy remains `none` until a trusted
   owner-ingress path is separately implemented and approved.

This resolves the earlier phrase "central router": the central part is versioned internal logic,
not one giant public workflow that carries every brand credential.

### Brand resolution and channel contract

The edge derives `brand_id=calapres` from the allowlisted Chatwoot account and inbox. It never
trusts a `brand_id` supplied in a webhook body. Every accepted event must contain or derive:

- `schema_version`;
- `brand_id`;
- `account_id` and `inbox_id`;
- `channel` and channel capability flags;
- `conversation_id` and `message_id`;
- `delivery_id` when Chatwoot supplies one;
- `correlation_id` and `idempotency_key`;
- event time, direction, visibility, sender/contact reference, content kind, and attachment
  metadata without persisting attachment content.

Unknown account, unknown inbox, outgoing message, private note, bot echo, missing conversation,
or mismatched brand stops before retrieval or LLM use. The website inbox remains disabled in the
registry until it passes the same live channel test as the four target inboxes.

### Single-responder rule

- Captain remains disconnected and AgentBot remains absent.
- Chatwoot automations do not produce customer replies.
- A customer-facing send node does not exist in the observation release.
- Before any later send, the edge must re-read the conversation and cancel when it finds a newer
  inbound message, a newer public human reply, a private owner instruction, a changed owner/status,
  a consumed idempotency key, or a disabled brand/kill switch.
- The re-read must bind the exact incoming/public anchor message to the Wait carrier and perform
  two independent, non-paginated reads with `after=anchor_message_id-1`. Each raw response must
  contain 1–99 valid rows, include the exact anchor, and produce the same canonical message set.
  Same-second messages are ordered by numeric message ID; a 100-row response, any changed set,
  invalid route/row, missing anchor, or newer non-activity message stops. This bounded v1 rule does
  not claim complete-history coverage or use a cursor chain that Chatwoot ordering could skip.
- A public human reply makes the conversation human-owned until an explicit bot-resume event or a
  new resolved-to-open lifecycle starts.

### Batching and delay

Chat messages are grouped by exact `brand_id + conversation_id`. A new inbound message advances a
generation token; older waiting executions wake and stop when their token is no longer current.
The observation target is a short channel-appropriate delay after the last message, with email
allowed a longer interval. The delay is measured and tested but produces no customer send.

### Identity and live facts

Chatwoot is the channel-contact and conversation source. It is not a guaranteed cross-channel
identity provider. The runtime may reuse an exact channel identity and may link another channel
only after verification. It must not merge customers by display name or social handle.

Shopify remains authoritative for customers, orders, payment, fulfillment, inventory, and
tracking. n8n stores only references and derived lookup fingerprints. A response always re-reads
the current Shopify record before presenting an operational fact. Until `read_customers` and the
required read paths are proven live, customer/order lookup capability is `disabled` and order
questions must fail closed rather than ask the model to guess.

### Persistence

No new external database is introduced.

- GitHub `main` stores the non-secret Brand Registry, schemas, approved policies, dated knowledge
  versions, workflow source, implementation decisions, and sanitized test fixtures. It never
  stores customer data, order data, raw conversations, attachments, tokens, or production logs.
- Shopify stores live commerce facts.
- Chatwoot stores channel conversations and contact records.
- Calapres-scoped n8n Data Tables store pilot operational state only: event deduplication,
  conversation generations/jobs, verified identity references, derived order-index fingerprints,
  incidents, case approvals, and sanitized audit events.
- n8n execution history is diagnostic only and must not be the incident, knowledge, or approval
  source of truth.

The Data Tables must not contain raw phone numbers, raw email addresses, addresses, message bodies,
attachments, order payloads, payment data, secrets, or full transcripts. Contact lookup values use
keyed fingerprints whose key remains in the credential vault. Loss of an index causes
re-verification or re-indexing, never disclosure.

n8n Data Tables do not provide a documented transactional uniqueness guarantee. They are accepted
for this observation pilot because egress is disabled. Automatic sending remains blocked until
concurrency/idempotency testing proves the final gate or a later recorded decision adopts a store
with the required atomic guarantees.

### Knowledge and owner decisions

The first knowledge pack contains only verified brand identity, tone, channel rules, authority
rules, and explicitly approved facts. Missing commercial policy is a knowledge gap, not an
invitation to infer.

Owner decisions are one of `reply_only`, `approve`, `approve_until`, or `correct`. Only an explicit
approval creates a new dated, brand-scoped GitHub knowledge version. A case-only answer remains in
the case approval/incident record and never silently becomes policy.

The decision contract binds the exact Calapres account/inbox/channel, conversation, incident ID
and revision, allowlisted owner reference, private-message HMAC fingerprint and key version,
single-use nonce timing, command digest, case-reply digest, and any knowledge proposal/base/target/
superseded versions. A validated preview has status `prepared` and `committed_at=null`; validation
does not mean the reply was sent, the incident was resolved, the row was written, or knowledge was
published. The approvals, incidents, and audit tables may be column-aligned in advance, but no
write path is allowed until fresh Chatwoot re-read, actor verification, digest re-verification,
incident compare-and-swap, atomic idempotency, and live schema re-verification all pass.

The first owner review surface may use sanitized n8n records and Chatwoot private notes. A private
Telegram Owner Agent is deferred until its credential and command contract receive a separate
activation review; it is not required to prove the no-send observation path.

### Failure, security, and cost boundaries

- Webhooks require signature verification and replay protection before message content is used.
- Transport verification evidence must be created by the verified graph branch, never accepted
  from fields inside an event payload. A public webhook must not connect directly to normalization.
- LLM output must match a strict schema and is treated as untrusted until deterministic checks
  pass.
- Every candidate knowledge ID must exist in the selected approved knowledge context and have
  `draft_only` authority; every live-fact ID must match the verified live-fact set. Unknown,
  owner-required, or mandatory-stop references escalate rather than becoming an observed draft.
- A free-text model draft is untrusted evaluation material and is never forwarded as a grounded
  result. The Core renders an observation draft only from the exact versioned customer-response
  text attached to approved knowledge or from a response fragment produced by a verified live
  source adapter.
- Store and channel credentials are statically bound in the brand edge and never selected from
  model output.
- All external failures, rate limits, ambiguous matches, stale knowledge, and schema failures end
  in `no_action` or an internal incident.
- Payload saving is minimized or disabled for nodes that handle customer or order data.
- The pilot adds n8n executions and LLM usage only; it does not consume Captain response credits
  because Captain is disconnected.
- Webhook-driven execution is preferred over high-frequency polling. The Core sub-workflow is an
  internal implementation unit, not a second customer execution or responder.

### Pre-activation safety bindings

The Calapres edge compiles the registry delay policy as 30–75 seconds for Instagram, TikTok, and
WhatsApp and 120–300 seconds for Email. A deterministic value is selected per event so a retry does
not invent a different due time. The one-second path is synthetic-test-only; live-shaped input
keeps the brand kill switch enabled until the live binding is approved.

The future Chatwoot ingress must reject an empty or larger-than-1-MiB body before parsing or HMAC,
verify the exact raw bytes and timestamp, and derive request replay identity from the signed request.
After verified parsing, it must separately derive stable business-event identity with a
brand-scoped HMAC over the ordered allowlisted account/inbox/event/conversation/message tuple. A
redelivery with a new timestamp/signature has a new request-replay fingerprint but the same event
fingerprint. Prior event-identity key versions must be retained and dual-read through the dedup TTL. The
unsigned `X-Chatwoot-Delivery` header is optional metadata and must never let a replay acquire a new
identity. Signed-ingress, live-re-read, and post-delay evidence are transient-only; full evidence
cannot enter Wait, Data Tables, or durable audit.

Every secret-keyed digest in Edge v2 is computed by a fixed native n8n Crypto node with a statically
bound Calapres credential. One item moves directly through the required sequential Crypto nodes;
each node writes one fixed digest field and the per-item finalizer reads only that same `$json`.
Split/Merge, positional batching, `$input.all()`, `.first()`, caller-supplied digest metadata, and a
Code-node secret are forbidden inside this chain. Code validates the exact result shape and its
plan binding but does not claim to have performed cryptographic verification itself. The reviewed
workflow graph, credential binding, source hash, and release lock are therefore part of this trust
boundary; graph drift or a Crypto failure stops before any durable acknowledgement.

The identifiers-only Wait carrier binds its exact ordered fields with a canonical SHA-256
fingerprint and includes only the pinned baseline-HMAC key version plus opaque status and assignee
fingerprints. Raw status and assignee values are forbidden. The same HMAC key version must remain
available through the maximum Wait interval and be used for the fresh Chatwoot comparison; until
that pre-Wait baseline capture is credential-backed, live-shaped input fails closed before Wait.
The carrier SHA detects unexpected in-execution mutation but is not an authorization boundary
against an n8n project editor who could recompute it; project access isolation and the secret-keyed
baseline fingerprints remain required security boundaries.

The pre-activation Edge may render exact operational table-row previews for validation, but static
fixture fingerprints are never live-persistable. Until a verified request replay claim, stable
business-event HMAC, keyed identity HMAC, live schema recheck, and safe atomic idempotency
implementation exist, every preview keeps
`write_executed=false`, `persistence_ready=false`, and `persistable=false`.

## Activation gates

Observation may start after the workflow source and schemas validate, isolated tables exist, and
the Calapres edge is confirmed to have no outbound customer node.

Live webhook connection requires an approved Chatwoot credential and a deliberate final action
because it grants persistent access and transmits customer events to n8n. Shopify customer lookup
requires a deliberate scope review and live read test. These are implementation gates, not reasons
to weaken or bypass identity verification.

Customer egress remains disabled until all of the following are demonstrated:

1. exact routing for all four target inboxes and fail-closed routing for every other inbox;
2. valid webhook signature and replay rejection;
3. one draft for a duplicate event;
4. batching and stale-generation cancellation;
5. human intervention cancellation;
6. verified live-source retrieval with ambiguous and failure cases stopping safely;
7. structured owner review and incident persistence;
8. clean logs with no secrets or unnecessary customer data;
9. brand kill switch and rollback;
10. separate owner approval for customer-facing activation.

## Consequences

- Calapres can be built and tested now without risking a customer reply.
- Existing Captain knowledge may be reviewed as a migration source, but it is not authoritative or
  connected to the runtime.
- A future brand gets its own edge, project/data boundary, credentials, registry entry, knowledge,
  and tests while reusing an immutable Core release.
- The paused catalog table, workflows, and Shopify-Meta catalog relationship remain untouched.
- Supabase remains prohibited.
