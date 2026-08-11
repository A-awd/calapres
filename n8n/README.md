# Calapres customer-service n8n source

This directory contains the source contracts and observation-only workflow source authorized by
decision 0010. It is deliberately Calapres-scoped. It is not a multi-brand credential container,
a customer database, or a customer-facing bot release.

## Runtime source

- `workflows/calapres-customer-service-edge-v1.ts` — the only brand edge. Its current source uses a
  sanitized manual fixture, merges the post-response delay stage into the edge, and contains no
  public webhook or customer-send node. The Wait receives only the strict
  `delayed-observation-state` contract; message content and model candidates are discarded first.
  Its exact ordered fields are bound by canonical SHA-256, and it carries only the pinned
  baseline-HMAC key version plus opaque status/assignee fingerprints. Live baseline capture is
  deliberately unavailable and fails closed until the Chatwoot read and HMAC credential are approved.
  The compiled policy uses 30–75 seconds for Instagram/TikTok/WhatsApp, 120–300 seconds for Email,
  and one second only for the synthetic test fixture. Live-shaped input keeps the kill switch on.
- `workflows/optix-customer-service-core-v1.ts` — the private, credential-free rules sub-workflow.
  It cannot receive a public channel event or contact a customer.
- `workflows/calapres-shopify-order-index-v1.ts` — a separate private, inactive index workflow
  because Shopify order events and reconciliation are a different ingress domain. It accepts only
  keyed fingerprints and opaque Shopify references, maps them to the exact 12-column live table
  contract, and performs no Data Table or Shopify write.
- `workflows/calapres-owner-review-desk-v1.ts` — a separate private, inactive owner-command
  validator. It binds the exact case, incident revision, owner, private-message fingerprint,
  nonce, and content digests, then emits only a lossless no-write preview. It has no public
  webhook, credential, Data Table node, model, customer send, or knowledge publication action.
- `schemas/` — strict JSON contracts for the reusable event/Core contracts, the stricter Calapres
  edge envelope, the provider-neutral structured model candidate, signed Chatwoot ingress,
  transient live re-read evidence, the identifiers-only Wait state, the post-delay decision, and
  every approved operational record class. The Core input
  references the generic envelope and `llm-candidate.schema.json`; the Calapres edge must first
  pass `calapres-event-envelope.schema.json`.
- `tests/fixtures/` — synthetic records only. They contain no production customer or order data.

The non-secret channel registry, knowledge releases, n8n project ID, and isolated Data Table IDs
are recorded under `support/brands/calapres/`. The approved response-style release is indexed by
`support/brands/calapres/response-style/manifest.json`. The separate model-policy manifest is
`support/brands/calapres/model-policy/manifest.json`; it remains `proposed` and inactive pending
its explicit access/privacy approval gate.

## Local validation

Run from the repository root:

```sh
python3 -m unittest discover -s n8n/tests -p 'test_*.py'
```

The tests use only the Python standard library and the local Node.js runtime used for n8n source;
they do not require package installation. They validate the strict JSON Schema subset used by this
repository, every valid fixture, and the JavaScript inside every n8n Code node, then
mutate the fixtures to prove that unknown accounts/inboxes, the disabled website inbox,
outgoing messages, private notes, bot echoes, missing routing fields, live mode, customer egress,
another brand at the Calapres edge, high-risk drafts, raw identity values, raw Wait state,
unverified post-delay rechecks, payload-supplied transport claims, unsigned Delivery-header replay,
fresh-signature redelivery, event-identity mutation, truncated or changed bounded re-read sets,
same-second human intervention, oversized webhook bodies, invented or owner-only knowledge
references, mismatched live-fact IDs, adversarial free-text model drafts, non-HMAC order-index
commands, raw incident/audit fields, mismatched owner/case/revision references, replay timing, and
untrusted owner commands all fail closed. A model draft is never forwarded as the
grounded result; the Core renders from the approved knowledge or verified live-fact response text.
The generic Core envelope and provider-neutral candidate contract separately accept future brand
logic so the shared Core does not need to be edited for each brand or model provider.

## Observation boundary

The current release may normalize a sanitized event, validate it, exercise deduplication and
generation contracts, respond to a future webhook before delaying, carry identifiers through a
Wait, require a fresh re-read, call the private Core, and record an internal observation. There is
no standalone delay workflow: keeping the stage in the edge preserves the same brand/credential
boundary and avoids another execution boundary. It must not:

- connect a live Chatwoot webhook before the persistent credential gate;
- enable Shopify customer/order lookup before scopes and live reads are proven;
- save message bodies, attachments, raw phone/email values, addresses, order payloads, or payment
  information in Data Tables;
- pass message text, a transcript, a sender identity value, or a model draft through the Wait;
- persist full signed-ingress, live-re-read, or post-delay evidence in Wait, Data Tables, or audit;
- treat a missing, unverified, stale, or human-intervened post-delay recheck as eligible;
- invoke Captain, AgentBot, an autonomous AI Agent, or a second responder;
- send a customer message or modify Shopify;
- use the paused catalog Data Table or any Supabase surface.

## Live Data Tables

Decision 0010 authorizes eight empty, Calapres-scoped operational tables in the isolated
`Calapres Customer Service` n8n project:

| Logical table | Purpose | Contract |
|---|---|---|
| `dedup` | stable business-event idempotency; request replay remains a separate transport gate | `dedup-record.schema.json`; exact preview `edge-dedup-table-row.schema.json` |
| `jobs` | conversation generation and delay state | `conversation-job.schema.json`; exact preview `edge-conversation-job-table-row.schema.json` |
| `customer_links` | verified opaque channel links | `identity-link.schema.json` |
| `order_index` | keyed lookup fingerprints and opaque Shopify references | `order-index-table-row.schema.json` |
| `verification` | identity verification lifecycle | `verification-record.schema.json` |
| `incidents` | sanitized escalations | `incident.schema.json`; edge preview `edge-incident-table-row.schema.json`; owner projection `owner-incident-table-row.schema.json` |
| `approvals` | structured owner decisions | `owner-decision.schema.json`; exact projection `owner-approval-required-row.schema.json` |
| `audit` | sanitized durable audit events | `audit-event.schema.json`; edge preview `edge-audit-table-row.schema.json`; owner projection `owner-audit-table-row.schema.json` |

Exact non-secret IDs live in `support/brands/calapres/runtime-manifest.json`. The existing paused
catalog table is not part of this runtime.

Data Tables do not provide a documented atomic uniqueness guarantee. They are acceptable for this
no-send observation release only. Their presence must not be used as evidence that customer egress
is safe. The current Edge table rows are shape previews only: `persistence_ready=false` and
`persistable=false`. Live dedup must bind `event_key` to the stable business-event HMAC, atomically
reserve it, and dual-read retained prior key versions through the dedup TTL. The signed-request
replay fingerprint is a separate short-lived transport check; an unsigned Delivery header never
defines event identity.

## Import and activation order

1. Validate this repository source and fixtures.
2. Compile/import the private Core and keep it inactive until its manual fixture passes.
3. Compile/import the Calapres edge and confirm it has no outbound customer node.
4. Confirm the merged Wait carrier contains only the strict identifier/control contract, its
   canonical fingerprint and baseline key-version bindings verify after Wait, and live baseline
   capture plus the live-re-read placeholder fail closed until Chatwoot read and HMAC credentials
   are approved.
5. Validate and import the Shopify order-index workflow inactive; do not bind a credential yet.
6. Validate and import the private Owner Review Desk inactive with caller policy `none`; keep every
   persistence and publication path absent.
7. Bind the edge to the immutable Core v1 reference; never expose the Core by public webhook.
8. Exercise all synthetic fail-closed cases and inspect sanitized records.
9. Handle the Chatwoot persistent-access gate and Shopify read-scope gate separately.
10. Connect a live webhook only after signature and replay verification are real, not payload flags.
11. Run observation with customer egress structurally absent.

Adding a send node, activating automatic customer replies, onboarding another brand, or granting
write authority requires a later explicit owner approval and the remaining gates in decision 0010.
