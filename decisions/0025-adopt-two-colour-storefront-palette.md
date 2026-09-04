# 0025 — Adopt the Calapres beige and burnt-brown storefront palette

Date: 2026-08-31

Status: accepted and published to production after owner visual approval

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

### 2026-09-05 campaign-logo clarification

The owner explicitly required the existing CALAPRES wordmark with its distinctive C/first-A flourish
in the Magnific campaign, not a generic font spelling or a newly generated logo. Reuse the approved
`assets/calapres-wordmark.png` silhouette. The live homepage freshly resolves that same asset through
its header CSS mask, in burnt brown; the underlying PNG's gold colour is not the rendered website
colour. Use the original graphic geometry in the campaign, with brown ink, not a wax-seal substitute.
This clarifies campaign asset reuse only; no storefront or checkout logo change is authorized.

The owner subsequently requested an explicit two-concept comparison: the original English wordmark
versus the approved burnt-brown CR wax-seal icon. This authorizes the seal in that second campaign
concept; it does not replace the storefront wordmark or choose a permanent campaign winner. Both
must use the existing approved asset references, not invented letterforms.

### Owner approval of both campaign identities and lifestyle direction — 2026-09-05

The owner explicitly approved both demonstrated campaign identity treatments for alternating future
advertisements: the original English CALAPRES wordmark and the existing burnt-brown CR wax seal.
Do not force a single winner or seek the same logo-direction approval again. This supersedes the
preceding comparison-only/no-winner state for those two existing treatments, not the live site logo.
The owner also requested less header background: move/compact the writing upward so the burner smoke
is clearly visible, rather than allowing a text panel to consume half the image.

The campaign audience is not families only: include newlyweds and brides. For bridal visuals, never
show a bride's face or full figure (including reflections). Use adult hand/wrist details, ivory satin,
watch and jewelry still life. Preserve the one-burner offer; contextual jewelry/satin are not included
merchandise. Avoid hands/fabric contacting a lit burner or covering its opening. New variants are
review drafts until inspected and accepted; approval of these identities is not account publication,
advertising-spend authorization, payment, or permission to alter Shopify/Klaviyo.


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

## Owner refinement — transparent scrollbar and layered beige glass — 2026-08-31

The owner subsequently rejected the beige scrollbar column and the flat solid-beige page. The
scrollbar track and corner are therefore transparent, its WebKit width is 4 px, its thumb is a
brown-derived translucent line with no beige border, and Firefox uses its native thin setting. This
removes the rejected 15 px beige gutter while preserving a visible scroll-position indicator.

The solid beige canvas is superseded by a 16% beige page tint and subtle gradients derived only from
the two approved source colours. Normal surfaces use 20% beige, panels 26%, header glass 58% with
24 px blur, and floating navigation and cart surfaces 72% with blur for legibility over arbitrary
content. Brown text remains solid; the search field is brown rather than beige. These are opacity
derivatives of the existing palette, not new interface colours, and do not change product media,
checkout, social destinations, typography, or the publication gate.

Canonical GitHub source commit `9c6d580c5d90f36e15081cf02b3c9ea856352a6b` is staged in unpublished
theme `165777604864` with MD5 `5059457f36d3dd3331be762a8eaa1b64`, 44,236 bytes. The final desktop
preview measured a 4 px gutter, no horizontal overflow, and the intended glass values. The live
theme was not changed; mobile owner review remains required before publication.

## Owner refinement — cart drawer glass — 2026-08-31

The owner subsequently rejected the cart drawer's 72% beige surface above its 22% brown scrim as
too dark and opaque. The cart-specific drawer is therefore 46% beige with 30 px blur, its scrim is
12% brown, and only its text-bearing header, item, empty, and footer regions add a 60% beige layer
for legibility. The global `--glass-strong` token remains unchanged because it also governs mobile
navigation and other surfaces.

The Saudi Post helper is part of the same drawer acceptance boundary and now wraps at 320 px instead
of exceeding its own box. These refinements use transparency derived only from `#DFD4C3` and
`#44271B`; they do not change the cart data, checkout destination, helper destination, navigation
glass, checkout branding, or publication gate. Canonical GitHub `main` commits
`2e1cbb90e2ed61ad52724937dede5ccbb2bb272d` and
`a7e3c96a01112a8bf371003df9a1a958bbd6ffe4` are staged in unpublished theme `165777604864`.
Theme Check passed and fresh populated-cart checks at 320, 390, and 1280 px found no horizontal
overflow. The live theme was not changed.

## Owner refinement — lighter cart glass over dark media — 2026-08-31

After reviewing the cart above the dark homepage video, the owner found the 46% drawer and its
stacked 60% surfaces visually too heavy and requested a lighter result without changing the rest of
the storefront. The cart-specific scrim is therefore reduced from 12% to 8% brown, the drawer uses
62% beige, and its header, item, empty, and footer regions use 74% beige. The existing 30 px blur,
rounded item card, and global glass tokens remain unchanged.

These values are still transparency derivatives of the approved ground `#DFD4C3` and ink
`#44271B`; they introduce no third interface colour. This refinement supersedes only the previous
cart-specific opacity values. It does not change cart data, checkout routing, the Saudi Post helper,
navigation glass, social destinations, checkout branding, or the publication gate. Canonical
GitHub `main` commit `73b2ae3c092e949f152a385cac66b705f6fee5e3` is staged in unpublished theme
`165777604864`. Fresh 320 px, 390 px, and normal-width checks found no document, drawer, or item
overflow. The live theme was not changed.

## Owner approval and production publication — 2026-08-31

After reviewing the combined unpublished theme, the owner explicitly directed that this design be
made live. Theme `165777604864` became `MAIN` at 2026-08-31T18:19:02Z, and former live theme
`165774786816` became `UNPUBLISHED` and is retained as the immediate rollback. No theme was deleted.

The prepublication full-theme comparison detected and blocked an unrelated six-file canonical-source
corruption. GitHub repair commit `34cf93d03a63e9da80200d403d12dbca6fc825ae` restored the exact
validated theme and documentation before the role switch. The published CSS, editorial section, and
homepage template match canonical source by MD5; Theme Check reports zero errors. Public checks after
leaving preview mode confirmed the approved palette, image-free homepage engraving band, cart glass,
verified footer links, and no horizontal overflow at 320 px, 390 px, or the normal browser width.

This publication does not approve or change checkout branding, payments, catalog data, or unverified
social destinations. Instagram, Snapchat, TikTok, and X remain blank; WhatsApp and email remain the
only configured footer links.

## Rollback

If the owner rejects the live result, publish only former live theme `165774786816`, then verify the
public palette, header wordmark, footer links, cart drawer, favicon, and mobile layout. Preserve both
themes, do not delete either one, and do not run the obsolete repository deployment workflow.
