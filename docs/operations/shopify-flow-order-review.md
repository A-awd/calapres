# Native order review, follow-up and undelivered queue

Applied in authenticated Calapres Shopify Admin on 2026-10-26, Asia/Riyadh.
Owner explicitly authorized native review/follow-up/internal alerts, an undelivered order view,
and read-only OTO verification without issuing a label. No n8n or AI step is part of these flows.

## Active native workflows

### كالابريز — مراجعة الطلب المدفوع ومتابعته بعد 24 ساعة

Workflow: `01a179a9-a15f-7924-9ff2-6b64eca6f2c3`
Saved editor version: `01M5WTK8AZ9Z66Q7P9T9SQW8F7`
Editor: https://admin.shopify.com/store/unywbe-ub/apps/flow/editor/01a179a9-a15f-7924-9ff2-6b64eca6f2c3/01M5WTK8AZ9Z66Q7P9T9SQW8F7

One combined workflow implements both the new-paid-order review and the delayed follow-up:

1. Trigger: Order paid. This starts on full payment, not partial payment or an authorization alone.
2. Eligibility condition: `order.test` equals false; NONE of `order.tags` equals `تجريبي`;
   `order.cancelledAt` does not exist. False branch performs no action.
3. Add order tag `مراجعة-طلب` without replacing existing tags.
4. Send internal email to the fixed store business mailbox `info@calapres.com`.
   Subject: `كالابريز | طلب مدفوع للمراجعة {{ order.name }}`.
   Body requests review of customization, approval and address; preserve prior approval and do
   not create a waybill before readiness. It contains only order name and direct Admin link,
   not customer identity/contact/address. Link uses `{{ order.legacyResourceId }}`.
5. Update the existing merchant-owned definition `calapres.customization_approval` (single line
   text). A native Flow metafield variable was explicitly created on order as
   `customizationApproval`; its selected property is `order.customizationApproval.value`.
   Configured value: `{{ order.customizationApproval.value | default: 'بحاجة إلى مراجعة' }}`.
   Nonempty approval is preserved; empty approval receives the review state. No approval is
   invented. This action can rewrite the same nonempty value; it does not approve a design.
6. Wait24 hours, once per workflow execution. No repeated quarter-hour polling.
7. Refresh current order facts after Wait and check ALL: displayFulfillmentStatus is NOT
   FULFILLED; cancelledAt does not exist; displayFinancialStatus equals PAID.
8. True branch sends one internal follow-up to `info@calapres.com`, with order name and Admin
   link. It explicitly calls for checking approval/preparation and says the alert does NOT mean
   that a customer delivery promise is late. False branch performs no action.

The sequence is review tag -> first internal email -> default/preserved approval -> Wait ->
follow-up condition -> second internal email. A failure stops downstream work and is handled by
native error alerting; successful email action is not proof of inbox receipt. Manual replay can
repeat internal emails; this task did not run a live/manual replay on historical orders.

No fulfillment hold/release, payment, cancellation, refund, shipment, customer message or CRM
write was added. No product/customization variant or original line-item request was changed.
Other internal fields remain staff-maintained. Setting approval alone is not a Flow trigger.
Existing historical paid orders were NOT replayed or bulk migrated.

### كالابريز — تنبيه تعطل الأتمتة

Workflow: `01a179a4-9d74-78c3-9b5a-36da89df2baf`
Saved editor version: `01M5WT97BM9B4DYT05HWSDTQDD`
Editor: https://admin.shopify.com/store/unywbe-ub/apps/flow/editor/01a179a4-9d74-78c3-9b5a-36da89df2baf/01M5WT97BM9B4DYT05HWSDTQDD

Official Shopify template: Workflow error occurred -> Send Shopify alert for errors.
No recipient/data field is invented; the native action provides Shopify Admin error alerts.
The trigger deduplicates once per workflow version within30 days. It does not detect a source
order event that never started a workflow, or a technically successful but incomplete business
outcome. No deliberate live failure or alert-delivery test was induced.

## Verification and operational boundaries

Both new workflows showed Turn off workflow after activation and Active in the reopened
workflows list. Two pre-existing marketing workflows remained unchanged and Active.
A first, more complex official logistics template was created but never activated. It remains
Inactive, renamed `مسودة غير مستخدمة — لا تفعّل`; it is not an operating workflow. No step or
workflow was permanently deleted; native step deletion warned that it cannot be undone.

Used native Test your workflow -> Add event -> Create event with existing-order snapshots.
These are Flow test events, not new orders or actual payment events; no actions were executed
against the source orders and no staff/customer email was actually sent by these tests.
Observed acceptance results:

- Real unfulfilled, paid, noncanceled order: initial eligibility Condition was true.
- First email Configuration preview rendered the correct fixed recipient, order name and exact
  numeric Admin order link without stray Liquid braces.
- Existing nonempty review state: approval action preview preserved it.
- Owner test order carrying `تجريبي`: eligibility Condition was false.
- Its empty approval field preview resolved to `بحاجة إلى مراجعة`, while Off path; no write.
- Real unfulfilled paid order: follow-up Condition was true in the snapshot.
- Existing manually fulfilled/delivered order: follow-up Condition was false.
- Wait24 hours and both email recipients/texts were saved/read back. Live24-hour execution,
  a real approved-status case and actual inbox receipt remain outside this simulation evidence.

Local UI evidence directory: `/Users/awd./.codex/visualizations/2026/10/26/`.
Proof files include `calapres-flow-errors-active.png`,
`calapres-flow-review-followup-active.png`, `calapres-flow-completed-order-excluded.png`
and `calapres-flow-workflows-active.png`. Screenshots are private local evidence, not uploaded.

Rollback: turn off only these two named workflows in native Flow. Deactivation also cancels
pending Wait runs. Do not disable existing marketing automations or delete definitions/values.

## Saved undelivered order view

Name: `الطلبات التي لم تُسلّم`
View ID: `1599521751296`
Direct entry: https://admin.shopify.com/store/unywbe-ub/orders?savedViewId=1599521751296
Saved native query:

`-delivery_status:"delivered" -status:"cancelled" -tag:تجريبي`

Saved from All as a NEW view; existing views were preserved. Native filters read back as Delivery
status is not Delivered, Order status is not Canceled and Tagged with is not تجريبي. The saved
view shows two existing unfulfilled real orders; completed private-courier deliveries and tagged
owner tests are absent. Unknown/no delivery status is retained. This is a saved view, not a
changed Orders-sidebar default. It does not filter only Unfulfilled/Open or hide all Archived.
It depends on accurate native delivery status. Split/multiple-shipment aggregation has not been
acceptance-tested; verify that edge case before relying on it for split shipping at scale.
Local proof: `calapres-undelivered-orders-view.png`.

## Read-only OTO findings

Official OTO - Shipping Gateway is installed and current Orders table contains imported orders.
Both current unfulfilled real orders are Assigned to Warehouse. The tracking URL column exists,
but there are no current shipment tracking links to compare against native Shopify fulfillment.
OTO dashboard:7 pending,0 awaiting pickup,0 currently shipping,0 on hold,0 delivered,0 returned;
3 canceled technical fixtures remain in OTO, total10 records. Prior Shopify Admin deletion did
not erase those third-party records. No cleanup/cancellation or Sync was performed in OTO.

Settings readback: auto-create shipments Off; OTO checkout discounted rates Off; correct
Calapres store identity/contact mailbox; account remains connected (Switch account available).
No explicit tracking/status mapping control was exposed in the embedded settings inspected.

Therefore order import is observed, but OTO -> Shopify tracking/Delivered writeback remains
UNVERIFIED: no existing genuinely shipped record is available. Current manually delivered
private-courier Shopify orders are not evidence of OTO-delivered events; OTO still shows them
Assigned to Warehouse. Do not claim bidirectional delivery sync based on those manual updates.

No waybill, carrier booking, credit funding, automatic shipment toggle, checkout rate, location
Sync, account switch, connection test, live test order or support/customer message occurred.
Next shipping acceptance: on the first owner-approved real shipment after physical readiness,
compare native carrier/tracking number/URL and later genuine carrier event/Delivered in both
systems, without duplicating its label. The pending native address-field contract remains separate.
Proof: `calapres-oto-orders-no-shipments.png`, `calapres-oto-no-active-shipment.png`.

## Official references

- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/order-paid
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-email
- https://help.shopify.com/en/manual/shopify-flow/concepts/variables
- https://help.shopify.com/en/manual/shopify-flow/getting-started/concepts/metafields
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/wait
- https://help.shopify.com/en/manual/shopify-flow/manage/test-workflow
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/workflow-error-occurred
- https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/filtering-orders
- https://help.tryoto.com/en/support/solutions/articles/150000200191-sales-channels-faqs
