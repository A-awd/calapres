# Shopify Flow and OTO tracking research — 2026-10-26

Status: researched proposals and read-only Admin inspection. No new Flow, view, shipping,
label, notification, customer message, app, paid feature or permission was configured.

## Native OTO integration: capability versus acceptance

The official OTO Shopify app imports orders without n8n. Importing an order, creating a
shipment, generating its waybill and observing physical delivery are separate outcomes.
The app has fulfillment/shipping write permissions; these do not establish successful
tracking/status writeback on this store. Public documentation reviewed does not give an
exhaustive Shopify-specific carrier/field/event compatibility contract.

OTO says sales-channel status discrepancies require checking Status mapping and Integration
Logs. Shopify explicitly warns that tracking number/carrier/URL presence does not itself
ensure automatic shipment-status updates. Tracking belongs in native Shopify fulfillment
tracking and delivery status; the new internal calapres courier/date fields are not automatic
OTO targets. A printable waybill PDF is distinct from the customer's tracking URL.
Detailed scans/location may remain behind the OTO/carrier tracking link; do not promise live
map/location or every checkpoint inline in Shopify.

Acceptance remains pending: read the current OTO Shopify channel settings, then compare an
existing genuinely shipped record in OTO and Shopify for tracking number, carrier, tracking
URL, fulfillment status and delivery event/time. Prefer an existing delivered shipment if
available. Do not create a label or reconstruct deleted address fixtures merely to test.
Native address-field specification remains separately pending in OTO ticket308330.
Existing owner policy remains manual label release only after physical readiness; no COD,
funding, paid shipment or automatic label issuance is authorized by this research request.

## Order work queue and default-page limit

Current native Admin All view contains seven existing records; the saved real-order view
contains four. Two real records show Delivered and two show Unfulfilled with no delivery
status. No order status was changed during this inspection.

Official Shopify docs say All is the default unfiltered view and cannot be changed/deleted.
Saved views support filters, columns and sorting. Live View actions on All exposes Duplicate;
on the existing custom view it exposes Rename, Duplicate and Delete. No Set as default/pin
option was present in the inspected menus. Do not claim the Orders sidebar has been changed.
A saved view has a direct savedViewId URL and can be used as the daily entry link. Last-view
persistence across navigation, browser restarts or devices was not established.

Propose an Arabic queue named الطلبات التي لم تُسلّم: exclude experimental and canceled
orders; retain preparation, tracking-added, in-transit, attempted, delayed, failed and unknown
status; exclude fully delivered orders. No status means delivery unknown, not proof of failure.
Do not substitute Unfulfilled: a Fulfilled order can still be in transit. Do not require Open or
hide all Archived: the store autoarchives paid/fulfilled orders before physical delivery.
Check multi-shipment/partially delivered behavior before using a simple Delivered exclusion;
all required items must be delivered before removing a split order from the work queue.
No new view or filter was saved during this task.

## Proposed phased workflows

| Priority | Operational outcome | Supported trigger/action and boundary |
|---|---|---|
| 1 | Every newly paid order enters review | Order paid; initialize only empty internal fields, add review tag and internal alert. Preserve genuine earlier approvals. Flag customization-request/variant discrepancies where source data is available. |
| 2 | Stalled approval/preparation is visible | Order paid then one Wait, refresh current data and notify only if still stalled. Threshold remains owner decision. Avoid repeated polling. |
| 3 | Staff have a daily urgency queue | Scheduled time + Get order data; compare actual promised/occasion dates and unresolved delivery state. Date definition filtering must first be enabled and query verified; fetch limit100 requires bounded handling at scale. |
| 4 | Unapproved customization cannot silently reach dispatch | Evaluate native Hold fulfillment order on ready-to-fulfill event, only after confirming OTO respects the hold. Manual approval/QA release; no automatic waybill. Do not blindly release all holds. |
| 5 | Carrier delivery closes operations | Fulfillment event created, real DELIVERED event; update internal stage/date only when OTO event writeback is proved. Manual courier events need their own path. |
| 6 | Automation failure is visible | Workflow error occurred + Shopify error alert/internal email. Native trigger deduplicates once per workflow version within30 days; it does not detect a missing source event or business outcome by itself. |
| 7 | Low stock is surfaced before overselling | Product variant inventory quantity changed; actual tracked stock/location and threshold crossing guard; internal alert/tag. |
| 8 | Risky paid orders are reviewed | Order risk analyzed; high-risk tag/alert and carefully scoped hold. No automatic cancellation, refund or payment capture. |
| 9 | Recorded returns get an owner | Return requested; internal triage tag/alert and follow recorded return lifecycle. This trigger requires self-serve returns and does not capture WhatsApp requests alone. |

Important implementation limits:
- Current official Flow trigger catalog does not list a native order-metafield-updated trigger.
  Selecting معتمد من العميلة alone is not an immediate automatic Flow trigger. Use a supported
  manual Run Flow automation, an event/Wait or bounded scheduled check, then verify readback.
- Release fulfillment order holds can release all holds, including another app/risk hold.
- Fulfillment event created applies to external fulfillment-service events, not manual events.
- Flow installation/configuration on this store was not verified by this research.
- Native event/condition workflows above do not require an AI step. Any WhatsApp connector,
  template, consent, message send or delivery receipt needs separate configuration/acceptance.
- Reuse the schema/workflow pattern for future brands with isolated stores, identities, credentials
  and notification recipients; this is not authorization to deploy across brands.

Suggested first implementation batch: paid-order review, one delayed internal follow-up and
error alert; then validated undelivered work queue and daily urgency digest. OTO gates/delivery
automation follow evidence of connector writeback and hold behavior. A successful Flow run is
not proof that OTO received tracking or that a customer received a WhatsApp message.

## Primary sources reviewed

- https://apps.shopify.com/oto
- https://help.tryoto.com/en/support/solutions/articles/150000202278-integrate-oto-with-shopify
- https://help.tryoto.com/en/support/solutions/articles/150000200191-sales-channels-faqs
- https://apis.tryoto.com/
- https://shopify.dev/docs/api/admin-graphql/latest/objects/fulfillmenttrackinginfo
- https://help.shopify.com/en/manual/fulfillment/setup/order-status-page/order-tracking
- https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/searching-orders
- https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/filtering-orders
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/update-order-metafield
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/wait
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/get-order-data
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/hold-fulfillment
- https://help.shopify.com/en/manual/shopify-flow/reference/actions/release-fulfillment-hold
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/fulfillment-event-created
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/workflow-error-occurred
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/product-variant-inventory-quantity-changed
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/order-risk-analyzed
- https://help.shopify.com/en/manual/shopify-flow/reference/triggers/return-requested
- https://shopify.dev/docs/apps/build/metafields/query-using-metafields
