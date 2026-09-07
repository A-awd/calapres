# 0040 — Enable live Paymob for a bounded owner payment test

- Date: 2026-09-08 (Asia/Riyadh)
- Status: Approved; configuration executed and checkout totals verified; real payment pending.
- Canonical starting commit: 7c3f7df4d9f795784aa933639ddcb776420ecd83

## Owner authorization

Abdulrahman asked to turn the payment gateway's test mode off and provide 99% off plus free
shipping for his own ordinary real-money trial order. He will enter payment credentials and
complete the purchase. This narrowly supersedes earlier instructions keeping Paymob in test
mode pending fresh authorization. It does not represent a general sales/fulfillment launch.

## Implementation and evidence

Shopify's existing Paymob Native Checkout provider 26640385 was Active with Test mode ON.
The checked test-mode control was cleared and Save was clicked. Shopify reported the provider
updated. Reopening the provider page confirmed the test control unchecked, the testing banner
absent and Save disabled. Existing Visa/Mastercard/Amex/Apple Pay selections were preserved.
No gateway credentials, account binding, funding, bank configuration or capture-method setting
was changed.

Reuse existing unused native order discount QXMRK, discount node 1696022790400, 99% off
entire order, maximum one use and once per customer. Enable shipping-discount combination.
Create QXMRKSHIP, discount node 1698864922880, free shipping to SA only, one use, once per
customer, order-discount combination enabled. Both expire 2026-09-09T21:00:00Z
(midnight starting September 10 Riyadh). API readback confirmed ACTIVE, zero uses and reciprocal
combination settings. Codes are not customer-ID restricted and must remain privately shared;
one-use and time bounds are the implemented restrictions.

Native order and shipping discounts were used as two codes. Shopify documentation supports
combining eligible order/shipping discounts and multiple discount codes in cart permalinks;
no combined link was actually verified in this session. Both codes were instead entered and
accepted in the existing checkout through its UI.

The existing cart had one white burner, text-engraving variant, SAR 390. The order code applied
SAR 386.10 off, initially leaving SAR 25 shipping and SAR 28.90 total. The shipping code removed
that SAR 25 charge, resulting in free shipping and SAR 3.90 total on the Pay now button and
cost summary. No contact/address/card information was entered or submitted, and no payment
or order was completed. Private checkout tokens and customer data are not recorded here.

## Verification limits and next step

Shopify live-mode configuration is verified. Actual gateway acceptance, capture, merchant
settlement readiness and bank settlement remain unverified until the owner's real transaction
provides evidence. Do not present a rendered credit-card form as proof of a successful payment.
Read the resulting Shopify/Paymob status before deciding a retry, refund or further action.

Actual stock, engraving/dispatch lead time, pickup address and packaged weight/dimensions are
still unresolved for a payment-to-delivery canary. No OTO label, pickup, shipping payment,
customer campaign, account binding, schedule or provider top-up is approved by this change.
Captain remains the sole automated customer responder, and OTO remains prepaid-only/no COD.

## References

- https://help.shopify.com/en/manual/discounts/discount-combinations
- https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks
- https://help.shopify.com/en/manual/discounts/managing-discounts
