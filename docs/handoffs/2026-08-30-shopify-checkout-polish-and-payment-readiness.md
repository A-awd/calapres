# Shopify checkout polish and payment-readiness handoff

Date: 2026-08-30

Last verified: 2026-08-30 13:27 Asia/Riyadh

## Identity and bounded scope

- Project: Calapres.
- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- GitHub baseline: `d4abddd4fb907d423b7f46aeb52b1a4349a48015`.
- Included: discount test setup, checkout form friction, Arabic labels, live-brand checkout styling,
  the owner-selected checkout logo and favicon, responsive editor verification, customer-facing
  shipping-rate labels, and read-only payment-provider and carrier readiness.
- Excluded: real card entry, OTP, live payment activation, orders, refunds, payouts, customer data,
  shipping prices or thresholds, shipping-provider connection, policies, pixels, Customer Privacy,
  theme-code deployment, products, Captain, Chatwoot, n8n, Meta, and the preserved storefront
  prototype.

This is a sanitized operational record. It contains no credentials, customer information, payment
identifiers, raw browser payloads, or card data.

## Canonical and live source verification

- Clean `origin/main` and local HEAD both resolved to
  `d4abddd4fb907d423b7f46aeb52b1a4349a48015` before this stage.
- Before documenting the later logo, favicon, and shipping-label follow-up, `origin/main` was
  freshly fetched and verified at `3a66851a2a6225481207f506be0868d2c2bda6e3`.
- The live storefront identity was verified against the exact live-theme source: Cairo, white,
  `#333330` body text, `#1B262D` dark CTA, `#A18E63` gold accent, and a text-only
  `كالابريز` wordmark.
- At the beginning of the stage, no approved PNG or SVG logo existed in canonical `main` or the
  exact live-theme branch, so no image was invented. In the later bounded follow-up, the owner
  visually selected the existing `Artboard_4_2x-100-removebg-preview.png` Calapres seal asset for
  the checkout and favicon. This did not approve or deploy the separate local prototype.

## Executed live changes

[Owner-approved and verified in authenticated Shopify Admin]

1. The temporary discount code `QXMRK` was saved as 99% off the order, limited to one use in total
   and one use per customer, with no minimum purchase and no combinations.
2. Checkout requires both first and last name. Forced customer sign-in remains off.
3. These Arabic theme-content overrides were saved one at a time and reread after each save:

   - `ابحث عن عنوانك`
   - `ادفع الآن`
   - `جميع عمليات الدفع آمنة ومشفّرة.`

4. The active checkout configuration was saved with Almarai for headings and body, a white
   background, and `#1B262D` for the primary accent and button. `#A18E63` remains a secondary
   palette color only.
5. One-page checkout, address autocompletion, buy-again, native card logos, and the native payment
   security structure remain enabled or visible.
6. In the later owner-approved follow-up, the selected Calapres seal was persisted as the checkout
   logo, centered at 100 px. After a full checkout-editor reload, the filename, 100 px width, and
   center alignment remained selected. The checkout preview rendered the same Shopify CDN image
   with `Calapres` alternative text at 100 px.
7. The same exact seal asset was saved in the active theme's favicon setting. After Save became
   disabled, a fresh public `calapres.com` document returned an `image/png` icon from Shopify CDN
   instead of the prior temporary inline SVG fallback.

Shopify displayed `Changes saved`. After the toast cleared, the saved editor state still showed
Almarai, `#1B262D`, one-page mode, address autocompletion, and a disabled Save action. Mobile and
desktop previews both showed the dark primary button and responsive payment layout. The logo and
favicon were additionally verified through post-save reload or fresh public-document rereads as
described above.

## Payment-provider evidence

[Verified live, read-only]

- Paymob is active but `Test mode is on`.
- Shopify explicitly states that all transactions are simulated in this mode and customers cannot
  make real purchases.
- Visa, Mastercard, American Express, and Apple Pay are enabled in the provider configuration.
- No test mode switch, provider credential, real card, OTP, charge, capture, refund, payout, or
  settlement was changed or exercised.

Do not tell the owner that a 99% order will return funds to the business while test mode remains on.
The next real-payment stage must first prove Paymob live onboarding, then disable test mode only if
the provider is ready, complete one bounded low-value purchase, verify the Shopify order and
provider transaction, and stop before expanding payment scope.

## Shipping label execution and carrier boundary

- Both domestic manual rate labels were changed from `قياسي` to
  `التوصيل داخل السعودية`.
- The paid rate remained `25 SAR` for orders from `0 SAR` through `319.99 SAR`; the free rate
  remained available from `320 SAR`.
- The free-rate edit and final profile save produced `Profile updated`. Before changing the paid
  rate, its stale draft was discarded and the profile was reloaded so it could not overwrite the
  first save. The paid-rate edit and final profile save then produced `Profile updated` again.
- A final profile reread showed both new names and the unchanged prices and thresholds.
- The profile still covers all products from one active location named `SMSA Retail Shop` and one
  domestic Saudi Arabia zone. Shopify identifies that location as a normal location, not a
  fulfillment service.
- `Carrier accounts` shows `None`; custom order fulfillment has no listed service, and local
  delivery and pickup in store are off.
- Shopify's current carrier-service reads returned no configured or available carrier service.
  OTO, Torod, and SIDEUP were not installed, and no Fastlo application handle was present.

The location name does not prove an SMSA integration. The preserved owner preference is Fastlo
where its coverage is suitable, behind one approved multi-carrier gateway and with one backup
carrier. That remains a proposal only: no provider has been selected, installed, paid, connected,
or tested. The first documented commercial check is whether OTO's 59 SAR tier can accept the
owner's Fastlo contract and correctly write tracking and status back to Shopify. Only the two
customer-facing manual-rate names changed; no price, threshold, carrier, fulfillment service, or
tracking configuration changed.

## Verified UX boundary

- Guest checkout remains the lower-friction choice; Shopify still retains the order and customer
  contact/profile data from a completed checkout.
- The address field is Shopify address autocompletion. Saudi Arabia is supported, but this is not
  proof of a direct Saudi National Address service connection.
- The checkout editor preview renders in English even though the checkout language setting is
  Arabic. The Arabic overrides were verified in the language editor, not inferred from that preview.
- Dark `#1B262D` on white has strong contrast. Gold `#A18E63` on white is not suitable for small
  text and was not used as the primary action or sole signal.

## Additional current-plan opportunities, not executed

- Keep the discount field expanded on mobile during code-led campaigns.
- Publish complete Arabic return, privacy, terms, shipping, and contact policies so Shopify links
  them from checkout and order-status surfaces.
- Add a free Checkout Blocks message to the thank-you and order-status pages with verified shipping
  timing, contact, and policy links.
- Keep customer accounts optional and passwordless; do not force sign-in.
- Reopen the preserved OTO/Fastlo comparison only as a separate shipping stage; verify contract
  support, route coverage, total fees, and Shopify tracking/status writeback before installing or
  paying for anything.

Custom trust blocks, gift fields, consent fields, or payment/shipping icon blocks inside the
information, shipping, and payment steps require Shopify Plus. Do not add a third-party checkout
app merely to simulate those placements.

## Unchanged state

- Paymob test mode and all provider credentials.
- Customer records, orders, payment transactions, refunds, payouts, and settlements.
- Shipping prices, thresholds, carriers, fulfillment, and tracking. Only the two manual-rate names
  changed.
- Policies, marketing consent, pixels, Customer Events, and Customer Privacy.
- Live theme code, products, collections, inventory, prices, redirects, Captain, Chatwoot, n8n,
  Meta, and customer conversations. Only the active theme favicon setting changed; no theme code
  was edited or deployed.
- The preserved local storefront prototype.

## Exact next action

Treat real-payment activation as the next blocker. Verify Paymob live onboarding and settlement
readiness before turning off test mode or entering a real card. After that separate bounded proof,
deactivate the one-use `QXMRK` test code if it was consumed or is no longer needed.
/Users/awd/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
