/Users/awd/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
# Calapres Captain order bridge and deferred roadmap handoff

Date: 2026-08-26

## Purpose

This record closes the post-`v1.1` conversation without replacing the protected Captain baseline.
It records the later Chatwoot upgrade, the first isolated external tool, its exact evidence limits,
the owner's operating preferences, and work that was discussed but deliberately deferred.

GitHub `main` remains the technical source of truth. Shopify remains the operational source of
truth for products, prices, customers, orders, fulfillment, and tracking data that has actually
reached Shopify. Chatwoot Captain remains the conversational layer.

## Protected state that remains unchanged

- `Calapres Assistant` (`2187`) remains the only automatic customer-facing responder connected to
  WhatsApp `128058`, Instagram `128031`, and TikTok `128033`.
- Audience remains `Everyone` and Schedule remains `Anytime`.
- The existing conversation-created automation still assigns the four Calapres inboxes to
  `خدمة عملاء كالابريز`.
- The rejected n8n responder `kAyF0D3ZZHxc0Hwp` remains unpublished and must never run while
  Captain is connected.
- The accepted `Calapres Captain v1.0 — Stable` baseline and its rollback branch remain intact.
- The additive `v1.1` engraving delta remains live: 74 approved FAQs, 22 documents, and the exact
  engraving limits recorded in the `v1.1` baseline. No earlier knowledge was deleted.
- Final owner-observed channel evidence still covers WhatsApp only. Equivalent final-baseline proof
  is not claimed for Instagram or TikTok.

## Chatwoot upgrade and new external-tool architecture

[Owner-reported] The Chatwoot account was upgraded to the Business plan. The exact current invoice
and plan price were not independently read during this closeout, so no billing amount is recorded
as verified.

[Verified live in authenticated Chatwoot] Captain now exposes exactly one custom tool:
`Calapres Shopify Order Lookup`. Its use is limited to an existing customer's order, fulfillment,
shipping, or tracking question. The tool has no customer-entered parameters and passes the current
conversation phone to an authenticated n8n webhook. It is not authorized for product prices,
cancellation, refunds, order edits, or Shopify writes.

[Verified live in authenticated n8n] The tool calls the published workflow
`Calapres | Captain Shopify Order Bridge v1` (`lLJpvjtcxTaoQeGj`). The workflow is active and has
only five linear nodes:

1. Receive the Captain tool request.
2. Validate the shared authorization, Chatwoot account `179973`, assistant `2187`, and Saudi mobile
   number; then build a bounded Shopify query.
3. Read Shopify Admin GraphQL using the dedicated read credential.
4. Convert the Shopify result into one safe result object.
5. Return that result to Captain.

This is an isolated bridge, not a replacement responder. Captain still writes the natural customer
reply. The bridge performs one bounded read and does not compose or send customer messages.

## What the order bridge can and cannot do

[Verified from the live workflow definition]

- It searches Shopify by the normalized Saudi phone attached to the current Chatwoot contact.
- It reads at most three matching customers, then the latest three orders for the unique customer.
- On one unique match it can return the customer's first name, order number and date, financial and
  fulfillment states, cancellation state, and up to three tracking records already stored in
  Shopify.
- On no match it returns `not_found`; on multiple customers it returns `ambiguous`; on a bridge or
  source problem it can return an unavailable result. Captain must not convert any of these states
  into the definitive claim that the customer has no order.
- Requests without a usable Saudi mobile number now use a safe no-match query rather than causing a
  server error.
- The Shopify operation is read-only. No mutation, cancellation, refund, fulfillment, customer
  edit, or outbound message is present.

[Important current limit] The tool text asks the customer for a full order number when the phone
lookup cannot safely resolve the request, but the current tool and workflow cannot search by order
number. The number only helps a human continue the case in the same chat. A future order-number
lookup would be a separate, approved capability, not something that may be implied now.

[Important current limit] No shipping-company API or shipping aggregator is connected. The bridge
can return only the carrier and tracking information already written into Shopify by some other
approved process.

## Verification evidence and gaps

[Verified in n8n execution history]

- Successful authenticated calls proved that Captain's tool endpoint can reach the workflow and
  that the workflow can perform its read-only Shopify query.
- An intentional request using the retired authorization value failed after the bridge credential
  was rotated, proving that the old value was rejected.
- Missing or unusable contact-phone cases initially failed. The workflow was then corrected so the
  same cases completed safely and returned a no-match result.
- The successful results inspected during this closeout all contained no matching Shopify customer.

[Not yet verified]

- No real matching customer/order result was observed.
- No proof yet shows Captain greeting a matched customer by name or returning a real fulfillment or
  tracking result.
- No new WhatsApp, Instagram, or TikTok delivery test was performed for the order tool.
- The current payment-gateway test mode was not confirmed, and no real or test checkout, payment,
  fulfillment, dispatch, or return was created in this stage.
- A complete order-number fallback and human escalation path has not been end-to-end tested.

Therefore the correct claim is: the authenticated read bridge and safe no-match path work; the real
matched-order customer experience remains unproven.

## Security and credential boundary

The bridge secret and Shopify credential must remain only in their authenticated platform settings.
No credential value, customer phone, customer name, order data, or raw execution payload belongs in
GitHub. During this read-only audit the authenticated editor rendered secret values, including
unrelated environment values, in its operator interface. None is reproduced in this record. Before
the bridge is treated as final production security state, perform one separately authorized,
bounded credential-hygiene stage: rotate the bridge authorization in Chatwoot and n8n together,
confirm the retired value fails, confirm the new value reaches only the safe no-match path, and
review whether unrelated visible credentials also require rotation.

## Durable operating decisions from the owner conversation

- Do not rebuild a separate assistant or complete architecture for each small improvement. Continue
  the same accepted Captain assistant with small, recorded, reversible deltas.
- Keep Captain as the conversational intelligence. Use n8n only when Captain needs a narrowly
  defined external read or action.
- Each future external feature gets its own small, independently removable bridge. Never rebuild a
  giant all-purpose responder like the rejected 107-node workflow. Each capability still requires
  its own owner approval; this pattern does not preapprove new tools.
- Shopify is the live authority for frequently changing products, prices, inventory, customers,
  orders, fulfillment, and tracking. Do not copy changing prices into static Captain knowledge and
  then require two manual edits. The current order tool does not read product prices, so no product
  or price answer may be described as live until a separately approved Shopify read succeeds.
- Captain speaks as `خدمة عملاء كالابريز` and does not lead replies with an unsolicited technical
  explanation that it is automated. It must nevertheless answer truthfully if directly asked
  whether it is a human or an automated assistant.
- Keep uncertainty inside the same customer chat and route it internally. Do not send the customer
  to email merely because a live fact is unavailable.
- Respond.io is closed as an alternative for this architecture. Do not restart that evaluation
  unless the owner explicitly reopens it.
- Use Saudi riyals for all commercial explanations to the owner; do not communicate prices in
  another currency.
- Do not create unsolicited PDF reports. The locally generated shipping PDF is not an approved or
  authoritative project artifact and must not be published.

## Chatwoot-native feature inventory

The post-upgrade implementation changed only the single Captain order tool and its isolated bridge.
It did not add a second Captain assistant, a new document, a scenario, a macro, a canned reply, a
label, a custom attribute, a message template, a contact type, a team, or another agent-assignment
rule. The existing assignment automation and `خدمة عملاء كالابريز` identity remain unchanged.

The assistant switcher visible in Chatwoot is useful for isolating a future brand or genuinely
different support purpose; it does not make the current Calapres assistant smarter by itself and is
not permission to clone Calapres for each incremental change. Documents and FAQs remain appropriate
only for stable, approved knowledge. Changing products, prices, inventory, orders, fulfillment, and
tracking should come from a separately approved live Shopify read, not repeated manual documents.

## Voice-note evidence

[Verified configuration] Account-level audio transcription is enabled.

[Owner-observed] After an earlier voice-note exchange produced nonsensical replies, the owner sent
a later voice question and confirmed that Captain understood it correctly. This is a useful
behavioral observation, not proof for every channel, accent, recording quality, or outbound-audio
case. No separate audio workflow or n8n bridge was created.

## Outbound WhatsApp is deferred

The owner wants future order updates and promotional messages to be initiated from the business.
Nothing was implemented. Before design or activation, refresh the current official Meta and
Chatwoot rules for the customer-service window, approved message templates, consent, marketing
categories, opt-out handling, and fees. Do not assume that an ordinary free-form message can be
started outside the permitted window. Treat order notifications and marketing campaigns as
separate features and separate approvals.

## Shipping research preserved for later discussion

[Deferred; no provider selected, installed, paid, connected, or tested]

The store currently sells luxury burner sets. Restrictions specific to shipping liquid perfume,
oils, charcoal, or incense are outside the present catalog and must be re-evaluated only if those
items are added.

The preferred future shape is:

    Shopify
        -> one approved multi-carrier gateway
        -> Fastlo where its coverage and contract are suitable
        -> one approved backup carrier for uncovered routes
        -> one fulfillment and tracking record written back to Shopify
        -> Captain reads the resulting Shopify state

Do not install two shipping applications that both update the same order, and do not build a custom
n8n shipping bridge before the chosen platform's native Shopify behavior is proven insufficient.

Research snapshot, not a purchase decision:

- OTO showed a free entry plan plus published paid tiers of SAR 59, SAR 279, and SAR 1,599 per
  month. The free tier advertises labels at OTO rates but not the merchant's own carrier contracts.
  It includes one sales channel and advertises cash-on-delivery settlement every 14 days.
  The SAR 59 tier advertises up to three carrier contracts, 50 own-contract shipments, three users
  and sales channels, and five automation rules; additional own-contract shipments are published at
  SAR 1.80 each. OTO had the strongest public Shopify-integration evidence in the review, but
  Fastlo contract support and exact Shopify status/tracking writeback still require written
  confirmation and a test.
- Torod showed a free entry point, a Premium tier at SAR 199 per month, and a Pro tier at SAR 399
  per month. Public Premium rates included SAR 16.10 within main cities and SAR 20.70 across Saudi
  Arabia, with weekly cash-on-delivery settlement; Pro advertised twice-weekly settlement. A
  Shopify listing that is free to install does not prove that the needed operational tier is free.
  Contract support, writeback, returns, and all extra fees require written confirmation.
- Fastlo has owner-reported reliability from prior use, but the owner also reported incomplete
  geographic coverage. A public Salla listing showed SAR 35 within the same city and SAR 45 between
  cities up to 15 kilograms, SAR 5 per additional five kilograms, before value-added tax, with
  cash-on-delivery transfer within two business days after delivery. Those are Salla-channel terms,
  not verified terms for the owner's direct contract. No sufficiently strong public evidence was
  found for a maintained direct Shopify application or documented merchant API. Fastlo is therefore
  a preferred carrier candidate where covered, not yet a proven national Shopify backbone.
- SIDEUP publicly presents a Shopify integration and multi-carrier operation without a fixed
  self-service subscription, but pricing and minimums are quotation-based and exact Shopify
  writeback behavior was not proven.
- Waared advertises pay-per-shipment access to more than 20 carriers and use of merchant carrier
  contracts, but the review did not find Shopify evidence strong enough to put it ahead of the
  shortlist.

The first commercial check, when the owner reopens shipping, is whether OTO's SAR 59 tier accepts
the owner's Fastlo contract and writes tracking and status correctly to Shopify. If not, compare it
with Torod Premium using the same routes and all-in fees. If neither supports Fastlo, use one
gateway for the national core and keep Fastlo as a controlled manual or isolated exception without
duplicate fulfillment.

Written answers required before choosing a provider:

- Does the platform accept the existing Fastlo contract, and what are the associated fees and
  shipment limits?
- Which fulfillment, tracking, cancellation, return, and failed-delivery events are written back
  to Shopify?
- What is the all-in price, including value-added tax, remote-area, cash-on-delivery, return-to-
  origin, return, insurance, packaging, and claims charges, for the owner's actual five routes?
- What are the settlement timing and reconciliation method for cash on delivery?
- Can a complete test be run without dispatching a real parcel?

Acceptance should use one controlled prepaid route, one cash-on-delivery route, one covered and one
uncovered destination, and cancellation/return and manual-fallback cases. Success means exactly one
fulfillment and one accurate tracking trail in Shopify.

Public sources checked for this deferred snapshot:

- OTO: [Saudi plans](https://www.tryoto.com/plans-ksa),
  [plan details](https://help.tryoto.com/en/support/solutions/articles/150000211067-oto-packages-and-plans-features-explained),
  [Shopify application](https://apps.shopify.com/oto), and
  [Shopify connection guide](https://help.tryoto.com/en/support/solutions/articles/150000202278).
- Torod: [plans](https://torod.co/en/price),
  [Shopify application](https://apps.shopify.com/torod), and
  [Shopify connection guide](https://help.torod.co/docs/%D8%B1%D8%A8%D8%B7-%D9%85%D8%AA%D8%AC%D8%B1-%D8%B4%D9%88%D8%A8%D9%8A%D9%81%D8%A7%D9%8A).
- Fastlo: [official site](https://fastlo.com/ar),
  [current Salla application listing](https://apps.salla.sa/ar/app/2050328018), and
  [Shopify community integration answer](https://community.shopify.com/t/integrating-shipping-software-with-shopify/199059).
- SIDEUP: [Saudi FAQ](https://sa.sideup.co/faq) and
  [Shopify application](https://apps.shopify.com/sideup-ksa).
- Waared: [official site](https://waared.sa/en).

These pages support only the stated public snapshot. Carrier availability, tax treatment,
contracts, remote-area fees, operational quality, and Shopify writeback can change and must be
reconfirmed before purchase.

## Exact next safe stage

Do not add another knowledge group, shipping platform, outbound WhatsApp feature, or second bridge
from this handoff. First obtain approval for one bounded security stage: rotate and reverify only
the Captain order-bridge authorization, without changing the assistant, inboxes, knowledge,
workflow shape, Shopify data, or customer conversations. Then stop for owner review.

After that review, the next functional proof should be a single controlled matched-order test that
does not dispatch a parcel and does not alter a real customer's order. Confirm the payment/test
conditions first, create or select an authorized test record with the owner's test phone, verify
the matched result inside Captain, record exactly what was observed, and stop. Do not add
order-number search or a shipping connection during that proof.

## Rollback

- To remove only the new external capability, disable or remove the single Captain tool and
  deactivate workflow `lLJpvjtcxTaoQeGj`; do not touch Captain's inbox connections or knowledge.
- Never publish responder workflow `kAyF0D3ZZHxc0Hwp` while Captain is connected.
- The Captain `v1.0` rollback branch and `v1.1` knowledge delta remain independent of the order
  bridge.
