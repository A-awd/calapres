# 0051 — Native Shopify order operations fields

Date: 2026-10-26
Status: owner-approved; implemented and verified live

## Decision

Use twelve merchant-owned, globally pinned Shopify ORDER metafields for customization approval,
requested text and final image; preparation stage; occasion and agreed delivery dates; delivery
method, courier/company and actual receipt date; gift card, wrapping and additions.
Keep approval/text/design first. Use the exact schema and Arabic choice sets in
[the staff guide](../docs/operations/order-page-fields.md).

## Boundaries

This is manual internal organization, not an automated approval gate or a new service.
No price, shipping label, payment, fulfillment, storefront, Captain or n8n behavior is altered.
No approval, delivery commitment or historical date may be inferred from a field being present.
Retain the source line-item inputs; use the new fields as a staff review record, not an overwrite.
Access remains internal: Storefront API disabled and Customer Account API No access.
Only approval, preparation and delivery method use the native order-list filtering capability.

## Acceptance

All twelve definitions persisted after reload, are globally pinned and appear on two existing
orders in the agreed order. The first real customization review was saved/retrieved with a
needs-review state and existing requested text; an internal comment explains the input mismatch.
No customer message, new order or financial/shipping operation was performed.

## Next

Staff review actual customer approval and populate verified facts. Automation, validation gates,
external synchronization or new file uploads require their own authorized implementation.
