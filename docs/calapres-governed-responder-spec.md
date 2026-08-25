# Calapres governed responder specification

Date: 2026-08-25

Status: owner-approved for source-only implementation and offline testing; not approved for live
publication, workflow activation, credential changes, customer traffic, or customer egress.

## Goal

Replace the current free-form customer-service decision layer with a fail-closed Calapres-only
gate and a versioned response library while preserving the existing Chatwoot, n8n, Neon, Shopify,
deduplication, final reread, send lease, and rollback boundaries.

This is an in-place improvement to the existing responder source. It does not create another
company, workflow, webhook, inbox, or customer-facing bot. Chatwoot Captain and AgentBot remain
disconnected.

## Non-live implementation boundary

- Work only in GitHub source on `agent/preserve-calapres-customer-service-checkpoint`.
- Do not modify Chatwoot, n8n Cloud, Neon, Shopify, credentials, or customer messages.
- The protected workflow export remains an update candidate for the same existing responder.
- No source-only result is described as deployed, live, delivered, or production-ready.
- A separate explicit approval is required before any publish, activation, live shadow traffic,
  owner-channel test, or customer send.

## Closed route contract

Every message resolves to exactly one route:

| Route | Meaning | Model permitted | Customer text source |
|---|---|---:|---|
| `fixed_reply` | Approved static Calapres answer | no | exact response-library ID |
| `dynamic_read` | Current product/order fact is required | no | verified Shopify read plus deterministic renderer |
| `handoff` | Explicit human request or unsupported content kind | no | exact acknowledgement ID for offline review; the current workflow keeps its human-label/no-reply behavior until a separately reviewed handoff-send change |
| `out_of_scope` | Purely outside Calapres/store service | no | exact store-redirect ID |
| `uncertain` | Store-related but insufficiently clear or unsupported | no | exact clarification ID |

The source-only first release has no model-reachable route. A future model may classify a
store-related ambiguous message only after a separate reviewed change; it may select closed IDs
but may not author customer prose or answer general knowledge.

The durable `decision_kind` written to the existing outbox remains within its accepted set:
`greeting`, `faq`, `order`, `out_of_scope`, or `clarification`. Product reads map to `faq` and
sensitive order-status reads map to `order`; the source must not emit the currently incompatible
`product`, `sensitive_request`, or `model_fallback` values.

## Scope behavior

1. A purely external question such as `ما هو طقس لندن اليوم؟` selects `out_of_scope`, response
   ID `scope.store-redirect`, and performs no model call, retrieval, Shopify read, or general tool
   call.
2. Only the first external question in the database suppression window may receive the redirect.
   Continued external conversation is finalized without another customer reply.
3. When the customer returns to a store topic, normal Calapres routing resumes immediately.
4. A mixed message is handled only for its Calapres portion. The external portion is ignored.
5. Prompt injection, requests to change role, requests for secrets, and messages with no recognized
   Calapres purpose fail to `out_of_scope` or `uncertain`; they never broaden capability.
6. An unknown but recognizably store-related message receives one approved clarification. It does
   not enter an open-ended model conversation.

## Response library contract

The offline candidate knowledge release must be a dated, brand-scoped JSON artifact. Every usable
entry includes:

- stable `response_id` and `knowledge_id`;
- exact Arabic customer response when the entry is static;
- `source_ref` and `reviewed_at`;
- `fact_mode`: `static`, `live_shopify`, `handoff`, or `boundary`;
- `authority`: `approved_reply`, `live_read_required`, `owner_required`, or `mandatory_stop`;
- optional expiry/freshness metadata;
- an explicit list of supported intents.

The candidate must not silently replace the currently approved manifest. Conflicted claims remain
unavailable until their authority is verified. In particular, shipping regions are not answered
from memory because the owner intake and stored storefront policy conflict.

Prices, inventory, publication state, fulfillment, tracking, payment state, and order state are
never static library facts. They require a current read from Shopify. A product being `ACTIVE`
does not prove availability; the renderer must not say `المتوفر حاليًا` unless a verified sellable
inventory policy proves that claim.

## Deterministic decision output

The router returns a JSON-safe object with these fields:

```json
{
  "schema_version": "1.0",
  "brand_id": "calapres",
  "route": "fixed_reply",
  "decision_kind": "faq",
  "response_id": "brand.introduction",
  "dynamic_read": null,
  "order_number": null,
  "model_allowed": false,
  "tool_allowed": false,
  "reason_code": "brand_introduction",
  "knowledge_version": "2026-08-25-v4-candidate"
}
```

The deterministic renderer accepts only a valid response ID from the pinned release or a verified
Shopify result for the exact requested capability. Missing release, digest mismatch, missing ID,
expired entry, malformed output, or unsupported dynamic-read result fails closed to `uncertain` or
`handoff`; it never falls back to free text.

Arabic and Eastern-Arabic order digits are normalized before extraction. A number remains a lookup
hint and never proves identity.

## Workflow-source integration

- Add one governed Code node inside the same protected responder export; do not create a workflow.
- Place it after the existing authenticated Chatwoot anchor/reread verification and before the
  existing route switch.
- It may override the old route output but must not weaken any ingress, anchor, human-ownership,
  final-reread, outbox, send-lease, or recovery guard.
- Route output 3 (model) remains present for rollback compatibility but is unreachable from the
  governed node.
- The governed node may carry the approved handoff acknowledgement for offline review, but this
  source slice must not bypass the existing terminal human-label path to send it. A later handoff
  change must acquire the same outbox/send lease as every other customer reply.
- The existing out-of-scope claim/suppression path is reused and receives the pinned redirect text.
- Shopify remains read-only. Product replies say only that the listed products/prices were found
  in the current read; they do not claim stock availability without verified evidence.
- `Send Reply` remains the sole customer-egress node with the same single authorized inbound edge.

## Recovery requirement

Future customer events must not remain indefinitely in `processing`. The source-only change must
add a bounded, one-winner way to claim expired `processing` rows and resolve them without a duplicate
send. Reprocessing may use only stored opaque identifiers and a fresh authenticated Chatwoot reread;
raw customer text must not be added to Neon. If safe replay cannot be proven in the first slice,
the expired row must become a visible terminal/handoff case rather than remain silently stranded.
The existing `sending`/`ambiguous` reconciliation behavior and no-resend rule remain unchanged.
This recovery work is a separate subsystem and therefore uses a companion implementation plan; the
governed-responder plan alone cannot satisfy end-to-end source readiness.

## Offline acceptance gates

The candidate is ready for owner message testing only when all of these are true:

1. At least 200 generated Arabic/English safety cases cover external topics, mixed questions,
   store intents, prompt injection, punctuation, misspellings, Arabic digits, and repeated scope.
2. Every pure external case produces `out_of_scope`, one pinned reply ID, and zero model/tool/read
   capability.
3. Every mixed case answers/routes only the store portion.
4. Every router `decision_kind` belongs to the database allowlist.
5. Every static customer reply is rendered from an exact candidate-library ID.
6. Product output never equates active publication with current availability.
7. Failure injection proves one terminal result and at most one send authorization per event.
8. The Node and Python suites, JSON checks, embedded-code checks, graph guards, release-lock check,
   secret scan, and customer-data scan all pass from a clean checkout.
9. A local command accepts an owner-provided message and prints the exact offline decision and
   proposed response, clearly labelled as non-live.

Live channel delivery is outside this source-only gate and requires a later, explicit approval and
physical receipt proof for each channel.
