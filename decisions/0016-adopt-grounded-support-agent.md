# 0016 — Adopt a grounded support agent with isolated brand packs

Date: 2026-08-25
Status: accepted for live owner testing

## Context

Decision 0015 stopped out-of-store answers, but its primary understanding layer was a fixed phrase
and keyword grammar. The owner's WhatsApp evidence showed the durable problem: a legitimate product
description could be rejected, while adding more phrases would only grow a brittle response tree.
The required system must understand the customer's meaning, know which brand and catalog it serves,
read current store facts, and still fail closed when a question is outside the store.

## Decision

1. Keep the existing responder `kAyF0D3ZZHxc0Hwp`, verified Chatwoot ingress, three-inbox
   allowlist, model-budget guard, final reread, send lease, recovery boundary, and single authorized
   `Send Reply` edge. Do not create another workflow, webhook, inbox, Captain, AgentBot, credential,
   or customer-send path.
2. Replace keyword matching as the primary understanding mechanism with the existing restricted
   language-model node acting only as a semantic classifier. It receives the current message,
   bounded recent context, one isolated brand pack, allowed intents, allowed capabilities, and an
   exact JSON schema. Temperature is zero and external tools are absent.
3. The classifier never writes customer prose, chooses network endpoints, or grants itself a new
   capability. A deterministic policy engine revalidates every field, rejects extra fields,
   cross-brand output, unsupported capabilities, and invalid confidence, then selects the route.
4. Current product titles and prices come only from bounded, brand-filtered, read-only Shopify
   queries. No price or inventory claim is embedded in the prompt. No Shopify mutation is allowed.
5. Out-of-catalog and external-information requests receive a subject-aware Calapres redirect. The
   system has no weather, news, general web search, or external-merchant tool and cannot continue an
   unrelated conversation.
6. Approved static facts remain useful as a small response library, but only as grounded rendering
   and fallback content after semantic classification. They are no longer the primary understanding
   layer. This supersedes that portion of decision 0015; its scope boundary and send-path controls
   remain active.
7. Future brands reuse the engine through a separate versioned brand pack, separate Shopify and
   channel credentials, and an exact inbox-to-brand binding. Brand packs and customer context must
   never be mixed.
8. Publication is not end-to-end proof. Acceptance requires owner-visible replies for an
   out-of-catalog purchase, an external-information request, and an unmatched product description,
   followed by execution inspection.

## Verification contract

- Invalid or expanded model output fails to a store clarification with no tool authority.
- Product search is capped and always includes the Calapres vendor and product-type filter.
- Order-change requests may inspect order status but cannot perform the change.
- The one inbound edge to `Send Reply` and the recovery no-resend invariant must remain unchanged.
- Repository tests, release lock, source/live parity, and owner-visible channel evidence are separate
  gates and must be reported separately.

## Live owner-test record

The existing 100-node responder was published at version
`ab7db7ab-0195-45dd-a061-8e4e8b157d46`. A fresh reread confirmed active/draft parity, disabled
execution-data retention, the strict classifier settings, and the unchanged single authorized edge
to `Send Reply`. Repository tests passed 322 Node tests and 92 Python tests before publication.
The previous deterministic version `d3d320d6-63be-4134-b333-a4941bf2480a` remains the behavioral
rollback target. Owner-visible channel proof is still pending and is not implied by this record.
