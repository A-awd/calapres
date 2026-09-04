# 0031 — Rebuild Captain knowledge and limit human handoff

Date: 2026-09-02

Status: accepted and implemented; Captain v2 remains live, the transfer wording is freshly
verified, and the 2026-09-04 owner amendment removes explicit human/AI challenges as immediate
handoff triggers

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
6. Do not hand off merely because the customer requests a human/employee, says the reply is AI, or
   repeats that demand. Continue service in the same conversation. Never claim that Captain is
   human, and do not expose AI, routing limitations, or technical failure. A future handoff may be
   used only for an approved operational or sensitive case after the corresponding bounded path is
   implemented and verified.
7. Use Western digits in Captain replies.

## 2026-09-03 transfer-wording amendment

When a valid handoff is required, the customer-facing wording must begin with a brief, gentle
apology and say that `الموظف المختص` will follow up. Do not describe the destination as a human,
human agent, support employee, or similar system-revealing label. This is an owner-approved tone
and terminology rule; it does not broaden the limited handoff triggers above.

The source conversation does not contain a fresh final readback proving that this wording remains
saved in the live Captain configuration. Verify it read-only before claiming the amendment is live,
and test it in Playground before any external-channel acceptance test.

## 2026-09-04 no-immediate-handoff amendment and live execution

The owner superseded the former explicit-human-request trigger after a live test conversation proved
that it stopped Captain in the same minute. Conversation `#17` showed the exact customer challenge
and the immediate response `أكيد، بحوّلك الآن لموظف خدمة العملاء`.

The live Captain configuration was corrected in four places:

- the system handoff message now reads
  `أعتذر لك، سيتابع معك الموظف المختص هنا.`;
- the response guideline says a human/employee request or AI challenge is not a handoff trigger,
  including repeated or insistent requests;
- a guardrail prohibits Handoff, human impersonation, AI disclosure, routing-limit language, and
  invented technical-failure excuses for that trigger; and
- the `تحويل محدود لخدمة العملاء` scenario description was corrected and the whole scenario was
  disabled because its attached Handoff tool still overrode softer instructions on repetition.

Fresh Playground tests covered the original challenge and a second insistent request. The final
two-message canary continued as Calapres service, asked what remained unresolved, then narrowed the
issue to order or product. It did not hand off, claim to be human, mention AI, or report a technical
problem.

This amendment supersedes the explicit-human-request customer policy in decision 0014 for the live
Captain surface. Decision 0014's old n8n workflow and database record remain historical and are not
revived. Disabling the scenario also removes its automatic operational handoffs; the separate
priority-classification scenario remains enabled. A durable 24-hour or 48-hour owner alert is still
unimplemented and must not be inferred from these prompt-level controls.

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

To roll back only this amendment, remove the new guardrail and response-guideline change and
re-enable the former handoff scenario. Do not do so without a fresh owner decision because it
restores same-minute handoff on explicit employee requests. Do not restore obsolete product pages,
sitemap documents, set claims, the two-letter engraving rule, or broad missing-answer handoff.
