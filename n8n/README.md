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
- `workflows/calapres-customer-service-edge-v2.ts` — the immutable source candidate for updating
  that same Edge, never for creating a second Calapres edge. It keeps the manual synthetic branch
  and adds a source-only production topology: signed raw-body ingress, native HMAC placeholders,
  recoverable request/event leases, pre-acknowledgement Chatwoot baseline fingerprints, one
  combined PostgreSQL generation/job commit, database-computed `due_at`, an identifiers-only Wait,
  and a 30-minute crash-recovery schedule branch inside the same workflow. The schedule also
  contains a gated four-inbox Chatwoot reconciliation path: one inbox scan lease, two bounded
  conversation snapshots, a durable per-conversation message cursor, and no cursor advance until
  every 1–99-row proof is verified. A 100-row result stops. Discovery remains explicitly
  `best_effort`; it does not claim a complete account ledger. Both normal/recovery workers must win
  the same due-job lease and repeat the bounded Chatwoot re-read before Core. The model gate and
  customer egress are structurally closed. The deployment manifest targets the existing workflow ID with
  `update_existing_only`; live import, credential binding, publishing, and activation remain
  prohibited.
- `workflows/optix-customer-service-core-v1.ts` — the private, credential-free rules sub-workflow.

The model phase also has a deny-first PostgreSQL reservation guard in migration 0008. It is
Calapres-only, defaults to disabled with a kill switch, reserves no more than $45/month internally,
and caps each conversation at 20 requests/day. It stores counters only; no prompts or responses.
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
- `runtime/` — pure, credential-free staged Chatwoot verification and post-delay logic. Native n8n
  nodes own HTTP, HMAC, PostgreSQL, and Wait effects; Code nodes do not read secrets or open
  network connections. Each HMAC plan stays on one item through fixed sequential native Crypto
  nodes and a per-item finalizer; there is no Split/Merge or positional result join. The finalizer
  validates shape and binding but truthfully records that cryptographic verification was not
  performed in Code. The reviewed graph and release hash are part of the credential boundary.
- `modules/` — deterministic brand-context compiler and provider-neutral model boundary. Customer
  excerpts are minimized and adversarially scanned; a model can classify/select approved IDs but
  its free-text draft is never the grounded response. The compiled context is pinned by a fixed
  trust artifact and final release lock, not by webhook data.
- `adapters/` — the provider-neutral atomic contract, an in-memory concurrency reference used only
  by tests, and the read-only Shopify identity adapter contract.
- `postgres/` — a PostgreSQL adapter candidate and migrations `0001`–`0007`. They define a
  Calapres-only key registry, recoverable replay/business leases, combined durable ingress commit,
  database-authoritative lifecycle time, due-job recovery, best-effort reconciliation scan/cursor
  compare-and-swap, and split Edge/owner execute-only roles.
  They are not production-validated until compiled and raced on an isolated real PostgreSQL engine.

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

Data Tables do not provide a documented atomic uniqueness guarantee. They remain empty
shape/previews and cannot authorize durable observation or customer egress. The PostgreSQL
candidate separates short-lived signed-request replay from stable business-event identity. A
request starts under a recoverable processing lease; it is a safe completed duplicate only after
one transaction links it to the business event, exact conversation generation, and durable due
job. The job carries identifiers and keyed control fingerprints only—never the message body,
phone, email, address, prompt, model draft, or Shopify payload. PostgreSQL creates all lifecycle
timestamps from its clock. The unsigned Delivery header never defines replay or event identity.

## Import and activation order

1. Validate this repository source and fixtures.
2. Compile/import the private Core and keep it inactive until its manual fixture passes.
3. Validate Edge v2 and its `update_existing_only` manifest, then update workflow
   `e442GlRmKP4IO8pm` only. Never create another Calapres Edge. Keep the live v1 draft unchanged
   until the provider, credentials, and inactive-import action are separately approved.
4. Confirm the merged Wait carrier contains only the strict identifier/control contract, its
   canonical fingerprint and baseline key-version bindings verify after Wait, and live baseline
   capture plus the live-re-read placeholder fail closed until Chatwoot read and HMAC credentials
   are approved.
5. Validate the PostgreSQL migrations in an isolated database. Prove database clock, key rotation,
   crash recovery, one-winner due-job claims, role isolation, backup, and restore before any live
   binding. The signed-webhook credential may execute only its eight fixed functions, the
   reconciliation credential only its six fixed functions, and the Owner credential only its two
   fixed functions. Shared logical operations use source-specific wrappers; the old generic Edge
   role receives no callable function.
6. Validate and import the Shopify order-index workflow inactive; do not bind a credential yet.
7. Validate and import the private Owner Review Desk inactive with caller policy `none`; keep every
   persistence and publication path absent.
8. Bind the edge to the immutable Core v1 reference; never expose the Core by public webhook.
9. Exercise all synthetic fail-closed, crash, duplicate, stale-generation, recovery, and graph-path
   cases and inspect sanitized records.
10. Handle the Chatwoot persistent-access gate, HMAC keys, PostgreSQL credential, model privacy
   gate, and Shopify read-scope gate separately.
11. Connect a live webhook only after the signed fixture, pre-ack baseline, combined durable commit,
   and schedule recovery are proven. HTTP 204 is forbidden before the durable job exists.
12. Run observation with the model call and customer egress structurally absent.

Adding a send node, activating automatic customer replies, onboarding another brand, or granting
write authority requires a later explicit owner approval and the remaining gates in decision 0010.
