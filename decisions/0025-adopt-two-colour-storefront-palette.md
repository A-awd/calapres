# 0025 — Adopt the Calapres beige and burnt-brown storefront palette

Date: 2026-08-31

Status: accepted for implementation in an unpublished preview; production publication pending
owner visual approval

## Context

The owner identified inconsistent interface colours across the storefront, including black and gray
text, a gold scrollbar, gold cart quantity badges, and differently coloured logo and social glyphs.
The owner selected the supplied Magnific-created wax-seal image as the visual colour authority and
directed the storefront to use a light beige ground plus a burnt-brown ink for writing and the
storefront logo.

Magnific creation history described the source qualitatively as deep cocoa brown on warm ivory or
soft cream, but it did not contain exact colour codes. The exact implementation values were therefore
sampled from the owner's 1280 x 1280 source image, SHA-256
`fb47a383ba18532aa2c90dfa4888b442f18f5af40130f95138e5599e6a4edaaa`, rather than guessed from the
rendered browser preview.

## Decision

1. Use exactly two source colours for the Shopify theme-controlled storefront interface:
   ground `#DFD4C3` and ink `#44271B`.
2. Derive glass, borders, shadows, overlays, hover states, and control outlines only by applying
   transparency to those two source colours. Do not introduce separate black, gray, gold, white, or
   red interface tokens.
3. Render the exact owner-supplied Calapres header wordmark silhouette and the existing social glyph
   geometries as brown masks. Keep all social destinations, enabled/disabled rules, accessible labels,
   and the verified WhatsApp and email destinations unchanged.
4. Keep errors distinguishable without a third colour by combining brown text with bold weight and a
   brown side rule. Keep keyboard focus visible with a brown outline.
5. Guarantee readable image overlays and control boundaries: beige-on-brown text must meet WCAG AA,
   and form/control boundaries must meet the 3:1 non-text contrast threshold.
6. Treat product photography, product colour swatches, video, and native third-party payment or
   application branding as truthful content outside the two-source interface-palette claim.
7. This decision changes the storefront and password-layout palette only. Shopify checkout remains a
   separately controlled surface and retains the colours recorded in decision 0022 until the owner
   approves a separate checkout-alignment stage.
8. This decision supersedes only the prior storefront colour tokens in decision 0022 and the displayed
   black social-glyph colour in decision 0024. It does not supersede either decision's checkout,
   identity-verification, link-destination, publication, or rollback rules.
9. Implement and verify the palette first in an unpublished Shopify theme. Do not publish it without a
   fresh explicit owner approval after visual review.

## Implemented preview record

The canonical source reached GitHub `main` commit
`0030abf2cf99229426a29a63591c2cacce4ffdc3`. Shopify draft
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`) contains the six corresponding
theme-file updates and remains `UNPUBLISHED`, not processing, and without a processing failure.

The two source colours have a 9.24:1 contrast ratio. The final hero action is at least 5.25:1 over a
worst-case white frame, collection labels are at least 5.60:1 over a worst-case white image, and the
60% ink control boundary is 3.36:1 against the beige ground. Theme Check reports no errors; its six
warnings are the pre-existing Cairo remote-font warnings.

Fresh preview checks at 320 px, 390 px, and 1280 px showed no horizontal overflow, no header overlap,
one row of six brown social glyphs, the exact WhatsApp and email links, no X destination, brown cart
quantity badges with beige digits, and no browser-console errors or warnings. The public live theme
was not changed.

## Owner refinement — transparent hero-video action — 2026-08-31

The owner subsequently rejected the brown rectangle around the first homepage video's action. The
action is therefore transparent in both normal and hover states, has no full rectangular border,
retains one beige underline and a brown-derived text halo, and is translated 12 px lower. An explicit
beige keyboard-focus outline remains. This refinement supersedes only the earlier backed hero-action
treatment and its unconditional 5.25:1 worst-frame contrast claim; it does not change the two source
colours, link destination, label, video, publication gate, or any checkout rule.

Because the action now sits directly over moving video, no single contrast ratio can be guaranteed
for every frame. The owner-directed tradeoff is mitigated by the two-colour halo and underline and was
visually checked at 320, 390, and 1280 px. Canonical GitHub `main` commit
`bce7d159670147f365ac43eadbb2d4361ed04209` is staged in the same unpublished theme
`165777604864`; the public theme was not changed.

## Rollback

No production rollback is needed while theme `165777604864` remains unpublished. If it is later
approved and published, preserve the then-former main theme as the immediate unpublished rollback and
verify the live palette, header wordmark, footer links, cart drawer, and mobile layout after the role
change. Do not delete either theme and do not run the obsolete repository deployment workflow.
