# Shopify checkout polish and payment-readiness handoff

Date: 2026-08-30

Last verified: 2026-08-30 17:15 Asia/Riyadh

Documentation coverage re-verified: 2026-08-30 18:12 Asia/Riyadh

Source-conversation fingerprint: `sha256-prefix:c1134307c4c602f0`

## Identity and bounded scope

- Project: Calapres.
- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- GitHub baseline: `d4abddd4fb907d423b7f46aeb52b1a4349a48015`.
- Included: discount test setup, checkout form friction, Arabic labels, live-brand checkout styling,
  the owner-selected checkout logo and favicon, responsive editor verification, customer-facing
  shipping-rate labels, the bounded Saudi Post cart-helper and branded-footer refinements,
  theme-source deployment safety, and read-only payment-provider and carrier readiness.
- Excluded: real card entry, OTP, live payment activation, orders, refunds, payouts, customer data,
  shipping prices or thresholds, shipping-provider connection, policies, pixels, Customer Privacy,
  theme code outside the four named cart/footer files, products, Captain, Chatwoot, n8n, Meta, and
  the preserved storefront prototype.

This is a sanitized operational record. It contains no credentials, customer information, payment
identifiers, raw browser payloads, or card data.

## Canonical and live source verification

- Clean `origin/main` and local HEAD both resolved to
  `d4abddd4fb907d423b7f46aeb52b1a4349a48015` before this stage.
- Before documenting the later logo, favicon, and shipping-label follow-up, `origin/main` was
  freshly fetched and verified at `3a66851a2a6225481207f506be0868d2c2bda6e3`.
- Before the later address-guidance and read-only shipping/Safari follow-up, `origin/main` was
  freshly fetched and verified at `76788b86ff464efd1b883112cc99e1adb449eac0`.
- Before the later footer-icon and checkout-friction follow-up, `origin/main` was freshly fetched
  and verified at `c008947e21d927329dff1bb4b41ab3f0604fc183`.
- The complete same-conversation coverage was compared again against freshly fetched `origin/main`
  `d3f868fd63d929cb92410c6a03a883ed23d535d8` before this documentation-only amendment.
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
3. These are the current Arabic theme-content overrides. The payment and security strings were
   saved in the original stage; the address string was superseded and independently reread in the
   later follow-up documented below:

   - `( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )`
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
8. In the later bounded theme follow-up, only `sections/footer.liquid` and `assets/calabriz.css`
   changed. Square frames and backgrounds were removed, the icons were enlarged, and Instagram,
   Snapchat, and TikTok received their natural brand color treatments. A public desktop visual
   check passed and the rendered DOM contained one of each new branded icon.

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

[Superseded payment-test approach] A 100% discount was rejected as a payment-path test because a
zero payable total cannot exercise the payment method. The final saved code is the 99% `QXMRK`
configuration above. That correction makes a non-zero checkout possible, but it still cannot prove
real authorization or settlement while Paymob remains in test mode.

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

## Address-guidance follow-ups

[Owner-approved and verified live]

- Address line 1 was first updated from `ابحث عن عنوانك` to
  `ابحث عن عنوانك (أدخل عنوانك الوطني لتسهيل البحث)`.
- That historical value was later superseded by the exact current string
  `( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )`, including one space inside each
  parenthesis. The current wording was verified after a full Admin reload and in the existing public
  checkout.
- The sentence is guidance for Shopify address autocompletion. It is not evidence of a direct
  Saudi National Address integration.
- No other checkout language, account, layout, branding, payment, or address preference changed.

## Saudi Post helper before checkout

[Owner-approved and verified live]

- The helper is outside checkout. It appears in the theme-controlled `/cart` page and cart drawer
  immediately before the customer continues to checkout.
- Its exact current visual lines are:

  - `لتسهيل شحنتك، أضف عنوانك المختصر في صفحة الدفع.`
  - `لا تعرف عنوانك المختصر؟ اعرفه عبر واتساب سبل ↗`

- The destination is
  `https://wa.me/966112898888?text=%D8%A7%D9%84%D8%B9%D9%86%D9%88%D8%A7%D9%86%20%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A`.
  WhatsApp opens with the draft `العنوان الوطني`; the customer must press Send.
- Before the first helper edit, unpublished draft theme `Copy of Calabris Shopify Theme`
  (`165745590528`) was created. It rolls back to no helper and was never published.
- Only `sections/main-cart.liquid` and `snippets/cart-drawer.liquid` changed in this helper stage.
  Their final live checksums are `18a9fab56106ebefe4a2479ae12bf5f7` and
  `842f3966eaec4a2280b5d811774c5cb9`, updated at `2026-08-30T12:52:52Z` and
  `2026-08-30T12:53:19Z` respectively.
- Visual checks at 390 by 844 confirmed exactly two lines with no wrapping on both cart surfaces.
  A 320 by 700 check also avoided wrapping, although the fit is intentionally tight.

[Superseded design lesson] The first enlarged refinement used more text, larger typography, and
larger spacing. It wrapped into four visual lines on a 390 by 844 mobile viewport and the owner
rejected it as too large. The compact two-line design above is the current live result.

This helper is a customer-initiated WhatsApp handoff, not a direct Saudi Post API, identity lookup,
or automatic National Address retrieval. It does not send customer data automatically. Basic,
Grow, and Advanced cannot place this custom link inside Shopify's protected Information, Shipping,
or Payment steps; Shopify Plus permits constrained Checkout Blocks or Checkout UI extensions there,
not arbitrary checkout-DOM or `checkout.liquid` access.

For rollback, restore only the two helper files from draft `165745590528`, verify the helper is
absent from `/cart` and the drawer, and leave the draft unpublished.

## Shipping presentation and plan constraints

[Verified live and against current Shopify behavior, read-only]

- Shopify withholds delivery rates until the customer supplies a delivery address, then displays
  only rates applicable to that address and order.
- The live profile has one Saudi Arabia zone and no Gulf zone. The two manual rows named
  `التوصيل داخل السعودية` are subtotal tiers, not two shipping companies: 25 SAR from 0 through
  319.99 SAR and free from 320 SAR. Their existing conditions are mutually exclusive for a
  single-profile cart.
- The live Shopify plan is Basic. Manual zones and fixed rates can be configured, but Shopify's
  third-party carrier-calculated shipping is unavailable on Basic.
- A later Gulf stage requires exact destination countries, fees or free-shipping thresholds,
  delivery estimates, and a choice between manual customer-facing labels and real calculated
  carrier services. None of those commercial inputs was inferred.
- No shipping zone, rate, name, price, threshold, carrier, app, location, fulfillment service, or
  tracking setting changed in this follow-up.

## Apple Pay and Safari-icon constraints

[Verified read-only]

- Apple Pay is a branded accelerated-checkout button. Shopify does not permit its brand color to
  be customized, so it cannot be changed to Calapres brown.
- Shopify also does not provide a merchant control to reorder Apple Pay ahead of the card method.
  Accelerated-wallet visibility and presentation vary by device and eligibility.
- A fresh public storefront document returned the owner-selected PNG favicon through Shopify CDN.
  The current document has no `apple-touch-icon` and no web-app manifest.
- The owner's existing Safari profile reportedly still shows an older Calapres icon. Safari may
  retain a cached favicon; the Page Menu control beside the address bar is browser chrome, and a
  Home Screen icon is a separate asset path. Server markup alone does not prove visual refresh in
  that existing Safari profile.
- No theme setting or theme code changed in this follow-up.

## Branded footer and checkout-friction follow-up

[Owner-approved and verified live]

- The live plan remains Basic and the active MAIN theme is `Calabris Shopify Theme`
  (`163004449024`).
- Before changing the footer, unpublished backup theme `Backup before social icons 2026-08-30`
  (`165747851520`) was created. Its `sections/footer.liquid` checksum was
  `0ddff0f3df2da32eb52dfb3a26591e9b`, and its `assets/calabriz.css` checksum was
  `01908b01ff2616099da2d1656f2147c7`.
- Only those two files changed. The current checksums are
  `fcbf12d5636339dbc91e67fd64d249b4` for `sections/footer.liquid`, updated
  `2026-08-30T14:03:49Z`, and `de2d9c3dab282a01c09175bc2d8e2fa3` for
  `assets/calabriz.css`, updated `2026-08-30T14:04:21Z`.
- The icons are not account links yet. `instagram_url`, `snapchat_url`, and `tiktok_url` remain
  blank, so Shopify renders decorative disabled spans. No URL was invented.
- Shipping was not changed. The observed checkout already held a valid restored address, so
  Shopify immediately showed the applicable rate; it did not expose every carrier before knowing
  the destination.
- The marketing opt-in checkbox was deliberately left unchanged. Hiding it would not auto-subscribe
  an entered email, and a customer record alone is not marketing consent.
- Paymob remains test-only. No payment method, wallet, card ordering, shipping configuration,
  marketing setting, customer, order, or product changed.

For rollback, restore only `sections/footer.liquid` and `assets/calabriz.css` from backup
`165747851520`. Do not publish the whole backup because the current address wording was saved after
the theme duplication.

[Ambiguous editor-timeout lesson] The first footer-editor attempt timed out before a visible save
confirmation. A connector reread proved the active file checksums were still unchanged. The editor
was then reloaded cleanly, the bounded edits were reapplied, and only the post-save file rereads and
public render were accepted as execution evidence. After any future editor timeout, reread the live
file or checksum before retrying; never infer that a timed-out submission saved.

## Theme-source deployment safety

[Verified repository risk; no workflow change]

- The active Shopify MAIN theme is `163004449024` and contains live changes that are not reconciled
  into canonical GitHub theme source.
- `.github/workflows/theme-deploy.yml` currently labels `163004449024` as the staging theme and
  labels `163072377088` as the live theme. That mapping conflicts with the latest verified Shopify
  role and is stale or inverted.
- The workflow also deploys source from the separate `shopify-theme` branch, not the latest live
  MAIN theme source.

Do not trigger the theme-deploy workflow, push theme files through it, or deploy the local
prototype. First pull and reconcile the exact current MAIN theme into a clean reviewed branch,
verify every destination theme ID and role read-only in Shopify, update the workflow through a
separate reviewed code stage, and deploy only to an unpublished preview theme. Stop before live
publication.

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
- Products, collections, inventory, prices, redirects, Captain, Chatwoot, n8n, Meta, and customer
  conversations. Across the recorded helper and footer stages, theme code changed only in
  `sections/main-cart.liquid`, `snippets/cart-drawer.liquid`, `sections/footer.liquid`, and
  `assets/calabriz.css`; no other theme file was edited.
- The preserved local storefront prototype.

Captain and its Shopify-native short-link state were outside this stage and unchanged. Preserve
[decision 0021](../../decisions/0021-adopt-shopify-native-short-product-links.md) and the
[2026-08-28 focused handoff](2026-08-28-captain-native-short-links-and-chatwoot-reporting.md); do
not infer physical external-channel delivery from the accepted Playground result. The earlier
[storefront/privacy handoff](2026-08-29-storefront-prototype-and-shopify-privacy.md) records the
historical pre-execution privacy diagnosis; the later
[Saudi-region removal handoff](2026-08-29-shopify-cookie-banner-saudi-region-removal.md) controls
the current cookie-banner region state.

## Intentional exclusions and known gaps

This record intentionally excludes screenshots, private checkout URLs and preview tokens, raw
browser or connector payloads, repetitive UI exchanges, credentials, customer or order data,
payment identifiers, card data, pixel identifiers, and the owner's private account information.
None of those exclusions is required to continue the project safely.

The following material gaps remain explicit:

- Paymob live onboarding, a real authorization, settlement, payout, and provider-portal readiness
  have not been proved.
- The footer icons passed a public desktop visual check, not a separate post-change mobile visual
  check. They are decorative until the owner provides the exact official account URLs.
- Whether `QXMRK` was consumed after it was saved is unknown; reread it before deactivation.
- The existing Safari profile's displayed icon remains visually unresolved; the document has no
  `apple-touch-icon` or web-app manifest.
- No real Saudi Post WhatsApp reply, National Address retrieval, or return-to-checkout journey was
  tested.
- The live theme is not reconciled into GitHub, and the current deployment workflow mapping is
  unsafe to use until separately corrected and reviewed.
- Entity-wide Saudi VAT threshold status, a clean-visitor Saudi cookie-banner presentation, and a
  live UK banner presentation remain unknown in their focused records.
- The local storefront prototype remains untracked, uncommitted, unapproved, non-Liquid, and
  undeployed; preserve its worktree until the owner accepts or rejects it.

## Exact next action

Treat real-payment activation as the next blocker. Verify Paymob live onboarding and settlement
readiness before turning off test mode or entering a real card. After that separate bounded proof,
deactivate the one-use `QXMRK` test code if it was consumed or is no longer needed.

If shipping is reopened first, obtain the owner's exact Gulf-country list, fees or thresholds,
delivery estimates, and manual-versus-calculated choice. Preserve the current Saudi rates until
those inputs are explicit. If the Safari icon is reopened, first identify whether the old image is
in a tab/bookmark, a Home Screen shortcut, or the browser's own Page Menu control before changing
theme code. Do not run the repository theme-deploy workflow until the exact live source and both
theme-ID roles have been reconciled and reviewed.
