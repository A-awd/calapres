# Onwan free pilot — 2026-10-23

> Historical Free-stage record. Growth was later authorized and retained; the Free-only authorization and pending-trial statements below are superseded. Read the [consolidated experiment register](2026-10-23-national-address-experiment-register.md) first for the current verdict and no-repeat rule.

## Explicit owner authorization

The owner approved installing Onwan on the existing Calapres store on its Free plan to inspect settings and test with synthetic data. The reviewed authorization disclosed access to customer names, contacts, addresses and device/activity data; customer edits; product reads; last60days order edits; checkout edits; and owner information. The owner did not approve a paid plan/trial, customer reminders or shipments.

## Verified execution

- Shopify installed `Onwan: Saudi National Address`, published by Mwwared, into the existing Basic store. The app opened successfully.
- The authenticated dashboard identifies **Free Plan**, usage0/25 KSA orders for the month. No paid subscription was accepted.
- During onboarding, deselected automatic capture emails and shipping-address auto-verify, selected pre-checkout as the capture path to inspect, left WhatsApp, extra extensions and past-order import unselected. The next screen made clear that enabling pre-checkout in Settings and activating the theme embed are two separate unfinished steps,0/2complete.
- Reloaded Settings shows Auto-send capture email unchecked, WhatsApp consent unchecked, WhatsApp reminder controls unchecked/disabled, and pre-checkout validation unchecked/disabled.
- Settings explicitly gates pre-checkout validation behind **Onwan Growth**. This is the address app's paid plan, not a Shopify plan upgrade. The free-plan controls do not expose the intended pre-checkout code-entry test.
- The standalone capture-page Preview is a static image/explanation, not an interactive validation sandbox. It does not prove successful lookup or order updates.
- The authenticated Features page lists every checkout, pre-checkout, account and reminder path as Not active. The Checkout Shipping Address guide says to request the code in Address1 and auto-verify the order; it does not document OTO mapping. Its video is https://vimeo.com/1171407381 .
- No storefront/theme embed or native checkout block was activated. No theme, checkout address label, product, customer, original order, payment, carrier booking, label, OTO credit or reminder send was changed by the trial operator. No synthetic checkout/order was created yet because the intended path is gated.

## Acceptance remains open

An installed app, advertised lookup or static preview does not prove: genuine short-code validation, complete native Shopify shipping-address fill, and original code plus address reaching OTO. There is no confirmed ready app satisfying all three from the available evidence. Do not call Onwan the adopted production solution or accept a paid plan merely to complete onboarding.

The authenticated Billing screen confirms Free as Current plan. Growth is approximately SAR109 per30days, rounded upward (source USD29), with a7daytrial. Tax, conversion fees and optional OTP/messages are additional/unverified. Do not activate it without the exact commercial authorization. The current authorization is Free only; a separate trial-authorization question is pending. No Select plan action was taken.

## Additional OTO evidence

OTO officially provides `getNationalAddressFromShortCode`, returning full address components. Its documented ready validator is WooCommerce-specific, not a ready Shopify Basic widget. OTO's Synchronize Order button updates status only and is not proof of address-refresh behavior. Do not infer that addresses can never update via other integration paths; their behavior is still unverified.

Sources:

- https://apps.shopify.com/national-address
- https://onwanapp.com/
- https://help.tryoto.com/en/support/solutions/articles/150000198523-how-to-synchronize-orders-with-the-connected-sales-channel-
- https://help.tryoto.com/en/support/solutions/articles/150000218196-how-to-add-saudi-national-address-fields-to-woocommerce
- https://apis.tryoto.com/#3dc4066c-3984-452b-b811-1c518d04a9ae

## Next safe action

Preserve all customer-facing activation off and report the exact paid-feature blocker. A future paid trial must first have bounded consent covering its recurring charge/usage limits, a safe unpublished theme path preserving all personalization, and a synthetic order/OTO ingress test. Do not turn on OTO shipment auto-create; decision0030 still requires release after physical readiness.
