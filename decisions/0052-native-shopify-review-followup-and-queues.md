# 0052 — Adopt native Shopify review, follow-up and order work queue

Date:2026-10-26. Owner explicitly requested applying the previously researched review,
follow-up/internal alerts, saving an undelivered view and inspecting OTO without a waybill.

## Accepted scope and applied state

Use native Shopify Flow for a combined Order paid review and one24-hour internal follow-up,
plus a separate native workflow-error alert. Keep notifications internal to the Calapres store
mailbox/Shopify Admin. Initialize empty approval to بحاجة إلى مراجعة; preserve existing
nonempty approval. Do not invent customer approval or block/release fulfillment by assumption.

Save a native order view excluding Delivered, Canceled and tagged experimental orders, retaining
unknown/in-transit work. It is a direct-entry saved view, not a changed global Orders default.
Both new workflows were activated and native simulation checked eligibility/exclusion, rendered
email/link, approval fallback/preservation and completed-order follow-up exclusion.
No historical live replay or actual email/24-hour-delivery acceptance was performed.

The dozen definitions in0051 remain merchant-owned/internal. Its former manual-only observation
is superseded ONLY for the approval fallback at Order paid; other field values remain manual.
Captain remains paused; old n8n systems and the two existing marketing workflows are unchanged.

## Shipping boundary

Read-only current OTO shows import, auto-create shipment Off and no genuine shipped/delivered
record. OTO -> Shopify tracking/status writeback remains unverified until an owner-approved real
shipment exists. This decision does not authorize creating a label, funding, carrier booking,
location Sync, address retest, customer message or new account/access.

See [exact configuration and acceptance](../docs/operations/shopify-flow-order-review.md).
Rollback is turning off the two new native workflows; preserve definitions and history.
