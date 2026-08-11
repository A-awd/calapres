# Calapres customer-service n8n source

This directory contains the source contracts and observation-only workflow source authorized by
decision 0010. It is deliberately Calapres-scoped. It is not a multi-brand credential container,
a customer database, or a customer-facing bot release.

## Runtime source

- `workflows/calapres-customer-service-edge-v1.ts` — the only brand edge. Its current source uses a
  sanitized manual fixture and contains no public webhook or customer-send node.
- `workflows/optix-customer-service-core-v1.ts` — the private, credential-free rules sub-workflow.
  It cannot receive a public channel event or contact a customer.
- `schemas/` — strict JSON contracts for the reusable event/Core contracts, the stricter Calapres
  edge envelope, and every approved operational record class. The Core input references the
  generic envelope; the Calapres edge must first pass `calapres-event-envelope.schema.json`.
- `tests/fixtures/` — synthetic records only. They contain no production customer or order data.

The non-secret channel registry, knowledge releases, n8n project ID, and isolated Data Table IDs
are recorded under `support/brands/calapres/`.

## Local validation

Run from the repository root:

```sh
python3 -m unittest discover -s n8n/tests -p 'test_*.py'
```

The tests use only the Python standard library; they do not require package installation. They
validate the strict JSON Schema subset used by this repository and every valid fixture, then
mutate the fixtures to prove that unknown accounts/inboxes, the disabled website inbox,
outgoing messages, private notes, bot echoes, missing routing fields, live mode, customer egress,
another brand at the Calapres edge, high-risk drafts, raw identity values, and raw incident/audit
fields all fail closed. The generic Core envelope separately accepts a future brand contract so
the shared Core does not need to be edited for each brand.

## Observation boundary

The current release may normalize a sanitized event, validate it, exercise deduplication and
generation contracts, call the private Core, and record an internal observation. It must not:

- connect a live Chatwoot webhook before the persistent credential gate;
- enable Shopify customer/order lookup before scopes and live reads are proven;
- save message bodies, attachments, raw phone/email values, addresses, order payloads, or payment
  information in Data Tables;
- invoke Captain, AgentBot, an autonomous AI Agent, or a second responder;
- send a customer message or modify Shopify;
- use the paused catalog Data Table or any Supabase surface.

## Live Data Tables

Decision 0010 authorizes eight empty, Calapres-scoped operational tables in the isolated
`Calapres Customer Service` n8n project:

| Logical table | Purpose | Contract |
|---|---|---|
| `dedup` | replay/idempotency state | `dedup-record.schema.json` |
| `jobs` | conversation generation and delay state | `conversation-job.schema.json` |
| `customer_links` | verified opaque channel links | `identity-link.schema.json` |
| `order_index` | keyed lookup fingerprints and opaque Shopify references | `order-index-record.schema.json` |
| `verification` | identity verification lifecycle | `verification-record.schema.json` |
| `incidents` | sanitized escalations | `incident.schema.json` |
| `approvals` | structured owner decisions | `owner-decision.schema.json` |
| `audit` | sanitized durable audit events | `audit-event.schema.json` |

Exact non-secret IDs live in `support/brands/calapres/runtime-manifest.json`. The existing paused
catalog table is not part of this runtime.

Data Tables do not provide a documented atomic uniqueness guarantee. They are acceptable for this
no-send observation release only. Their presence must not be used as evidence that customer egress
is safe.

## Import and activation order

1. Validate this repository source and fixtures.
2. Compile/import the private Core and keep it inactive until its manual fixture passes.
3. Compile/import the Calapres edge and confirm it has no outbound customer node.
4. Bind the edge to the immutable Core v1 reference; never expose the Core by public webhook.
5. Exercise all synthetic fail-closed cases and inspect sanitized records.
6. Handle the Chatwoot persistent-access gate and Shopify read-scope gate separately.
7. Connect a live webhook only after signature and replay verification are real, not payload flags.
8. Run observation with customer egress structurally absent.

Adding a send node, activating automatic customer replies, onboarding another brand, or granting
write authority requires a later explicit owner approval and the remaining gates in decision 0010.
