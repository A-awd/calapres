# 0030 — Adopt OTO as the prepaid-only Shopify shipping bridge

Date: 2026-09-01

Status: accepted and partially executed; pickup activation and an end-to-end test remain pending

## Context

Calapres needs a Shopify-native order-to-shipping bridge for Saudi delivery. The owner selected OTO
after the earlier carrier-platform review and explicitly prohibited cash on delivery. Payment-
provider work remains a later stage. Shopify already has two approved manual Saudi delivery rates:
SAR 25 below SAR 320 and free delivery from SAR 320.

The existing Shopify fulfillment location is named `SMSA Retail Shop`. OTO imported a sender
location with the same name, but its physical pickup details and the products' packaged weights and
dimensions are not yet verified.

## Decision

1. Use the official `OTO - Shipping Gateway` Shopify app and the existing `Calapres sa` OTO account
   as the shipping bridge for Calapres.
2. Keep cash on delivery disabled. Calapres accepts prepaid orders only; do not enable, test, or
   advertise cash on delivery.
3. Preserve the current Shopify Saudi rates: SAR 25 for order values from SAR 0 through SAR 319.99,
   and free delivery from SAR 320. Do not activate OTO checkout rates or replace these rates without
   a separate owner-approved commercial decision.
4. Map the existing Shopify fulfillment location to the matching OTO sender location, but do not
   activate courier pickup until the exact physical pickup address and phone are confirmed.
5. Do not invent packaged weight or dimensions. Record real packaged measurements before creating
   a default package or booking a carrier.
6. Prove the bridge with one prepaid test order: verify OTO order ingress, shipment creation, label,
   tracking number, and Shopify fulfillment/status writeback. A successful connection test alone is
   not end-to-end shipping proof.
7. Do not fund the OTO wallet, add an IBAN, buy a plan, book a carrier, or create a live shipment
   without the required factual inputs and the applicable action-time authorization.

## Execution record

The Shopify app is installed and connected. OTO shows `Calapres - 82929975552` as an active Shopify
channel, and its connection test returned success. Shopify location `91940061440`, `SMSA Retail
Shop`, is matched to OTO sender location `396002`, `SMSA Retail Shop`. Cash on delivery is off. The
Shopify delivery profile still contains only its two manual Saudi rates, and OTO's embedded
discounted-rate setup is incomplete.

No real order, shipment, label, tracking number, carrier booking, wallet funding, IBAN, or paid plan
was created. OTO auto-create is configured, but its behavior remains unproven until the prepaid
end-to-end test.

## Next gate

Confirm the actual courier pickup address. Complete and activate the OTO sender location, then
measure the fully packaged product and run one prepaid end-to-end test. If the test changes customer
checkout pricing, creates a financial commitment, or requires a carrier purchase, stop for the
specific approval before that action.

## Rollback

Disable the OTO Shopify channel or uninstall the OTO app only after confirming that no shipment is
in progress. Preserve the Shopify manual Saudi delivery rates. Do not delete historical shipping or
order records as part of rollback.
