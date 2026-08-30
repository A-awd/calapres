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
- The three Arabic strings above were saved separately and reread with the Save action disabled.
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

## Plan boundary

On the current non-Plus plan, Shopify can additionally keep the discount field visible on mobile,
publish Arabic policy links, use customer accounts optionally, and place Checkout Blocks on the
thank-you and order-status pages. Custom trust blocks, custom fields, or payment/shipping icon
blocks inside the information, shipping, and payment steps require Shopify Plus. None of those
additional changes is authorized by this decision.

## Rollback

Restore the checkout font and accent/button controls to their prior defaults, clear only the three
Arabic overrides above, and return the first-name requirement only if the owner explicitly chooses
that higher-friction rollback. Deactivate only `QXMRK` when the bounded test is complete. Do not
disable Paymob, alter another discount, force sign-in, change customer records, or modify the live
theme during rollback.
