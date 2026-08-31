
# Handoff

## Resume here — cart glass is staged; duplicate checkout before changing its identity — 2026-08-31

The cart correction is complete in canonical GitHub `main` commits
`2e1cbb90e2ed61ad52724937dede5ccbb2bb272d` and
`a7e3c96a01112a8bf371003df9a1a958bbd6ffe4`, and in unpublished Shopify theme
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`). The drawer is now 46% beige
with 30 px blur over a 12% brown scrim; text-bearing drawer regions are 60% beige. The Saudi Post
helper wraps at 320 px. The exact draft files are:

- `assets/calabriz.css`: MD5 `91f46f1d04a2b30d1f25677fb5054567`, 44,422 bytes.
- `snippets/cart-drawer.liquid`: MD5 `8e99438d4ff949d5269c2bac1488eebc`, 2,938 bytes.

Theme Check passed 181 files with zero errors and six existing Rubik warnings. Populated-cart
checks at 320, 390, and 1280 px found zero document or drawer horizontal overflow and zero remaining
helper overflow. Theme `165774786816` is still `MAIN`; its CSS and cart snippet checksums remain
`c5503cec29f1c5c4baf72e1742f6972a` and `842f3966eaec4a2280b5d811774c5cb9`. Do not publish
draft `165777604864` without the owner's explicit approval.

Checkout remains unchanged. The Basic store has one profile only,
`gid://shopify/CheckoutProfile/5133926656`, named `My Store configuration`, and it is active.
There is no draft. The current live checkout is white, uses the old 100 px centered seal, dark
`#1B262D` actions, and Almarai. Editing and saving this profile changes live checkout immediately,
and the editor currently warns that it participates in a paused rollout. The theme preview
parameter does not isolate checkout branding.

Resume by using Checkout settings → More actions → Duplicate on the active configuration. Do not
press Edit and Save on the active configuration. In the duplicate only, use a transparent
`#44271B` version of the exact Calapres wordmark, approximately 180–200 px centered; use
`#FAF8F5` for the main background, `#F7F4EF` for the header and order summary, `#44271B` for
accent and button, transparent inputs, and Rubik for headings and body. Preview it before any
publication. The in-app browser could focus the More actions button but Shopify's popover did not
open through the trusted browser interface, so no draft was created and no live checkout value was
changed.

The required shipping phone field is already separate from the required email field. Shopify's
native form setting cannot fix the country code or enforce a regex. The desired normalized rule is
`^\+9665[0-9]{8}$` with an Arabic field error such as: `أدخل رقم جوال سعودي صحيحًا يبدأ بـ5
ويتكون من 9 أرقام بعد رمز الدولة +966.` On Basic, implement that rule only through a
privacy-and-price-reviewed public App Store app that provides a Cart and Checkout Validation
Function. Do not install an app or claim a fixed visual `+966` input mask without a separate
owner choice.

## Resume here — configured-only social links staged; three official URLs still needed — 2026-08-31

The dead-button footer correction is complete in canonical GitHub `main` commit
`12a3ca53cb53ef4a09a0d9628ddc19265640b2cc` and unpublished Shopify theme
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`). The draft renders a social
glyph only when its theme URL is configured. It currently shows only WhatsApp and email; blank X is
hidden. Adding verified Instagram, Snapchat, or TikTok URLs in the footer settings will make each
corresponding glyph appear and become clickable without another code change.

Do not infer the missing public URLs from Chatwoot inbox IDs, old supplier accounts, search results,
or the brand name. The repository and both Shopify themes contain no official Calapres URL or handle
for the three accounts. Obtain the exact owner-confirmed Instagram, Snapchat, and TikTok profile URLs,
then update only those three footer settings in draft `165777604864` and verify every destination.
Leave X blank until its official account is ready.

Shopify persisted `sections/footer.liquid` with MD5 `909b23bc8b16f2818d7fdc85fa3b3f16`, 8,594
bytes. Theme Check passed 181 files with zero errors and six existing Rubik warnings. Fresh preview
inspection found exactly `https://wa.me/966508727687` and `mailto:info@calapres.com`, zero disabled
social spans, zero X glyphs, and no horizontal overflow. Theme `165774786816` remains `MAIN` and its
footer was not edited. Do not publish draft `165777604864` without the owner's explicit approval.

## Resume here — transparent scrollbar and layered beige glass staged; combined draft remains unpublished — 2026-08-31

The owner's scrollbar and beige-glass correction is complete in canonical GitHub source commit
`9c6d580c5d90f36e15081cf02b3c9ea856352a6b` and Shopify draft
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`). The draft remains
`UNPUBLISHED`; theme `165774786816` remains `MAIN` and its CSS was not edited.

Only `assets/calabriz.css` changed. The page scrollbar now has a transparent track, no beige thumb
border, and a 4 px WebKit width; Firefox keeps its native thin form. The former solid beige page is
now a 16% tint over subtle two-colour gradients, ordinary surfaces are 20%, panels 26%, and header
glass is 58% with 24 px blur. Floating navigation and cart surfaces stay stronger at 72% so brown
text remains usable over imagery. No third interface colour was introduced.

Shopify persisted MD5 `5059457f36d3dd3331be762a8eaa1b64`, 44,236 bytes. Theme Check passed
181 files with zero errors and the six existing Rubik remote-font warnings. The final 1280 by 720
in-app preview measured a 4 px gutter versus the 15 px rejected baseline, no beige scrollbar track,
and no horizontal overflow. The header was visually checked over dark product images; the footer,
cart drawer, and navigation glass were also opened and inspected. A fresh final mobile screenshot
was not available after the browser-session handoff, so retain mobile owner review before publishing.

Review `https://calapres.com/?preview_theme_id=165777604864`. Do not publish this combined draft or
save the pending checkout Rubik selection without the owner's next explicit approval. Do not run
`.github/workflows/theme-deploy.yml`.

## Resume here — transparent hero-video action staged; combined draft remains unpublished — 2026-08-31

The owner's correction to the first homepage video's `تسوقوا الآن` action is complete in canonical
GitHub `main` commit `bce7d159670147f365ac43eadbb2d4361ed04209` and Shopify draft
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`). The draft remains
`UNPUBLISHED`; theme `165774786816` remains `MAIN` and was not edited.

Only `assets/calabriz.css` changed. The brown normal/hover background and full rectangular border
are gone, a light beige underline remains, and the whole action is 12 px lower. Its brown-derived
text halo keeps it readable over the moving video without reintroducing a background, and its
keyboard focus outline is explicit. The exact link remains
`https://calapres.com/collections/all`. Shopify persisted MD5
`6157d7918151a17a2d8d77889349fe04`, 42,705 bytes.

Theme Check passed 181 files with zero errors and six existing Rubik external-font warnings. Fresh
320 by 700, 390 by 844, and 1280 by 900 renders had no horizontal overflow; the action's bottom gaps
are 24 px on both mobile checks and 15 px at 1280 by 900. The in-app 1280 by 720 check measured
9.6 px. Computed normal state is transparent with no box and the mobile screenshot shows the action
clear of the edge. The former 5.25:1 worst-frame contrast claim no longer applies to a transparent
action over moving video; rely on the verified halo/underline treatment and owner visual review.

Review `https://calapres.com/?preview_theme_id=165777604864`. Do not publish this combined draft or
save the pending checkout Rubik selection without the owner's next explicit approval. Do not run
`.github/workflows/theme-deploy.yml`.

## Resume here — normalized footer icons staged; combined draft remains unpublished — 2026-08-31

The footer correction is complete in canonical GitHub `main` commit
`3e9e57423cd8b5b8ffc2f02f8aba47d026f5ea5d` and in Shopify draft
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`). The draft remains
`UNPUBLISHED`; current live theme `165774786816` remains `MAIN` and was not edited.

All social interaction boxes were already 40 by 40 px. X looked taller because its SVG fills its
viewBox while the others include internal whitespace. `assets/calabriz.css` now calibrates each
glyph optically to about 25.6 px of painted platform height, makes the envelope comparable in visual
width, and lowers TikTok by 0.03 rem. It also gives all six glyphs the same
`translateY(-2px) scale(1.04)` hover motion. The persisted draft asset is 42,475 bytes with MD5
`ab04e90808c4306f42b34ce432dd728b`.

Theme Check passed 181 files with zero errors and six existing external-font warnings. Fresh 320 px,
390 px, and 1280 px renders kept one icon row without horizontal overflow, and direct in-app hover
checks produced the same transform for every glyph. WhatsApp and email retain their exact verified
destinations. Instagram, Snapchat, TikTok, and X remain spans with no `href` and the default cursor,
so their new hover response is visual only until exact official URLs are verified.

Review `https://calapres.com/?preview_theme_id=165777604864`. Do not publish it or save the pending
checkout Rubik selection without the owner's next explicit approval. Do not run
`.github/workflows/theme-deploy.yml`.

## Resume here — Rubik selected; storefront staged, checkout still Almarai — 2026-08-31

The owner selected Rubik as the intended shared storefront and checkout typeface. Arabic support
and the SIL Open Font License 1.1 were verified from the current Google Fonts source, and Rubik is
present in both Shopify Checkout typography pickers.

Canonical GitHub `main` commit `57ba09ae875dbf97572aa6d133e4b488eedfd43e` changes only
`assets/calabriz.css`, `layout/theme.liquid`, and `layout/password.liquid`, using Rubik weights 300,
400, 500, and 700. The exact source is staged in existing Shopify draft
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`), which remains `UNPUBLISHED`:

- `assets/calabriz.css`: `6024e3040c7482a9b7bdf62951b8b97f`, 42,290 bytes.
- `layout/theme.liquid`: `2050521984003899b13538d938fd10b3`, 3,762 bytes.
- `layout/password.liquid`: `5c19d2d396eb36780f41bbfe4db90c0d`, 1,812 bytes.

Theme Check passed 181 files with zero errors and six external-font warnings. Fresh 320 px, 390 px,
and 1280 px renders loaded Rubik, had no overflow or header overlap, and kept the six footer icons on
one row. The in-app preview console had no errors or warnings. Review the exact draft at
`https://calapres.com/?preview_theme_id=165777604864`.

Checkout is not yet changed. The editor currently has unsaved Rubik selections for both Headings and
Body, but Save was deliberately not pressed; the active configuration and its preview remain
Almarai. Public theme `165774786816` also remains unchanged and continues to render Cairo. After the
owner visually approves the combined draft, publish only theme `165777604864`, save Rubik in both
checkout fields as the coordinated live step, fully reload both surfaces, and verify persistence.
Preserve `165774786816` as the immediate theme rollback and Almarai as the exact checkout rollback.
Do not run `.github/workflows/theme-deploy.yml`.

## Resume here — two-colour storefront palette awaits owner visual approval — 2026-08-31

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. The bounded work began
from `0b18953b8823bc254ff28406ae21be90f70cb7e0`; implementation source is now in canonical GitHub
commit `0030abf2cf99229426a29a63591c2cacce4ffdc3`. Authenticated Shopify still shows
`165774786816` as `MAIN` and `165770887424` as the immediate unpublished rollback.

The owner chose the supplied Magnific wax-seal image as the visual colour authority. Magnific
creation `DoBCSVCpcl` contained qualitative cocoa/ivory wording but no numeric values. The exact
image-derived interface sources are beige ground `#DFD4C3` and burnt-brown ink `#44271B`; their
contrast is 9.24:1. Decision 0025 records that alpha derivatives are allowed for interface depth,
while product media, product swatches, video, and native third-party branding remain truthful
content rather than UI tokens. Checkout remains separate and unchanged.

Shopify draft `Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`) remains
`UNPUBLISHED`, not processing, and without failure. It contains six changed files:

- `assets/calabriz.css`: `3dd71367b0f450c1a47af1362fcb2275`.
- `layout/theme.liquid`: `7df9733932f681968bc11c1d0277486b`.
- `layout/password.liquid`: `9b69bba75122a3000b3857451bf92a05`.
- `sections/header.liquid`: `a6a0c72959d62d639cc59a0119d65e50`.
- `sections/footer.liquid`: `d91fdc9df03e364c531b73c43ca0a2e6`.
- `snippets/cart-drawer.liquid`: `417fccebc63ff62eb65353cf220c22d1`.

The draft unifies the scrollbar, text, buttons, cart badge/drawer, form controls, browser
`theme-color`, header wordmark, and six footer glyphs. The raw wordmark and social assets are not
redrawn; their silhouettes are rendered as brown CSS masks. WhatsApp remains exactly
`https://wa.me/966508727687`, email remains exactly `mailto:info@calapres.com`, X remains disabled,
and all other social-link rules are unchanged. Error notes retain a non-colour distinction, focus
indicators are visible, and image overlays/control boundaries meet their applicable contrast gates.

Theme Check passed with zero errors and six existing Cairo remote-font warnings. Final 320 px,
390 px, and 1280 px renders had no horizontal overflow, header overlap, or browser-console errors or
warnings. Both mobile sizes showed all six brown icons on one row; cart, national-address helper,
contact fields, hero action, and collection labels rendered in the intended palette. The open store
redirects `/password` to the homepage, so the password layout was checked statically.

Next action: show the owner
`https://calapres.com/?preview_theme_id=165777604864` and wait for a fresh explicit approval. If
approved, publish only theme `165777604864`, verify its new `MAIN` role and public 320/390/1280
renders, and preserve `165774786816` as the immediate rollback. Do not publish now, do not change
checkout or the favicon asset in this stage, and do not run `.github/workflows/theme-deploy.yml`.

## Resume here — exact Calapres wordmark is in an unpublished header preview — 2026-08-31

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. This bounded stage
started from clean GitHub `origin/main` commit `0f8275069cef9d34cbce7e428d72643c0926d7d0`.
The public store remains on Shopify theme `165774786816`; its immediate rollback theme remains
`165770887424`.

The owner requested the lower `CALAPRES` wordmark from the supplied transparent
`معدل -7.png` in place of the Arabic text at the top of the storefront, excluding the oval
monogram. Do not use either rejected generative attempt: both altered the lettering and lacked true
alpha. The implemented `assets/calapres-wordmark.png` is an exact deterministic crop of the supplied
PNG, 1249 x 220 with real transparency and SHA-256
`b4c993f9c4ea3618232b8346036b892b0ed1bf6f25561a2a7dabef2f78a20d02`. An adjacent original
Illustrator file confirmed the same art but was not changed or committed.

Shopify draft `Preview — Calapres wordmark header 2026-08-31` (`165776949504`) was duplicated from
the current main and remains `UNPUBLISHED`, not processing, without failure. Only the new PNG,
`sections/header.liquid`, and `assets/calabriz.css` were updated. Shopify reread MD5 checksums
`3945fcf018f3b264605a4deb46fa8a7c`, `65a85e560125f6f2171923d821b79246`, and
`b5344d298d4fba4d9082a75ef7633dc0` respectively. The image is decorative while the link retains
`كالابريز` as its accessible name and still points to `/`.

Fresh preview renders passed at 320 px, 390 px, and desktop widths. The wordmark widths were 102.4
px, 124.8 px, and 144 px; it did not overlap the account/cart actions or the menu, and the browser
console had no errors or warnings. The live theme was not edited or published.

No font changed. The storefront remains Cairo and checkout remains Almarai. Shopify checkout
typography is separate from theme typography. The owner is reviewing Arabic families in Google
Fonts; after receiving two or three exact family names, verify each in Shopify's checkout font
picker and implement only one family that can be used on both surfaces. Stop again for visual
approval before publishing draft `165776949504`.

No product, customer, order, payment, Paymob, shipping, checkout, tax, app, Captain, n8n, Chatwoot,
Meta, or social-link setting changed.

## Resume here — six-icon mobile footer is live and verified — 2026-08-31

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. The implementation
started from clean GitHub base `2dc41a860118802eed6f85a65588e03c12516d35` and its source reached
GitHub `main` commit `199010681eff2f36c252a7412aaedd1189f82717` before publication. The owner's
dirty, diverged checkout and unrelated worktrees were not modified.

The public mobile defect is proven. At 390 px the existing social column was 158 px wide, each
icon box was 44.8 px wide, the gap was 12.8 px, and wrapping was enabled, so the four icons split
into two rows. WhatsApp was not assigned a larger layout box; its official glyph only looked larger
inside the same box.

Shopify duplicated theme `165770887424` into theme `165774786816` and renamed it
`Preview — six social icons mobile fix`. It adds official-style X and email assets, keeps the
existing Instagram, Snapchat, TikTok, and WhatsApp assets, optically reduces only the WhatsApp
glyph, and makes the social block span both footer columns on mobile. The six items stay in one
non-wrapping row.

Identity rules are explicit. Email is clickable at `mailto:info@calapres.com`, proven from the
authenticated Shopify store and public Calapres pages. WhatsApp remains
`https://wa.me/966508727687`. X is visible but disabled because no official Calapres X destination
was found in Shopify, GitHub, the public store, or a focused search. Do not invent or infer an X
handle.

Shopify returned no user errors. The persisted draft checksums are
`b9ead771d07e6a6fdbc6f86e9fe65bc8` for `sections/footer.liquid`,
`c5503cec29f1c5c4baf72e1742f6972a` for `assets/calabriz.css`,
`f125a682c3f7f612bf66e786e6c94a2a` for `assets/icon-x.svg`, and
`96ca267b44babbccb0f46d74c7de4308` for `assets/icon-email.svg`. Shopify's
`config/settings_data.json` reread exactly matched the local source and reported checksum
`8c265f87b89a1a49c641b842a37a323e`.

Pre-publication preview checks passed at 320 px, 390 px, and 1280 px. All six icon boxes shared one
y-coordinate, the mobile container height was 40 px, WhatsApp and email had the exact links, X had
no `href`, and the browser console had no errors. The footer schema has 16 unique setting IDs, the
changed JSON and SVGs parse, the new SVGs contain no executable or external references, and
`git diff --check` passes.

The owner explicitly authorized publication. Authenticated Shopify Admin confirmed that publishing
`165774786816` would replace `165770887424`; the confirmation was accepted and the theme library
showed the new theme as `Active`. A fresh Admin GraphQL reread now shows `165774786816` as `MAIN`,
not processing and without a processing failure, while `165770887424` is `UNPUBLISHED`. The role
change timestamp is `2026-08-31T13:01:23Z`; the former main is preserved as the immediate rollback.

After explicitly exiting preview mode, a fresh public 320 px render had no preview bar and showed
all six 40 px icon boxes on one row. WhatsApp linked exactly to
`https://wa.me/966508727687`, email linked exactly to `mailto:info@calapres.com`, X had no `href`,
and the browser console had no errors. Instagram, Snapchat, and TikTok remain disabled until their
official URLs are separately verified. The publication stage is complete; typography is the next
separate storefront stage. Do not run `.github/workflows/theme-deploy.yml`.

## Resume here — reconciled four-icon theme is live with verified Calapres WhatsApp — 2026-08-31

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. This production
publication started from a clean, freshly fetched `origin/main` commit
`212401db65aa090b427ef760bb2827b46879f498`; the owner's dirty, diverged checkout and unrelated
worktrees were not modified.

The official WhatsApp destination was proved before publication from authenticated Chatwoot
account `179973`, inbox `128058`, and its Account Health surface. They show the connected,
approved `Calapres | كالابريز` Business account at `+966 50 872 7687`, with phone-number ID
`1202498582954919` and WABA ID `1835160094133742`, matching the canonical project record. The
public destination `https://wa.me/966508727687` opened a WhatsApp page headed
`Calapres | كالابريز`; no message was sent.

Before publication, only `config/settings_data.json` in the unpublished preview theme
`165770887424` was updated to set `whatsapp_url` to that exact destination. Shopify returned no
user errors. The persisted file checksum is `d63fd05a769262c4248c65749115c950`, size 922 bytes,
updated `2026-08-31T11:54:17Z`. A fresh preview DOM showed the exact link on the WhatsApp glyph.

The owner explicitly authorized production publication after that verification. Authenticated
Shopify Admin confirmed that publishing
`Preview — official social icons + Safari favico...` would replace
`Calabris Shopify Theme`; the confirmation was accepted. A fresh Admin GraphQL reread now shows
`165770887424` as `MAIN`, not processing, with no processing failure, and the former main
`163004449024` as `UNPUBLISHED`. The former main is the direct rollback theme and was not
deleted.

After exiting preview mode, the public store had no preview bar and exposed the footer WhatsApp
link as `https://wa.me/966508727687`. The live document emits
`calapres-favicon-monogram-2026-08-31.png` as its 16 px and 32 px favicons. The four approved
official black glyphs are now live. Instagram, Snapchat, and TikTok remain disabled because their
URL settings are still blank; do not invent those account destinations. The separately labelled
Saudi Post helper remains `966112898888` and is not the Calapres account.

No product, customer, order, payment, Paymob, shipping, checkout, tax, app, Captain, n8n, Chatwoot,
or Meta setting changed, and no WhatsApp message was sent. Do not run
`.github/workflows/theme-deploy.yml`; its IDs/roles and deployment branch remain obsolete. Any
rollback or deployment-workflow correction is a separate bounded stage.

Canonical decision:
[0024 — Publish the reconciled Calapres theme with a verified WhatsApp destination](decisions/0024-publish-reconciled-theme-with-verified-whatsapp.md).

## Resume here — four official social glyphs and Calapres favicon ready in preview — 2026-08-31

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. This bounded stage
started from a clean, freshly fetched `origin/main` commit
`a774056dbaf5105366ab9e938e3dec4ec5764f4b`; the owner's dirty, diverged checkout and unrelated
worktrees were not modified.

Shopify verifies `Calabris Shopify Theme` (`163004449024`) as `MAIN` and
`Preview — official social icons + Safari favico...` (`165770887424`) as `UNPUBLISHED`. The owner
approved the preview's black Instagram, Snapchat, and TikTok glyphs and requested a matching
WhatsApp glyph. The preview now contains the unmodified black digital WhatsApp glyph from Meta's
2026 Brand Resource Center pack. Its SHA-256 is
`dea0d50de5d2e53320246d7172a2b8e84a999caa7798cd91681e63831cba6ed9`.

Three preview files changed in the final refinement. Shopify returned no user errors and the
verified checksums are `effe39ee446c06d7b3fc63450e694123` for
`assets/icon-whatsapp.svg`, `a871f19bfbd8d4b45496eb525b66b777` for
`sections/footer.liquid`, and `4dafdfa6e8d9d00cf29310561465ec14` for
`layout/password.liquid`. The password layout's obsolete embedded circle-and-dot favicon was
replaced with the same configured Calapres favicon declarations used by the storefront so the old
symbol cannot return if password protection is enabled later. A fresh preview DOM and visual check showed exactly four balanced glyphs:
Instagram, Snapchat, TikTok, and WhatsApp. The preview still emits the approved Calapres monogram
as 16 px and 32 px favicons and a 180 px Apple touch icon.

All four social destinations remain blank. The glyphs are deliberately visible but disabled; no
Calapres WhatsApp number was guessed, and the SPL helper number `966112898888` was not reused. An
owner-supplied official destination is required before enabling any social link.

The exact 62-file preview source was reconciled into a clean Git worktree because the previous
`main` tree held a different obsolete storefront prototype. All non-JSON theme files matched the
Shopify checksums, every JSON body parsed, 16 Liquid section schemas passed unique-ID checks, the
official WhatsApp asset passed a static safety check, and `git diff --check` passed. Shopify CLI
`4.7.0` Theme Check returned no errors and only six existing `RemoteAsset` warnings for the Cairo
Google Fonts links in the storefront and password layouts.

The active public theme was not changed. Do not run `.github/workflows/theme-deploy.yml`; its theme
roles are still wrong and it deploys the obsolete `shopify-theme` branch. The next production step
is to view the final preview, obtain explicit live-publication approval, publish through the
authenticated Shopify Admin surface, then verify the public DOM, footer visually, and Safari icon
before updating this handoff again.

## Resume here — email and shipping phone are separate required fields — 2026-08-31

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-31 Asia/Riyadh. This bounded live-setting stage started from a clean, freshly fetched
`origin/main` commit `1d71ecb833c08aedaeb9e5bbd4863cf2b6df9baf`; the owner's dirty, diverged
checkout and unrelated worktrees were not modified.

Authenticated Shopify Checkout settings now use `Email` as the Customer contact method and
`Required` for Shipping address phone number. Shopify displayed `Settings saved`, and a full Admin
reload persisted both values. A fresh checkout with one physical product displayed separate Arabic
fields for `البريد الإلكتروني` under Contact and `الهاتف` under Delivery; both rendered with
`required=true` and `aria-required=true`.

This is Shopify's native shipping-address phone field, not a custom field. It is enforced when the
checkout collects a shipping address; it does not verify that the number is mobile or SMS-capable
and does not grant marketing consent. Guest checkout and the existing marketing opt-in
configuration remain unchanged.

No customer data, address data, card data, order, payment, discount, shipping rate,
payment-provider setting, theme file, or app changed. `Pay now` was not pressed. Paymob remains
untouched and test-only. This newest section supersedes only the older historical wording that no
Checkout configuration apart from the address label had changed.

Rollback only on an explicit owner request: restore the combined `Phone number or email` contact
method and/or reduce or remove the shipping-phone requirement. Do not alter Paymob or any unrelated
Checkout setting during that rollback.

Canonical decision:
[0022 — Adopt a low-friction Shopify checkout with the live Calapres identity](decisions/0022-adopt-low-friction-shopify-checkout.md).

## Resume here — branded footer icons live; checkout friction bounded — 2026-08-30

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-30 17:15 Asia/Riyadh. This bounded live-stage record started from a clean, freshly fetched
`origin/main` commit `c008947e21d927329dff1bb4b41ab3f0604fc183`. Shopify remains on the Basic
plan, and the active MAIN theme remains `Calabris Shopify Theme` (`163004449024`).

Before the footer change, Shopify created unpublished draft theme
`Backup before social icons 2026-08-30` (`165747851520`). Its prechange checksums are
`0ddff0f3df2da32eb52dfb3a26591e9b` for `sections/footer.liquid` and
`01908b01ff2616099da2d1656f2147c7` for `assets/calabriz.css`.

Only those two files changed in the active theme. The square frames and backgrounds were removed,
the icons were enlarged, and natural brand treatments were applied: Instagram gradient, Snapchat
yellow and black, and TikTok black, cyan, and red. A public desktop visual check passed, and the
rendered DOM contained one each of the three new branded icons. The current live reread returned:

- `sections/footer.liquid`: `fcbf12d5636339dbc91e67fd64d249b4`, updated
  `2026-08-30T14:03:49Z`.
- `assets/calabriz.css`: `de2d9c3dab282a01c09175bc2d8e2fa3`, updated
  `2026-08-30T14:04:21Z`.

Do not describe the icons as connected social accounts. `instagram_url`, `snapchat_url`, and
`tiktok_url` are blank, so they are decorative disabled spans and are not clickable. No destination
was invented. Obtain the owner's exact official URLs in a separate stage before enabling links.

The current exact Address line 1 checkout text is
`( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )`. It includes one space inside each
parenthesis and was verified after a full Admin reload and in the existing public checkout. It guides Shopify
address autocompletion; it does not prove a direct National Address integration.

No Apple Pay or card ordering changed. Shopify controls native wallet presentation, cannot place
Apple Pay first by merchant preference, and varies accelerated-wallet visibility by device and
eligibility. No shipping setting changed: Shopify reveals applicable rates after it has an address,
and the observed checkout already held a valid restored address, so its applicable rate appeared
immediately. The marketing checkbox was deliberately preserved because hiding it would not make an
entered email valid marketing consent; creating a customer record is not the same as subscribing
that customer to marketing. Paymob remains test-only.

No payment, shipping, marketing-consent, customer, order, product, discount, privacy, Captain,
Chatwoot, n8n, or Meta state changed. Apart from the exact checkout-address string and the two
named footer files, no checkout or theme surface changed.

Do not run `.github/workflows/theme-deploy.yml` in its current state. Shopify verifies
`163004449024` as the active MAIN theme, while the workflow labels that ID as staging and labels
`163072377088` as live. It also deploys the unreconciled `shopify-theme` branch. Reconcile the
exact live source and verify both destination roles before a separate workflow repair; any design
translation must go to an unpublished preview theme and stop before live publication.

For footer rollback, restore only `sections/footer.liquid` and `assets/calabriz.css` from draft
`165747851520`, then verify the live footer. Do not publish that entire backup: the current address
language was saved after the theme was duplicated and would be lost or made stale by a whole-theme
publication. Leave the draft unpublished.

Detailed same-conversation record:
[Shopify checkout polish and payment-readiness handoff](docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md).

## Resume here — SPL WhatsApp helper live before checkout — 2026-08-30

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. This bounded
live-theme stage started from clean, freshly fetched `origin/main`
`a5ca00aaad4293039870fa642d86d8a13b63d364`; the later refinement was documented from clean,
freshly fetched `origin/main` `3a9f2b2f0f6b22cf8820be86ec97932412125704`; and the final
compact-mobile refinement was documented from freshly fetched `origin/main`
`e8f9392136fb6a08e271b1605f993ec48583fa71`. Read this section and
[decision 0022](decisions/0022-adopt-low-friction-shopify-checkout.md) before any further cart,
theme, address-assistance, or checkout work.

The distinction that triggered this stage is now proven in production: a custom link cannot be
inserted into the protected Information, Shipping, or Payment steps on Basic, Grow, or Advanced,
but it can be placed in the theme-controlled cart immediately before checkout. Shopify Plus is
required for custom text or links in those checkout steps, and even Plus uses constrained Checkout
Blocks or Checkout UI extensions rather than arbitrary `checkout.liquid` or checkout-DOM access.

The live helper now appears on both the cart drawer and `/cart` with exactly two lines:

- `لتسهيل شحنتك، أضف عنوانك المختصر في صفحة الدفع.`
- `لا تعرف عنوانك المختصر؟ اعرفه عبر واتساب سبل ↗`

Its exact destination is
`https://wa.me/966112898888?text=%D8%A7%D9%84%D8%B9%D9%86%D9%88%D8%A7%D9%86%20%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A`.
WhatsApp opens with decoded draft text `العنوان الوطني`; the customer must press Send.

Active MAIN theme `Calabris Shopify Theme` is `163004449024`. Before the edit, draft backup
`Copy of Calabris Shopify Theme` (`165745590528`) was created and left unpublished. No new backup
was created before the refinement, so this draft rolls back to no helper rather than the first
helper design. Only `sections/main-cart.liquid` and `snippets/cart-drawer.liquid` were refined.
The final live reread returned checksum `18a9fab56106ebefe4a2479ae12bf5f7` at
`2026-08-30T12:52:52Z` for the cart page and checksum `842f3966eaec4a2280b5d811774c5cb9`
at `2026-08-30T12:53:19Z` for the drawer, with role `MAIN`.

The earlier larger typography and spacing wrapped the two text elements into four visual lines on
mobile. The owner rejected that presentation; it and its prior checksums are historical and
superseded. The current styling reduces typography, spacing, and padding. Visual verification at
390 by 844 passed on `/cart` and in the opened drawer with exactly two lines and no wrapping. A
320 by 700 check also preserved both single-line sentences, although the fit is very tight.

This is a WhatsApp handoff, not a direct SPL API connection. No WhatsApp exchange or address
retrieval was performed or observed, and the helper does not automatically send identity data or
the prefilled message; the customer must press Send.
No checkout setting, payment provider, shipping setting, or product changed; no other system was
included in this bounded mutation.

The live Liquid source is still not reconciled into canonical GitHub `main`. Do not deploy the
stale repository theme over the active theme. The exact next theme-code action is a separate
read-only pull and reconciliation of the current MAIN theme into a clean reviewed branch. If the
owner requests rollback first, restore only the two files from draft theme `165745590528`, verify
the link disappears from both cart surfaces, and leave the backup unpublished. That rollback
removes the helper entirely; it does not restore the first helper wording or the superseded
oversized refinement.

## Resume here — Saudi customer VAT collection set to zero — 2026-08-30

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-30 13:57 Asia/Riyadh. This bounded tax stage started from clean `origin/main`
`cad21a8f16b644d2bb98a6df20d4626200d00604`. Read
[decision 0023](decisions/0023-set-saudi-vat-collection-zero-pending-review.md) and the
[focused tax handoff](docs/handoffs/2026-08-30-shopify-saudi-vat-zero-collection.md) before any
further tax, pricing, shipping-total, or invoice work.

The owner stated that Calapres has no Saudi VAT registration and instructed that checkout must not
add VAT. Before the change, Saudi Arabia used active Manual Tax with a 15% country base rate while
tax-inclusive pricing and tax on shipping were off, the Saudi override list was empty, and duties
and import taxes were not set up. Only the Saudi country rate changed: 15% to 0%. Shopify confirmed
the save, and a full Admin reload reread 0%.

A read-only Shopify analytics query for 2025-08-30 through 2026-08-30 returned zero orders, gross
sales, net sales, taxes, and total sales. This establishes only the connected store's Shopify
history. It does not include taxable supplies outside Shopify or the expected next 12 months, so
the entity-wide ZATCA threshold position remains unknown and needs prompt confirmation.

A fresh guest checkout with one live 390 SAR burner and synthetic, non-personal Saudi test data
showed free `التوصيل داخل السعودية`, no estimated-tax or tax line, and a 390 SAR total. No card
data, real customer data, order, or payment was submitted. The owner's earlier open checkout had
reported 10 SAR shipping, but that amount was not reproduced in the fresh checkout and no shipping
setting changed during this tax stage.

Treat 0% here as a Shopify no-collection configuration, not a claim that Calapres products are
legally zero-rated. The owner's registration and taxable-supplies position was not independently
audited. ZATCA currently describes mandatory registration above 375,000 SAR in taxable supplies
under the applicable 12-month test and voluntary eligibility above 187,500 SAR in taxable supplies
or expenses, with forecast and special-case rules. Promptly establish the prior- and next-12-month
position across the entity, not only this Shopify store. Reopen immediately if collection is
already required, becomes required, or a VAT registration takes effect, and follow ZATCA or
licensed Saudi tax advice for the effective date, invoices, price display, and shipping treatment.

Do not add a Tax ID under Shopify Billing as a substitute; that setting concerns VAT on Shopify's
own bill, not customer checkout collection. Do not restore 15%, issue VAT invoices, label supplies
zero-rated, or alter the 390 SAR product price without a separately verified tax and pricing stage.
Paymob test mode, all payment settings, products, shipping rates, checkout branding and language,
theme code, privacy settings, Captain, Chatwoot, n8n, and Meta were unchanged.

## Historical address guidance; current wording is in the newest section — 2026-08-30

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-30 13:42 Asia/Riyadh. This bounded follow-up started from clean `origin/main`
`76788b86ff464efd1b883112cc99e1adb449eac0`. Read
[decision 0022](decisions/0022-adopt-low-friction-shopify-checkout.md) and the
[focused checkout handoff](docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md)
before any further checkout, shipping, payment, or Safari-icon work.

At this stage, the checkout Address line 1 label was
`ابحث عن عنوانك (أدخل عنوانك الوطني لتسهيل البحث)`. It was saved and reread unchanged after a full
Shopify Admin reload. The value has since been superseded by the exact current wording in the newest
handoff section above. Treat both strings as guidance for Shopify address autocompletion, not proof
of a direct Saudi National Address integration.

Shopify already hides delivery rates until the customer enters a delivery address, then displays
only rates applicable to that address and order. The live profile still has one Saudi Arabia zone
and no Gulf zone. Its two rates named `التوصيل داخل السعودية` are subtotal tiers, not two carriers:
25 SAR from 0 through 319.99 SAR and free from 320 SAR. No shipping configuration changed. A future
Gulf stage must first receive the exact countries, fees or thresholds, delivery estimates, and
whether the owner wants manual rate labels or real carrier-calculated services. The live plan is
Basic: manual zones and rates remain possible, but third-party carrier-calculated rates are not
available on this plan.

Do not recolor the branded Apple Pay button; Shopify does not allow that button's brand treatment
to be customized. The public storefront currently emits the owner-selected PNG favicon from
Shopify CDN, but the owner's existing Safari profile reportedly shows an older icon. Safari may
cache favicons; its Page Menu control is browser UI, and Home Screen icons use a separate path. The
current document exposes no `apple-touch-icon` or web-app manifest. No theme code was changed, and
no visual Safari success is claimed from the server reread alone.

No order, customer, payment setting, payment transaction, shipping zone, rate, condition, carrier,
app, fulfillment service, theme file, product, privacy setting, Captain, Chatwoot, n8n, Meta
setting, or customer conversation changed in this follow-up. The only live mutation was the exact
Address line 1 wording above.

## Resume here — checkout branded; shipping labels clarified; Paymob still test-only — 2026-08-30

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-30 13:27 Asia/Riyadh. Read
[decision 0022](decisions/0022-adopt-low-friction-shopify-checkout.md) and the
[focused checkout handoff](docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md)
before any further checkout or payment work. This stage started from clean `origin/main`
`d4abddd4fb907d423b7f46aeb52b1a4349a48015`; the later logo, favicon, and shipping-label
follow-up was documented after a fresh `origin/main` verification at
`3a66851a2a6225481207f506be0868d2c2bda6e3`.

Shopify now requires both first and last name while guest checkout remains available. The saved
Arabic overrides are `ابحث عن عنوانك`, `ادفع الآن`, and
`جميع عمليات الدفع آمنة ومشفّرة.`. The active checkout was saved with Almarai for headings and
body and the live storefront's dark `#1B262D` action color. One-page checkout, address
autocompletion, buy-again, white backgrounds, native payment logos, and the security structure were
preserved. In a later owner-approved follow-up, the owner visually selected the existing Calapres
seal asset. It is now the checkout logo, centered at 100 px, and the active theme favicon. The
checkout editor persisted the file, width, and alignment after a full reload and rendered the same
Shopify CDN asset in its checkout preview. A fresh public storefront document returned the PNG
favicon from Shopify CDN instead of the former temporary inline icon. The separate icon at the far
left of Safari's address bar is Safari's own page-control button and cannot be branded by the site.

Temporary code `QXMRK` is active at 99% with one total use and one use per customer, no minimum,
and no combinations. It is only for the owner's bounded checkout test.

Paymob remains active in test mode. The provider lists Visa, Mastercard, American Express, and
Apple Pay, but Shopify explicitly says every transaction is simulated and customers cannot make
real purchases. Do not enter a real card or claim settlement. The exact next stage is to verify
Paymob live onboarding and settlement readiness before turning off test mode, then perform one
bounded low-value proof and stop.

Both domestic manual rate labels were changed from `قياسي` to `التوصيل داخل السعودية`. The paid
rate remains 25 SAR from 0 through 319.99 SAR and the free rate remains available from 320 SAR.
Shopify displayed `Profile updated` after each final profile save, and the final profile reread
showed both new labels with the original prices and thresholds. The profile still uses one normal
Shopify location named `SMSA Retail Shop`; the name is not proof of a fulfillment service or SMSA
integration. `Carrier accounts` shows `None`, no carrier service is configured or available,
OTO/Torod/SIDEUP are not installed, and no Fastlo application handle is present. The carrier the
owner previously preferred is Fastlo where covered, behind one approved multi-carrier gateway plus
a backup. That remains proposed only; no provider has been selected, installed, paid, connected,
or tested. The first preserved commercial check is whether OTO's 59 SAR tier accepts the owner's
Fastlo contract and writes tracking/status back to Shopify.

No order, customer, real payment, refund, payout, shipping price or threshold, carrier, fulfillment
connection, policy, pixel, privacy setting, theme code, product, Captain, Chatwoot, n8n, Meta
setting, or customer conversation was changed. The bounded live deltas were the checkout logo, the
active theme favicon setting, and the two manual shipping-rate names. The preserved storefront
prototype remains local and undeployed.

## Resume here — Saudi Arabia removed from Shopify cookie-banner regions — 2026-08-29

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-29 18:50 Asia/Riyadh. Read the
[focused execution handoff](docs/handoffs/2026-08-29-shopify-cookie-banner-saudi-region-removal.md)
before any further privacy or storefront work.

The owner explicitly approved one bounded Shopify Admin change. The manual cookie-banner region
set started at 32 of 299: Saudi Arabia was the only selected Asian region and 31 European
recommended regions were selected. Only Saudi Arabia was unchecked, then `Done` and `Save` were
submitted. After a full Admin reload, Shopify showed 31 of 299 selected, Europe 31 of 31 on the
Recommended tab, and the United Kingdom still checked. No Asian region remained selected.

A newly opened public storefront page identified its Shopify country as `SA`, remained Arabic and
SAR, loaded Shopify's native privacy-banner and consent-tracking scripts, and showed no visible
banner or consent controls. This observation is consistent with the saved Saudi exclusion but is
not an independent clean-visitor proof because the browser profile's prior consent state was not
inspected or reset. A `?country=GB` attempt remained in the Saudi context, so no live UK network
simulation is claimed; UK retention is proved only by the post-save Admin configuration reread.

No banner content, appearance, position, checkout setting, automation choice, privacy policy,
theme file, pixel, product, Captain, Chatwoot, n8n, Meta, redirect, or customer conversation was
changed. Do not reopen privacy policy translation or pixel work from this handoff.

The owner-approved Admin mutation and its post-reload persistence verification are complete. A
clean-visitor Saudi presentation and a live UK presentation were not independently verified in
this session. Stop without expanding the privacy scope. The next separate design action is owner
visual review of the preserved mobile prototype; only after approval should a clean stage
reconcile the live theme, translate the accepted design to Liquid, deploy to an unpublished
preview theme, verify mobile behavior, and stop before live publication.

## Resume here — local mobile prototype prepared; Shopify privacy not changed — 2026-08-29

Canonical project: `Calapres`; repository: `A-awd/calapres`; branch: `main`. Last verified:
2026-08-29 10:52 Asia/Riyadh.

Read the
[focused storefront and privacy handoff](docs/handoffs/2026-08-29-storefront-prototype-and-shopify-privacy.md),
then preserve the current Captain state from
[decision 0021](decisions/0021-adopt-shopify-native-short-product-links.md) and the
[2026-08-28 Captain handoff](docs/handoffs/2026-08-28-captain-native-short-links-and-chatwoot-reporting.md).
This closeout started from clean GitHub `origin/main`
`922e22263ca0a18d176b0f2a4abc26cd9d67cd87`; the dirty owner checkout was not touched.

A verified local-only mobile-first prototype exists in
`/Users/awd/Documents/calapres/worktrees/storefront-hero-prototype-20260829`, branch
`codex/storefront-hero-prototype-20260829`. It follows the owner's preferred FRAMA editorial
direction and uses Calapres assets. Its comparison, interaction, build, and worker checks passed,
but it is untracked, uncommitted, not production-approved, not implemented as Shopify Liquid, and
not deployed. Preserve that worktree until the owner accepts or rejects the prototype.

The live cookie banner is Shopify Customer Privacy, not theme code. Read-only evidence showed it
enabled in the full-width bottom position with Saudi Arabia explicitly included. The connected
Shopify MCP lacked the privacy-read scope, and no safe region-edit mutation was found; it cannot
perform the requested Saudi-only change in its current state. Do not hide the banner with theme
CSS and do not use the broader global-disable operation as a substitute.

No live system changed during this storefront-and-privacy phase. Preserve Captain, its two tools
and two bridges, the native short links, Chatwoot, n8n, Meta, Shopify products and pixels, Customer
Privacy settings, the live theme, and customer conversations.

The immediate next action is owner review. If the owner explicitly reopens privacy execution,
make one bounded Shopify Admin change only: remove Saudi Arabia from the cookie-banner regions,
verify the banner is absent in a Saudi context and remains present in a configured EEA or UK
context, record the exact result, and stop. Keep mobile design review and any later Liquid-theme
implementation as a separate stage.

## Resume here — native short links accepted in Playground; stop for review — 2026-08-28

Read
[decision 0021](decisions/0021-adopt-shopify-native-short-product-links.md), the
[v1.3 short-link baseline](docs/baselines/2026-08-28-calapres-captain-v1.3-shopify-native-short-links.md),
and the
[focused short-link and reporting handoff](docs/handoffs/2026-08-28-captain-native-short-links-and-chatwoot-reporting.md).
This stage started from clean GitHub `origin/main`
`e1188212d6361c852778c88e1eff54dbf37d3226`; the owner's dirty, diverged checkout was not touched.

Shopify now owns exactly three first-party redirects: `/p/white`, `/p/beige`, and `/p/gray`, each
pointing to its existing canonical white, beige, or gray product path. Direct checks returned HTTP
`301` to each exact target and final HTTP `200` product pages. No product handle or other product
record changed, and no third-party shortener was introduced.

Workflow `8jtjLu261ZzcipGq` still has the same five linear nodes, tool, endpoint, credentials,
request contract, Shopify read, and response envelope. Only `Shape Safe Product Link Result`
changed. It now maps a safe exact canonical product URL to one of three exact allow-listed short
URLs; seven local test cases passed. The published n8n version is
`روابط شوبيفاي المختصرة الأصلية`, with description
`إرجاع روابط شوبيفاي المختصرة الأصلية`.

The first fresh Captain Playground prompt,
`أبغى أطلب المبخرة البيضاء`, returned the safe technical-unavailable wording while the n8n host
and the production webhook independently returned HTTP `503`; the n8n Cloud page showed the
instance as `In progress`. This was a transient infrastructure-availability observation, not
evidence that the deterministic mapping was wrong. The host and webhook then recovered to HTTP
`200`.

One retry used the same prompt. Captain returned exactly the public title
`مبخرة كالابريز الفاخرة — الأبيض` plus `https://calapres.com/p/white`, with no price,
availability, inventory, discount, previous-price, or bundle-content claim. This accepts the
bounded Playground path after recovery. It does not prove the short link was physically delivered
in WhatsApp or delivered on Instagram or TikTok.

The exact next action is owner review. Do not send a WhatsApp test, edit a customer conversation,
create another redirect, change any other workflow node, or combine a later external-channel proof
with the pending order-bridge authorization rotation.

Preserve Captain, its three inboxes, Audience, Schedule, assignment automation, knowledge,
guidelines, inactivity choice, and two tools. Preserve all Meta WhatsApp settings, the order
bridge, and the unpublished old responder. Roll back only by restoring the prior Shape-node code
and deleting the three exact Shopify redirects; remember that HTTP `301` responses can be cached.

The Chatwoot reporting review was read-only. The live account has zero labels, zero custom
attributes, and exactly one unchanged conversation-created assignment automation. No report or
classification setup is live. A later owner-approved stage may separate contact purchase status,
conversation result, labels, and saved filters. `شكراً لطلبك` may set only `يحتاج تحقق`; it must
never establish `طلب موثق` without a uniquely matched Shopify order. The proposed independent
bridge `كالابريز | تصنيف العملاء حسب طلبات شوبيفاي` is not approved or executed.

## Resume here — Captain replied in Chatwoot; verify physical WhatsApp visibility — 2026-08-28

The fresh-message gate after the conversation's `Open` to `Pending` recovery has now been crossed.
In the real WhatsApp conversation, Captain answered an external car-link request with a concise
store-scope redirect in the same minute. The owner's beige follow-up then produced the exact beige
product title and canonical Calapres URL. Captain's generation trace explicitly showed a tool call
with product query `البيج`, and the outbound message tooltip read `تم الإرسال بنجاح`.

This verifies inbound eligibility, Captain response generation, product-link tool selection, and
the Chatwoot-side status label. It does not yet verify physical display on the owner's WhatsApp
screen: the owner reported that no reply was visible when checked. n8n execution evidence was also
not refreshed because workflow `8jtjLu261ZzcipGq` is not exposed through the current n8n MCP
access. Do not infer either a bridge failure or physical delivery from those observability limits.

No live configuration changed during this read-only check. Preserve the current conversation state,
Captain, both tools, both workflows, channels, Audience, Schedule, assignment automation,
knowledge, Shopify, and Meta state. The next bounded action is observation only: confirm the same
two replies on the owner's WhatsApp client. If they remain absent, inspect the outbound
Chatwoot-to-WhatsApp delivery layer without changing global routing or either bridge, document the
evidence, and stop.

## Resume here — WhatsApp handoff-routing recovery awaiting one fresh message — 2026-08-27

The latest owner test message was visible in Chatwoot, but its existing conversation had already
been handed off by Captain and marked `Open`. The message therefore remained on the human path;
the product-link bridge was not invoked, and its execution history contained no call matching the
message. This proves ingress and isolates the silence to conversation routing. It does not prove a
failure of WhatsApp, Captain, or either Shopify bridge.

Live reread preserved assistant `2187`, its three connected social inboxes, Audience `Everyone`,
Schedule `Anytime`, `Wait for the customer`, and the unpublished old responder. Only the affected
owner test conversation was returned from `Open` to `Pending`. The older inbound message was not
replayed during observation, so no reply success is claimed.

Ask for no configuration work. The exact next action is one fresh owner-originated WhatsApp
message in that same conversation. Observe the physical WhatsApp reply. If the request is for a
product link, also confirm one new execution of `8jtjLu261ZzcipGq` and compare only the returned
title and canonical URL. Then document the evidence and stop. Do not manually reply from Chatwoot,
resolve the conversation, change assistant settings or automation, publish the old responder, or
modify either bridge while performing this proof.

## Resume here — product-link bridge accepted in Playground; stop for owner review — 2026-08-27

Read
[decision 0020](decisions/0020-adopt-captain-product-link-bridge-and-concise-replies.md), the
[v1.2 product-link baseline](docs/baselines/2026-08-27-calapres-captain-v1.2-product-links-and-concise-replies.md),
and the
[detailed product-link handoff](docs/handoffs/2026-08-27-captain-product-link-and-response-quality.md).
They supersede the earlier sequencing instruction that prohibited a second bridge before the
order-bridge credential stage: the owner explicitly reopened and approved this bounded product-link and
response-quality stage. The order-bridge credential rotation itself remains pending.

Captain still has one assistant, `Calapres Assistant` (`2187`), connected only to WhatsApp
`128058`, Instagram `128031`, and TikTok `128033`, with Audience `Everyone`, Schedule `Anytime`,
74 FAQs, and 22 documents. The existing assignment automation was not changed. The internal
description already identified a luxury burner store, so it was left alone. Meta WhatsApp profile,
display name, catalog, Shopify records, customer conversations, and the old unpublished responder
were not changed.

Captain now has two tools. Preserve the unchanged order tool and its bridge. The new tool is
`كالابريز | البحث عن رابط منتج شوبيفاي`; it calls published workflow
`كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1` (`8jtjLu261ZzcipGq`). The workflow has
five linear nodes and only reads a bounded set of active Shopify product titles and canonical
online-store URLs. Its safe envelope is `status`, `title`, `url`, and `clarification`; it does not
return price, availability, discounts, bundle contents, customer or order data, and it cannot send
a reply or mutate Shopify.

Two independent response guidelines are live: one owns reply length and shape; the other owns the
live-product-fact boundary. Keep them separate by purpose. Do not fragment every sentence into a
new guideline. The inactivity behavior is now `Wait for the customer`. Previously, one hour of
silence allowed Captain to review and resolve the conversation. The exact `سعدنا بخدمتك...` text
was configured for that route and no once-per-day campaign was identified, so this is its likely
source.

The original Playground acceptance failed. Execution `44652` proved Shopify returned the active
white product and canonical URL, but the safe-URL helper used unavailable `new URL(...)` behavior
inside the n8n Code-node sandbox and silently rejected the URL. Only that helper was replaced with
an anchored exact-Calapres HTTPS validator, and eight offline safe/unsafe URL cases passed. The
workflow retained the same five linear nodes and was published as
`تصحيح فحص رابط المنتج في بيئة عقدة الكود`.

The product-link authorization exposed during diagnosis was then rotated in both Chatwoot and n8n
through owner handoff. Keep all values outside GitHub. Executions `44662` and `44664` failed in
`Validate Request and Resolve Color` with `Unauthorized request`, proving the retired value is
rejected. Execution `44663` proved the replacement value reaches a matched safe result.

Two bounded diagnostic replies then isolated the remaining Captain-side defects. The tool
description was strengthened to require the product-link tool for explicit Arabic purchase/link
intent such as `أبغى أطلب`, to preserve the customer's product and color words, and to forbid adding
`طقم` or an unrequested color. More importantly, the Chatwoot response template had omitted the
required `response.` object prefix. It now reads `response.status`, `response.title`,
`response.url`, and `response.clarification`, so Captain receives the parsed bridge fields.

[Accepted final Playground evidence] A fresh final prompt, `أبغى أطلب المبخرة البيضاء`, returned
exactly two short lines: `مبخرة كالابريز الفاخرة — الأبيض` followed by the
[canonical product URL](https://calapres.com/products/مبخرة-كالابريز-الفاخرة-الأبيض).
Execution `44668` succeeded in 2.182 seconds through all
five nodes and returned `matched` with the same URL. This proves the bounded Playground path only.
It does not prove availability, price, discount, inventory, bundle contents, a real customer reply,
or delivery on WhatsApp, Instagram, or TikTok.

Stop for owner review. The order-bridge authorization rotation from decision 0019 remains a
separate pending security stage. Do not combine it with price or inventory lookup, product writes,
order-number search, shipping, outbound WhatsApp, another knowledge group, another bridge, Meta
changes, or a real customer conversation.

Each separately owner-approved capability may use the modular pattern. Naming or specifying a
capability does not approve implementation. An approved bridge still needs an Arabic display name,
bounded inputs and outputs, a declared source of truth, one acceptance test, and an independent
rollback. To roll back only this stage, remove or disable the new Captain tool, deactivate only
workflow `8jtjLu261ZzcipGq`, remove only the two recorded guidelines, and restore the former
inactivity choice only if the owner explicitly requests that behavior. Do not touch the order
bridge or protected Captain state.

## Resume here — isolated Captain order bridge live — 2026-08-26

Start with
[decision 0019](decisions/0019-adopt-isolated-captain-external-tool-bridges.md) and the
[detailed closeout](docs/handoffs/2026-08-26-captain-order-bridge-and-deferred-roadmap.md).
They supersede lower historical statements that the current Chatwoot plan has no Captain tools.

The protected conversational state remains unchanged. `Calapres Assistant` (`2187`) is the only
automatic responder on WhatsApp `128058`, Instagram `128031`, and TikTok `128033`, with Audience
`Everyone`, Schedule `Anytime`, and the existing assignment automation. Captain contains 74
approved FAQs and 22 documents. The old responder `kAyF0D3ZZHxc0Hwp` remains unpublished and must
never run alongside Captain.

[Verified live] Captain now has one custom tool, `Calapres Shopify Order Lookup`, connected to the
active five-node n8n workflow `Calapres | Captain Shopify Order Bridge v1`
(`lLJpvjtcxTaoQeGj`). This is not the old architecture. Captain still understands and answers the
customer; n8n only validates the authenticated request, reads bounded order facts from Shopify by
the current contact phone, and returns a structured safe result. It contains no AI composer, sends
no Chatwoot message, and performs no Shopify write.

Successful history proves authorization, Shopify read connectivity, and the safe no-match path.
It does not prove a real matched order, greeting by name, fulfillment or tracking answer, or
customer-channel delivery. The current tool cannot search the full order number it asks for after
no match. No carrier API is connected; only tracking already in Shopify can be returned.

The owner-approved reusable pattern is one accepted Captain assistant plus one small, independent
n8n bridge for each separately approved external feature. Shopify owns dynamic prices, products,
orders, fulfillment, and tracking; do not copy changing facts into Captain knowledge. Respond.io is
closed. Shipping selection and outbound WhatsApp remain deferred. Do not publish the unsolicited
local shipping PDF.

The exact next safe stage is one separately approved security change: rotate only the bridge
authorization in Chatwoot and n8n together, verify that the retired value fails and the new value
reaches the safe no-match result, record the result, and stop. Do not change Captain, its inboxes,
knowledge, assignment, workflow shape, Shopify data, or customer conversations during that stage.
After owner review, the next functional stage is one controlled matched-order test without parcel
dispatch. Do not add order-number search, shipping, outbound messages, another bridge, or another
knowledge group at the same time.

## Resume here — Captain v1.1 engraving knowledge live — 2026-08-26

Continue from the protected `v1.0` architecture with one additive `v1.1` engraving delta. Live
Chatwoot reread confirmed assistant `2187`, WhatsApp, Instagram, and TikTok connections, Audience
`Everyone`, Schedule `Anytime`, and the single enabled new-conversation assignment automation are
unchanged. Account-level audio transcription is enabled. Captain now shows 74 approved FAQs and 22
documents.

The complete executed delta is two engraving FAQs plus one narrow engraving guardrail. Captain may
confirm only two letters, or two letters plus a date. It must not claim that engraving is free,
must not invent a price, and must not promise a full name or logo. Exact text, tests, and rollback
instructions are in
[Calapres Captain v1.1 — Engraving](docs/baselines/2026-08-26-calapres-captain-v1.1-engraving.md).

Playground verification passed for the price boundary, rejection of a full-name-and-logo request,
and confirmation of the approved two-letters-plus-date format. This is Playground evidence only,
not new WhatsApp, Instagram, or TikTok delivery evidence. Older crawled FAQs still conflict with
the owner facts; they were left intact, and the new guardrail is required for the verified result.

Do not configure n8n, Shopify, Captain tools, or another knowledge group from this handoff. Stop
for owner review. If rollback is required, remove only the two exact FAQs and the one exact
guardrail recorded in the v1.1 delta document.

## Resume here — v1.1 blocked before knowledge execution — 2026-08-26

At 09:08 Asia/Riyadh, a clean worktree based on GitHub `origin/main`
`9f9dbd3ed9d8ac4c47e2d695e216ad194505aaac` completed the required read-only Shopify and n8n
refresh. Shopify still shows the three active white, beige, and gray Calapres burners at SAR 390
each and reports inventory 0. n8n workflow `kAyF0D3ZZHxc0Hwp` remains unpublished with no active
version and was not executed.

The live Chatwoot refresh could not proceed because the required browser security policy check was
temporarily unavailable for `app.chatwoot.com` in both supported authenticated browser surfaces.
No security control was bypassed and no unauthenticated workaround was used. As a result, no
Captain knowledge was added, no Playground test was run, and no `v1.1` behavior may be claimed.
The current executed baseline remains `Calapres Captain v1.0 — Stable`.

Next, retry the live Chatwoot read. Confirm assistant `2187`, WhatsApp `128058`, Instagram
`128031`, TikTok `128033`, Audience `Everyone`, Schedule `Anytime`, the single assignment
automation, knowledge counts, and disabled memory/contact/citation/automatic-FAQ settings. If all
match the baseline, add exactly one owner-approved knowledge group as an additive reversible delta,
verify only that group in Playground, document it, and stop for owner review.

## Resume here — Calapres Captain v1.0 stable — 2026-08-26

[Verified, owner-observed] The owner accepted the current Captain behavior as the best configuration
reached so far in this project after a physically visible WhatsApp reply gave a direct, natural,
store-grounded answer and kept an uncertain shipping request inside the same chat without referring
the customer to email. Preserve this result as the behavioral baseline.

Read
[Calapres Captain v1.0 — Stable](docs/baselines/2026-08-26-calapres-captain-v1.0-stable.md),
[decision 0018](decisions/0018-adopt-chatwoot-captain-prelaunch-pilot.md), and the
[detailed Captain handoff](docs/handoffs/2026-08-25-captain-prelaunch-pilot.md).
The canonical branch is `main`; the GitHub rollback branch is `captain-v1.0-stable`.

Assistant `2187` remains the only automatic responder on WhatsApp `128058`, Instagram `128031`,
and TikTok `128033`. The existing assignment automation, Audience `Everyone`, and Schedule
`Anytime` must remain unchanged. The n8n responder `kAyF0D3ZZHxc0Hwp` remains unpublished.

The immediate next action is a single additive `v1.1` knowledge group using the pending
owner-supplied facts already listed in the baseline. Explain and verify that group, then stop before
adding another. Do not rename or replace Captain, delete baseline knowledge, change architecture,
buy or enable a paid service, publish n8n, or claim live order lookup. The accepted WhatsApp result
does not by itself verify the final baseline on Instagram or TikTok.

## Captain routing correction — 2026-08-25

The initial post-connection silence was traced to historical conversations that were still Open.
Captain does not re-evaluate audience and schedule for each new message in an existing open
conversation; it enters when a conversation is new or a resolved conversation reopens. The owner
messages had reached Chatwoot, but they remained on the old human/open path.

All seven existing conversations are now assigned to `خدمة عملاء كالابريز` and resolved. The
Chatwoot dashboard readback showed `غير معيّن: 0`. A single enabled automation rule named
`إسناد كل محادثة جديدة إلى خدمة عملاء كالابريز` triggers on conversation creation, covers the
four existing inboxes (`Calapres`, Instagram, TikTok, and WhatsApp), and assigns the human agent
`خدمة عملاء كالابريز`. Captain remains connected only to WhatsApp, Instagram, and TikTok; its
Audience is `Everyone` and Schedule is `Anytime`.

The n8n responder remains unpublished with no active version. No synthetic or operator-authored
customer message was sent during this routing correction. This evidence boundary was later
superseded for WhatsApp only by the owner's physically visible, accepted Captain reply recorded in
the 2026-08-26 stable closeout above. Final Instagram and TikTok behavior remains unverified in
this closeout; inspect the exact channel before changing global knowledge, guardrails, or
architecture.

## Captain prelaunch pilot — 2026-08-25

Detailed closeout: [Captain prelaunch customer-service handoff](docs/handoffs/2026-08-25-captain-prelaunch-pilot.md).

Resume from decision 0018. Chatwoot Captain assistant `Calapres Assistant` (`2187`) is the only
automatic responder and is connected to WhatsApp `128058`, Instagram `128031`, and TikTok
`128033`. Email and website remain disconnected. n8n workflow `kAyF0D3ZZHxc0Hwp` is unpublished;
fresh readback showed `active=false` and no active version. Do not reconnect or publish it while
Captain is connected.

Captain now has the exact Calapres-only scope guardrail, a natural Saudi-Arabic response guideline
that explicitly forbids `وش حاب تعرف عن منتجات كالابريز أو طلبك؟`, and a corrected identity for
the live white, beige, and gray burner catalog. Its Playground replies were materially better for
the owner's car, Mykonos-ticket, missing green/orange burner, and order-status examples. No paid
upgrade or additional service was added.

The current plan blocks Captain custom tools. Treat product-page knowledge as crawled support
content rather than a guaranteed live Shopify read, and hand order-status questions to a human.
Long-term memories, contact access, citations, and automatic FAQ generation remain off. The only
next action is the owner's real WhatsApp, Instagram, and TikTok test. Record the physically visible
reply before claiming success. If rollback is required, disconnect Captain from all three inboxes
first, then and only then consider republishing preserved n8n draft version
`b67ae1e3-98df-4665-9bee-29754d1beafd`.

## Grounded natural conversation live — 2026-08-25

Resume from the same live workflow `kAyF0D3ZZHxc0Hwp`, active version
`b67ae1e3-98df-4665-9bee-29754d1beafd`, 107 nodes. Decision 0017 supersedes decision 0016 only where
0016 required deterministic customer-visible prose. Facts still come only from the isolated
Calapres pack or bounded Shopify reads; external lookup and Shopify writes remain unavailable.

Root causes fixed in place: numeric TikTok `message_type=0` now passes the same ingress condition as
string `incoming`; verified recent Chatwoot messages now use the canonical fields consumed by the
classifier; the classifier has a dedicated structured parser; and every grounded draft passes
through one natural Saudi-Arabic composer plus a deterministic validator. New numbers, unsupported
actions, malformed output, or confidence below 0.85 fall back to the original grounded draft.

Fresh active-version readback confirmed the new nodes, parsers, OpenAI credential, graph connections,
and 107-node count. Repository verification passes 277/277 Node tests, 92/92 Python tests, and the
refreshed release lock. No duplicate workflow or synthetic customer message was created. The immediate
rollback target is `ab7db7ab-0195-45dd-a061-8e4e8b157d46`. The only remaining behavioral evidence is
the owner's own message through WhatsApp, Instagram, and TikTok; inspect the resulting execution if
any channel does not visibly reply, but do not reopen the architecture or create a test copy.

## Grounded support agent owner test — 2026-08-25

Resume from the same live workflow `kAyF0D3ZZHxc0Hwp`, active version
`ab7db7ab-0195-45dd-a061-8e4e8b157d46`, 100 nodes. Decision 0016 supersedes decision 0015 only where
0015 made fixed grammar the primary understanding layer. The existing restricted model now returns
strict classification JSON; the grounded engine revalidates it and alone selects an approved
static fact, a read-only Shopify product/order lookup, a store boundary, clarification, or human
handoff. There is no web-search tool and no model-authored customer prose.

No workflow, webhook, inbox, Captain, AgentBot, credential, or customer-send path was created.
The one inbound edge to `Send Reply` remains `Customer Egress Authorized?` output 0. The model is
temperature zero with strict schema; product queries are capped and include the Calapres vendor and
burner product-type filter. Node tests pass 322/322 and Python tests pass 92/92. The previous
deterministic version `d3d320d6-63be-4134-b333-a4941bf2480a` is the behavioral rollback target.

End-to-end delivery is not yet proven. Ask the owner to send, through a real connected channel:
`أبغى أشتري سيارة`, `ما هو طقس لندن اليوم؟`, and
`بكم المبخره الخضراء المخططه بالبرتقالي`. Confirm the physically visible replies and then inspect
the matching executions. The expected last response must say the described product was not found
and list the live white, beige, and gray catalog alternatives and prices; it must not say available.

## Owner-test correction — 2026-08-25

Do not treat the first activation as end-to-end success. The owner's WhatsApp screenshot proved
that two valid burner price descriptions were sent to the generic clarification. The scope parser
mistook the color word after `المبخره` for an external merchant. The corrected closed descriptor
grammar is live on the same workflow at version `d3d320d6-63be-4134-b333-a4941bf2480a`, still 100
nodes, with no graph, credential, webhook, inbox, or send-edge change. Targeted tests pass 51/51.
Rollback target is `1afb2f65-0f5c-4a87-9525-03a11088d6ff`. Wait for the owner to repeat the exact
green/orange burner question and confirm the physically visible reply before claiming success.

## Governed responder activation — 2026-08-25

The owner explicitly authorized live testing. Existing workflow `kAyF0D3ZZHxc0Hwp` is active on
version `1afb2f65-0f5c-4a87-9525-03a11088d6ff` with 100 nodes. The only new live node is `Governed
Customer Scope Router`, connected `Verify Chatwoot Anchor and Route -> Governed Customer Scope
Router -> Route Customer Service Decision`. It embeds knowledge candidate
`2026-08-25-v4-candidate`, never emits the model route, and limits Shopify to exact read-only
product/order capabilities. External questions use the pinned store redirect.

No new workflow, webhook, Chatwoot inbox, Captain, AgentBot, credential, or send path was created.
The single inbound edge to `Send Reply` remains `Customer Egress Authorized?` output 0. Local
targeted tests passed 50/50, and the post-publish n8n reread confirmed active/draft parity and the
expected graph. Roll back to version `aa654b47-1b8f-4132-979e-0199454028a2` if the owner's real
TikTok, Instagram, or WhatsApp tests expose a regression. Do not describe any channel as proven
until the owner confirms the physically visible reply and the matching execution is inspected.

## Verification update — 2026-08-14

Resume from branch `agent/preserve-calapres-customer-service-checkpoint`, commit
`e269ccb38b80f4156f065b3e5660b177f3c281b3`, Draft PR #4. GitHub confirmed the protected source
digest `2795336b25d88b2ed4b7cc2246fd4efbc6ee47e0f80ec152bbf35bacd5bcc49a`; live n8n read confirmed
workflow `kAyF0D3ZZHxc0Hwp`, version `aa654b47-1b8f-4132-979e-0199454028a2`, 99 nodes, and no
execution-data retention. No external message, Shopify write, workflow, webhook, or credential was
created during this continuation.

The current GitHub guard failure was release-lock drift, not a workflow-contract failure: source
and manifest changed in `36c289f`, and migration 0015 was not locked. The lock was regenerated and
local `release_lock.py --check` passes with digest
`90e549cc03507c3d23abfea118ecec96f026b94e8eb562e1308bbb8777de4c26`.

Neon live verification confirmed schema versions 0014 and 0015 in `calapres_cs.schema_migrations`
for `shiny-hill-38628371/neondb`. Recent durable records include unresolved `processing` events on
WhatsApp and Instagram without a decision or Chatwoot message id. Treat this as confirmed live
state requiring diagnosis, not as delivery proof. The current selected Node tests pass 40/40;
older checkpoint language saying 32/32 is historical.

Remaining acceptance gates are unchanged and must be proven separately: a real WhatsApp catalog
question reaching Shopify and a physically received grounded answer; real Instagram and TikTok
platform delivery; then an evidence-based canonical responder/webhook decision with rollback. Do
not synthesize customer messages, expose secrets or PII, write Shopify, or retire either existing
responder/webhook.

## Clean-session handoff — 2026-08-14

Resume from branch `agent/preserve-calapres-customer-service-checkpoint`, commit
`36c289fb00aa6e224030ad6ea8d2d460b7e085f7`. Read this section and the matching top section in
`STATE.md` before touching anything; they supersede older live snapshots below. Frozen responder
SHA-256: `2795336b25d88b2ed4b7cc2246fd4efbc6ee47e0f80ec152bbf35bacd5bcc49a`.

- Live responder: `kAyF0D3ZZHxc0Hwp`, active version `aa654b47-1b8f-4132-979e-0199454028a2`,
  99 nodes. Execution-data diagnostics are off again.
- Live Neon `shiny-hill-38628371` / `neondb`: migrations 0014 and 0015 are applied. Exact allowed
  inboxes are Instagram `128031`, TikTok `128033`, WhatsApp `128058`; website `128028` is rejected.
- Social evidence is split: n8n/Chatwoot replay succeeded and created messages `794491944` and
  `794491968`, but the owner did not observe Instagram/TikTok delivery. Treat both channels as not
  end-to-end proven and trace a fresh message without creating another webhook.
- Broad WhatsApp price/catalog routing is present and Shopify is read-only, but a fresh post-version
  `aa654...` inbound execution has not proved the route. Verify it with a real catalog question and
  inspect the Shopify node plus the physically received answer.
- Existing Edge workflow `e442GlRmKP4IO8pm` and two Chatwoot webhooks remain. Do not create a third.
  Canonical-responder consolidation is unresolved and requires evidence before any retirement.
- Latest targeted tests: 32/32. Full suite and current GitHub CI were not rechecked here.

Preserve the rollback chronology: initial catalog/social patch -> owner observed outage -> immediate
revert `b08e406` -> discovery of missing migration 0014 and WhatsApp-only DB constraints -> apply
0014/0015 -> reapply in `36c289f`. Do not misattribute the outage or rebuild the workflow.

The next agent should verify GitHub/origin first, inspect only these unresolved gates, keep Shopify
read-only, avoid secrets/PII, and never equate successful n8n execution with customer delivery.

## Verified Calapres social inbox allowlist live — 2026-08-13 (session 6)

Enabled the existing workflow for the verified Calapres Chatwoot inboxes: Instagram `128031`,
TikTok `128033`, and WhatsApp `128058`; website `128028` remains rejected. This was a six-node
parameter-only update to the same 99-node workflow, preserving dynamic inbox binding through final
reread, send proof, and recovery. Social-channel order questions without a trusted phone ask for
the order number and do not disclose Shopify identity or order data. Active version
`523a1bc0-daea-4d81-95e0-8912e4630455`; source SHA-256
`fa418c30417e43f15924ce7c545059bf612545523a13b6daeb2015bb75dffadc`; commit `dec732e`. Targeted
tests 27/27 and both CI workflows green. Source/configuration is confirmed; real inbound Instagram
and TikTok messages remain the required channel-delivery proof.

## Contextual bounded replies live — 2026-08-13 (session 5)

Fixed the owner's observed canned behavior at its actual source: unknown/off-topic messages were
being answered by one hard-coded router sentence without reaching GPT. They now use the existing
restricted GPT-5.4 route with recent Chatwoot context and natural, varied Saudi-Arabic behavior;
brief social exchanges and safe simple facts are handled naturally, genuinely unrelated work gets
a topic-specific concise boundary and redirect, and unclear business requests get one useful
clarification. The model still cannot invent store/order facts or perform open-ended unrelated
tasks. `Humanize Text` accepts up to three short sentences and enforces confidence 0..1;
temperature is 0.4.

Live workflow remains `kAyF0D3ZZHxc0Hwp`, 99 nodes, active version
`a2e3352f-36d4-49e2-b585-3197dea3e322`; no workflow/node duplication. Frozen source SHA-256 is
`e62a0afc063953b0eff5f613f70601d1af453945a566fd2febc615900b015337`, implementation commit
`f2c23627177882339143fb4a6b4b07064e9a5814`. Source/live parity verified and both CI workflows
passed (275 Node, 92 Python). Budget caps, kill switch, idempotency, final reread/send lease,
Shopify read-only scope, and no execution-data retention are unchanged. Live Neon remains schema
version 13; migration 0014 is still a separate explicit-approval gate.

## Migration 0014 syntax/NULL-bypass fix, Shopify credential swap (prepared) — 2026-08-13 (session 4)

**Migration 0014**: fixed a semicolon-inside-`--`-comment defect that broke Neon's migration
splitter (`syntax error at or near "no"`), and a NULL-comparison validation-bypass bug the fix
process exposed (empty/malformed jsonb commands could reach a raw `INSERT` instead of a clean
rejection). Verified both fixes by replaying all 14 migrations against a disposable local
Postgres 16 (not Neon) — clean apply, schema version 14, and the three new functions now reject
`{}`::jsonb correctly. Live Neon is still version 13; still needs a session with Neon MCP access
(or the owner via the Neon console) to run the fixed file.

**Shopify credential: DONE, CONFIRMED LIVE.** The owner shared `Shopify-Calapres` with the
"Calapres Customer Service" team project via n8n's own Sharing tab (not moved — all 18 other
personal-workflow references to it stayed intact). The credential swap on
`GET Shopify Orders Read Only` then applied. Verified with a real, isolated read-only probe before
publishing (temporary manual-trigger branch, zero connections to production nodes/Postgres/Send
Reply): `{ shop { name myshopifyDomain } }` returned genuine `HTTP 200`
`{"shop":{"name":"Calapres","myshopifyDomain":"unywbe-ub.myshopify.com"}}`. No `mutation` keyword
anywhere in the node. Probe branch and its temporary execution-retention override removed
immediately after; live/source parity and both graph invariants (single `Send Reply` edge, single
`Build Human Escalation` edge, schedule trigger can't reach `Send Reply`) re-verified before
publish. Active version `3da4f1cd-494c-4f47-9907-3d1f68dc018b`. One cosmetic note: n8n's update
API won't let a `setNodeCredential` call clear the node's now-dead `oAuth2Api` credential-map
entry once `authentication` is `predefinedCredentialType` — it's inert (never read) and mirrored
in the frozen source for honest parity; a test asserts it can never become reachable.

## Remove intentional pre-send delay — 2026-08-13 (session 3)

Owner requirement: no deliberate human-like pause before the customer reply; only unavoidable
API/DB/model processing time between verification and send. Implemented as a minimal rename +
parameter change on the existing `n8n-nodes-base.wait` node: `Human Delay` (`amount: 5`) ->
`Pre-Send Continuation` (`amount: 0`), propagated to its two downstream references. Frozen source
SHA-256 `23e459dc36277e848318a5ba50c2c6596b78ab4dcf68868289e97ce078bff21b`, 99 nodes (unchanged
count — rename/parameter only). No security or durability gate touched; see STATE.md for the full
list of re-verified invariants and the graph-parity diff (empty on nodes, params, credentials, and
connections).

Live workflow `kAyF0D3ZZHxc0Hwp` published as active version `73e3e3f2-c507-426a-bf7b-e1300fdd0c4e`.
Same update restored `saveManualExecutions/saveDataErrorExecution/saveDataSuccessExecution` to
`false/none/none` (previously left at diagnostic `true/all/all` settings from earlier work this
session — an identified and now-fixed carry-over bug, not a new issue). Rollback points preserved
and restorable: `8c518aeb-22c2-4ab9-bcef-7418029386da` (original baseline),
`7cca9e9b-6092-444b-8cb8-7735c39a9b5f` (pre-zero-delay 99-node SLA/escalation graph).

Latency: no new real inbound message has occurred since publish (deliberately not synthesized —
see STATE.md for why). Computed from real production execution `41342` (real owner WhatsApp
message on conversation #3): old total inbound-to-reply-sent was 9.75s, of which exactly 5.000s
was the now-removed fixed wait; projected new latency is ≈4.75s, bounded by Chatwoot
anchor-reread + Postgres claim/lease + final Chatwoot send API time. Directly observing the new
number requires one real inbound message — the same unavoidable step needed for the final Outcome
3 acceptance test.

Still open, both owner-only unavoidable actions (not fixable by any tool available to this
session): (1) Shopify credential `QKgLBMWQtO6G4zvM` returns Shopify's own `401 Invalid API key or
access token` — needs a browser OAuth reauthorization by the account owner; (2) migration `0014`
(24h SLA tables/functions) is written and statically tested but not yet applied to the live Neon
database — this session has no Neon MCP tool access.

## Self-service-first escalation with durable 24h SLA (decision 0014) — 2026-08-13 (session 2)

The owner rejected the prior interpretation that cancellation/refund/complaint language or any
Shopify/model failure should immediately add the `human` label. Corrected and implemented in the
same workflow: `Build Human Escalation` now has exactly one inbound edge (explicit
`customer_requested_human`, verified by a graph test). Every other previously-escalating case
self-serves with a bounded, non-invented reply (order-status disclaimer for
cancellation/refund/complaint, minimum-identifier clarification for Shopify failures/missing
data/ambiguity, a fixed fallback sentence for model budget denial or untrusted output). A durable
24-hour unresolved-case SLA (migration `0014_calapres_cs_customer_reply_sla_escalation.sql`,
schema version 14) now backstops all of this: one open case per conversation
(`calapres_cs.customer_reply_sla_cases`), `atomic_upsert_customer_reply_sla_case` (touch/resolve,
never resets the clock on a repeated message), `atomic_claim_due_customer_reply_sla_escalation`
(23h-48h claim window, `FOR UPDATE SKIP LOCKED` lease, same pattern as send-recovery),
`atomic_finalize_customer_reply_sla_escalation` (escalated / resolved-as-ineligible / released for
retry). The existing `Recover Ambiguous Sends Every 15 Minutes` trigger gained one isolated
fan-out branch for this — no new trigger, workflow, webhook, or credential. Graph tests prove
neither this branch nor the trigger can reach `Send Reply`. Frozen source SHA-256 is
`5092f7311b033f362e03cb3f4953fca32f068596a820cd0958c38d7b9830e76e` (82 -> 99 nodes). Full
Python (92) and Node (269+) suites pass.

**Not yet Neon-verified**: this session has no Neon MCP access. Migration 0014 is written, its
static contract tests pass, but it has not been applied to the live database. Until it is applied
(by a session with Neon MCP access, or by the owner via the Neon console), the new
`Postgres Customer Reply 14 Update SLA Case` and the SLA-escalation sub-branch's Postgres calls
will error on every execution once published live — this is fail-loud, not fail-silent, and does
not block or delay `Send Reply` (they are parallel, not sequential, confirmed by graph reachability
tests), but the 24-hour escalation feature itself is not functionally live until the migration runs.

**Separately, still unresolved**: the Shopify credential `QKgLBMWQtO6G4zvM` ("Unnamed credential",
generic `oAuth2Api` type) returns Shopify's own `HTTP 401 "Invalid API key or access token"` when
called through the exact live node/credential — this is an invalid/expired access token, not a
scope-denial error (which would be a `200` with a GraphQL `ACCESS_DENIED` error instead). Fixing
this requires an OAuth reauthorization only the account owner can complete in a browser; no scope
change, credential replacement, or workaround can substitute for that.

## Owner-directed escalation policy correction — 2026-08-13

The owner corrected a design defect: the bot was treating any Shopify/credential/data-gap
failure as an immediate silent human handoff (adding the `human` label and going quiet),
including on conversation #3 after the n8n Shopify credential failed an order lookup. The
corrected, binding policy: escalate to the owner only when the customer explicitly asks for a
human/agent, or a case stays unresolved 24 hours; every other Shopify failure or missing-data
case must attempt self-service or ask for the single missing identifier, never add the
`human` label or go silent. Fixed inside the same workflow only, same credential, no new
resources: `Prepare Shopify Order Read` and `Build Verified Shopify Order Reply` now turn
missing-phone, missing-product-topic, Shopify API/credential failure, order/customer ambiguity,
identity mismatch (never revealing the order belongs to a different phone), product-not-found,
and uncertain/partial fulfillment status into a direct clarification reply instead of
`Build Human Escalation`; the `Shopify Order Read Ready?` false branch now points to
`Human Delay` (the send path) instead of escalation. Cancelled/refunded orders still escalate
(a resolved, sensitive money state matching the original mandatory refund/cancellation rule),
as does an explicit customer request for a human agent (new router detection,
`error_code: customer_requested_human`) and existing model/budget/kill-switch uncertainty
paths. A 24-hour unresolved-case escalation was not implemented in this pass — it requires new
durable SLA-tracking state and is out of scope for this fix; flagged as a follow-up.

Conversation #3's `human` label, added under the prior incorrect policy, was removed live via
a temporary, isolated, sentinel-gated branch reusing the existing `Header Auth account 3`
credential and the existing `POST Chatwoot Human Label` node's endpoint pattern (dead-end,
zero interaction with production Postgres/send logic, fanned out from an existing connection
without removing it). Chatwoot's own activity log recorded `خدمة عملاء كالابريز أزال human`
at 13:43:45Z; a control probe afterward failed only `anchor_missing_or_duplicate` (expected
for a synthetic message id), not `human_label_present`, confirming `Should Reply?` /
the anchor's live label check no longer blocks the conversation. The scaffold nodes were fully
removed immediately after; live graph was re-verified to match the frozen source exactly
(82 nodes, single `Send Reply` inbound edge, recovery isolated, no-save settings restored).
New source SHA-256 is `f77279c1c844da3c62f1cc09ef8038f11a71ff510ae059c01c3327dfc551f02a`.

## Owner feedback fixes: classification, live Shopify reference, delivery audit — 2026-08-13

Owner-reported functional failures were diagnosed from live evidence (no-send diagnostic
executions 41316-41317). Findings: (1) all three outgoing replies carry Meta-confirmed
`delivered` status with real WhatsApp wamid source_ids addressed to the owner's number, so
transport works; the phone-side report needs the owner to check the business-number chat.
(2) The bot itself escalated conversation #3 at 13:26:23Z (activity message: human label added)
after `بلغي الطلب` hit the order path and the n8n Shopify credential failed the customers query
— the same query succeeds with valid scopes, so the n8n Shopify OAuth credential is missing
read_customers/read_orders (and needs read_products for the new product path); until fixed the
order and product paths escalate fail-closed by design. The human label also explains the bot's
silence on later messages. (3) Store location/identity questions (وين مقركم، انتم في مصر؟) were
misrouted out-of-scope and then suppressed; the router now answers them deterministically as
Saudi-store FAQs, personal questions stay out-of-scope. (4) Product price/color questions now
route to a live Shopify products query and reply only from returned data (title + SAR price),
escalating when nothing is found; the memorized 390/190 price facts were removed from both the
router and the model prompt, and the model is instructed to escalate price/stock questions.
New source SHA-256 is `2aec6eacb67cb8b343397f2318a0e6112bdd2a2eee959a448b30e6de480a8fb3`.

## First live customer round trip — 2026-08-13 13:22 UTC

After the anchor fix was published as live version `50dc7cd0-71ab-4e19-b57a-e6682a998380`
(commit `991a517`), the owner's real WhatsApp inbound completed the full protected path in
production for the first time. Independently audited evidence (Codex, live Neon + Chatwoot):
greeting inbound `793040533` reached state `sent` with `send_attempt_count=1`, outgoing Chatwoot
message `793040908`, `sent_at` 13:22:07Z; a following out-of-scope inbound `793041254` reached
state `sent` with one attempt, outgoing `793041537`, 13:22:24Z. Conversation #3 shows both
replies with WhatsApp delivery ticks. Exactly one reply per inbound; no private note; no Shopify
write; deterministic routes only (no model call). Execution retention remained disabled during
these production sends. Diagnostic manual executions `41267`–`41272` earlier the same hour ran on
the pre-fix anchor and terminated fail-closed without any send.

Still outstanding before declaring full operational readiness: live out-of-scope suppression
(second notice inside 24h must be silent), live sensitive-message escalation (`human` label, no
customer send), a live model-route reply with budget reservation, and an optional safe order
lookup; ambiguous-send recovery remains proven synthetically only.

## Real-inbound anchor fix — 2026-08-13

The first real inbound after the capability-URL ingress deploy passed ingress, produced a live
durable claim in Neon (first live proof of the restricted Postgres path), and both authenticated
Chatwoot rereads returned 200 — then every event failed `anchor_mismatch`. Root cause, proven by
live diagnostic executions 41267–41272: the conversation-messages API omits `account_id` from
message rows (unlike webhook payload rows), so the anchor's `account_id === 179973` comparison
failed on all genuine messages; the old pinned fixtures had assumed the wrong row shape. The
anchor now validates `account_id` only when the field is present (the API call itself is pinned
to account 179973 by URL), and `Prepare Raw Chatwoot Ingress` gained a non-production-only
base64 diagnostic input used for owner-initiated manual runs. A regression test exercises the
anchor against real API-shaped rows. New source SHA-256 is
`3a10cd938146c828ff43c44fe20cf2ce992d4d632836c0b90b9e6c47aa1e1f85`.

## Chatwoot HMAC defect and capability-URL ingress — 2026-08-13

Real Chatwoot deliveries cannot be signature-verified (upstream chatwoot/chatwoot#13809: the
signing `hmac_token` is not exposed anywhere). Decision 0013 replaces signature enforcement with
capability-URL ingress plus the authenticated reread anchor; do not reintroduce a signature
requirement until Chatwoot exposes the real signing key. The frozen source is 82 nodes, SHA-256
`f24ee6f32a2768dae37f783d4bc7c7204f3c6397397ebc2698549eefbdaaaa9f`; ingress nodes are
`Prepare Raw Chatwoot Ingress` → `Webhook Ingress Ready?` → `Finalize Chatwoot Ingress Gate` →
`Chatwoot Ingress Accepted?`, with `Respond Chatwoot Ingress Rejected` fail-closed. `Send Reply`
still has exactly one authorized inbound edge and recovery still cannot reach it.

## Recovery cadence quota fix — 2026-08-13

The MVP recovery schedule now fires every 15 minutes (was every 1 minute). Frozen source SHA-256 is
`30b477d79c988c922fd5a3c7d04febbf4fe9255ed84fbe65e9a840f95a001818`; release-lock digest is
`f55598279f17dd6b03857c9fbeb63815e5c0e0a8d6937bf3ca01049beeb22e93`. The schedule trigger is named
`Recover Ambiguous Sends Every 15 Minutes` and still cannot reach `Send Reply`. Expected monthly
schedule cost is ~2,880 executions against the 10,000-execution n8n Pro plan. Do not restore the
1-minute cadence without recomputing plan headroom. The live workflow `kAyF0D3ZZHxc0Hwp` must match
this source exactly; rollback `8c518aeb-22c2-4ab9-bcef-7418029386da` is retained.

## New-conversation handoff — 2026-08-13 14:56 +03

Start by fetching GitHub and checking out
`agent/preserve-calapres-customer-service-checkpoint`. At session close, local HEAD, `origin`, and
Draft PR #4 all pointed to `6889b74a5539b3dc4d1337fe76ff97074d9fade3`, and the customer-service
guard plus both Shopify checks were green. Read the first sections of `STATE.md` and this file
before older historical sections; some lower sections intentionally preserve superseded evidence.

Do not rebuild anything. The protected source is
`n8n/deployments/calapres-cs-bot-protected-draft.json`, SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`. Its release lock contains
95 files and digest `1203cedc5737711a371699a80a5249eb2367dc39d0dde133c80960250c904566`.
The final frozen checks were Node 249/249 and Python 92/92, with JSON, syntax, graph, secret/PII,
and release-lock checks green.

Live n8n state at handoff:

- existing workflow `kAyF0D3ZZHxc0Hwp` is active on protected version
  `941205ae-dab2-4684-b897-dee3655a2af7`, with 83 nodes and two triggers;
- `8c518aeb-22c2-4ab9-bcef-7418029386da` is the rollback version;
- Edge v2 `e442GlRmKP4IO8pm` remains preserved and unchanged;
- execution payload retention is disabled;
- Chatwoot has the two pre-existing `message_created` webhooks only: Edge observation and MVP;
- do not create a third webhook, duplicate workflow, or parallel responder.

Live Neon state at handoff:

- project `shiny-hill-38628371`, database `neondb`, main branch
  `br-broad-brook-awxulst4`;
- migrations 0001–0013 are applied;
- isolated validation branch `br-misty-glade-awba7bxf` passed reset-from-main restore validation;
- its prior state is preserved at `calapres-cs-pre-restore-validation-2026-08-13`;
- runtime execute grants are function-specific and direct table reads are denied;
- budget control is enabled, kill switch is off, monthly ceiling is USD 45, reservation is
  USD 0.05, and the daily conversation request limit is 20;
- one old synthetic USD 0.05 reservation remains as audit evidence; do not mistake it for real
  customer spend.

The synthetic execution matrix is recorded as `41145`–`41160`. Execution `41160` proved the full
pinned path through send authorization and durable completion without an external synthetic send.
Live HMAC binding was separately proved with a signed outgoing fixture returning 204; a wrong HMAC
returned 401. Exactly one manual technical message was sent to the owner's conversation #3. No
Shopify write or private note occurred.

The only material real-world proof still missing is an owner-only fresh inbound WhatsApp cycle:
observe exactly one protected reply, verify the corresponding durable Neon event and send
completion, then replay the same event and prove no duplicate reply. Do not use another contact,
do not expose secrets, and do not merge PR #4 to `main` before review.

Claude Code is now the implementation engineer and Codex is the independent auditor. Claude Code
was instructed to inspect first, preserve the active working version, and report exact evidence.
Its result is pending and must not be trusted merely because an n8n execution succeeds. Compare
its commit, source hash, live workflow/version/node count, Neon writes, Chatwoot behavior, replay,
and outbound effects against this handoff. If it changes the architecture, creates a duplicate,
weakens HMAC/idempotency/budget/reread protections, or cannot prove the final inbound cycle, treat
that as a blocker and preserve the current rollback.

## Resume checkpoint — 2026-08-13

Continue on branch `agent/preserve-calapres-customer-service-checkpoint`. The protected update of
the existing MVP `kAyF0D3ZZHxc0Hwp` is draft version
`941205ae-dab2-4684-b897-dee3655a2af7` with 83 nodes and source SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`. The still-active rollback is
`8c518aeb-22c2-4ab9-bcef-7418029386da`. Do not create another workflow and do not modify Edge v2
`e442GlRmKP4IO8pm`.

Neon main and the isolated validation branch have migrations 0001–0013. The new recovery contract
retries transient Chatwoot reads without resetting delivery state or increasing send attempts.
Recovery verifies the stored reply digest and cannot reach `Send Reply`. The only incoming edge
to `Send Reply` is output 0 of `Customer Egress Authorized?`. Shopify remains query-only, model
spend is behind the database budget/kill-switch guard, and uncertain cases label for owner review.

Synthetic executions `41145`–`41160` are the final graph evidence. Execution `41160` completed
the pinned signed-ingress -> durable claim -> Chatwoot reread -> deterministic reply -> final
reread -> send claim -> pinned Chatwoot send -> durable completion path. No external send occurred
in that execution. Manual, success, error, and progress execution retention are disabled. After
the repository and CI freeze pass, the remaining live gate is publishing this exact
existing-workflow draft and proving one owner-only inbound/reply/recovery cycle; retain the old
active version as the rollback and do not merge PR #4 to `main` before review.

Publication is now complete on the existing workflow: active version
`941205ae-dab2-4684-b897-dee3655a2af7`. The old `8c518aeb-22c2-4ab9-bcef-7418029386da` remains
available for rollback. GitHub Actions passed both customer-service and Shopify checks for
`8c4d969`. Live HMAC was proven with a signed outgoing fixture that returned 204 and stopped
before PostgreSQL; invalid HMAC returned 401. Chatwoot already contains the Edge observation
webhook and the MVP webhook, both subscribed only to `message_created`; no webhook was added.
Neon restore was tested by resetting the isolated branch from main while preserving its previous
state under `calapres-cs-pre-restore-validation-2026-08-13`.

The only proof still requiring the owner's phone is a fresh inbound WhatsApp message followed by
the protected reply path. WhatsApp Web was not linked, so no OTP, QR, or credential was requested
or bypassed. Do not simulate that customer action through another contact. Until that one
owner-only live cycle is observed, distinguish the pinned full delivery proof from a real inbound
customer delivery proof.

## Resume from

Continue from the latest verified `main` revision. Decision 0006 is binding for the Shopify-native
architecture, decision 0007 is binding for the isolated Calapres ownership-proof site, and decision
0008 is binding for the Optix customer-service design and its Calapres-only pilot boundary.
Decision 0009 makes the ownership-evidence page a future multi-brand standard without authorizing
another brand implementation. Decision 0010 is binding for the inactive Calapres observation
runtime, its no-send boundary, and its persistent-access gates.

Decision 0012 selects Neon for the PostgreSQL gate. The isolated Neon database has migrations
0001–0010 applied; migration 0008 adds the deny-first model budget guard, migration 0009 fixes
the namespace-scoped key-bundle join that blocked durable writes. The restricted n8n
Webhook/Reconciliation credentials have passed SSL
connection tests. The checked-in Edge v2 is imported into the existing target `e442GlRmKP4IO8pm`
with those two project-scoped credentials; the read-only Shopify branch is also present and bound
to the project OAuth2 read credential. Do not create a workflow, activate it, publish it, or
connect live Chatwoot traffic.

The final local freeze passed Node 175/175 and Python 92/92. Real Neon two-session checks covered
database clock, role separation, rollback, and one-winner locking; a temporary branch schema
comparison produced no diff and the branch was removed. This is not a provider backup-restore
drill, and no live Chatwoot, model, or Shopify observation has occurred.

The current Neon recheck reports PostgreSQL 18.4, migrations 0001–0010, four restricted runtime roles,
and deny-first budget defaults (`enabled=false`, `kill_switch=true`, daily limit 20, monthly limit 45 USD).
The inactive n8n target passed internal synthetic valid-signature, modified-body, and invalid-signature
webhook runs; targeted Node coverage passed 83/83. These tests did not send a customer message.

For the frozen post-`bfb191c` customer-service source release, resume from branch
`agent/preserve-calapres-customer-service-checkpoint` and read
[`docs/calapres-customer-service-checkpoint-2026-08-12.md`](docs/calapres-customer-service-checkpoint-2026-08-12.md)
before changing any Edge v2, PostgreSQL, reconciliation, context/LLM, schema, fixture, or test file.
The current Edge v2 source hash is
`c3f2e3f00c6cfeeeba42966639303056fd178e7b67ed512a6d39c6da6e22d991`, and
`support/brands/calapres/customer-service-release-lock.json` verifies the release set. Do not
rebuild these artifacts or claim production readiness from this checkpoint. The target is now
published and active for observation only; `main` remains authoritative until the preserved branch
is reviewed and merged.

Latest checkpoint: commit `86d59eb` binds the read-only Shopify customer lookup result to the strict
Core input envelope. The preceding `8ebf82a` checkpoint adds the read-only Shopify client-credentials renewal contract
and targeted tests. The preceding `b0d4ba8` checkpoint refreshes and verifies the customer-service release lock after
migrations 0004, 0007, and 0008 changed. The verified Edge production URL is
`https://kunads90.app.n8n.cloud/webhook/calapres/customer-service/chatwoot/v2`. Chatwoot now has
exactly one saved observation webhook, subscribed only to `message_created`; its signing secret is
stored in the project-scoped n8n Crypto credential. Edge v2
source and target have a Shopify read-only HTTP node and no model node; the target is published and
active for observation only. The new Shopify read-only app is installed and its Client Credentials token was tested
directly: Shopify returned a 24-hour token with only read scopes, and read-only Admin GraphQL
queries for shop/products and customer ID returned successfully without logging customer fields.
The pre-existing credential-free Core dependency is published solely to satisfy n8n's sub-workflow
dependency; it has no public trigger, customer data source, or customer egress.
The first live synthetic raw-body POST exposed a mismatch between the existing n8n HMAC credential
and the secret shown by the existing Chatwoot webhook edit form. The existing credential was corrected
in place and the same signed POST then returned `200`; Chatwoot shows exactly one enabled webhook.
The first permitted synthetic event for test conversation `3` returned HTTP 200 but created no
durable rows. Root cause was confirmed in PostgreSQL: `_edge_key_bundle_valid` compared the
request namespace against unrelated registry namespaces. Migration 0009 is applied and the
atomic function now returns `committed / processing_claimed` in direct Neon verification. The n8n
target was updated and published at version `55ff93fc-8400-4a55-8338-3cc5301f7f71`; it remains
observation/no-send. The
n8n end-to-end durable replay proof remains the final observation check; do not weaken HMAC or
use customer data to manufacture it.
The generic OAuth2 credential is saved in n8n with the expanded read-only scope set. The source
Edge v2 now contains the read-only customer lookup branch and its source hash is recorded in the
deployment manifest; the imported target contains the same branch. No Shopify write occurred.

## Completed in the Supabase retirement

1. Verified the canonical repository, branch, remote synchronization, and baseline revision.
2. Read all root operating documents and relevant decisions.
3. Audited the complete tree and found two obsolete Supabase implementations: a legacy React
   application and a later product-sync layer.
4. Confirmed the Shopify theme directories and theme deployment workflow have no Supabase
   dependency.
5. Removed the legacy React and Vite application, its Supabase client, authentication, storage,
   functions, generated types, packages, and lock files.
6. Removed the Supabase migrations and edge functions.
7. Removed the retired supplier and Supabase synchronization source and its CI workflow.
8. Replaced active architecture instructions with a direct Shopify draft, review, approval, and
   publication workflow.
9. Added decision 0006 and marked the conflicting parts of decisions 0002, 0003, and 0005 as
   superseded.
10. Added Shopify-only CI with a guard against runtime Supabase reintroduction.

## Live systems

- No product was published, deleted, or edited during this repository cleanup.
- No customer, order, payment, or inventory data was touched.
- No external Supabase project or historical data was deleted.
- Live n8n was audited read-only. All eight workflows using the saved Calapres Supabase credential
  are archived and inactive.
- The dormant credential remains saved because credential deletion requires confirmation at the
  time of deletion.
- Existing Agentic, policies, Knowledge Base, FAQs, collections, and storefront configuration are
  unaffected.
- The selected Calapres WhatsApp asset is operational on Meta Cloud API. The approved display name
  is `Calapres | كالابريز`; WABA ID is `1835160094133742`; phone-number ID is
  `1202498582954919`; the phone is `CONNECTED`, verified, and protected by two-step verification.
- Chatwoot Cloud account `179973` and its existing WhatsApp inbox `128058` use those same IDs. The
  webhook is configured and a real inbound, outbound, and owner-acknowledgement test passed.
- The native Calapres Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email `128326`
  inboxes are the exact customer-service pilot allowlist. Website inbox `128028` remains disabled
  for this pilot.
- n8n project `Calapres Customer Service` (`0kVami0vGGBbT7Cy`) contains eight empty isolated
  operational tables. Core `uCBXuRjlv8NyeikO` and Edge `e442GlRmKP4IO8pm` are inactive and
  unpublished. Shopify Order Index `cLHCuJ21r4RAuDTE` and Owner Review Desk
  `hU7sAMAQSg9Obgky` are likewise inactive and unpublished. All four have no credentials or public
  webhook, have no customer-send or Shopify-write node, and do
  not retain success, error, manual, or progress execution payloads under current settings.
- The approvals, incidents, and audit table schemas are aligned to the exact lossless owner-review
  projections at 34, 18, and 17 columns. The tables remain empty. Owner Review Desk caller policy
  is `none`, it contains no Data Table node, and its four decision actions remain previews with all
  writes and knowledge publication disabled.
- The Edge now includes the identifiers-only Wait and post-delay recheck; there is no separate
  delayed worker. The compiled delay is 30–75 seconds for the three chat channels and 120–300
  seconds for Email; one second is reserved for the sanitized fixture. The carrier binds its exact
  identifier/control fields with SHA-256 and carries only a pinned baseline-HMAC key version plus
  opaque status/assignee fingerprints. Live-shaped input keeps the kill switch on and fails closed
  before Wait until the trusted baseline capture and no-credential re-read are replaced. The index maps only HMAC
  fingerprints and opaque Shopify references to the exact 12-column empty order-index table and
  still performs no write.
- Source-only Chatwoot contracts now specify raw-byte HMAC verification, a 1 MiB pre-parse limit,
  request replay protection independent of the unsigned Delivery header, a separate stable
  business-event HMAC for idempotency across redeliveries, transient post-delay re-read evidence,
  and two independent non-paginated reads from the anchor-minus-one cursor. Each read must contain
  1–99 valid rows, include the exact incoming/public anchor, and yield the same canonical set;
  any newer non-activity message or route/state mismatch cancels.
  Full evidence is forbidden from Wait, Data Tables, and audit. No webhook or credential is live.
- The Edge previews the exact dedup/jobs/incidents/audit table shapes but marks every projection
  non-persistable and no-write. Static fixture fingerprints can never make a live event ready; a
  verified request replay claim, stable business-event HMAC with key-version dual-read, and
  identity-HMAC binding remain future live preconditions.
- Repository contracts, synthetic fixtures, and seventy-two local tests cover the shared Core, strict
  knowledge/live-fact grounding, transport-claim rejection, the stricter Calapres edge, embedded
  n8n Code syntax, channel delay, signed-ingress/re-read contracts, exact table-row projections,
  the index mapper, and the owner-decision trust boundary. Sanitized n8n runs `40625`, `40651`,
  `40619`, and Owner Review Desk run `40631` passed after the final fixes with
  customer egress, Data Table writes, knowledge publication, and Shopify writes all false.
  No n8n customer-service agent or automatic customer-facing reply is active.
- The model's free-text draft has no authority and is not forwarded. A grounded observation draft
  is rendered deterministically from versioned `customer_response_ar` or a verified live-source
  response fragment selected by an exact cited fact ID.

## Exact next actions

1. Continue with decision 0010 and `docs/calapres-customer-service-pilot.md`; do not recreate the
   already-built project, tables, Core, Edge, Order Index, Owner Review Desk, registry, knowledge
   releases, contracts, or fixtures.
2. Keep the Neon database and restricted credentials as the inactive PostgreSQL test foundation;
   complete real transaction/concurrency/recovery and backup/restore evidence before any live
   binding. The model budget guard is disabled by default and must remain so until the model phase.
3. The project-scoped Chatwoot read credential is now bound only to the existing Edge v2 GET nodes;
   verify it with a private synthetic read before creating any webhook. Obtain action-time owner
   confirmation before binding the dedicated Calapres OpenAI credential (project allowlist currently
   only `gpt-5.4-nano-2026-03-17`) to any model node or enabling a model call, then creating/sharing webhook-HMAC, identity-HMAC, or expanded Shopify
   access required for live observation.
   Two internal project-scoped Crypto credentials are bound to the existing identity/route and
   baseline/reread HMAC nodes. Keep the webhook HMAC secret separate until webhook creation.
4. Implement the checked-in signed-ingress contract in the existing Edge, emit trusted transport
   evidence from raw-body HMAC verification, capture status/assignee baselines with a pinned
   identity-HMAC key version before Wait, and replace the no-credential re-read slot with a live
   Chatwoot re-read after the merged identifiers-only delay using that same key version. Never connect a webhook directly to
   normalization. Prove a real signed fixture because Chatwoot issue `#13809` may affect the
   displayed HMAC secret; never bypass a failed signature check or use the unsigned Delivery header
   as replay identity.
5. Prove real brand routing, private observation drafts, deduplication, delay cancellation, owner
   intervention, and verified Shopify retrieval. This does not authorize customer-facing replies.
5. Review the four draft products directly in Shopify.
6. Add or approve missing media, inventory, price, collections, SEO, and sales channels.
7. Record owner publication approval, publish in Shopify, and verify storefront and Catalog
   inclusion.
8. Collect the missing commercial-register number, VAT number if applicable, verified phone, and
   complaint-response commitments.
9. Reconcile the live theme source into `main` before further theme-code deployment.
10. Delete the dormant Calapres Supabase credential from n8n only after explicit confirmation.

## Do not do

Do not restore the retired React application, Supabase files, database queue, supplier pipeline, or
old n8n sync code from Git history. Do not treat an external database record as a publication gate.
Do not permanently delete retired external data without a separate instruction naming the exact
project and acknowledging irreversibility.

## Theme delivery — 2026-07-31

- `shopify-theme` @ `65a5388` carries the Calabriz Liquid theme converted from the approved static build; all schema JSON is valid and `shopify theme check` passes with zero errors.
- Next: publish the four draft products (and add the iPad-stand photos) so the storefront renders live data, preview the staging theme, then publish it manually when approved.

## WhatsApp display-name ownership proof — 2026-08-11

- The ownership page is committed and pushed on `main` at
  `daf25f564c063a6f9066a56bf02293a68242bebc` and is deployed from `owner-site/` by GitHub Pages.
- The exact public statement is:
  `كالابريز (Calapres) علامة تجارية مملوكة ومدارة بواسطة مؤسسة عبق الخيل للتجارة.`
- It also includes the literal candidate relationship
  `Calapres by مؤسسة عبق الخيل للتجارة`, the same relationship in English, a link to the official
  Calapres store and email, and Organization/Brand/WebPage structured data.
- Pages deployment run `31469442562` succeeded. GitHub verified ownership of
  `awd-businesses.com`, and the repository Pages configuration uses that custom domain.
- The apex A records and `www` CNAME now point to GitHub Pages. Google Workspace MX, SPF, DKIM,
  Facebook verification, Domain Connect, and GitHub verification records remain intact.
- GitHub completed its DNS check, issued the custom-domain certificate, and HTTPS enforcement is
  enabled. The apex returns the exact published page over HTTPS with status `200`; `www` redirects
  to the apex, and the live response hash matches `owner-site/index.html`.
- Public resolvers point to GitHub. Some local DNS caches may temporarily continue serving the old
  Squarespace page until their previous record expires.
- Meta approved the live display name `Calapres | كالابريز` for the selected Calapres asset. Live
  Graph verification showed WABA `1835160094133742`, phone-number ID `1202498582954919`,
  `CONNECTED`, `CLOUD_API`, `VERIFIED`, and `STANDARD` throughput. Two-step verification is enabled.
- The two-step PIN is stored only in the local macOS Keychain under
  `Meta WhatsApp 2FA PIN - Phone ID 1202498582954919`; never copy it into GitHub or a workflow.
- Chatwoot Cloud account `179973`, existing inbox `128058`, reports the same identifiers, approved
  name, connected phone, and successful webhook configuration.
- A real bidirectional test passed from the owner's phone through Meta and Chatwoot and back to the
  phone; the owner's acknowledgement then arrived in the same Chatwoot conversation.
- Chatwoot template synchronization was initiated successfully. No duplicate account, WABA, phone,
  app, or inbox was created.
- No n8n customer-service bot is active. No file, setting, DNS record, or content for `calapres.com`
  or the live Shopify store was changed.

### Resume action

1. Continue with decisions 0008–0010 and the already-built inactive runtime; do not recreate the
   project, tables, Core, Edge, index, registry, knowledge, style, policy, contracts, or fixtures.
2. The dedicated Chatwoot read credential is bound to existing GET nodes only. Obtain action-time
   owner confirmation for the LLM/HMAC/Shopify read access; until the signed fixture and database
   gates pass, do not create a live webhook.
3. After confirmation, test real Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email
   `128326` events as private observation only; Website `128028` remains outside the allowlist.
4. Keep every automatic customer send disabled until owner review and all end-to-end gates pass.

## Paused catalog investigation

- The official Shopify-synchronized catalog is associated with an old or inaccessible WABA rather
  than the current operational Calapres WABA.
- The owner explicitly paused this topic. Do not delete the official catalog, change its native
  Shopify synchronization, or create a replacement catalog as a shortcut.
