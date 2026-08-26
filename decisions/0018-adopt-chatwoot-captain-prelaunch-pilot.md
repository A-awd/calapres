/Users/awd/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
# 0018 — Adopt Chatwoot Captain for the prelaunch customer-service pilot

Date: 2026-08-25

Status: accepted and live for owner prelaunch evaluation

## Context

The n8n responder adopted by decisions 0015–0017 failed the owner's real-channel acceptance test.
WhatsApp and Instagram repeatedly received the same generic clarification even though the workflow
contained two AI-agent stages. Live evidence proved that the inbound messages reached the workflow
and reserved model budget, but the customer-visible result repeatedly became the fixed fallback.
Further patching would continue a failed bespoke conversational architecture.

Chatwoot account `179973` already contains `Calapres Assistant` (`2187`) with Calapres website and
product knowledge. Before activation it was disconnected from every inbox. Its current plan allows
Captain replies and the Playground but does not allow Captain custom tools; no paid upgrade is
authorized.

## Decision

1. Use the existing Chatwoot Captain assistant as the only automatic customer-facing responder for
   the prelaunch owner evaluation.
2. Connect Captain only to the existing Calapres WhatsApp, Instagram, and TikTok inboxes. Email and
   website remain outside this activation.
3. Unpublish n8n workflow `kAyF0D3ZZHxc0Hwp`. Preserve its draft and version history as a reversible
   rollback artifact, but do not publish it while Captain is connected.
4. Configure Captain to answer only about Calapres products, orders, payment, shipping, returns,
   and policies; redirect clearly external questions without answering them or repeatedly asking a
   generic store question.
5. Ground the assistant identity in the live Shopify catalog: Calapres currently sells the white,
   beige, and gray luxury burner sets. Shopify remains the operational source of truth.
6. Use natural, concise Saudi Arabic, read the recent conversation context, ask at most one useful
   clarification, and never use the rejected fixed phrase
   `وش حاب تعرف عن منتجات كالابريز أو طلبك؟`.
7. Because custom tools are unavailable on the current plan, Captain must hand order-status cases
   to a human rather than claim a live Shopify lookup. No plan upgrade or additional paid service is
   authorized by this decision.
8. Do not enable Captain-generated long-term memories, contact-information access, or automatic FAQ
   generation during this pilot. Existing conversation context remains available inside Chatwoot.
9. Captain eligibility is evaluated on a new conversation or a resolved conversation reopening,
   not on every message added to an already-open historical conversation. Resolve inactive
   pre-pilot conversations before owner acceptance traffic; do not interpret silence in a retained
   Open conversation as proof that channel ingress failed.
10. Use one Chatwoot conversation-created automation rule to assign all existing Calapres inboxes
    to `خدمة عملاء كالابريز`. This assignment rule does not connect Captain to website or email and
    does not authorize a second responder.

This decision supersedes decisions 0010 and 0015–0017 only for the active customer-facing responder
and live operating mode. Their source, tests, and version history remain as rollback evidence.
Shopify authority, Calapres inbox isolation, the ban on invented facts, and the prohibition on
Supabase and Shopify writes remain active.

## Live record

The n8n responder was unpublished and reread as inactive with no active version. Captain was
connected to the existing WhatsApp `128058`, Instagram `128031`, and TikTok `128033` inboxes. The
website and email inboxes were not connected. No workflow, inbox, credential, product, order,
customer record, paid plan, or external service was created.

After the first real-channel attempt stayed silent, live inspection showed the test messages inside
historical Open conversations. All seven existing conversations were assigned to
`خدمة عملاء كالابريز` and resolved, leaving zero unassigned conversations. One enabled
conversation-created automation rule now covers the four existing inboxes (`Calapres`, Instagram,
TikTok, and WhatsApp) and assigns each new conversation to that agent. Captain remained connected
only to the three social inboxes with Audience `Everyone` and Schedule `Anytime`.

Playground checks before connection produced subject-aware replies for a car request, an external
Mykonos-ticket request, a missing green/orange burner, and an order-status request. These checks
prove the configured assistant behavior only. The owner's next real messages through the three
connected channels are the end-to-end acceptance evidence; success must not be claimed before the
replies are physically observed.

## Rollback

Disconnect Captain from the three inboxes before republishing any n8n responder. Never allow both
responders to operate on the same inbox. The preserved n8n draft version is
`b67ae1e3-98df-4665-9bee-29754d1beafd`.

## Named operating baseline

On 2026-08-26 the owner named the first acceptable operating configuration
`Calapres Captain v1.0 — Stable`. Its exact operating record is stored in
`docs/baselines/2026-08-26-calapres-captain-v1.0-stable.md`. Future knowledge experiments must be
additive, versioned from `v1.1`, and reversible by removing only the recorded new delta. This label
does not imply that Chatwoot provides a native cloud snapshot or that destructive knowledge edits
are recoverable.
