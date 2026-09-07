# Commerce/WhatsApp closeout and content-automation resume

Date: 2026-09-08, Asia/Riyadh.
Canonical repository: A-awd/calapres; branch main.
Verified baseline: adfd1552ddc6589ee3a010f7cc3cee5674443aa6.
Provenance: this conversation's explicit handoff request after the owner deferred further n8n
work and selected TikTok/Instagram content as the next conversation's focus. No raw conversation
identifier is retained. This is a new closeout phase; the September 6 creative closeout and
September 8 focused favicon record remain separate, unchanged historical records.

## Current direction and authority

[Owner-approved direction] Leave n8n alone for now. This means stop further investigation,
migration and hardening work, NOT disable the active paid-order sender or its supporting systems.
Next conversation: establish content automation for TikTok and Instagram. The owner's earlier
Snapchat/Instagram/TikTok purchase-attribution request remains pending, but content production
is the immediate priority. Do not confuse purchase attribution, admin app blocks, inbox replies
and scheduled content publication.

The owner prefers official native integrations and fewer external dependencies. This is a
preference to evaluate against proven capabilities, not approval to bind accounts, move the
WhatsApp number, buy a plan, replace Captain, or schedule/publish content. n8n is a deterministic
workflow engine in the current sender, not an LLM. No platform can honestly promise 100% uptime
or exact generated-image fidelity.

This invocation publishes documentation only. No new conversation is created or dispatched.
The owner receives an English continuation prompt and opens the next conversation themselves.

## Coverage map: existing canonical homes

| Material subject | Canonical home and current interpretation |
| --- | --- |
| Eight bridal concepts, originals, refinements, exact prompts/costs and failed realism trials | docs/calapres-bridal-concepts-2026-09-05.md; decisions 0025 and 0038. Do not duplicate prompts here or regenerate a batch. |
| Operations secretary/provider/voice, Klaviyo containment and recovered history | docs/handoffs/2026-09-06-calapres-operations-and-bridal-creative-closeout.md and its linked September 3 recovery handoff; decisions 0031–0037. |
| SAR 10 uploaded-design option on all three burners | decision 0039; STATE.md paid-order attachment audit supplies later evidence. |
| Obsolete Safari icon | docs/handoffs/2026-09-08-safari-browser-icon-refresh.md; owner confirmed brown seal after new tab. No further cache work. |
| Paymob live mode, evolving discount requests and paid owner canary | decision 0040 with later-evidence pointer; STATE.md is the canonical final transaction/attachment audit. |
| Personalized WhatsApp confirmation, guards, exact CAS strategy, failures/recovery and limits | decision 0041; STATE.md activation section; n8n/calapres-paid-order-whatsapp-confirmation.json. |
| Native Meta app compatibility investigation | New evidence below. |
| Next content phase and publication boundaries | This record; concise pointers in STATE.md and HANDOFF.md. |

The older claims of test-only Paymob, missing confirmation template, wrong Saudi prefix,
unverified completed-order attachment receipt, and no active order sender are superseded by
newer evidence already in STATE.md. Current evidence is a Shopify-reported successful live
sale and received attachment URL, not bank settlement, decoded image acceptance or delivery
of merchandise. Latest discount configuration was CR99 99.99% plus CR98 SA free shipping;
one-use expiry 2026-09-09T21:00:00Z. Usage/status needs refresh after the owner's purchase.
Do not restore QXMRK, buy the proposed combined-discount app or repeat the payment.

[Reported] Owner discovered the checkout country picker when focusing the phone field.
This withdrew the premise that a separate phone-picker app was necessarily needed. No such
installation is proven. User also asked for more persuasive email-consent wording; no executed
replacement or approved final phrase is evidenced here. Keep consent accurate and email drafts off.

## New native WhatsApp investigation: observations, not migration

[Verified, read-only September 8] The Shopify connector returned Calapres / calapres.com / Basic.
Shopify's built-in Flow Send HTTP request action requires Grow, Advanced or Plus. This excludes
that direct built-in action on the observed plan, not every conceivable custom app implementation.
No upgrade is approved.
https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-http-request

[Verified] Meta publishes the official WhatsApp order-update app:
https://apps.shopify.com/whatsapp
Earlier research overlooked it; do not repeat a categorical claim that no official direct
Shopify-to-WhatsApp notification app exists. Existence is not proven compatibility with Chatwoot.

Authenticated Shopify installed-apps menu included WhatsApp. Opening it reached
/store/unywbe-ub/apps/whatsapp-by-meta, showing “Connect WhatsApp to your Shopify store” and
“Get started”. Thus installed but onboarding incomplete on the observed surface; not a successful
number binding. The app was already present; this investigation did not install it.

Its own FAQ, opened within the authenticated embedded app, stated:
- Customer replies are managed in WhatsApp Business app or Meta Business Suite Inbox.
- Existing WhatsApp Business app numbers can use the documented coexistence onboarding.
- For problems connecting existing numbers, it recommends a new/virtual number or support
  review of eligibility; support cannot force eligibility.
It did not document continued Chatwoot/Captain operation or shared outgoing-message history
for the current Cloud API number. Do not reinterpret mobile-app coexistence as proof that two
Cloud API integrations can share this setup.
FAQ-linked source:
https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4-public-preview#coexistence-flow

The public Shopify Messaging WhatsApp-marketing setup describes switching/disconnecting an
existing provider. It is a DIFFERENT feature from Meta's transactional WhatsApp app and cannot
be used as conclusive evidence that the latter requires migration:
https://help.shopify.com/en/manual/promoting-marketing/create-marketing/shopify-messaging/whatsapp/setup

Read-only review of Chatwoot upstream develop code showed status processing returns if the
message source ID is absent locally; receiving a delivery-status callback alone does not create
the missing outgoing message. Echo handling exists, but this does not prove Meta's Shopify app
supplies compatible echoes or that hosted Chatwoot runs that exact revision.
https://github.com/chatwoot/chatwoot/blob/develop/app/services/whatsapp/incoming_message_base_service.rb

[Verified UI, bounded] Meta Business Suite automation page showed conversational presets
(keywords, comments, away, contact/hours/location), plus enabled instant-reply and FAQ rows.
No Shopify-paid-order trigger was observed. Channel targets and actual duplicate-reply behavior
were not verified; do not declare a Captain conflict or toggle anything on that evidence alone.

[Unknown] Same-number eligibility, preserved Chatwoot inbound routing/Captain, full message
history and delivery synchronization with the Meta app. No support request was sent, no account
connected, no number migrated, no new number created. “Get support” / app-store “Open” did not
produce a destination in that browser; existing Shopify Apps navigation reached the installed
app and FAQ. Do not repeatedly install/retry because an app-store popup failed.

[Conclusion] Native compatibility remains unresolved, not proven impossible. The owner
explicitly deferred this investigation. A later resumption should request a precise vendor
compatibility answer and a bounded test only when authorized; no “100% suitable” claim.

## Next content phase: exact starting work

1. Refresh the canonical main branch, then read this record, AGENTS/README/STATE/HANDOFF/
   LAUNCHER/DECISIONS, creative record, decision 0038, and linked operations closeout.
2. Read-only inventory the actual Calapres TikTok/Instagram profiles, roles, available native
   content tools, existing posts/drafts and reusable approved assets. Verify exact account
   identity and permissions; Shopify channel presence or inbox connection does not prove
   publishing authorization. Metricool reads were historically available; publishing was excluded.
3. Propose a concrete owner-reviewable content workflow: idea -> verified reference -> script/
   caption -> asset -> review -> approved publication -> performance review. Prefer native
   TikTok/Meta tools where they fit; do not introduce n8n as the default content orchestrator.
   Determine formats, cadence and brand voice from assets and owner input, without inventing
   commercial facts. Prepare a small first content plan/draft package before any schedule.
4. Keep publishing, enabling schedules, paid spend, binding accounts and new subscriptions
   behind fresh bounded approval. This handoff authorizes no content generation or live changes.
   No new content system, calendar, post or schedule was implemented in this closeout.

Creative constraints: Magnific only for image generation/editing; actual image references must
reach the tool; one pilot plus at most one targeted correction by default. Preserve failed and
unaccepted outputs as such. Cartier Panthere lies naturally flat; Van Cleef Alhambra details
must match real references (six-motif bracelet draft is wrong). Visible incense and smoke must
originate from the bowl when requested. Preserve actual burner colors/body and one-burner offer;
props are not included merchandise; no compulsory advertising logos. The fictional bridal
face/new dress/held-smoking-burner/no-mirror exception is bounded to the requested concept.
The latest holding image was rejected for realism. Do not promise reference fidelity from prose.

## Protected dependencies and remaining risks

Keep active workflow FwJvEt91ZB61lPI7 unchanged. Its delivered owner canary and duplicate-stop
passed; a fresh production paid event and new-contact branch remain unobserved end-to-end.
No automatic incident alerts or reconciliation were implemented. Never blindly reset a send claim.
The earlier sensitive diagnostic was deleted; payload saving is disabled; tool-session exposure
was not erased. Preserve the lesson in STATE.md/decision 0041 without exporting raw executions.

Captain remains conversational responder. Preserve owner secretary LKA07iWfCpjawVNB,
unpublished specialist olVB3TzKClXjuOei, owner project AeQgtZlgJbiXCM2e, customer-service team
project 0kVami0vGGBbT7Cy, and sole Telegram webhook owner Owner Telegram Voice Bridge
0EQB4mv5NknrXsHM. No migration to phone app, Klaviyo WhatsApp, retired responder or Supabase.
No Gateway top-up/auto-top-up; USD 30 was only proposed. Direct OpenAI credential entry was
observed, but a user key was not bound or successfully tested. Klaviyo remains draft.
Stock, dispatch/engraving lead time, pickup and package measurements still gate fulfillment.
OTO is prepaid-only; COD prohibited. Instagram visitor-visible WhatsApp-button acceptance
remains unverified. No live creative/campaign publication is implied.

Media belongs in existing iCloud Calapres/Ai-Work organization; canonical current Mac root:
`/Users/awd/Library/Mobile Documents/com~apple~CloudDocs/عمل/تجارة/Calapres/Ai-Work`.
Verify access and sync, preserve historical Downloads originals, and do not relocate them by
assumption. Existing creative record distinguishes local saves from unconfirmed iCloud upload.

## Deletion-confidence audit and privacy boundary

All material continuity items available in this conversation have a canonical home in the
coverage map, with new investigation evidence and owner direction added here. Historical
attempts remain in their original focused records. No known critical continuity gap remains;
unverified operational outcomes are explicitly pending, not fabricated.
Intentionally excluded: raw customer/order identity, uploaded design URLs, account secrets,
signed browser URLs, tokens, raw tool responses, repetitive chat and transient browser state.
This is a sanitized operational handoff, not a verbatim transcript or legal-evidence archive.
Publication verification must read back all changed Markdown and canonical main before the
final safe-to-delete-for-project-continuity verdict. No live-system or code changes belong to
this handoff publication.
