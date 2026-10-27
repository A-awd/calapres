# Published Shopify Flow ideas for Calapres — research only

## Applied follow-up — 2026-10-27

The owner subsequently selected idea 5 and asked to omit idea 1 if the storefront already
required engraving text/card messages. Live empty/whitespace checks confirmed product-form
validation; no theme change or missing-data workflow was needed. Idea 5 is now an Active native
returning-customer tagging/internal-notice flow. Native negative simulations passed; positive
production execution and actual mailbox receipt remain unverified. See
[the current implementation and limits](../operations/shopify-flow-returning-customer.md) and
[decision 0053](../../decisions/0053-native-returning-customer-classification.md).
The research below is preserved as the earlier record; its no-selection/no-change statements
apply to that research phase. Ideas 2–4 remain proposals, not approvals or saved workflows.


27 October 2026, Asia/Riyadh. Owner requested published workflows/templates, an explanation of
practical benefits and a recommendation; explicitly prohibited applying them. Baseline main:
`ad3d525d964872516196af6f6d7917c8f230beb2`. Global launcher/routing remained unchanged at verified
`dd0e7d3dbbb3d31a635fa78555cdb7f2e61b2bf3`. No workflow was created, imported, edited, tested,
activated or disabled; no connector/app was installed and no message or shipment was sent.

## Existing work excluded from new recommendations

Read-only observation of the existing native Flow list confirmed five entries: the paid-order
review/24-hour internal follow-up, workflow-error alert, subscriber welcome-discount email and
abandoned-checkout recovery were Active; the unused draft remained Inactive. This readback proves
configuration only, not actual internal-mail receipt or a completed live 24-hour execution.
The current review, alerting, twelve order fields and saved undelivered view must be preserved.
Do not offer welcome, abandoned checkout or a second generic paid-order email as new additions.

## Research scope and evidence strength

Reviewed current Shopify Help/template references, the Flow marketing page's linked popular-template
article, original merchant discussion and creator documentation. The linked Shopify popular-template
article was last updated in 2023; use it as published pattern history, not current adoption statistics.
Technical availability was checked against current Help references. Community/creator examples show
that a pattern has been published; they do not prove store-specific success or measured sales uplift.
The following priority is a Calapres recommendation, not a ranking by global usage counts.

## Suggested priority

| Priority | Candidate | Published basis | Calapres addition and expected value |
| --- | --- | --- | --- |
| 1 | Missing engraving/card data and work tags | Official customAttributes conditions/actions template; original Countertop engraving example | Inspect structured data per line item, identify engraving/card work and flag missing required values before staff preparation. Extend current review rather than duplicate its email. |
| 2 | Stop-work notice after cancellation of a custom order | Get notified when an order containing a specific product is canceled | Order canceled, with selected custom/physical-card products, sends an internal stop-work notice. Helps the team avoid continuing engraving after cancellation. Does not cancel or refund anything. |
| 3 | One daily priority digest using actual staff-entered dates | Tag and send a daily summary of late fulfillments; official scheduled-summary examples | Consolidate pending approval/preparation and approaching recorded occasion/promised dates into one staff email. Unlike the existing per-order 24-hour follow-up, it prioritizes current work across orders. |
| 4 | Low-stock threshold crossing alert | Get notified by email when product variant inventory is low | Notify staff when a tracked variant crosses a chosen threshold, rather than on every below-threshold change. Supports timely stock planning without automatically ordering, hiding or republishing products. |
| 5 | Identify a genuine returning customer | Organize customers by order count tiers; Segment customers by purchase behavior | Internal returning-customer tag/notice within existing review can prompt more personal staff service. No automatic discount, reward, gift purchase or customer send. |

### 1. Customization completeness and order classification

Proposed sequence: Order paid -> exclude test/canceled fixtures -> evaluate each relevant line's
structured attributes -> add specific work/review tags -> flag only missing required data.
Example tag names such as حفر, كرت إهداء and نقص بيانات are proposals, not saved configuration.
The official template reads customAttributes for conditions/tags/notes; the missing-data check is
our proposed adaptation, not a prebuilt Calapres validator. The Countertop example is a POS app
publisher's original description of per-item engraving data -> Flow tagging/internal notifications;
no Countertop installation is proposed or required merely to use the native structured-data pattern.

Actual line-property keys and requirements must be inspected before any implementation. Evaluate
conditions on the same line item; one item's text must not satisfy another item's engraving.
Shopify documents an empty-list condition caveat, so a simple Empty check alone is insufficient.
A file URL or text value does not prove design validity, customer approval or manufacturing readiness.
The physical printed card is a product/message, not a Shopify stored-value gift card or payment gateway.
Do not apply a financial gift-card template to it or overwrite original personalization instructions.

### 2. Cancellation after work has begun

Proposed sequence: Order canceled -> relevant personalized product/card present -> one staff notice
with safe Admin link and a clear instruction to review/stop preparation. This is event-driven, not
polling. It is an internal exception path distinct from the current Order paid review. Production
stage can later help decide urgency, but a blank stage is not proof that work never started.
Do not add automatic cancellation, payment capture, refund, restock or customer notification.
Avoid duplicate notices where cancellation also produces a refund event. Historical orders are
not replayed. Email configuration/success would still require separate destination receipt evidence.

### 3. Daily digest and real promised dates

Official scheduled patterns retrieve orders, evaluate conditions and send a summary once at the
selected time. A Riyadh morning schedule and any lead-time window are examples for later selection,
not configured decisions. Do not adopt the source template's two-day shipping guarantee as a Calapres
promise, and do not treat the general 14-day policy as every customer's agreed arrival date.
Use only actual staff-entered occasion/promised-delivery dates; leave unknown dates unknown.

For preparation, include pending approval/production cases. For delivery follow-up, do not restrict
coverage to Open or Unfulfilled: archived or already-shipped orders can still be undelivered. Keep
payment/cancellation/test exclusions and the actual delivery status appropriate to each section.
The current OTO writeback gap limits any delivery-dependent result. Do not invent carrier events.

Get data returns at most 100 entries per action: later design must cover the intended population
without silent truncation. If Run code is chosen, pass scheduledAt as the date input; its sandbox
has no live clock functions. No code, schedule, query or digest was created in this research.

### 4. Low stock

The inventory-quantity-changed trigger supplies previous quantity. Proposed policy: previously
above the chosen threshold, now at/below it -> internal notification. A value such as three units
is illustrative and needs owner selection, not a forecast or reorder commitment. Verify inventory
tracking and location; the trigger can fire even when inventory tracking is disabled. Packaging
consumables can only be included if they are actually modeled/tracked appropriately in Shopify;
Flow does not infer physical bag/card stock. Keep product publication and supplier contact manual.

### 5. Returning customers

The published tagging patterns support customer order-count/spend tiers. For Calapres, meaningful
repeat purchases should exclude owner tests/cancellations under an agreed counting policy; a raw
order count is not automatically a count of qualifying paid retained purchases. Add only an internal
service cue and coordinate it with current review. Do not create a second VIP marketing sequence,
promise uplift or automatically apply a discount. Any later marketing must account for the active
welcome/recovery flows, Klaviyo state, consent and duplicate-send prevention.

## Other published ideas retained for later

- **High-risk review/fulfillment hold:** Shopify publishes Hold fulfillments based on risk level.
  Useful before consuming a personalized blank, but only if the relevant risk data exists and the
  team follows the stop-work process. A fulfillment hold does not physically stop engraving or
  prove that OTO enforces it. Do not import automatic payment-capture/cancellation variants.
- **Hold pending customization approval:** a proposed adaptation, not a completed approval gate.
  No native order-metafield-updated trigger was established. Shopify's ready-made release action
  removes all holds on that fulfillment order, so automatic release could clear an unrelated risk
  hold. Do not promise automatic release merely when a field becomes approved.
- **Delivery-exception alert:** Fulfillment event created -> failed attempt/failure -> staff alert.
  OTO must actually supply those Shopify events; import or a tracking number alone does not prove it.
- **Review request after genuine delivery:** a publisher documents Delivered -> wait -> Judge.me
  request. This needs verified delivery events and the approved review/messaging tool/consent, and
  must not duplicate current marketing. No extra app is recommended merely to copy the example.
- **Return/refund exception review:** internal follow-up after Refund created can reveal recurring
  issues. Return requested only covers supported self-serve-return events, not every request in a
  conversation. Neither should approve a return/refund or send a customer message automatically.

## Source register

1. Current official examples: https://help.shopify.com/en/manual/shopify-flow/getting-started/workflow-examples
2. Flow overview/popular-template link: https://www.shopify.com/flow
3. Published popular-pattern article (updated 2023): https://www.shopify.com/enterprise/blog/ecommerce-automation-software-shopify-flow
4. Original merchant discussion (anecdotal): https://www.reddit.com/r/shopify/comments/1cpn1ab/creative_ways_youve_used_shopify_flows/
5. customAttributes and daily-summary templates: https://help.shopify.com/en/manual/shopify-flow/reference/actions/add-order-tags
6. Original engraving example (updated 23 February 2026): https://www.countertop.dev/docs/examples/engraving-messages
7. Same-item/list conditions: https://help.shopify.com/en/manual/shopify-flow/reference/conditions
8. Cancellation-specific-product template: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/order-cancelled
9. Scheduled summaries: https://help.shopify.com/en/manual/shopify-flow/getting-started/concepts/advanced-workflows
10. Get order data limits: https://help.shopify.com/en/manual/shopify-flow/reference/actions/get-order-data
11. Run code limitations: https://help.shopify.com/en/manual/shopify-flow/reference/actions/run-code
12. Low-stock template: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/product-variant-inventory-quantity-changed
13. Customer tiers: https://help.shopify.com/en/manual/shopify-flow/reference/actions/add-customer-tags
14. Fulfillment holds/templates: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/order-ready-to-fulfill
15. Release-all-holds boundary: https://help.shopify.com/en/manual/shopify-flow/reference/actions/release-fulfillment-hold
16. Risk-analysis scope: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/order-risk-analyzed
17. Native fulfillment events: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/fulfillment-event-created
18. Original Flow-team explanation: https://community.shopify.com/t/fulfillment-created-trigger-failed-to-get-attempted-delivery-notification/337353
19. Original delivery/review example (updated 20 July 2026): https://help.omegatheme.com/en/article/integrate-shopify-flow-18bakpv/
20. Refund follow-up: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/refund-created
21. Return-request scope: https://help.shopify.com/en/manual/shopify-flow/reference/triggers/return-requested
22. Flow availability: https://help.shopify.com/en/manual/shopify-flow
23. Internal-email constraints: https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-email

## Continuation

Research is complete; no candidate is selected or approved for implementation. Owner-facing first
recommendation is to improve customization completeness/classification within current review and
consider the cancellation stop-work exception, then a single digest and stock alert if useful.
Preserve Captain's pause, existing active flows/unused inactive draft, fields/view, private originals
and current permissions. No customer send, shipment, payment, trial or platform switch follows.
