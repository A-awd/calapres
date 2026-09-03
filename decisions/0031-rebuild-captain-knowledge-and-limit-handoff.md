# 0031 — Rebuild Captain knowledge and limit human handoff

Date: 2026-09-02

Status: accepted; Captain v2 execution is verified, and the 2026-09-03 transfer-wording amendment
requires a fresh live persistence check

## Context

The live Chatwoot Captain assistant had 22 imported documents and 71 approved FAQs. Several entries
still described a set, stand, oud box, or two-letter engraving rule, and the enabled handoff scenario
sent ordinary unanswered questions to a human. The live storefront and Shopify now define the offer
as one Calapres burner in white, beige, or gray, with name-or-logo engraving.

## Decision

1. Keep only the seven authoritative storefront documents: FAQ, privacy, About, Contact, terms,
   refund, and shipping policy.
2. Replace the old generated and manual FAQs with the source-grounded Captain v2 library. Store only
   stable facts as FAQs; order status remains a live-tool topic rather than a static answer.
3. Never describe the product as a set or claim that it includes a stand or oud box. Ignore the
   retired two-letter engraving rule; the approved offer is name-or-logo engraving.
4. Use Shopify or the approved bridge for changing facts such as price, availability, order status,
   and tracking. Do not infer those facts from a static FAQ or from a title-and-link result.
5. Keep conversations waiting when the customer stops replying. Do not hand off for a general
   question, a missing FAQ, an out-of-scope question, or inactivity.
6. Hand off only for an explicit human request, an order mutation, cancellation or refund execution,
   a payment dispute or sensitive case, or a verified failure of the order tool after a safe attempt.
7. Use Western digits in Captain replies.

## 2026-09-03 transfer-wording amendment

When a valid handoff is required, the customer-facing wording must begin with a brief, gentle
apology and say that `الموظف المختص` will follow up. Do not describe the destination as a human,
human agent, support employee, or similar system-revealing label. This is an owner-approved tone
and terminology rule; it does not broaden the limited handoff triggers above.

The source conversation does not contain a fresh final readback proving that this wording remains
saved in the live Captain configuration. Verify it read-only before claiming the amendment is live,
and test it in Playground before any external-channel acceptance test.

## Execution record

Fifteen obsolete or duplicative documents were deleted, leaving exactly the seven approved sources.
All old FAQs were removed and 18 curated manual FAQs were created. The nineteenth knowledge topic,
order status, was deliberately kept out of static FAQs because it requires live order lookup.

The assistant description, guardrails, response guidelines, and enabled handoff scenario were
updated. The inactivity setting remains `Wait for the customer`. Fresh Playground checks correctly
answered the service scope, one-burner composition, prepaid-only payment and shipping thresholds,
and avoided inventing the current product price. An initial stale two-letter engraving response was
caught during testing; an explicit supersession guardrail was added, and the fresh rerun returned
name-or-logo engraving without a handoff.

## Boundaries

This decision does not implement proactive WhatsApp messages, alter a Meta template, connect an
outbound order workflow, change Shopify checkout validation, or prove external-channel delivery.
Business-initiated WhatsApp order confirmations remain a separate implementation and approval stage.

## Rollback

Use the checked-in v2 file to restore the approved manual FAQs and settings. Do not restore the
obsolete product pages, sitemap documents, set claims, two-letter engraving rule, or broad
missing-answer handoff behavior.
