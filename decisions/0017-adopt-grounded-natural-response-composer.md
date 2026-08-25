# 0017 — Adopt grounded natural response composition

Date: 2026-08-25
Status: accepted and live for owner use

## Context

Decision 0016 correctly separated semantic classification from facts and tools, but it prohibited
the model from writing the final customer response. That left deterministic templates as the last
customer-visible layer. Owner evidence from WhatsApp and Instagram showed repetitive replies that
ignored conversational wording and felt like an automated menu. A separate defect also discarded
the verified Chatwoot transcript because the producer emitted `customer/store + text` while the
consumer accepted only `incoming/outgoing + content`. TikTok webhooks could additionally express an
incoming message as numeric `0`, while the outer gate accepted only the string `incoming`.

## Decision

1. Keep the same live responder `kAyF0D3ZZHxc0Hwp`, webhook, inboxes, credentials, Shopify
   read-only boundary, durable state gates, final reread, send lease, and single authorized
   `Send Reply` edge. Do not create a parallel test or production workflow.
2. Accept a Chatwoot inbound message only when its direction is either the string `incoming` or the
   documented numeric form `0`; every other account, inbox, direction, private message, bot message,
   or empty message remains rejected.
3. Normalize the verified recent transcript once as bounded `{direction, content}` rows using
   `incoming` and `outgoing`. This exact context is passed to semantic classification and final
   composition.
4. Keep the restricted model as a strict semantic classifier. Attach a dedicated structured output
   parser to the agent instead of relying on a model-level response format that the agent wrapper
   did not reliably preserve.
5. After deterministic policy and any Shopify read produce a grounded draft, use a second restricted
   model call only to express that draft naturally in one to three short Saudi-Arabic sentences.
   It receives the customer message, bounded recent context, decision kind, and grounded draft. It
   has no web search, Shopify tool, write tool, or external-information tool.
6. Validate the composed reply before the existing send controls. Reject low-confidence, ungrounded,
   malformed, overlong, invented-number, or untrusted-action output and fall back to the original
   grounded draft. The composer cannot add a price, stock count, policy, tracking fact, refund,
   cancellation, address change, or shipment action.
7. This supersedes decision 0016 only where it required deterministic rendering for all
   customer-visible prose. Its semantic classifier, isolated brand packs, bounded Shopify reads,
   external-scope boundary, and all send-path safety controls remain active.

## Verification contract

- Numeric and string Chatwoot inbound forms must pass the same gate.
- The exact verified transcript must reach both AI stages in canonical bounded form.
- Both AI stages must use strict structured parsers and have no external tools.
- Every customer-visible draft must pass through one composer and one deterministic validator.
- New numbers or action claims must fall back to the grounded draft.
- `Customer Egress Authorized? -> Send Reply` remains the only customer-send edge.
- Publication and owner-visible delivery remain separate evidence gates.

## Live record

The existing responder was updated in place and published as active version
`b67ae1e3-98df-4665-9bee-29754d1beafd`, 107 nodes. The update applied atomically with only two
pre-existing disconnected-node warnings. Fresh version readback confirmed the inbound gate,
canonical context contract, classifier parser, grounded natural composer, parser, validator,
existing OpenAI credential, and unchanged final send path. No synthetic customer message was sent.
The previous classifier-only version `ab7db7ab-0195-45dd-a061-8e4e8b157d46` is the immediate
behavioral rollback target.
