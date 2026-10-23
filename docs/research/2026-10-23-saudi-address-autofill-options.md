# Saudi short-address autofill — research checkpoint, 2026-10-23

> Historical initial research. Later live tests refined the Basic/Growth findings. The owner subsequently rejected custom backends and external middleware for this address path; the conditional Direct API proposal below is not an active next action. Read the [consolidated experiment register](2026-10-23-national-address-experiment-register.md) first for the current verdict and no-repeat rule.

## Owner outcome

Keep OTO. Buyers should enter their Saudi short address once, receive a full verified shipping address, and place an order that staff can ship without asking for address corrections. Contact should be exceptional. This is address-quality work, not a new carrier-platform selection.

## Live read-only findings

- Shopify Plan details shows Basic.
- Customer accounts settings shows the current passwordless/customer-account configuration. Do not revert to legacy accounts to accommodate an address app.
- The prior bounded checkout/order inspection found that the first address line was relabeled as short-address guidance; that does not establish validation or universal collection.
- OTO remains installed. Manual shipment release after goods are physically ready is intentional under decision0030. Do not enable auto-create at payment to solve address automation.
- No app, account, subscription, theme change, order, customer message, label or new backend was created by this research.

## What was actually tested

In the publisher's public Saudi Address Pro demo, entered its published sample `RCTB4359` and selected the returned suggestion. The demo populated building, street, district, city, postal code and additional number, displaying a verified result. This proves a public demonstration of code-to-address resolution, not independent SPL authorization, Shopify compatibility, OTO ingestion or carrier-label printing. No customer address or contact detail was supplied to that provider.

## Ready-app evidence

| Candidate | Documented behavior | Material limit |
|---|---|---|
| Onwan | Pre-checkout short-code popup, real-time validation and full details for confirmation; supports legacy and current customer accounts. | Standard checkout full-address fill is described as happening after order completion; immediate native checkout fill is explicitly Plus. No public proof of Basic popup-to-native-shipping-field prefill or Shopify-to-OTO mapping. Exact popup feature tier is not clearly assigned in its pricing table. |
| Zoketo OTP | Publisher explicitly advertises cart popup, SPL lookup and checkout address prefill on all plans, without Plus. | Current FAQ says the app requires legacy accounts. Short-code feature's exact tier, independent use without forced login/OTP, accelerated checkout and OTO field mapping are unproved. Do not change account architecture to make it fit. |
| Saudi Address Pro | Shopify listing advertises verified code-to-address checkout widget. Public service demo successfully resolved its example. | Basic compatibility unproved; public Shopify embed guide refers to theme.liquid script autodetection, which does not prove access to hosted checkout fields. App price and Direct API price are different products. |
| Enwany | Post-order processing and short-code storage; lists OTO among supported integrations. | Repairs/resolves after order creation; not evidence of buyer-entered code prefilling checkout before payment. |
| Saudi Checkout Guard | Public validation app checks four Latin letters plus four digits in address line2 before Saudi orders are created. | Format only: no SPL existence check or full-address lookup. Its own guide requires accelerated-payment testing. This is a possible guard, not a complete autofill solution. |

## Current advertised prices, not accepted quotes

- Onwan Growth: 109 SAR per monthly cycle, rounded upward, excluding unverified tax/FX fees. Underlying source is USD29; twelve cycles are exactly 1305 SAR at the SAMA peg. This is not confirmation that the required popup is included. Optional paid OTP and extra messages are separate; no OTP is needed merely to type a short code.
- Saudi Address Pro Shopify app: 184 SAR per year, rounded upward, excluding unverified tax/FX fees; source USD49/year. First 100 validations advertised free. Do not buy without Basic compatibility proof.
- Saudi Address Pro Direct API: 999 SAR/year for 100000 validations, with a no-card 60-day trial advertised. Page explicitly separates this from the Shopify app price. Development, hosting and VAT inclusion are not established.

## Shopify constraints that affect the solution

1. Native third-party address autocomplete inside checkout requires Plus. Native ordinary Google autocomplete supports Saudi Arabia but does not prove short-code lookup.
2. A Basic storefront/cart step is possible in principle. However a cart-only popup is bypassable by direct and accelerated checkout. Apple Pay/Google Pay also prevent the documented UI-extension address mutation. These paths require an actual acceptance test, not a marketing assumption.
3. Do not rebuild Calapres's personalized cart using a simple variant/quantity permalink: Shopify documents line properties only for the first item in that route. Losing engraving/file/customization properties is unacceptable. Official prefill parameters on a cart permalink are not proof that equivalent parameters can safely update the current `/checkout`.
4. A public App Store Function can validate on Basic. A custom Functions app requires Plus. Validation alone does not call SPL and fill an address; network access is separately restricted.
5. Newly documented Shopify `addressCode` does not prove a native Saudi short-address UI is rolled out to this store or that the stable Admin API and OTO app map it.
6. OTO Orders API has `customer.shortAddressCode`, alongside address/city/postcode/district. Public Shopify integration documentation does not establish the mapping from any proposed address app into that field or each carrier label.

## Recommendation and next bounded proof

Keep OTO and evaluate address capture as a separate layer. Onwan is the first ready-app pilot candidate compatible with current customer accounts; Zoketo's advertised Basic prefill merits review only if it can run independently of its legacy-login requirement. Neither is approved or proven end to end. Do not buy Plus solely for this issue.

Before installing, obtain approval for the exact app's customer/order-data permissions and any account/trial/recurring commitment; do not silently process existing orders or enable customer reminders. Test a synthetic unpublished flow: short code entered once, full shipping fields present at the documented stage, all product personalization preserved, normal checkout and accelerated paths checked, original code/address imported correctly into OTO. Inspect the carrier payload/label only under the applicable separate shipment authorization and after physical readiness. Do not claim complete automation from a metafield or app listing alone.

If the ready app fails the required flow, scope a separate licensed short-address API implementation with a bounded approved architecture. The public Direct API service demonstrates the lookup and publishes a price, but production retention/forwarding terms, secure key handling, cart preservation and checkout coverage remain design gates. No backend or account was approved by this research.

## Primary sources

- https://onwanapp.com/
- https://apps.shopify.com/national-address
- https://zoketoapps.com/en/blogs/news/short-address-code-shopify-saudi-arabia
- https://zoketoapps.com/en/
- https://apps.shopify.com/zoketo-otp-login-with-phone
- https://apps.shopify.com/saudi-address-pro
- https://saudiaddresspro.com/demo
- https://saudiaddresspro.com/pricing
- https://saudiaddresspro.com/docs
- https://apps.shopify.com/enwany
- https://scalecomm.net/enwany
- https://apps.shopify.com/saudi-checkout-guard
- https://checkoutguard.waseem.space/installation-guide/?locale=en
- https://help.shopify.com/en/manual/checkout-settings/address-collection-preferences
- https://shopify.dev/docs/apps/build/checkout/delivery-shipping/address-autocomplete/build-autocomplete
- https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks
- https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation
- https://shopify.dev/docs/api/checkout-ui-extensions/latest/target-apis/checkout-apis/addresses-api
- https://help.tryoto.com/en/support/solutions/articles/150000213808-orders-apis
- https://sama.gov.sa/en-US/MediaCenter/News/Pages/news-557.aspx
