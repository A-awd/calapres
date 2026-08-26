# Captain prelaunch customer-service handoff

Date: 2026-08-25

Last verified: 2026-08-25 20:03 Asia/Riyadh (UTC+03:00)

Pre-publication baseline: `35f9e9437ebf61e73856e064e2089b3a14f176fc`

## Identity and scope

- Project: Calapres.
- Canonical repository and branch: `A-awd/calapres`, `main`.
- Conversation purpose: replace an unacceptable repetitive social-channel responder with a
  natural, store-scoped prelaunch assistant without adding a paid service.
- Included live systems: Chatwoot Captain, the existing WhatsApp, Instagram, and TikTok inboxes,
  the former n8n responder, and read-only Shopify product facts.
- Excluded authority: no payment or plan upgrade, Shopify write, customer/order mutation, new
  workflow, new inbox, new credential, product publication, or destructive knowledge cleanup.

## Executive state

[Verified] Decision 0018 is the current operating decision. Existing Chatwoot Captain assistant
`Calapres Assistant` (`2187`) is the only automatic responder connected to WhatsApp `128058`,
Instagram `128031`, and TikTok `128033`. Email and website are not connected.

[Verified] Former responder `kAyF0D3ZZHxc0Hwp` is unpublished with `active=false` and
`activeVersionId=null`. Draft version `b67ae1e3-98df-4665-9bee-29754d1beafd` is preserved only for
rollback. Historical sections describing it as active are superseded; never run it alongside
Captain.

[Unknown] Captain has not yet been proven end to end by a new physically visible reply on any of
the three connected channels after this switch. Playground behavior is configuration evidence,
not channel-delivery evidence.

[Verified] The first silent owner test used already-open historical conversations. Captain checks
eligibility when a conversation is created or a resolved conversation reopens, not on every new
message in an existing Open conversation. All seven historical conversations are now assigned to
`خدمة عملاء كالابريز` and resolved; the dashboard shows zero unassigned conversations.

[Verified] One enabled Chatwoot automation rule assigns every newly created conversation from the
four existing inboxes (`Calapres`, Instagram, TikTok, and WhatsApp) to
`خدمة عملاء كالابريز`. Captain remains connected only to the three social inboxes.

## Work performed and verification

- [Observed] Owner screenshots showed the preceding system repeatedly returning the same generic
  store clarification on WhatsApp and Instagram. TikTok also lacked a visible reply in the earlier
  trial. This was the acceptance failure that triggered the architecture switch.
- [Verified] The n8n workflow was unpublished before Captain was connected, preventing two
  automatic responders from operating on the same inbox.
- [Verified] Captain was connected individually to the existing WhatsApp, Instagram, and TikTok
  inboxes; Chatwoot showed a successful connection for each.
- [Verified] Audience is `Everyone` and Schedule is `Anytime`. The seven retained conversations
  were resolved after assignment so the next inbound message is eligible for Captain re-entry.
- [Verified] A single active conversation-created automation covers all four existing inboxes and
  assigns new conversations to `خدمة عملاء كالابريز`; the unassigned count read back as zero.
- [Verified] Captain received a Calapres-only scope guardrail: it must not answer cars, travel,
  weather, food, or other external topics, and must redirect once without repeating a generic menu.
- [Verified] Its response guidance now requires recent-conversation context, a direct answer, at
  most one useful clarification, concise natural Saudi Arabic, varied wording, and no invented
  facts. The rejected phrase `وش حاب تعرف عن منتجات كالابريز أو طلبك؟` is explicitly forbidden.
- [Verified] The assistant description was corrected from perfume-store wording to Calapres as a
  luxury burner store with white, beige, and gray burner sets.
- [Verified] Long-term memories, contact access, citations, and automatic FAQ generation remain
  off. No paid upgrade or additional service was added.
- [Verified] Playground checks produced subject-aware behavior for a car request, a Mykonos-ticket
  request, a nonexistent green/orange burner, and order status. Order status handed off rather
  than inventing a live lookup.
- [Verified] Repository validation before the operating-decision publication passed 328 Node
  tests, 92 Python tests, the customer-service release lock, and `git diff --check`.

## Facts, dependencies, and risks

Shopify remains the operational source of truth. The read-only snapshot used during configuration
showed three active Calapres burner products (white, beige, and gray) priced at SAR 390 each and
zero reported inventory. Refresh this snapshot read-only before relying on it later; never infer
availability. Captain knowledge mentioned a SAR 490 compare-at price, but that figure was not
independently confirmed by the Shopify read and must not be presented as verified.

Captain is now the conversational intelligence layer inside Chatwoot. Its underlying model/provider
was not independently verified in this work and must not be guessed. On the current plan, Captain
custom tools are unavailable, so it cannot perform a live Shopify order-status lookup. Such cases
must hand off to a human unless a future tool-enabled design and its cost are explicitly approved.

The knowledge surface contains 22 documents and 72 approved FAQs. It includes useful Calapres
product and policy pages but also broad or unrelated agentic/privacy/UCP material. Nothing was
deleted. The new scope rules mitigated this in Playground, but knowledge pollution remains a
quality risk if live replies expose it.

## Decisions and lessons

- [Approved and executed] Pilot Captain on the existing plan only, with no extra charge.
- [Superseded] The bespoke n8n responder is no longer the live conversational architecture. Adding
  more AI-agent nodes did not prevent its fixed fallback from dominating the customer-visible
  answer. The lesson is to judge the final visible route, not the presence of an AI node.
- [Not approved] Any Chatwoot plan upgrade, Captain custom-tool purchase, new service, duplicate
  test workflow, mass FAQ/document deletion, or n8n republish.
- The owner wants one stage completed and explained before the next stage, and does not want test
  copies or prolonged synthetic testing. There are no external customers yet; owner messages are
  the acceptance traffic.

### Inherited n8n diagnosis

[Observed on 2026-08-25 at 07:14 Asia/Riyadh, historical and not current] Neon contained 89
customer-reply events, of which 44 were `sent`; 11 `processing` events had expired leases, seven
business events were `prepared` with expired leases, and two request-replay claims remained in
`processing`. No new event had appeared after 2026-08-19. The established failure mechanism was
that the workflow could durably claim an event, return HTTP 204 to Chatwoot, then stop before final
processing; recovery covered `sending` or `ambiguous`, not expired `processing`. Chatwoot would
normally not redeliver an event already acknowledged with 204. These counts are deliberately
dated and must not be treated as current without a fresh read-only check.

The older 99-node responder also had confirmed semantic and conversational defects: ambiguous
Arabic words routed ordering, shipping, and engraving questions incorrectly; Arabic order-number
digits and follow-up order numbers were mishandled; product failures could ask for an order number;
media-only messages were ignored; a `human` label could cause later silence; and creation of a
Chatwoot message was mistaken for physical social-channel delivery. Later revisions attempted to
correct parts of this behavior, but the final owner-visible 107-node trial still repeated the
fixed clarification. Therefore the preserved draft is rollback source only, not a validated
production fallback. A future reactivation would require a fresh read-only audit and explicit
approval, not a simple republish.

## Immediate next action

The owner should now send one normal new message through WhatsApp, Instagram, and TikTok. Each
message will reopen its resolved conversation and provide the first valid Captain channel test.
Record the physically visible replies. Do not change the architecture before seeing this evidence.

If a channel fails, inspect that exact channel path first: Captain-to-inbox connection, incoming
conversation, and outgoing delivery. If the reply is repetitive or factually wrong, inspect the
specific Captain conversation and cited knowledge before changing global guardrails. For TikTok,
do not assume a response-quality problem when the actual fault may be channel delivery.

If rollback becomes necessary, disconnect Captain from all three inboxes first. Only then may a
separately approved action consider republishing the preserved n8n version. Never operate both.

## Privacy and preservation boundary

This record intentionally omits secrets, authentication material, raw private messages, raw tool
responses, screenshots, repetitive abusive language, and temporary UI state. It preserves the
operational meaning of the owner's examples without archiving the conversation verbatim. No known
omission is required to continue the project safely, but this file is not legal or evidentiary
transcript preservation.

## Read first when resuming

1. `AGENTS.md`
2. `README.md`
3. `STATE.md`
4. `HANDOFF.md`
5. `DECISIONS.md`
6. `LAUNCHER.md`
7. `decisions/0018-adopt-chatwoot-captain-prelaunch-pilot.md`
8. This detailed handoff
