# 0019 — Adopt isolated Captain external-tool bridges

Date: 2026-08-26

Status: accepted and live for the first read-only order bridge

## Context

Decision 0018 selected Chatwoot Captain as the only automatic customer-facing responder and
correctly recorded that the earlier plan did not expose Captain custom tools. The owner later
upgraded Chatwoot and authorized a permanent, simple connection to Shopify. Live inspection then
confirmed one Captain custom tool and one small n8n bridge.

The owner rejected a return to the former 107-node all-purpose responder. The required reusable
pattern for Calapres and future brands is one conversational assistant with small, independent
external capabilities. Frequently changing product and order facts must not be copied into static
Captain knowledge when Shopify already owns them.

## Decision

1. Keep `Calapres Assistant` (`2187`) as the only automatic customer-facing responder. Captain
   understands the conversation and writes the reply; n8n is not a parallel responder.
2. Permit n8n only as a narrow external-tool bridge invoked by Captain. Each future feature must
   first be approved by the owner as a separate capability, then have its own small, independently
   removable workflow, credential scope, evidence, and rollback. This decision does not preapprove
   any future tool. Do not combine order lookup, shipping, marketing, returns, catalog reads, or
   other capabilities into one all-purpose workflow.
   A bridge is a deterministic provider of structured facts: it contains no conversational AI,
   keeps no conversational memory, does not compose customer prose, and has no Chatwoot send path.
3. Adopt `Calapres Shopify Order Lookup` and workflow
   `Calapres | Captain Shopify Order Bridge v1` (`lLJpvjtcxTaoQeGj`) as the first implementation of
   this pattern. It may perform bounded, read-only Shopify order lookup using the current
   conversation phone. It may not write to Shopify or send a customer message itself.
4. Keep Shopify as the operational authority for changing products, prices, inventory, customers,
   orders, fulfillment, and tracking. Captain knowledge may hold stable policies and response
   boundaries; it must not become a manually duplicated price or order database.
   A future product or price answer may be presented as live only after its own approved Shopify
   read succeeds; the current order tool does not provide that capability.
5. A successful unique lookup may return only the customer first name, order identifier and date,
   financial and fulfillment states, cancellation state, and tracking already present in Shopify.
   A no-match, ambiguous, invalid-phone, or unavailable result must not become a definitive claim
   that the customer has no order. Keep the case in the same chat and hand it off internally.
6. Do not imply order-number search. The current tool has no order-number parameter and searches by
   phone only. Asking for a full order number currently supports human continuation, not another
   automated lookup.
7. Do not imply a live carrier lookup. No shipping-company or aggregator API is connected; Captain
   can read only tracking that another approved system has already written to Shopify.
8. Keep responder workflow `kAyF0D3ZZHxc0Hwp` unpublished. It must never run while Captain is
   connected, even though the new isolated order bridge is active.
9. Continue one accepted Captain assistant through small, additive, reversible deltas. Version
   labels describe recorded deltas; they do not authorize cloning or rebuilding the assistant.
10. Present the service as `خدمة عملاء كالابريز` without leading every reply with a technical
    automation disclosure. If a customer directly asks whether the service is human or automated,
    answer truthfully and do not impersonate a person.
11. Respond.io is not part of the approved path and its comparison is closed unless the owner
    explicitly reopens it. Commercial explanations to the owner use Saudi riyals.
12. Shipping selection, proactive WhatsApp messages, marketing templates, shipping notifications,
    label creation, fulfillment updates, additional tools, plan upgrades, and Shopify writes remain
    separate decisions. None is authorized by this decision. Normal Captain replies to inbound
    customer conversations continue.

This decision supersedes decision 0018 only where it recorded that the then-current plan lacked
custom tools, prohibited a paid upgrade, and required every live order-status case to skip an
automated Shopify read. It preserves every other 0018 boundary: Captain-only customer responses,
the three connected social inboxes, the assignment automation, Shopify authority, the unpublished
old responder, the ban on invented facts, and the protected `v1.0` baseline.

For Captain external tools only, this decision also supersedes the earlier 0008/0010 requirement
that every capability pass through one shared customer-service ingress or Core topology. Their
credential isolation, brand separation, deterministic validation, no-invention rules, and Shopify
authority remain active. The retired n8n customer-response architecture is not revived.

## Live record

[Owner-reported] The account was upgraded to Chatwoot Business. The exact billing record was not
independently read in this closeout.

[Verified live] Chatwoot contains exactly one Captain tool, `Calapres Shopify Order Lookup`.
n8n workflow `lLJpvjtcxTaoQeGj` is published, active, and contains five linear nodes: authenticated
webhook ingress, request and phone validation, a bounded Shopify GraphQL read, safe result shaping,
and the response to Captain. The Shopify operation is query-only.

Execution history proves authenticated Shopify connectivity, rejection of a retired authorization
value, and a corrected safe no-match path for missing or unusable phones. Every successful result
inspected in this closeout had no matching Shopify customer. A real matched order, name greeting,
tracking answer, order-number fallback, and final customer-channel reply remain unverified and may
not be claimed.

The exact capability, evidence, deferred shipping research, and next stage are recorded in
[the 2026-08-26 detailed handoff](../docs/handoffs/2026-08-26-captain-order-bridge-and-deferred-roadmap.md).

## Security boundary

Never store the bridge authorization, Shopify credential, customer phone, customer identity, order
payload, or raw execution data in GitHub. The authenticated editor rendered credential values
during the closeout inspection; none is recorded here. Credential rotation and focused negative and
positive authorization tests are the next separately approved security stage.

## Rollback

Disable or remove only the Captain order tool and deactivate workflow `lLJpvjtcxTaoQeGj`. Do not
disconnect Captain, delete knowledge, alter the assignment automation, or publish the old responder.
The `v1.0` rollback branch and `v1.1` engraving delta remain independent.
