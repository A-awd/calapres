# 0022 — Adopt a low-friction Shopify checkout with the live Calapres identity

Date: 2026-08-30

Status: accepted and executed; real payment settlement remains unverified

## Context

The live store allowed guest checkout, but its checkout presentation still used Shopify's default
blue and default font. The owner approved a bounded checkout stage: preserve easy guest purchase,
require both customer names, improve the Arabic labels and trust wording, match the checkout to the
current live storefront, and prepare one tightly limited test discount. The approved local
storefront prototype remains separate and is not the visual authority for this live checkout stage.

The exact live storefront uses Cairo, white, dark charcoal `#1B262D`, body text `#333330`, a gold
accent `#A18E63`, and a text-only `كالابريز` wordmark. No approved image logo exists in canonical
`main` or the exact live-theme branch. Shopify checkout does not offer Cairo, but it does offer the
Arabic-friendly Almarai font.

## Decision

1. Keep guest checkout available. Do not force account creation or sign-in. A completed guest order
   still creates the order and associated customer/contact record in Shopify.
2. Require both first and last name. Keep the checkout in one-page mode and keep Shopify address
   autocompletion enabled.
3. Use these Arabic checkout strings:

   - Address line 1: `ابحث عن عنوانك`
   - Primary payment action: `ادفع الآن`
   - Card security notice: `جميع عمليات الدفع آمنة ومشفّرة.`

   The address wording describes Shopify's address search. It must not be represented as a direct
   Saudi National Address integration without separate provider evidence.
4. Use Almarai for checkout headings and body, keep the background white, and use `#1B262D` for
   primary buttons, links, and selections. Keep `#A18E63` only as a secondary palette color because
   its contrast on white is insufficient for small text. Preserve the store-name text instead of
   inventing or uploading a logo image.
5. Trust text must remain factual. Do not claim that payment is guaranteed, fraud is impossible, or
   provider-side card storage behavior is known without provider evidence.
6. Keep the existing Paymob payment methods unchanged. While Paymob test mode is on, every
   transaction is simulated and no real settlement is proven. Turning test mode off is a separate
   readiness stage that must verify Paymob onboarding and a real end-to-end payment path first.
7. Keep the temporary `QXMRK` test discount isolated: 99% off the order, one total use, one use per
   customer, no minimum, and no combinations. It is for the owner's bounded checkout test, not a
   permanent public promotion.

## Executed record

[Verified live in authenticated Shopify Admin]

- `QXMRK` was saved at 99% with the limits above.
- First and last name are both required; forced sign-in remains off.
- The original three Arabic strings were saved separately and reread with the Save action disabled;
  the address string was later superseded by the dated amendment below.
- Almarai was saved for headings and body. The primary accent and button were saved as `#1B262D`.
- One-page checkout, address autocompletion, buy-again, white backgrounds, native payment logos,
  and Shopify's native security structure remain enabled or visible.
- Shopify displayed `Changes saved`; the editor then reread Almarai, `#1B262D`, one-page mode, and
  address autocompletion from the saved configuration.

[Verified payment boundary]

- Paymob is active but explicitly in test mode.
- Visa, Mastercard, American Express, and Apple Pay are enabled in its current Shopify provider
  configuration.
- No real card, OTP, live charge, capture, refund, payout, or settlement test was performed.

## 2026-08-30 owner-approved implementation amendment

This amendment supersedes only the image-identity sentence in decision item 4. After reviewing the
actual asset, the owner explicitly selected the existing Calapres seal file
`Artboard_4_2x-100-removebg-preview.png` for the checkout and the active storefront favicon. Use
that exact asset as the checkout logo, centered at 100 px, and as the theme favicon. This bounded
choice does not approve the separate local storefront prototype or authorize a broader redesign.

The owner also approved replacing both customer-facing domestic manual-rate names from `قياسي`
to `التوصيل داخل السعودية`. Preserve the paid rate at 25 SAR for 0 through 319.99 SAR and the free
rate from 320 SAR. The shared label must not be represented as proof of an SMSA, Fastlo, or other
carrier integration.

[Verified live implementation]

- After a full checkout-editor reload, the selected seal filename, 100 px width, and center
  alignment persisted. The checkout preview rendered the same Shopify CDN asset at 100 px.
- The active theme favicon setting persisted with Save disabled. A fresh public storefront
  document returned the PNG through Shopify CDN instead of the former inline fallback icon.
- Shopify displayed `Profile updated` after each final shipping-profile save. A final profile
  reread showed both new rate names with the original prices and thresholds.
- No checkout account rule, payment-provider setting, shipping price, threshold, carrier,
  fulfillment service, tracking setting, or theme code changed in this amendment.

## 2026-08-30 address-guidance and platform-constraint amendment

The owner approved replacing only the Address line 1 label with
`ابحث عن عنوانك (أدخل عنوانك الوطني لتسهيل البحث)`. The value persisted after Save and a full
Shopify Admin reload. This supersedes the shorter address label in the original execution record,
but it does not claim a direct Saudi National Address integration; the underlying feature remains
Shopify address autocompletion.

Shopify already withholds delivery rates until a customer supplies a delivery address and then
shows only the applicable rates. The live profile still has one Saudi Arabia zone and no Gulf
zone. The two domestic rate rows are mutually exclusive subtotal tiers, not two carriers. A Gulf
zone can be considered only in a separate shipping stage after the owner chooses the exact
countries, fees or thresholds, delivery estimates, and whether the rates are manual or calculated
by a real carrier. The live Basic plan supports manual zones and fixed rates but not third-party
carrier-calculated rates. No shipping setting changed in this amendment.

Keep the branded Apple Pay button native; Shopify does not permit recoloring it to the Calapres
palette. The public storefront server currently returns the selected PNG favicon, but that does
not prove every existing Safari profile refreshed its cached icon. Safari's Page Menu control is
browser chrome, and a Home Screen icon is a separate path; the current public document exposes no
`apple-touch-icon` or web-app manifest. No theme code changed in this amendment.

## 2026-08-30 final address wording and pre-checkout helper amendment

The owner later approved the exact current Address line 1 wording
`( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )`, including one space inside each
parenthesis. Shopify persisted that value after a full Admin reload, and the existing public
checkout rendered it. This wording supersedes the intermediate address label in the preceding
amendment. It remains guidance for Shopify address autocompletion and does not establish a direct
Saudi National Address integration.

The owner also approved a compact Saudi Post helper in the theme-controlled cart page and cart
drawer, immediately before checkout. The two current visual lines are:

- `لتسهيل شحنتك، أضف عنوانك المختصر في صفحة الدفع.`
- `لا تعرف عنوانك المختصر؟ اعرفه عبر واتساب سبل ↗`

The link opens Saudi Post's WhatsApp destination with the draft `العنوان الوطني`; the customer
must still press Send. This is a customer-initiated WhatsApp handoff, not a direct Saudi Post API,
identity lookup, or automatic address retrieval. It does not send customer data automatically.

Keep this helper outside Shopify's protected Information, Shipping, and Payment steps. Basic,
Grow, and Advanced do not permit custom text or links inside those steps. Shopify Plus would allow
constrained Checkout Blocks or Checkout UI extensions there, not arbitrary checkout-DOM or
`checkout.liquid` access. The exact live files, checksums, mobile evidence, rollback snapshot, and
superseded four-line design are recorded in the
[checkout and payment-readiness handoff](../docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md).

## 2026-08-31 required contact fields amendment

The owner requires both an email address and a phone number for a shippable checkout. Use Shopify's
native `Email` Customer contact method and set Shipping address phone number to `Required`. Do not
use the combined `Phone number or email` alternative. The resulting fields are independent and
mandatory, with email under Contact and phone under the shipping address.

[Verified live implementation]

- Authenticated Shopify Admin saved both settings and displayed `Settings saved`.
- A full Admin reload persisted `Email` and `Required`.
- A fresh physical-product checkout displayed separate Arabic email and phone fields. Both rendered
  with `required=true` and `aria-required=true`; the email used `type=email` and the phone used
  `type=tel`.
- No customer or address data was entered, `Pay now` was not pressed, and no order, payment,
  payment-provider setting, shipping rate, theme file, app, or marketing-consent setting changed.

The phone is Shopify's native shipping-address phone field and is required only when checkout
collects a shipping address. Shopify does not establish that the value is mobile or SMS-capable,
and the requirement is not SMS or WhatsApp marketing consent.

## 2026-08-31 checkout-identity correction and Saudi-phone constraint boundary

The owner has now rejected the active checkout's stark white background and former 100 px simplified
seal. The intended replacement is the realistic wax seal isolated from the supplied 1280 x 1280
image and staged as `assets/calapres-checkout-wax-seal.png`; do not use the English wordmark or the
old simplified `Artboard_4_2x-100-removebg-preview.png` seal. The staged 755 x 840 PNG has real
alpha and SHA-256
`2ffe03f1bff302b781bbd882d18e971f878d154aa6f90413e42b6643f25024f1`. Very pale beige
backgrounds derived from the approved storefront ground, burnt-brown actions, and Rubik for both
headings and body remain intended. The owner subsequently confirmed that the background is very
light beige and glass-like, not blue, and explicitly approved the exact realistic seal. Because the
Basic checkout editor does not expose arbitrary CSS, backdrop blur, or alpha-bearing surface
controls, implement `glass-like` as very pale solid surfaces with subtle tonal separation and
transparent input fills in the duplicate; do not claim actual glass blur. This direction supersedes
only the prior checkout seal, white-background, dark `#1B262D`, and Almarai presentation choices.
It does not change guest checkout, the separate
required email and shipping-phone fields, shipping rates, address wording, policy links, payment
providers, or publication safeguards.

The current Basic store has only one active checkout configuration and no draft. Because saving
that configuration changes live checkout immediately, first duplicate it, perform this identity
alignment only in the duplicate, preview it, and publish only after fresh owner approval. Do not
treat a theme `preview_theme_id` as a checkout-branding preview. The present read-only audit
confirmed the old seal, white and `#F5F5F5` backgrounds, `#1B262D` actions, and Almarai remain
live; no checkout setting was changed. Fresh authenticated schema inspection confirmed that the
Basic store exposes no public checkout-profile duplication or checkout-branding mutation, so the
draft must be created through Shopify's Checkout settings interface rather than an API workaround.

The owner's requested Saudi mobile rule is `+966` followed by exactly nine digits beginning with
5. Shopify's native required-phone setting cannot lock a prefix, apply an input mask, or enforce
that pattern. A cart-and-checkout validation Function may reject a normalized value that does not
match `^\+9665[0-9]{8}$`, but on this Basic store it must be delivered by a public Shopify App
Store app; a custom Function app requires Plus. App selection, price/privacy review, installation,
and activation remain a separate owner choice. Do not claim that server-side validation visually
locks `+966` in Shopify's native field.

## Plan boundary

On the current non-Plus plan, Shopify can additionally keep the discount field visible on mobile,
publish Arabic policy links, use customer accounts optionally, and place Checkout Blocks on the
thank-you and order-status pages. Custom trust blocks, custom fields, or payment/shipping icon
blocks inside the information, shipping, and payment steps require Shopify Plus. None of those
additional changes is authorized by this decision.

## Rollback

Restore the checkout font and accent/button controls to their prior defaults, clear only the three
Arabic overrides above, and return the first-name requirement only if the owner explicitly chooses
that higher-friction rollback. Restore the combined `Phone number or email` contact method and/or
reduce or remove the shipping-phone requirement only if the owner explicitly requests that exact
rollback; do not alter Paymob or another Checkout setting. Remove the checkout seal, clear the
theme favicon, or restore the two
rate names to `قياسي` only if the owner explicitly requests those specific reversals; do not alter
their prices or thresholds. To remove the Saudi Post helper, restore only
`sections/main-cart.liquid` and `snippets/cart-drawer.liquid` from draft theme `165745590528` and
verify both cart surfaces; do not publish the whole draft. Deactivate only `QXMRK` when the bounded
test is complete. Do not disable Paymob, alter another discount, force sign-in, change customer
records, or modify unrelated theme code during rollback.
