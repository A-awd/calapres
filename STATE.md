Warning: truncated output (original token count: 33774)
Total output lines: 1855

/Users/awd/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew

# Project State

## Six-icon mobile footer published and verified — 2026-08-31

[Canonical base] This bounded footer correction was implemented from a clean worktree at freshly
fetched GitHub `origin/main` commit `2dc41a860118802eed6f85a65588e03c12516d35` and published
after its source reached GitHub `main` commit `199010681eff2f36c252a7412aaedd1189f82717`. The
owner's dirty, diverged checkout and unrelated worktrees were not modified.

[Verified live defect] The public storefront was inspected at a 390 px mobile viewport. The social
column was only 158 px wide while every icon occupied a 44.8 px square with a 12.8 px gap and
wrapping enabled. The four existing icons therefore rendered as two rows. WhatsApp's layout box was
not larger than the others; its glyph only appeared visually larger because it filled more of its
SVG view box.

[Implemented source] Shopify duplicated main theme `165770887424` into theme `165774786816`,
renamed `Preview — six social icons mobile fix`. The footer renders six glyphs in this order:
Instagram, Snapchat, TikTok, WhatsApp, X, and email. The X geometry comes from X's official Brand
Toolkit; the email glyph comes from Shopify Polaris commit
`af6ffb66a5b1d20f6c2c898b334a1ebb53728ba2`. The WhatsApp glyph is optically reduced without
changing its official asset. At mobile widths the social block spans both footer columns and the
six equal interaction boxes are distributed in a single non-wrapping row.

[Verified identities and link boundary] The exact official store email is
`info@calapres.com`, confirmed by the authenticated Shopify store plus the public contact, privacy,
and terms pages. Its icon uses `mailto:info@calapres.com`. No official Calapres X account URL was
found in Shopify, the canonical repository, the public store, or a focused public search, so the X
glyph is deliberately a disabled span rather than a guessed link. The verified Calapres WhatsApp
destination remains exactly `https://wa.me/966508727687`.

[Verified source files] Shopify accepted all five unpublished-theme writes without user errors and
reread the exact persisted bodies. Its returned checksums are:

- `sections/footer.liquid`: `b9ead771d07e6a6fdbc6f86e9fe65bc8`.
- `assets/calabriz.css`: `c5503cec29f1c5c4baf72e1742f6972a`.
- `assets/icon-x.svg`: `f125a682c3f7f612bf66e786e6c94a2a`.
- `assets/icon-email.svg`: `96ca267b44babbccb0f46d74c7de4308`.
- `config/settings_data.json`: `8c265f87b89a1a49c641b842a37a323e`; its API-returned text
  exactly matched the local source and contains the verified WhatsApp and email values with blank X.

[Pre-publication validation] Fresh draft renders at 320 px and 390 px contained exactly six icons with one
shared y-coordinate and a 40 px-high container: one row, no overlap, and no wrap. A 1280 px render
also held all six in one row. WhatsApp and email exposed the exact destinations above, X had no
`href`, and the browser console contained no errors. The Liquid footer schema parses with 16 unique
setting IDs, all changed JSON and SVG parse, the new SVGs contain no script or external reference,
and `git diff --check` passes.

[Owner-authorized publication] The owner explicitly approved publication after the final draft
review. Authenticated Shopify Admin displayed the exact confirmation that publishing
`Preview — six social icons mobile fix` (`165774786816`) would replace
`Preview — official social icons + Safari favico...` (`165770887424`); the confirmation was
accepted and the theme library then showed `165774786816` as `Active`.

[Verified final Shopify roles] A fresh authenticated Admin GraphQL reread identifies
`165774786816` as `MAIN`, not processing, with no processing failure. Theme `165770887424` is now
`UNPUBLISHED` and remains the immediate rollback theme. Both role changes were recorded at
`2026-08-31T13:01:23Z`.

[Verified public result] After explicitly exiting Shopify preview mode, a fresh public storefront
render at 320 px had no preview bar and contained exactly six 40 px interaction boxes on one shared
row. WhatsApp exposed exactly `https://wa.me/966508727687`, email exposed exactly
`mailto:info@calapres.com`, X remained a disabled span without `href`, and the browser console
contained no errors. Instagram, Snapchat, and TikTok also remain disabled because their exact
official account URLs are still unverified.

[Unchanged scope] No product, customer, order, payment, Paymob, shipping, checkout, tax, app,
Captain, n8n, Chatwoot, or Meta setting changed. Do not run
`.github/workflows/theme-deploy.yml`; it still contains obsolete theme-role assumptions and a
noncanonical deployment branch.

## Reconciled four-icon theme published with verified Calapres WhatsApp — 2026-08-31

[Canonical base] This production publication started from a clean worktree at freshly fetched
GitHub `origin/main` commit `212401db65aa090b427ef760bb2827b46879f498`. The owner's dirty,
diverged checkout and unrelated worktrees were not modified.

[Verified WhatsApp identity] Authenticated Chatwoot account `179973`, WhatsApp inbox `128058`,
and its Account Health surface all identify `+966 50 872 7687` as the connected Calapres
Business account. The approved display name is `Calapres | كالابريز`, the phone status is
`Connected`, the quality rating is `GREEN`, and the live phone-number and WABA identifiers
match the canonical project record: `1202498582954919` and `1835160094133742`. The public link
`https://wa.me/966508727687` redirected through WhatsApp to a page headed
`Calapres | كالابريز`. No message was sent.

[Draft-only link update] Before publication, only
`config/settings_data.json` in theme `165770887424` was updated to set
`whatsapp_url` to `https://wa.me/966508727687`. Shopify returned no user errors. The persisted
file is 922 bytes with checksum `d63fd05a769262c4248c65749115c950`, updated
`2026-08-31T11:54:17Z`. A fresh preview render exposed exactly that destination on the WhatsApp
footer link.

[Owner-authorized production publication] Authenticated Shopify Admin displayed the exact
confirmation that publishing `Preview — official social icons + Safari favico...`
(`165770887424`) would replace `Calabris Shopify Theme` (`163004449024`). The owner had
explicitly authorized publication after WhatsApp verification, so the confirmation was accepted.
The theme library then showed the new theme as `Active`.

[Verified final Shopify roles] A fresh authenticated Admin GraphQL reread identifies
`165770887424` as `MAIN`, not processing, with no processing failure. The former main
`163004449024` is now `UNPUBLISHED` and remains the direct rollback theme. Both role changes
were recorded at `2026-08-31T11:56:17Z`.

[Verified public result] After exiting Shopify preview mode, a fresh public storefront render had
no preview bar and exposed the footer WhatsApp link as
`https://wa.me/966508727687`. The public document also emitted the approved Calapres monogram
asset `calapres-favicon-monogram-2026-08-31.png` in its 16 px and 32 px favicon declarations.
The published source contains the four previously approved official black social glyphs:
Instagram, Snapchat, TikTok, and WhatsApp.

[Social-link and SPL boundary] Only WhatsApp is clickable. `instagram_url`, `snapchat_url`, and
`tiktok_url` remain blank, so those three glyphs remain visible disabled spans until their exact
official account URLs are separately verified. The Saudi Post/SPL helper continues to use
`966112898888` only for the explicitly labelled national-address assistance link in the cart; it
was not reused as Calapres's WhatsApp identity.

[Unchanged scope] No product, variant, inventory, collection, customer, order, discount, payment,
Paymob, shipping, checkout, tax, app, Captain, n8n, Chatwoot, or Meta setting changed. The
Chatwoot/Meta surfaces were read only, no WhatsApp conversation was started, and no customer
message was sent. Do not run `.github/workflows/theme-deploy.yml`; it still contains obsolete
theme-role assumptions and a noncanonical deployment branch.

Canonical decision:
[0024 — Publish the reconciled Calapres theme with a verified WhatsApp destination](decisions/0024-publish-reconciled-theme-with-verified-whatsapp.md).

## Official social icons and Calapres Safari favicon ready in preview — 2026-08-31

[Canonical base] This bounded theme-reconciliation stage started from a clean worktree at freshly
fetched GitHub `origin/main` commit `a774056dbaf5105366ab9e938e3dec4ec5764f4b`. The owner's
dirty, diverged repository checkout and unrelated worktrees were not modified.

[Verified Shopify roles] Authenticated Shopify Admin GraphQL identifies `Calabris Shopify Theme`
(`163004449024`) as `MAIN` and `Preview — official social icons + Safari favico...`
(`165770887424`) as `UNPUBLISHED`. The preview is not processing and has no processing failure.

[Owner-approved preview and executed draft-only refinement] The owner approved the preview's clean
black Instagram, Snapchat, and TikTok glyphs and requested a matching WhatsApp glyph. Only the
unpublished preview was changed. `assets/icon-whatsapp.svg` is the unmodified black digital glyph
from Meta's 2026 WhatsApp Brand Resource Center pack; its SHA-256 is
`dea0d50de5d2e53320246d7172a2b8e84a999caa7798cd91681e63831cba6ed9`.
`sections/footer.liquid` now renders WhatsApp using the same accessible linked-or-disabled pattern
as the other three services and defines one unique `whatsapp_url` setting. Shopify returned no
user errors. The verified preview checksums are:

- `assets/icon-whatsapp.svg`: `effe39ee446c06d7b3fc63450e694123`.
- `sections/footer.liquid`: `a871f19bfbd8d4b45496eb525b66b777`.
- `layout/password.liquid`: `4dafdfa6e8d9d00cf29310561465ec14`.

The final review also found that the dormant password layout still embedded the former circle-and-dot
favicon. It now uses the same configured Calapres monogram, 16 px and 32 px favicon declarations,
and 180 px Apple touch icon as the storefront layout. Shopify accepted that unpublished-theme update
without user errors. This prevents the obsolete symbol from returning if password protection is
enabled later.

[Verified preview result] A fresh preview render contained exactly four social items labelled
Instagram, Snapchat, TikTok, and WhatsApp, each with its own theme asset. A visual check showed one
balanced monochrome row. The preview also continues to emit the approved square Calapres monogram
as 16 px and 32 px favicons plus a 180 px Apple touch icon. The active public theme still emits the
older favicon and older hand-drawn footer artwork because no live publication occurred.

[Social-link boundary] `instagram_url`, `snapchat_url`, `tiktok_url`, and `whatsapp_url` are blank,
so all four glyphs are decorative disabled spans rather than clickable account links. No public
Calapres WhatsApp destination was found and the private operational number remains intentionally
redacted. The Saudi Post/SPL destination `966112898888` was not reused.

[GitHub reconciliation] The exact 62-file unpublished preview source was read through authenticated
Shopify Admin GraphQL into the clean worktree. Every non-JSON file matched Shopify's reported MD5,
including the final password-layout correction;
the JSON bodies were parsed successfully from the API-returned source. The obsolete, conflicting
47-file storefront prototype from the prior `main` tree was replaced only inside this clean
worktree so GitHub can represent the actual approved Calabriz theme instead of a hybrid. All 16
Liquid section schemas have unique setting IDs and block types, all repository JSON parsed, the
WhatsApp asset contains no scripts or external references, and `git diff --check` passed. Shopify
CLI `4.7.0` Theme Check completed with no errors; it reported only six existing `RemoteAsset`
warnings for the Cairo Google Fonts links in the storefront and password layouts.

[Live and deployment boundary] No active-theme file, product, customer, order, payment, shipping,
checkout, app, Captain, Chatwoot, n8n, or Meta configuration changed in this stage. Do not run
`.github/workflows/theme-deploy.yml`: it still assigns the known theme IDs incorrectly and deploys
the obsolete noncanonical `shopify-theme` branch. Live publication is a separate production step
after the owner views the final four-icon preview and explicitly authorizes publication.

## Separate required email and shipping-phone fields live — 2026-08-31

[Canonical base] This bounded checkout-setting stage started from a clean worktree at freshly
fetched GitHub `origin/main` commit `1d71ecb833c08aedaeb9e5bbd4863cf2b6df9baf`. The owner's
dirty, diverged repository checkout and unrelated worktrees were not modified.

[Owner-approved and executed live] In authenticated Shopify Checkout settings, Customer contact
method changed from `Phone number or email` to `Email`, and Shipping address phone number changed
from `Don't include` to `Required`. Shopify displayed `Settings saved`. A full Admin reload then
reread `Email` selected and `Required` for the shipping phone, proving that both values persisted.

[Verified customer-facing result] A fresh checkout from the existing cart with one physical
product displayed two separate Arabic fields: `البريد الإلكتروني` under Contact and `الهاتف`
under Delivery. The rendered email control was `type=email`, `required=true`, and
`aria-required=true`; the phone control was `type=tel`, `required=true`, and
`aria-required=true`. The session retained the browser's existing unpublished preview-theme
parameter, but these requirements are shop-level Checkout settings rather than theme fields.

[Boundary] The required phone is Shopify's native shipping-address phone field. It applies when a
checkout collects a shipping address; Shopify does not prove that the entered number is mobile or
SMS-capable, and requiring it does not create marketing consent. Guest checkout and the existing
marketing opt-in configuration were preserved.

[Unchanged scope] No contact data, address data, card data, customer, order, payment, discount,
shipping rate, payment-provider setting, theme file, or app changed. `Pay now` was not pressed;
Paymob remains untouched and test-only. This section supersedes only the older dated statements
that no Checkout setting apart from address wording had changed.

Canonical decision:
[0022 — Adopt a low-friction Shopify checkout with the live Calapres identity](decisions/0022-adopt-low-friction-shopify-checkout.md).

## Branded footer icons live; checkout-friction boundaries verified — 2026-08-30

[Canonical and live base] This bounded follow-up started from a clean worktree at freshly fetched
GitHub `origin/main` commit `c008947e21d927329dff1bb4b41ab3f0604fc183`. Shopify remains on
the Basic plan. The active MAIN theme is `Calabris Shopify Theme` (`163004449024`). The owner's
dirty, diverged repository checkout, the preserved storefront prototype, and unrelated worktrees
were not modified.

[Verified rollback snapshot] Before the footer mutation, Shopify created unpublished draft theme
`Backup before social icons 2026-08-30` (`165747851520`). In that snapshot,
`sections/footer.liquid` had checksum `0ddff0f3df2da32eb52dfb3a26591e9b` and
`assets/calabriz.css` had checksum `01908b01ff2616099da2d1656f2147c7`. Leave the draft
unpublished. It predates the later checkout-address language save, so it must not be published as a
whole-store rollback.

[Owner-approved and executed live footer change] Only `sections/footer.liquid` and
`assets/calabriz.css` changed in the active theme. The square frames and backgrounds were removed,
the social icons were enlarged, and their natural brand treatments were applied: the Instagram
gradient, Snapchat yellow and black, and TikTok black, cyan, and red. A fresh public desktop visual
check passed, and the rendered DOM contained one each of the new Instagram, Snapchat, and TikTok
icons. The active-theme reread returned:

- `sections/footer.liquid`: checksum `fcbf12d5636339dbc91e67fd64d249b4`, updated
  `2026-08-30T14:03:49Z`.
- `assets/calabriz.css`: checksum `de2d9c3dab282a01c09175bc2d8e2fa3`, updated
  `2026-08-30T14:04:21Z`.

[Social-account boundary] The active settings `instagram_url`, `snapchat_url`, and `tiktok_url`
are still blank. The three branded icons therefore render as decorative disabled spans, not
clickable account links. No account URL was guessed or invented. A separate owner-supplied URL
stage is required before making any icon clickable.

[Owner-approved and executed checkout wording] The Address line 1 checkout text was saved as the
exact string `( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )`, including one space
inside each parenthesis. A full Admin reload and the existing public checkout reread showed the same
value.
This is guidance for Shopify address autocompletion, not proof of a direct Saudi National Address
integration.

[Verified checkout-friction boundaries; unchanged] Apple Pay and card ordering was not changed.
Shopify controls native wallet presentation, does not permit merchants to reorder Apple Pay ahead
of the card method, and displays accelerated wallets according to device and eligibility. Shipping
configuration was also left untouched: rates appear only after Shopify has an applicable delivery
address, and the observed session already held a valid restored address, which is why its applicable
rate was immediately visible. The marketing opt-in checkbox remains enabled; hiding it would not
turn an entered email into valid marketing consent, and a Shopify customer record is not the same
as a marketing subscription. Paymob remains test-only.

[Unchanged scope] No payment setting, provider credential, shipping zone, rate, threshold,
carrier, fulfillment setting, marketing-consent setting, customer, order, product, discount,
privacy setting, Captain, Chatwoot, n8n, or Meta setting changed. Apart from the exact address text,
no checkout configuration changed. Apart from the two named footer files, no active-theme file
changed.

[Current theme deployment risk] The live MAIN theme is `163004449024`, but
`.github/workflows/theme-deploy.yml` currently labels that same ID as staging and labels
`163072377088` as live. The workflow also deploys the separate `shopify-theme` branch while the
exact live source remains unreconciled. Do not trigger it or deploy the local prototype. First pull
and reconcile the live MAIN source, verify both theme roles in Shopify, correct the workflow in a
separate reviewed code stage, deploy only to an unpublished preview theme, and stop before live
publication.

[Rollback and stop] If the footer change is explicitly rejected, restore only
`sections/footer.liquid` and `assets/calabriz.css` from draft `165747851520`, then verify the public
footer. Do not publish the full backup because the checkout-address language changed after the
draft was duplicated. The bounded footer and address-label stage is complete. The next separate
input for social links is the owner's exact official account URLs; the next payment blocker remains
Paymob live-onboarding and settlement-readiness verification.

Detailed same-conversation continuation:
[Shopify checkout polish and payment-readiness handoff](docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md).

## SPL WhatsApp address helper live in cart and cart drawer — 2026-08-30

[Canonical base] This bounded live-theme stage started from a clean worktree at freshly fetched
GitHub `origin/main` commit `a5ca00aaad4293039870fa642d86d8a13b63d364`. The owner's dirty,
diverged repository checkout and the preserved storefront prototype were not modified.

[Refinement documentation base] The later copy, styling, and WhatsApp-prefill refinement was
documented from freshly fetched `origin/main` commit
`3a9f2b2f0f6b22cf8820be86ec97932412125704` in a new clean worktree.

[Compact-mobile documentation base] The final compact-mobile refinement was documented from
freshly fetched `origin/main` commit `e8f9392136fb6a08e271b1605f993ec48583fa71` in another new
clean worktree. The owner's dirty checkout and all unrelated worktrees remained untouched.

[Placement boundary] The helper is outside Shopify checkout. It appears in the storefront cart
page and cart drawer immediately before the customer continues to checkout. It does not add a
block, field, or link inside Shopify's information, shipping, or payment steps and therefore does
not claim non-Plus checkout extensibility.

[Verified official platform boundary] Shopify's current checkout extensibility boundary requires
Shopify Plus for custom text or links inside the Information, Shipping, or Payment steps. Grow and
Advanced do not unlock that placement. Even on Plus, customization uses constrained Checkout
Blocks or Checkout UI extensions; it is not arbitrary `checkout.liquid` or checkout-DOM access.
The current helper remains in the theme-controlled cart before checkout.

[Verified rollback snapshot] Before changing the active theme files, Shopify created draft theme
`Copy of Calabris Shopify Theme` (`165745590528`). It remains a draft rollback snapshot and was not
published. No new backup was created for the later refinement, so this existing draft rolls the
store back to no helper; it does not preserve the first helper wording or styling.

[Historical first implementation] Active MAIN theme `Calabris Shopify Theme` (`163004449024`)
was initially updated in exactly two files: `sections/main-cart.liquid` and
`snippets/cart-drawer.liquid`. Both initially exposed the same helper text and destination:

- `لا تعرف عنوانك الوطني؟ اعرفه عبر واتساب سبل ↗`
- `https://wa.me/966112898888`

Both saves returned no Shopify `userErrors`. A live reread returned checksum
`25e3b71a777a7c7ce6a485d4e9de3ef3` for `sections/main-cart.liquid`, updated
`2026-08-30T12:18:00Z`, and checksum `9359f95fc0280449d108ae8d77db6866` for
`snippets/cart-drawer.liquid`, updated `2026-08-30T12:19:40Z`. The reread also confirmed that the
edited theme still has role `MAIN`. These first-stage copy, destination, checksums, and timestamps
are historical and superseded for the current live state by the refinement below.

[Historical first public result] Fresh public checks found the exact visible Arabic text and exact
`https://wa.me/966112898888` destination in both the opened cart drawer and `/cart`. This proves
the pre-checkout helper is live on both cart surfaces. It does not prove a WhatsApp conversation,
identity lookup, National Address retrieval, or the customer's return to checkout. The first-stage
copy and bare destination are superseded for the current live presentation by the refinement below.

[Historical oversized refinement] The same two files in active MAIN theme `Calabris Shopify Theme`
(`163004449024`) were first refined without changing the placement. They used two text elements:

- `لتسهيل شحنتك، أضف عنوانك الوطني المختصر في صفحة الدفع.`
- `وإذا لم تعرف عنوانك الوطني المختصر، اعرفه عبر واتساب سبل ↗`

Their destination was
`https://wa.me/966112898888?text=%D8%A7%D9%84%D8%B9%D9%86%D9%88%D8%A7%D9%86%20%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A`.
The helper used a larger card and larger message/action typography. At a 390 by 844 mobile viewport,
the two elements wrapped across four visual lines. The owner rejected that presentation as too large;
this wording, styling, and visual result are historical and superseded by the compact refinement below.

[Historical oversized reread] Both saves returned no Shopify `userErrors`. The active-theme reread
returned checksum `638f3a262b38a416173ee800b24d78d0` for `sections/main-cart.liquid`, updated
`2026-08-30T12:37:49Z`, and checksum `54e7676f665af8df44b1c2fc49436d5b` for
`snippets/cart-drawer.liquid`, updated `2026-08-30T12:39:07Z`. These checksums are superseded and
must not be treated as the current live files.

[Owner-approved and executed compact-mobile refinement] Only the same two theme files were refined.
The current live helper now shows exactly these two visual lines:

- `لتسهيل شحنتك، أضف عنوانك المختصر في صفحة الدفع.`
- `لا تعرف عنوانك المختصر؟ اعرفه عبر واتساب سبل ↗`

The WhatsApp destination is unchanged:
`https://wa.me/966112898888?text=%D8%A7%D9%84%D8%B9%D9%86%D9%88%D8%A7%D9%86%20%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A`.
It opens WhatsApp with the decoded draft `العنوان الوطني`; the customer must still press Send.
The mobile typography, spacing, and padding are compact enough to preserve one visual line per
sentence instead of the rejected four-line presentation.

[Verified current live reread] The active MAIN theme reread returned checksum
`18a9fab56106ebefe4a2479ae12bf5f7` for `sections/main-cart.liquid`, updated
`2026-08-30T12:52:52Z`, and checksum `842f3966eaec4a2280b5d811774c5cb9` for
`snippets/cart-drawer.liquid`, updated `2026-08-30T12:53:19Z`. The theme retained role `MAIN`.

[Verified compact public result] Visual checks at a 390 by 844 mobile viewport confirmed exactly
two lines with no wrapping on both `/cart` and the opened cart drawer. A narrower 320 by 700 check
also showed both sentences without wrapping, although the fit is intentionally very tight. This
does not prove that the customer pressed Send, received an SPL reply, retrieved an address, or
returned to checkout.

[Unchanged live scope] No checkout setting, payment provider, shipping setting, or product changed.
No other system was included in this bounded mutation. The link opens WhatsApp; it is not a direct
SPL API integration and does not automatically disclose or retrieve a National Address.

[Unreconciled source] The exact live theme source is still ahead of and different from canonical
GitHub theme files. This documentation records the verified Shopify mutation but does not pretend
that `main` now contains the two live Liquid files. The next separate theme-code stage must pull
and reconcile the exact MAIN theme into a clean reviewed branch before any repository-led theme
deployment. Do not overwrite the active theme from the stale local theme surface.

[Stop and rollback] The bounded helper-link stage is complete. If rollback is explicitly
requested, restore only the two changed files from draft theme `165745590528` to the active MAIN
theme and verify the helper is absent from both public cart surfaces. That draft removes the helper
entirely; it does not restore the first helper version or the superseded oversized refinement. Do
not publish the backup theme or alter checkout, payment, shipping, or products during rollback.

Canonical decision:
[0022 — Adopt a low-friction Shopify checkout with the live Calapres identity](decisions/0022-adopt-low-friction-shopify-checkout.md).

## Saudi customer VAT collection set to zero pending obligation review — 2026-08-30

[Canonical base] This bounded tax stage started from clean GitHub `origin/main` commit
`cad21a8f16b644d2bb98a6df20d4626200d00604`. The preserved storefront prototype and the owner's
dirty, diverged repository checkout were not modified.

[Owner statement and execution boundary] The owner stated that Calapres has no Saudi VAT
registration and instructed that checkout must not add VAT. This statement was accepted as the
business input for the Shopify configuration change; Calapres revenue, forecast taxable supplies,
and ZATCA registration status were not independently audited. A zero Shopify collection rate does
not classify the burner as a legally zero-rated supply.

[Verified Shopify sales boundary] A read-only Shopify analytics query for 2025-08-30 through
2026-08-30 returned zero orders, gross sales, net sales, taxes, and total sales. This covers the
connected Shopify store only; it does not establish entity-wide taxable supplies, sales outside
Shopify, or the expected next-12-month test.

[Verified live before change] Saudi Arabia used active Manual Tax with a 15% country base rate.
Shop-level reads and Admin controls showed tax-inclusive pricing off and tax on shipping off. The
Saudi override list was empty, and duties and import taxes had not been set up.

[Owner-approved and executed live] Only the Saudi country base tax rate was changed from 15% to
0%. Shopify displayed a successful-save notice. After a full Admin reload, the Saudi Manual Tax
page reread the country rate as 0%. Product price, shipping settings, payment settings, Shopify
billing tax information, and all other regional tax settings were untouched.

[Verified checkout result] A fresh guest checkout with one live 390 SAR burner and a synthetic,
non-personal Saudi test address displayed `التوصيل داخل السعودية` as free, no estimated-tax or tax
line, and a 390 SAR total. No card data was entered and no order or payment was submitted. The
owner's earlier open checkout reportedly showed 10 SAR shipping, but the fresh test did not
reproduce that amount; no shipping setting was changed in this tax stage.

[Compliance boundary] ZATCA currently describes mandatory registration above 375,000 SAR in
taxable supplies over the applicable 12-month test and voluntary eligibility above 187,500 SAR in
taxable supplies or expenses, subject to forecasts and special cases. This record makes no legal
determination that Calapres is below those thresholds. Promptly establish the prior- and
next-12-month position across the entity. Reopen immediately if registration or collection is
already required, becomes required, or a VAT registration takes effect, and configure collection
and invoicing from the effective date advised by ZATCA or a licensed Saudi tax professional.

[Stop] The zero-collection checkout stage is complete as a temporary protective configuration
based on the owner's no-registration statement and the store's zero Shopify sales history. The
current entity-wide threshold position is still unknown: promptly confirm taxable supplies outside
Shopify for the prior 12 months and the expected next 12 months. Do not enter a Shopify billing Tax
ID, describe the products as zero-rated, issue VAT invoices, or restore 15% without a verified
registration or separate professional instruction.

Canonical decision:
[0023 — Set Saudi VAT collection to zero pending obligation review](decisions/0023-set-saudi-vat-collection-zero-pending-review.md).

Detailed continuation:
[Shopify Saudi VAT zero-collection handoff](docs/handoffs/2026-08-30-shopify-saudi-vat-zero-collection.md).

## Historical checkout address guidance; later wording recorded above — 2026-08-30

[Canonical base] This bounded follow-up started from clean GitHub `origin/main` commit
`76788b86ff464efd1b883112cc99e1adb449eac0`. The preserved storefront prototype and the owner's
dirty, diverged repository checkout were not modified.

[Historical owner-approved execution] At this stage, the checkout Address line 1 label was
`ابحث عن عنوانك (أدخل عنوانك الوطني لتسهيل البحث)`. Shopify enabled Save after the edit; after
Save and a full Admin reload, the same exact value was reread from the language editor. That value
has since been superseded by the exact current wording recorded in the newest state section above.
Both strings are customer guidance for Shopify address autocompletion, not evidence of a direct
Saudi National Address integration.

[Verified live, read-only shipping boundary] Shopify already withholds delivery rates until the
customer supplies a delivery address, then shows only rates applicable to that address and order.
The current profile has one Saudi Arabia zone and no Gulf zone. Its two identically named manual
rates are price tiers, not two shipping companies: 25 SAR from 0 through 319.99 SAR and free from
320 SAR, so their existing subtotal conditions are mutually exclusive for a single-profile cart.
The live plan is Basic. Manual country zones and fixed rates can be added on that plan, but
third-party carrier-calculated rates are unavailable on Basic. No zone, rate, condition, carrier,
app, location, or fulfillment setting changed in this follow-up.

[Verified platform and browser boundaries] Shopify's branded Apple Pay button cannot be recolored
to Calapres brown, so it remains native. A fresh public storefront document still returned the
owner-selected PNG favicon from Shopify CDN. The document has no `apple-touch-icon` or web-app
manifest, and the owner's existing Safari profile reportedly still displays an older icon. That
display is not claimed fixed: Safari can retain an older favicon, its Page Menu control is browser
chrome, and a Home Screen icon is a separate asset path. No live theme code changed.

[Stop] The bounded address-label mutation is complete. A future Gulf-shipping stage requires the
owner's exact destination countries, fixed fees or free-shipping thresholds, delivery estimates,
and whether the options are manual labels or real carrier-calculated services. Do not invent those
commercial inputs or change the existing Saudi rates while deciding them.

Canonical decision:
[0022 — Adopt a low-friction Shopify checkout with the live Calapres identity](decisions/0022-adopt-low-friction-shopify-checkout.md).

Detailed continuation:
[Shopify checkout polish and payment-readiness handoff](docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md).

## Checkout branded; shipping labels clarified; Paymob still test-only — 2026-08-30

[Canonical base] This bounded live checkout stage started from clean GitHub `origin/main` commit
`d4abddd4fb907d423b7f46aeb52b1a4349a48015`. The preserved local storefront prototype was not
modified or deployed. Before documenting the later logo, favicon, and shipping-label follow-up,
GitHub `origin/main` was freshly fetched and verified at
`3a66851a2a6225481207f506be0868d2c2bda6e3`.

[Owner-approved and executed live] Temporary code `QXMRK` was saved at 99% with one total use,
one use per customer, no minimum, and no combinations. Checkout now requires first and last name
while forced sign-in remains off. Arabic overrides were saved for address search
(`ابحث عن عنوانك`), payment action (`ادفع الآن`), and the accurate security notice
(`جميع عمليات الدفع آمنة ومشفّرة.`).

[Verified saved presentation] The active checkout configuration was saved with Almarai for
headings and body and `#1B262D` for the primary accent and button. White backgrounds, one-page
checkout, address autocompletion, buy-again, native card logos, and native security structure were
preserved. In a later owner-approved follow-up, the owner visually selected the existing Calapres
seal asset as the checkout logo. Shopify persisted it centered at 100 px; a full editor reload and
the checkout preview reread the same Shopify CDN image, width, and alignment. The same exact asset
was saved as the active theme favicon. A fresh public storefront document then returned the PNG
from Shopify CDN instead of the temporary inline fallback icon. Safari's page-control button beside
the address bar is browser chrome and was not changed.

[Payment boundary] Paymob remains active in test mode. Visa, Mastercard, American Express, and
Apple Pay are enabled, but Shopify states that all transactions are simulated and customers cannot
make real purchases in this mode. No real card, OTP, order, charge, capture, refund, payout, or
settlement was tested or changed.

[Shipping label execution and carrier boundary] Both domestic manual rate labels were changed from
`قياسي` to `التوصيل داخل السعودية`. The paid rate remained 25 SAR for orders from 0 through
319.99 SAR, and the free rate remained available from 320 SAR. Shopify displayed `Profile updated`
after each final profile save, and a final reread showed both new labels with the same prices and
thresholds. The profile still uses one normal location named `SMSA Retail Shop`; that name does not
prove a fulfillment service or SMSA integration. `Carrier accounts` shows `None`, no carrier
service is configured or available, OTO/Torod/SIDEUP are not installed, and no Fastlo app handle is
present. The preserved owner preference is Fastlo where covered through one approved multi-carrier
gateway plus a backup, but no provider has been selected, installed, paid, connected, or tested.

[Stop] Checkout polish is complete. The next separate stage is Paymob live-onboarding and
settlement-readiness verification before turning off test mode or entering a real card. Additional
Basic-plan checkout opportunities were documented but not executed.

Canonical decision:
[0022 — Adopt a low-friction Shopify checkout with the live Calapres identity](decisions/0022-adopt-low-friction-shopify-checkout.md).

Detailed continuation:
[Shopify checkout polish and payment-readiness handoff](docs/handoffs/2026-08-30-shopify-checkout-polish-and-payment-readiness.md).

## Saudi Arabia removed from Shopify cookie-banner regions — 2026-08-29

[Canonical base] This bounded live-settings stage started from clean GitHub `origin/main` commit
`38a28429f749eda9d66142d0e7d568ddcc685408`. The owner's dirty, diverged checkout and the local
storefront prototype worktree were not modified or staged.

[Owner-approved and executed live] In authenticated Shopify Admin, Customer Privacy was using
manual regions with automated settings off. The cookie-banner region editor showed 32 of 299
regions selected: Saudi Arabia as the only selected Asian region and 31 selected European
recommended regions. Only Saudi Arabia was unchecked. `Done` was selected and the enabled `Save`
action was submitted; the save action then disappeared.

[Verified persisted in Shopify] After a full admin reload, the region summary read Austria,
Belgium, and 29 other regions. Reopening the editor showed 31 of 299 selected and Europe 31 of 31
on the Recommended tab, including the United Kingdom. No Asian region remained selected. This is
server-reread evidence that the Saudi-only delta persisted while the configured European and UK
regions remained intact.

[Observed post-save Saudi storefront context] A newly opened public `calapres.com` page rendered
Arabic, SAR, and an inline Shopify country value of `SA`. Shopify's native privacy-banner and
consent-tracking scripts still loaded, but no visible cookie-banner heading, consent buttons, or
preference control was present. This is consistent with the saved Saudi exclusion, but it is not
an independent clean-visitor proof because the browser profile's prior consent state was not
inspected or reset.

[UK verification boundary] A direct storefront attempt with `?country=GB` remained in the Saudi
context (`SA` and SAR), so it is not claimed as a live UK geolocation test. UK retention is
verified only from the post-save authenticated Admin configuration reread, not from the banner
preview or a simulated UK network location.

[No other live change] Banner content, color, position, checkout display, automated-settings
choice, privacy policy, theme code, pixels, Customer Events, Shopify products, Captain, Chatwoot,
n8n, Meta, redirects, and customer conversations were not changed. No per-pixel consent behavior
was measured and no legal conclusion was made.

[Stop] The owner-approved Admin mutation and its post-reload persistence verification are
complete. A clean-visitor Saudi presentation and a live UK presentation were not independently
verified in this session. Stop without expanding the privacy scope. The next separate design
action remains owner visual review of the preserved mobile prototype. Do not translate or deploy
it until that review.

Detailed continuation:
[Shopify cookie-banner Saudi-region removal](docs/handoffs/2026-08-29-shopify-cookie-banner-saudi-region-removal.md).

## Storefront prototype local; Shopify privacy diagnosis complete — 2026-08-29

[Canonical base] This documentation-only closeout started from clean GitHub `origin/main` commit
`922e22263ca0a18d176b0f2a4abc26cd9d67cd87`. The dirty, diverged owner checkout and its unrelated
duplicate files were not modified or staged.

[Prepared only] A mobile-first Calapres storefront prototype based on the owner's preferred FRAMA
reference exists in local worktree
`/Users/awd/Documents/calapres/worktrees/storefront-hero-prototype-20260829`, branch
`codex/storefront-hero-prototype-20260829`. Its visual comparisons, mobile-menu interaction,
production build, and four worker tests passed. The prototype remains untracked, uncommitted, not
approved for production, not translated into the Shopify Liquid theme, and not deployed. No live
theme or Shopify storefront setting changed.

[Verified live, read-only] `calapres.com` currently loads Shopify's native
`/cdn/shopifycloud/privacy-banner/storefront-banner.js`. Storefront consent data reports the banner
enabled in the full-width bottom position and explicitly includes Saudi Arabia in its region list.
The canonical theme directories contain no banner implementation. The live privacy policy is
predominantly English while the storefront and banner are Arabic.

[Verified MCP boundary] The connected Shopify MCP lacked the privacy-read scope during this
conversation. Schema inspection showed a global cookie-banner disable capability but no safe
region-specific mutation. Therefore the current MCP cannot execute the desired Saudi-only change.
Theme CSS is also the wrong layer because hiding the visible banner does not change Shopify's
consent state.

[Owner preference, not executed] The owner prefers the banner not to appear to Saudi customers and
prioritizes Saudi marketing measurement. The narrow discussed path is a future Shopify Admin stage
that removes only Saudi Arabia from the banner regions while preserving the configured EEA and UK
regions. No legal review was completed, no consent or pixel behavior was changed, and no claim is
made that a future save succeeded.

[No live change in this phase] Captain, Chatwoot, n8n, Meta, Shopify products, Customer Privacy
settings, analytics pixels, the live theme, customer conversations, and the three native product
redirects were all untouched during the storefront-and-privacy work recorded here.

[Immediate next action] Stop for owner review. If explicitly reopened, execute only the bounded
Saudi-region Customer Privacy change through Shopify Admin, verify Saudi absence and EEA/UK
presence, document the exact result, and stop. Keep the separate storefront-design continuation to
mobile visual review; do not combine it with privacy execution.

Detailed continuation:
[Storefront prototype and Shopify privacy handoff](docs/handoffs/2026-08-29-storefront-prototype-and-shopify-privacy.md).

## Shopify-native short product links accepted in Playground — 2026-08-28

[Canonical base] This bounded stage started from clean GitHub `origin/main` commit
`e1188212d6361c852778c88e1eff54dbf37d3226`. The owner's dirty, diverged checkout and its unrelated
untracked files were not modified or staged.

[Owner-approved and executed in Shopify] Exactly three first-party URL redirects now exist:
`/p/white`, `/p/beige`, and `/p/gray`. They point respectively to the canonical white, beige, and
gray Calapres burner product paths. Each short URL returned HTTP `301` to its exact canonical
target, and following each redirect reached an HTTP `200` product page. No third-party shortener,
product-handle change, price, inventory, order, customer, or other Shopify write was introduced.

[Owner-approved and executed in n8n] Product-link workflow `8jtjLu261ZzcipGq` still contains five
linear nodes with the same tool, endpoint, request validation, Shopify read, credentials, and safe
response envelope. Only `Shape Safe Product Link Result` changed: an exact safe canonical product
URL now maps to one of the three exact allow-listed URLs on `calapres.com`. Seven local test cases
passed. The workflow was published with version name `روابط شوبيفاي المختصرة الأصلية` and
description `إرجاع روابط شوبيفاي المختصرة الأصلية`.

[Verified acceptance after transient interruption] The first fresh Playground prompt,
`أبغى أطلب المبخرة البيضاء`, returned safe technical-unavailable wording while both the n8n host
and production webhook independently returned HTTP `503`; n8n Cloud displayed the instance state
`In progress`. The host and webhook later recovered to HTTP `200`. One retry with the same prompt
returned the exact public title `مبخرة كالابريز الفاخرة — الأبيض` followed by exactly
`https://calapres.com/p/white`, with no price, availability, inventory, discount, previous-price,
or bundle-content claim. This accepts the bounded Playground path. Physical WhatsApp visibility
and delivery on every external channel remain unverified.

[Verified protected state] Captain remains the only customer-facing responder. Its assistant,
inboxes, Audience, Schedule, knowledge, two response guidelines, inactivity behavior, two tools,
assignment automation, and customer conversations were not changed. Meta WhatsApp settings were
not touched. The order bridge remains unchanged and its separate authorization-rotation stage is
still pending. Responder `kAyF0D3ZZHxc0Hwp` remains unpublished.

[Read-only Chatwoot finding; proposal only] The account currently has zero labels, zero custom
attributes, and exactly one unchanged conversation-created assignment automation. No
classification or report configuration was created. A future design should separate contact
purchase status, conversation result, operational labels, and saved filters. Text such as
`شكراً لطلبك` may indicate only `يحتاج تحقق`; a real Shopify order match is required for
`طلب موثق`. The independently removable bridge
`كالابريز | تصنيف العملاء حسب طلبات شوبيفاي` is proposed only and is not approved or executed.

[Stop] The native short-link stage is complete and stopped for owner review. Do not send a
customer-channel proof, implement the reporting proposal, or combine either with the pending
order-bridge authorization rotation without a separately bounded instruction.

Canonical decision:
[0021 — Adopt Shopify-native short product links for Captain](decisions/0021-adopt-shopify-native-short-product-links.md).
Exact baseline:
[Calapres Captain v1.3 — Shopify-native short product links](docs/baselines/2026-08-28-calapres-captain-v1.3-shopify-native-short-links.md).
Detailed continuation:
[Captain native short links and Chatwoot reporting handoff](docs/handoffs/2026-08-28-captain-native-short-links-and-chatwoot-reporting.md).

## Captain generated replies in Chatwoot; WhatsApp-client visibility unconfirmed — 2026-08-28

[Verified live in authenticated Chatwoot] A fresh owner-originated WhatsApp message reached the
same test conversation after its `Open` to `Pending` recovery. Captain generated a concise
two-sentence redirect for an external car-link request in the same minute. After the owner replied
with the beige color, Captain returned one short response containing only the expected product
title and the canonical beige Calapres product URL.

[Verified Captain tool selection] The generation trace for the beige reply explicitly recorded a
tool call with product query `البيج`. Both outbound messages were labeled `Generated by Captain`.
The final message displayed the double-check status icon, whose live tooltip read
`تم الإرسال بنجاح`. This proves fresh-message Captain eligibility, Captain generation,
product-link tool selection, and the Chatwoot-side status label in a real WhatsApp conversation.
It does not by itself prove physical display in the owner's WhatsApp client.

[Owner-reported and unresolved] The owner reported that no reply was visible when they checked
WhatsApp. The authenticated Chatwoot evidence contradicts a claim that Captain produced no reply,
but customer-side visibility remains unconfirmed. The n8n MCP could not expose workflow
`8jtjLu261ZzcipGq` because MCP access is not enabled for that workflow, so no matching n8n
execution is claimed from this check.

[No live change] This verification was read-only. No conversation status, assistant setting,
inbox, automation, guideline, knowledge, tool, workflow, Shopify record, or Meta setting changed.
Do not repeat the prior routing repair or redesign either bridge. The next evidence boundary is the
physical WhatsApp client: confirm whether the two Captain replies become visible there; if not,
diagnose only the outbound channel-delivery layer while preserving the current Captain and bridge
configuration.

## Captain WhatsApp handoff-routing incident isolated; fresh-message proof pending — 2026-08-27

[Verified live] The owner's latest WhatsApp test message reached the existing Chatwoot
conversation, so channel ingress was working. The conversation had previously been handed off by
Captain and marked `Open`, leaving the new inbound message on the human path. Captain did not
invoke the product-link tool, and n8n showed no product-link execution at or after that message.
This was a conversation-state routing condition, not evidence that WhatsApp, Captain, or either
Shopify bridge was destroyed.

[Verified protected state] `Calapres Assistant` (`2187`) remained connected to WhatsApp `128058`,
Instagram `128031`, and TikTok `128033`; Audience remained `Everyone`; Schedule remained
`Anytime`; the inactivity action remained `Wait for the customer`; and the old responder
`kAyF0D3ZZHxc0Hwp` remained unpublished. No assistant, inbox, automation, guideline, knowledge,
tool, workflow, Shopify record, or Meta setting was changed during diagnosis.

[Executed bounded recovery] Only the affected owner test conversation was changed from `Open` to
`Pending`, returning it to the bot queue. Chatwoot confirmed the new pending state. Captain did not
retroactively answer the inbound message that had arrived before this state change during the
subsequent observation window.

[Pending evidence] One fresh owner-originated WhatsApp message is required after the pending-state
recovery. Success means a physically visible Captain reply in WhatsApp and, for a product-link
request, a matching new execution of workflow `8jtjLu261ZzcipGq`. Until both relevant observations
exist, external-channel product-link delivery remains unverified. Do not send a manual Chatwoot
reply, alter global routing, or reopen either bridge while collecting this proof.

## Captain product-link bridge accepted in Playground; owner-review stop — 2026-08-27

[Owner-approved and executed] Captain has exactly two independently removable custom tools. The
existing `Calapres Shopify Order Lookup` and its workflow were not changed. The added tool is
`كالابريز | البحث عن رابط منتج شوبيفاي`, connected to the published five-node n8n workflow
`كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1` (`8jtjLu261ZzcipGq`). The bridge accepts
one bounded product query, performs a read-only Shopify GraphQL lookup, and returns only `status`,
`title`, `url`, and `clarification`. It has no conversational AI, customer-send path, price,
inventory, discount, bundle-content, order, customer, or Shopify-write capability.

[Verified protected state] `Calapres Assistant` (`2187`) remains connected only to WhatsApp
`128058`, Instagram `128031`, and TikTok `128033`; Audience remains `Everyone`; Schedule remains
`Anytime`; and knowledge remains 74 FAQs and 22 documents. The assistant identity and internal
description, inboxes, assignment automation, knowledge, Shopify records, customer conversations,
and Meta WhatsApp profile, display name, catalog, and phone settings were not changed. The old
responder `kAyF0D3ZZHxc0Hwp` remains unpublished and outside this architecture.

[Executed response policy] Two separate Captain guidelines remain live: one enforces one message
of at most two short sentences with a direct answer followed by at most one question or one link;
the other forbids unsupported product availability, discount, previous-price, or bundle-content
claims and limits the link tool to its live Shopify title and URL. The inactivity action remains
`Wait for the customer`, replacing the former one-hour review route that contained the recurring
`سعدنا بخدمتك...` resolution text. The assignment automation was not changed.

[Verified deterministic corrections] The original failed execution `44652` proved that Shopify
returned `مبخرة كالابريز الفاخرة — الأبيض` with its canonical URL, but the n8n Code-node sandbox
silently rejected that URL because `new URL(...)` was unavailable inside `try/catch`. Only the URL
helper in `Shape Safe Product Link Result` was replaced with an anchored validator for exact HTTPS
Calapres product URLs; offline checks passed eight allowed/rejected URL cases. The workflow retained
its five-node shape and was published as `تصحيح فحص رابط المنتج في بيئة عقدة الكود`.

Two later diagnostic replies exposed separate Captain-side defects without changing the bridge:
the tool description did not reliably invoke the product-link tool for Arabic new-purchase intent,
and the response template separately failed to expose the returned fields to Captain. The tool
description now requires invocation for explicit new-purchase, buy, view, or product-link requests
such as `أبغى أطلب`, forbids adding `طقم` or another color, and permits clarification only from the
bridge. Existing-order status and tracking remain assigned to the order tool. The response template
now reads the parsed JSON through `response.status`, `response.title`, `response.url`, and
`response.clarification`, as required by Chatwoot's custom-tool contract.

[Verified credential rotation] The product-link authorization that appeared in local diagnostic
output was replaced in both Chatwoot and n8n through owner credential handoff. Exact values remain
outside GitHub. n8n executions `44662` and `44664` stopped in `Validate Request and Resolve Color`
with `Unauthorized request`, proving the retired value is rejected. The replacement value reached
the safe bridge successfully; execution `44663` returned a matched title and HTTPS URL.

[Accepted Playground evidence] After the diagnostic corrections, one fresh final Playground prompt
was sent: `أبغى أطلب المبخرة البيضاء`. Captain returned exactly two short lines: the live title
`مبخرة كالابريز الفاخرة — الأبيض` and the
[canonical product URL](https://calapres.com/products/مبخرة-كالابريز-الفاخرة-الأبيض). n8n
execution `44668` succeeded in 2.182 seconds through all five nodes and its final envelope was
`matched` with the same canonical URL. This verifies the bounded Playground path from Captain to
n8n to Shopify and back to Captain. It does not prove availability, price, discount, inventory,
bundle contents, a customer-channel reply, or delivery on WhatsApp, Instagram, or TikTok.

[Stop] The product-link stage is complete and stopped for owner review. The independent
order-bridge authorization rotation remains pending and was not performed or satisfied by this work. No
additional bridge, product-price or inventory lookup, WhatsApp catalog change, shipping capability,
outbound message, customer conversation, Shopify write, or Meta setting is approved or executed.

Canonical decision:
[0020 — Adopt a Captain product-link bridge and concise-response policy](decisions/0020-adopt-captain-product-link-bridge-and-concise-replies.md).
Exact baseline:
[Calapres Captain v1.2 — Product links and concise replies](docs/baselines/2026-08-27-calapres-captain-v1.2-product-links-and-concise-replies.md).
Detailed continuation:
[Captain product-link and response-quality handoff](docs/handoffs/2026-08-27-captain-product-link-and-response-quality.md).

## Captain isolated Shopify order bridge live — 2026-08-26

[Verified live in authenticated Chatwoot] The protected Captain configuration remains in place:
`Calapres Assistant` (`2187`) is the only automatic customer-facing responder on WhatsApp
`128058`, Instagram `128031`, and TikTok `128033`; Audience is `Everyone`; Schedule is `Anytime`;
and the existing new-conversation automation assigns the four Calapres inboxes to
`خدمة عملاء كالابريز`. Captain still contains 74 approved FAQs and 22 documents. The protected
`v1.0` baseline and additive `v1.1` engraving delta were not changed.

[Owner-reported plan state; capability verified live] The owner upgraded Chatwoot to Business. The
exact billing record was not independently read in this closeout, but the newly available custom
tool capability was verified. Captain has exactly one tool, `Calapres Shopify Order Lookup`.

[Verified live in authenticated n8n] The tool calls active workflow
`Calapres | Captain Shopify Order Bridge v1` (`lLJpvjtcxTaoQeGj`). It has five linear nodes and is a
deterministic, read-only Shopify fact bridge: authenticated ingress, request and Saudi-phone
validation, bounded Shopify GraphQL query, safe result shaping, and return to Captain. It contains
no conversational AI, sends no Chatwoot message, and performs no Shopify mutation. Captain remains
the only component that speaks to the customer. The rejected 107-node responder
`kAyF0D3ZZHxc0Hwp` remains unpublished and must not run while Captain is connected.

[Verified evidence] Execution history proves authenticated bridge-to-Shopify connectivity,
rejection of a retired authorization value, and the corrected safe no-match path for missing or
unusable phones. The successful results inspected all had no matching customer. No real matched
customer/order, name greeting, fulfillment answer, tracking answer, or external-channel delivery
was proven.

[Current limits] Lookup is by the current Chatwoot contact phone only. Although Captain asks for a
full order number after no match, the current tool cannot search that number; it supports human
continuation only. No shipping-company or aggregator API is connected, so Captain can return only
tracking already present in Shopify. Payment-gateway test mode and a controlled end-to-end order
test remain unverified.

[Accepted operating pattern] Decision 0019 supersedes decision 0018 only for the old plan/tool
restriction. Keep one accepted Captain assistant; use one small, independently removable n8n
bridge per external feature; and keep changing products, prices, orders, fulfillment, and tracking
in Shopify rather than duplicated static knowledge. Respond.io is closed unless the owner explicitly
reopens it. No shipping provider or outbound WhatsApp capability was selected or implemented.

[Owner-observed voice behavior] Account-level transcription is enabled. After an earlier poor
voice-note response, the owner confirmed that a later voice question was understood correctly.
This is not equivalent to proof across every channel or recording condition.

[Security boundary and next action] Authenticated editor inspection rendered credential values;
none is stored in GitHub. The next safe stage requires separate approval: rotate only the order
bridge authorization in Chatwoot and n8n together, prove the retired value fails and the new value
returns the safe no-match result, then stop. Only after owner review should one controlled
matched-order test be considered; do not add order-number search, shipping, another tool, or more knowledge
during that proof.

Canonical decision:
[0019 — Adopt isolated Captain external-tool bridges](decisions/0019-adopt-isolated-captain-external-tool-bridges.md).
Detailed closeout and deferred roadmap:
…3774 tokens truncated…لمبخره الخضراء المخططه بالبرتقالي` receiving the generic store clarification
instead of a Shopify price read. Root cause was an over-broad external-merchant rule that treated
the first color word after `المبخره` as if it were a merchant name. This disproved the earlier
activation claim as an end-to-end success.

The rule now accepts a closed list of burner color/pattern descriptors only inside an explicit
burner price request. `بكم الحاشي`, `بكم السياره`, bare external merchants, and product requests
from an external merchant remain unable to authorize Shopify or the model. Targeted tests pass
51/51, including the two exact owner messages and external controls. The same 100-node workflow is
active on corrected version `d3d320d6-63be-4134-b333-a4941bf2480a`; live reread confirmed
active/draft parity and the corrected embedded descriptor rules. Version
`1afb2f65-0f5c-4a87-9525-03a11088d6ff` is the immediate rollback target. A new owner-visible reply
is still required before claiming the correction works end to end.

## Governed Calapres responder live — 2026-08-25

The owner explicitly approved live activation for channel testing. The existing responder
`kAyF0D3ZZHxc0Hwp` was updated in place and published as active version
`1afb2f65-0f5c-4a87-9525-03a11088d6ff`, 100 nodes. One deterministic `Governed Customer Scope
Router` now sits between the authenticated Chatwoot anchor check and the existing decision switch.
No workflow, webhook, Chatwoot inbox, Captain, AgentBot, credential, or customer-send path was
created; `Send Reply` still has exactly one inbound authorization edge.

The live router uses candidate knowledge version `2026-08-25-v4-candidate`. External questions
receive the pinned Calapres redirect and cannot authorize a model or tool. Only exact store intents
can select approved static replies or Shopify read-only product/order reads; the governed router
never emits the model output. The dormant model prompt was also tightened to forbid external facts.
Product results now say `لقيت في المتجر الآن` and do not claim inventory availability.

Local targeted verification passed 50/50 before publish. A fresh n8n read after publish confirmed
the active/draft version match, the 100-node graph, the governed-router edges, and the single
`Customer Egress Authorized? -> Send Reply` edge. Previous active version
`aa654b47-1b8f-4132-979e-0199454028a2` remains the exact rollback target. End-to-end delivery from
TikTok, Instagram, and WhatsApp is now awaiting the owner's real channel tests and must not be
claimed from workflow publication alone.

## Checkpoint verification and release-lock repair — 2026-08-14

This section supersedes older live-status claims below where they conflict. GitHub confirmed Draft
PR #4 is open on `agent/preserve-calapres-customer-service-checkpoint` at
`e269ccb38b80f4156f065b3e5660b177f3c281b3`, with the frozen source SHA-256
`2795336b25d88b2ed4b7cc2246fd4efbc6ee47e0f80ec152bbf35bacd5bcc49a`. The n8n read confirmed the
same live responder `kAyF0D3ZZHxc0Hwp`, active version `aa654b47-1b8f-4132-979e-0199454028a2`, 99
nodes, and diagnostic execution retention disabled. No workflow, webhook, credential, Shopify
write, or external synthetic message was created or sent during this verification.

GitHub CI had one genuine guard failure because commit `36c289f` changed the frozen source and
manifest and added migration 0015 without refreshing the immutable release lock. The lock was
regenerated from the current repository files; it now verifies locally with digest
`90e549cc03507c3d23abfea118ecec96f026b94e8eb562e1308bbb8777de4c26` and explicitly covers
`0015_calapres_cs_customer_reply_omnichannel.sql`.

Neon live verification confirmed schema migrations 0014 and 0015 are applied to project
`shiny-hill-38628371`, database `neondb`, and the expected `customer_reply_sla_cases` table exists.
This is confirmed live. It does not prove customer delivery. The latest durable rows include
WhatsApp and Instagram events still in `processing` with no decision or Chatwoot message id; this
is evidence of an unresolved operational symptom, not proof of a route or delivery failure cause.
The selected source tests pass 40/40 (the prior checkpoint's targeted count was 32/32).

The unresolved gates remain: fresh WhatsApp catalog question through Shopify to a physically
received answer; fresh Instagram and TikTok platform delivery trace; and canonical responder /
webhook decision with rollback. Do not claim any of these from n8n, Chatwoot, or Neon alone.

## Clean-session handoff — 2026-08-14

This section supersedes older live-status claims below where they conflict. The current protected
branch is `agent/preserve-calapres-customer-service-checkpoint` at commit `36c289fb00aa6e224030ad6ea8d2d460b7e085f7`.
The frozen 99-node responder source is `n8n/deployments/calapres-cs-bot-protected-draft.json`, SHA-256
`2795336b25d88b2ed4b7cc2246fd4efbc6ee47e0f80ec152bbf35bacd5bcc49a`.

Current live responder: workflow `kAyF0D3ZZHxc0Hwp`, active version
`aa654b47-1b8f-4132-979e-0199454028a2`, 99 nodes. Diagnostic retention was closed after inspection:
success/error data `none`, execution progress `false`, manual executions `false`. Edge workflow
`e442GlRmKP4IO8pm` and two existing Chatwoot webhooks still exist; no third workflow or webhook was
created. Canonical responder consolidation remains unresolved and must not be guessed.

Live Neon project `shiny-hill-38628371`, database `neondb`, now has migrations 0014 and 0015.
Migration 0015 expanded the exact customer-reply outbox/function allowlist to Instagram `128031`,
TikTok `128033`, and WhatsApp `128058`; website `128028` remains excluded. Before 0015, real social
executions `41693`/`41695` reached n8n but Postgres returned `route_invalid`. After 0015, replay
completed and Chatwoot created TikTok message `794491944` and Instagram message `794491968`.
Because the owner subsequently reported no visible platform delivery, Instagram/TikTok end-to-end
delivery is **not proven** and remains an active blocker despite successful n8n/Chatwoot evidence.

The current responder routes broad catalog/price questions (`بكم`, `وش الأنواع`, `عطيني أسعارها`)
to Shopify read-only `product_catalog` instead of allowing an ungrounded model answer. Shopify was
independently confirmed to contain three active burners (white, beige, gray), each 390 SAR. This
source/live configuration is confirmed, but no fresh inbound WhatsApp execution after active version
`aa654b47-1b8f-4132-979e-0199454028a2` has proven the full Shopify catalog reply path. Do not claim
catalog E2E success until that evidence exists. Shopify inventory returned zero, so do not claim
availability without an approved inventory policy.

The first catalog/social publish failed operationally and was rolled back (`b08e406`) when all
channels appeared stopped. Later evidence identified the root cause as missing live migration 0014
plus WhatsApp-only database constraints, not the catalog routing patch. Migrations 0014/0015 were
then applied and the patch was re-applied in `36c289f`. Latest targeted tests passed 32/32 (29
protected-draft plus 3 omnichannel-migration). Full-suite and current GitHub CI status were not
rechecked at this checkpoint.

Next safe work is evidence-driven only: (1) prove a fresh WhatsApp catalog question actually reaches
Shopify and returns grounded titles/prices; (2) trace fresh Instagram and TikTok inbound messages
through platform -> Chatwoot -> n8n -> Chatwoot -> platform delivery; (3) only after evidence, decide
which existing responder/webhook is canonical and retire duplicates through an explicit reviewed
change. Never expose secrets/PII, add Shopify writes, or infer success from an n8n execution alone.

## Verified Calapres social inbox allowlist live — 2026-08-13 (session 6)

The existing workflow was intentionally hard-coded to WhatsApp inbox `128058`, so Instagram and
TikTok messages were rejected before the model. Confirmed the live Chatwoot inboxes as Instagram
`128031`, TikTok `128033`, WhatsApp `128058`, and website `128028`. Expanded the same 99-node
workflow to an exact allowlist of the first three; the website remains excluded. Inbox identity is
carried and rechecked through ingress, Chatwoot anchor reread, final reread, send proof, and recovery.
Social contacts without a trusted phone cannot infer a Shopify identity and are asked for an order
number without disclosing customer/order data. Published active version
`523a1bc0-daea-4d81-95e0-8912e4630455`. Frozen source SHA-256
`fa418c30417e43f15924ce7c545059bf612545523a13b6daeb2015bb75dffadc`; implementation commit
`dec732e007672ae48d7da64f67e6b5f1f1f82f0c`. Targeted tests passed 27/27 and both GitHub CI
workflows passed. No duplicate workflow, webhook, node, or credential was created. A real inbound
reply on Instagram and TikTok is still required to prove each platform's end-to-end delivery.

## Contextual bounded replies live — 2026-08-13 (session 5)

The repetitive off-topic response was not a weak-model failure: `Verify Chatwoot Anchor and
Route` bypassed the model for every unclassified message and emitted one hard-coded sentence,
while the model prompt repeated that same sentence as a mandatory answer. Removed that static
route. Unclassified messages now reach the existing restricted GPT-5.4 path with the exact
customer message and recent conversation context; the prompt varies natural Saudi-Arabic replies,
handles brief social conversation, gives only very short safe general answers, redirects unrelated
tasks with a topic-specific boundary, and never invents Calapres, Shopify, order, or product facts.
Business-unclear messages ask one useful clarification. `Humanize Text` now permits up to three
short sentences and rejects confidence outside 0..1; model temperature is 0.4.

Published on the same live workflow `kAyF0D3ZZHxc0Hwp` with no added/removed nodes or duplicate
workflow: active version `a2e3352f-36d4-49e2-b585-3197dea3e322`, 99 nodes. Source SHA-256
`e62a0afc063953b0eff5f613f70601d1af453945a566fd2febc615900b015337`; implementation commit
`f2c23627177882339143fb4a6b4b07064e9a5814`. Source/live node parity and settings were verified;
the only serialization difference is an omitted empty false-output array on `SLA Case Claimed?`
and has no behavior. Both CI workflows passed on the implementation commit (275 Node tests and
92 Python tests). Existing model budget, per-conversation limit, kill switch, final Chatwoot
reread, send lease, Shopify read-only boundary, and no-execution-data-retention settings remain
unchanged.

## Migration 0014 syntax/NULL-bypass fix, Shopify credential swap (prepared) — 2026-08-13 (session 4)

Three independent findings this session, each fixed at the root cause, not worked around:

**1. Migration 0014 syntax error, now fixed and replay-verified.** The owner ran migration
`0014_calapres_cs_customer_reply_sla_escalation.sql` through Neon's safe temporary-branch
migration flow (live Neon is still schema version 13); Postgres rejected it with `syntax error
at or near "no"`. Root cause: several `--` line comments contained an embedded semicolon (e.g.
`-- ...timestamps only; no customer text.`); a statement splitter that isn't aware `;` can appear
inside a SQL comment treats it as a statement boundary, so `no customer text.` gets parsed as raw
SQL. Removed the semicolon from all seven affected comments (wording only, no logic change) and
added a regression test that fails if one reappears. Verified by initializing a disposable local
PostgreSQL 16 instance (never touched Neon) and replaying migrations `0001` through `0014` in
order against it — all 14 apply cleanly, schema lands at version 14.

That same local replay also surfaced a second, independent defect while probing the new
functions with an empty `{}` command: their validation guard clauses used bare
`x <> 'calapres'` / `x !~ pattern` checks, which evaluate to `NULL` (not `TRUE`) when the jsonb
key is absent — and `IF NULL THEN` silently skips the rejection in plpgsql. For the claim/finalize
functions this only degraded to a generic "queue empty"/"lease invalid" response (accidentally
safe), but for `atomic_upsert_customer_reply_sla_case`'s `touch` path a fully empty command
reached the `INSERT` and raised a raw NOT NULL constraint violation instead of the intended
`schema_invalid` rejection — a real gap in the fail-closed contract every other function in this
schema already keeps. Wrapped every such comparison in `COALESCE(x, '')` across all three new
functions; re-verified locally that `{}` is now cleanly rejected and a well-formed command still
succeeds. No table, function signature, grant, or business logic changed.

**Still not applied to live Neon** (still version 13) — this session again has no Neon MCP access;
applying the now-fixed migration remains the owner's or a Neon-MCP-equipped session's action.

**2. Shopify credential fix: CONFIRMED LIVE and CONFIRMED TESTED with a real authenticated read.**
`GET Shopify Orders Read Only` used generic credential `oAuth2Api:QKgLBMWQtO6G4zvM` ("Unnamed
credential"), whose token Shopify reports invalid/expired. Switched it to the existing
`Shopify-Calapres` credential (`shopifyOAuth2Api:QLsvwO73GFsQfy0w`) — no new app or credential
created. First live-apply attempt failed (`credential 'QLsvwO73GFsQfy0w' is not usable in this
workflow's project` — the credential lived in the owner's personal n8n project, the workflow in
the "Calapres Customer Service" team project). **The owner resolved this via n8n's own Sharing
tab** (shared, not moved, preserving all 18 other personal-workflow references to the same
credential). The retried update applied. n8n's own validator then refused to let the update API
clear the node's now-dead `oAuth2Api` credential-map entry (`node type ... does not accept
credential 'oAuth2Api'` once `authentication` is `predefinedCredentialType`) — this entry has no
effect on request behavior (the node only reads the `shopifyOAuth2Api` slot given the current
`authentication` value), so the frozen source mirrors it verbatim for honest parity, and a test
asserts it can never become reachable without `authentication` regressing first.

Before publishing, verified with a real, isolated read-only probe: a temporary manual-trigger
branch (zero connections to any production node, Postgres call, or `Send Reply`) issued
`{ shop { name myshopifyDomain } }` through the new credential and got a genuine `HTTP 200`:
`{"shop":{"name":"Calapres","myshopifyDomain":"unywbe-ub.myshopify.com"}}`. Confirmed no
`mutation` keyword anywhere in the node's parameters. Removed the probe branch and its temporary
execution-retention override immediately after, re-verified full live/source parity (nodes,
params, credentials, connections, disabled-state, settings byte-identical) and both graph
invariants (single `Send Reply` inbound edge; single `Build Human Escalation` inbound edge;
15-minute schedule trigger cannot reach `Send Reply`), then published as active version
`3da4f1cd-494c-4f47-9907-3d1f68dc018b`.

## Remove intentional pre-send delay — 2026-08-13 (session 3)

The owner removed the requirement for a human-like pause before replying. The `n8n-nodes-base.wait`
node that previously held every reply for a fixed 5 seconds was renamed from `Human Delay` to
`Pre-Send Continuation` and its wait set to 0 seconds (frozen source SHA-256
`23e459dc36277e848318a5ba50c2c6596b78ab4dcf68868289e97ce078bff21b`, still 99 nodes — this is a
parameter/rename change only, no nodes added or removed). The rename was propagated to its two
downstream references (`GET Final Chatwoot Messages` URL, `Verify Final Chatwoot Reread` jsCode).
No other gate changed: raw-body ingress checks, the Chatwoot capability-URL + anchor-reread model
(HMAC verification was already removed for an unrelated, upstream Chatwoot defect — see decision
0013), replay/idempotency, Neon durability, brand/inbox isolation, identity checks, Shopify read
verification, model budget/kill switch, the final reread/anchor cancellation, the send lease, the
15-minute recovery/SLA schedule branch, and the single `Send Reply` node are all unchanged and
re-verified byte-identical against the live workflow after publish (node params, credentials, and
the full connection edge-set diff came back empty; `Send Reply` still has exactly one inbound edge
from `Customer Egress Authorized?`, `Build Human Escalation` still has exactly one inbound edge
from `Route Customer Service Decision` output 5, and the 15-minute schedule trigger still cannot
reach `Send Reply`). Live workflow `kAyF0D3ZZHxc0Hwp` published as active version
`73e3e3f2-c507-426a-bf7b-e1300fdd0c4e`; this update also restored the execution-retention settings
to `saveManualExecutions:false, saveDataErrorExecution:'none', saveDataSuccessExecution:'none'`,
which had been left on `true`/`all`/`all` from earlier diagnostic sessions. Rollback points
preserved: `8c518aeb-22c2-4ab9-bcef-7418029386da` (original pre-session baseline) and
`7cca9e9b-6092-444b-8cb8-7735c39a9b5f` (last full 99-node SLA/escalation graph with the old 5s
wait), both still restorable via `mcp__n8n__restore_workflow_version`.

**Measured latency**: no new real inbound message has arrived since publish, so the zero-delay
code path itself has not yet produced a directly observed round trip — synthesizing a fake inbound
customer event to manufacture that number is exactly what this project's evidence rules forbid.
Instead this is computed from a real, already-recorded production round trip: execution `41342`
(webhook-triggered, real owner WhatsApp message "مين انت" on conversation #3 at
2026-08-13T14:18:40Z, under the pre-zero-delay code) shows the `Chatwoot In` webhook received at
`14:18:41.340Z` and `Send Reply` completing (HTTP 200 to Chatwoot) at `14:18:51.093Z` — a total
inbound-to-reply-sent latency of 9.75s, of which the `Human Delay` node alone consumed exactly
5.000s (verified from its own `executionTime` in the execution record). Subtracting that fixed,
now-removed wait projects a same-shape round trip at **≈4.75s**, all of it unavoidable Chatwoot
anchor-reread, Postgres claim/lease, and final Chatwoot send API time. This is a computed
projection from real historical data (CONFIRMED TESTED for the 5.000s removed component; DOCUMENTED
projection for the ≈4.75s remainder), not a CONFIRMED LIVE measurement of the new zero-delay path —
that requires one real new inbound message, which is also the one unavoidable step left for
Outcome 3 below.

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

The first real owner-phone WhatsApp inbound (Chatwoot message `792970340`, n8n execution `41243`)
was rejected `signature_mismatch` by the protected ingress gate. Root cause is upstream defect
chatwoot/chatwoot#13809: Chatwoot signs webhook deliveries with an internal `hmac_token` that is
exposed through neither the UI nor the REST API, while the signing format itself matches the
workflow implementation exactly. Because no obtainable secret can verify genuine deliveries,
decision `0013-adopt-capability-url-ingress-after-chatwoot-hmac-defect` removes delivery-signature
enforcement and rests ingress authenticity on the capability webhook path, the unchanged
structural checks (raw body, 1 MiB, JSON-only parse after the gate), pinned account/inbox, the
authenticated Chatwoot reread anchor, and the atomic claim/lease layer. The frozen source is now
82 nodes; the `Crypto account 3` credential is unbound but retained. New source SHA-256 is
`f24ee6f32a2768dae37f783d4bc7c7204f3c6397397ebc2698549eefbdaaaa9f`. Execution retention was
enabled temporarily for the diagnostic capture and must be returned to no-save with the fix
deployment. The owner-phone round trip remains the acceptance gate.

## Recovery cadence quota fix — 2026-08-13

The protected MVP recovery schedule was reduced from every 1 minute to every 15 minutes inside the
frozen source `n8n/deployments/calapres-cs-bot-protected-draft.json`. Rationale: the n8n Pro plan
allows 10,000 executions per month and August usage was already 2,086; a 1-minute cadence alone
consumes ~43,200 executions per 30 days and would exhaust the plan around 2026-08-19. Fifteen
minutes matches the 900-second maximum retry delay enforced by migration 0013's
`atomic_release_customer_reply_recovery` contract, keeps reconciliation SLA within one DB retry
ceiling, and costs ~2,880 executions per 30 days (~29% of plan), leaving headroom for both
Chatwoot-triggered workflows. The trigger node was renamed to
`Recover Ambiguous Sends Every 15 Minutes`; recovery still has no send path. The update manifest
now records `interval_minutes: 15` and 2,880 estimated monthly executions. New source SHA-256 is
`30b477d79c988c922fd5a3c7d04febbf4fe9255ed84fbe65e9a840f95a001818` and the regenerated release-lock
digest is `f55598279f17dd6b03857c9fbeb63815e5c0e0a8d6937bf3ca01049beeb22e93`. Python 92/92,
Node 249/249, and the release-lock check all passed after the change. The live workflow
`kAyF0D3ZZHxc0Hwp` is being updated to this exact source; the retained rollback version
`8c518aeb-22c2-4ab9-bcef-7418029386da` is unchanged. The owner-phone inbound proof remains the
final outstanding evidence.

## Clean-session checkpoint — 2026-08-13 14:56 +03

GitHub and `origin` were rechecked immediately before closing the long implementation session.
Branch `agent/preserve-calapres-customer-service-checkpoint`, Draft PR #4, and the local checkout
all pointed to `6889b74a5539b3dc4d1337fe76ff97074d9fade3`; all three GitHub checks were green.
The protected customer-reply source remains frozen at SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`, and the release lock
digest remains `1203cedc5737711a371699a80a5249eb2367dc39d0dde133c80960250c904566`.

The current live n8n truth is that the existing MVP workflow `kAyF0D3ZZHxc0Hwp` is active on the
protected 83-node version `941205ae-dab2-4684-b897-dee3655a2af7`. Version
`8c518aeb-22c2-4ab9-bcef-7418029386da` is the retained rollback. Edge v2
`e442GlRmKP4IO8pm` was preserved and was not replaced or duplicated. No new workflow or Chatwoot
webhook was created during the protected activation.

The frozen verification result remains Node 249/249, Python 92/92, plus green JSON, syntax, graph,
release-lock, secret, and PII checks. Neon main remains on migrations 0001–0013 with restricted
runtime roles, direct table access denied, and the database budget control enabled with kill switch
off, a USD 45 monthly ceiling, a USD 0.05 reservation, and 20 requests per conversation per day.
No Shopify write, private note, or model request occurred in the final synthetic test batch.

One technical manual message was sent only to the owner's Chatwoot conversation #3. The final
owner-phone inbound proof is still not recorded: a fresh inbound WhatsApp message must produce
exactly one protected reply, durable event/send completion must be verified in Neon, and replay
must not create a second reply. Until that evidence exists, do not call the system fully proven
end to end for real inbound traffic.

Claude Code has been given the implementation/audit continuation prompt, but no future claim or
change from that run is authoritative until it is compared with GitHub, the exact live n8n version,
Neon, and Chatwoot. The next clean session should audit Claude Code's output against this checkpoint,
preserve the working protected version, and avoid redesign, duplicate workflows, another webhook,
or a premature merge to `main`.

## Calapres protected customer-reply candidate — 2026-08-13

The existing live MVP workflow `kAyF0D3ZZHxc0Hwp` is active on protected version
`941205ae-dab2-4684-b897-dee3655a2af7`; rollback version
`8c518aeb-22c2-4ab9-bcef-7418029386da` remains available. No duplicate workflow was created and
Edge v2 `e442GlRmKP4IO8pm` was not changed. The frozen protected source SHA-256 is
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`.

The protected draft verifies Chatwoot HMAC over the raw body, acknowledges eligible events only
after a durable Neon claim, rereads Chatwoot before decision and send, uses deterministic
greetings/FAQ/scope replies, reserves the model budget before a restricted model call, reads
Shopify through GraphQL queries only, and requires an exact PostgreSQL send lease before the sole
customer-egress node. Sensitive or uncertain cases receive the `human` label and no customer
reply. Recovery verifies both the Chatwoot marker and reply SHA-256; transient read failures are
rescheduled and recovery has no path to customer send.

Neon main now has migrations 0001–0013. Migration 0013 was first proven on isolated branch
`br-misty-glade-awba7bxf` and then applied to main. Runtime execute grants remain function-specific,
direct table reads remain denied, and the live recovery queue had zero due rows. Targeted n8n
executions `41145`–`41160` covered signature mismatch/staleness, wrong inbox, durable duplicate,
PostgreSQL uncertainty, later human/private/AgentBot activity, an exactly-100-row page, malformed
anchor, scope suppression, kill switch, model failure, and a fully pinned successful delivery.
No real customer message, private note, model request, or Shopify write was made by these tests.
Execution payload retention is restored to disabled.

After the GitHub source guard and Shopify CI both passed on commit `8c4d969`, the exact frozen
draft was published to the same workflow. Live n8n now reports active version
`941205ae-dab2-4684-b897-dee3655a2af7`, 83 nodes, two triggers, and success/error/manual/progress
retention disabled. The prior active version `8c518aeb-22c2-4ab9-bcef-7418029386da` remains the
rollback. Chatwoot has two pre-existing `message_created` webhooks: Edge observation and the MVP;
no third webhook was created. A locally signed, non-customer outgoing fixture using the existing
MVP Chatwoot secret returned HTTP 204 from the published endpoint, proving the live HMAC binding
without entering PostgreSQL or customer send. A wrong-HMAC request returned 401.

Neon remained at migration 13 with zero customer-reply events and zero unresolved sends after
publication. The budget control is enabled with kill switch off, a 45 USD monthly ceiling,
0.05 USD per reservation, and 20 model requests per conversation per day. The isolated validation
branch was reset from main successfully; migration 13 and restricted execute permissions remained
present after restore, while direct runtime table reads remained denied.

## Current phase

Shopify-native storefront and catalog readiness, plus verified Calapres customer channels in
Chatwoot. The Nawadir Dior supplier architecture and all Supabase-based Calapres architecture are
retired. Decision 0010 closes the customer-service pre-implementation gate and authorizes a
Calapres-only observation runtime. No production customer-service bot or automatic customer send
is deployed.

## PostgreSQL provider gate — 2026-08-12

Neon is the selected PostgreSQL provider for the inactive Calapres observation runtime. Project
`shiny-hill-38628371` / database `neondb` has migrations 0001–0010 applied, including a deny-first
model-budget guard with a hard `$45` monthly reservation ceiling, a 20-request daily conversation
cap, and a default-on kill switch. It has 25 Calapres tables,
40 routines, SSL-required n8n credentials for the restricted Webhook and Reconciliation login
roles, and verified callable-boundary ACLs. No customer traffic, customer send, or Shopify write has
occurred. The existing Edge workflow `e442GlRmKP4IO8pm` remains the only target and is now published
and active for observation. The v2 source is imported into that same target;
its 15 PostgreSQL nodes use the project-scoped Webhook and Reconciliation credentials, and the
read-only Shopify branch is present with the project OAuth2 read credential bound (149 nodes total).
Node tests are 175/175 and Python tests are 92/92. A real two-session Neon check verified the
database clock, Webhook execute permission, Reconciliation denial, transaction rollback, and
single-winner session locking. A temporary Neon branch matched the primary schema with no diff and
was removed after verification. Provider backup-restore service recovery and live Chatwoot
observation remain unproven.

Current recheck: Neon reports PostgreSQL 18.4, all ten migration records, four restricted runtime
roles, and the expected deny-first budget defaults (`enabled=false`, `kill_switch=true`, daily limit 20,
monthly limit 45 USD). The existing n8n target passed synthetic valid-signature, modified-body, and
invalid-signature webhook runs (executions 40786, 40787, and 40785); these were internal tests only and
no customer message was sent. Targeted Node coverage passed 83/83. The workflow is now active with
published version `8d4d3e38-1ecd-47ee-beeb-fd2189e60f26`.

## Preserved customer-service source release — 2026-08-12

The Calapres Edge v2, transactional-state, reconciliation, context/LLM boundary, schemas, fixtures,
and tests are preserved on branch `agent/preserve-calapres-customer-service-checkpoint` as a
frozen candidate, now imported into the existing inactive target. Edge v2 contains the bounded four-inbox Chatwoot reconciliation
scan/cursor graph inside the existing Edge, with the schedule disabled and all live authority closed.
The current source hash is `c3f2e3f00c6cfeeeba42966639303056fd178e7b67ed512a6d39c6da6e22d991`; the deployment
manifest matches it, and
[`docs/calapres-customer-service-checkpoint-2026-08-12.md`](docs/calapres-customer-service-checkpoint-2026-08-12.md)
records the source-only boundary.
`support/brands/calapres/customer-service-release-lock.json` verifies the frozen source set. GitHub
`main` remains the approved runtime baseline until this candidate is reviewed and merged.

The release lock was refreshed in commit `86d59eb` after the read-only Shopify customer branch was
bound to the strict Core input envelope;
the lock check and targeted PostgreSQL tests pass. The final Edge URL is verified as
`https://kunads90.app.n8n.cloud/webhook/calapres/customer-service/chatwoot/v2`. Chatwoot now has
exactly one saved observation webhook, subscribed only to `message_created`; its signing secret is
stored in the project-scoped n8n Crypto credential. The Edge workflow is published and active for
observation; no customer message has been sent. Shopify read access is available through the
connected read-only MCP and the active Edge target has the read-only Shopify branch bound to
the project OAuth2 credential. The model credential is present, but the model call remains
structurally closed and the budget guard remains deny-first.

Live signature recheck found that the existing n8n Chatwoot HMAC credential did not match the secret
shown by the existing Chatwoot webhook edit form. The existing credential was corrected in place
without creating a new credential; the same synthetic raw-body POST then returned `200`, and Chatwoot
shows exactly one enabled webhook. A permitted synthetic event for test conversation `3` returned
HTTP 200 but exposed a PostgreSQL defect: `_edge_key_bundle_valid` joined all namespaces in its
FULL OUTER JOIN, so unrelated key rows caused `key_coverage_incomplete` and prevented durable
writes. Migration 0009 corrected the join and migration 0010 grants the exact callable surface to the n8n LOGIN roles; Neon now returns `committed / processing_claimed` for
the atomic function. The existing Edge target was updated and published at version
`55ff93fc-8400-4a55-8338-3cc5301f7f71`; it remains observation/no-send. No customer message,
private note, model call, or Shopify write occurred.

## Approved architecture

    owner approval -> Shopify draft -> product review -> Shopify publication

Shopify is the operational source of truth. GitHub `main` is the technical source of truth for the
theme, decisions, and sanitized handoffs. There is no external product database, authentication
service, storage service, catalog queue, or mandatory orchestration layer.

## Verified repository state — 2026-07-29

### GitHub

- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- Verified clean baseline before the retirement change:
  `b225b9643f8dc9a765ec99a305d969d7a558cf6d`.
- The legacy React and Vite application was not part of the Shopify theme deployment path and has
  been removed from the current tree.
- Supabase configuration, migrations, functions, generated types, client SDK dependency, and lock
  files have been removed.
- The retired supplier, n8n, and Supabase synchronization source and its CI workflow have been
  removed.
- A Shopify-only CI workflow checks the theme and blocks runtime Supabase reintroduction.
- Historical code remains recoverable from Git and must not be restored into the active tree.

### Shopify theme

- The active repository surface is the Shopify theme under `assets`, `config`, `layout`, `locales`,
  `sections`, `snippets`, and `templates`.
- The isolated `owner-site/` surface and its GitHub Pages workflow publish only the Calapres
  legal-ownership evidence page; they are not part of the Shopify theme or its deployment path.
- Those theme directories contain no Supabase dependency.
- The existing deployment workflow does not depend on Supabase.
- The live theme is still ahead of `main`; theme-source reconciliation remains a separate task.

### Live Shopify

- Four products were last verified as drafts with inventory 0.
- The three burner drafts have media; the customizable stand draft does not.
- No product was published as part of the Supabase retirement work.
- Agentic catalog access, policies, Knowledge Base, FAQs, collections, and storefront settings are
  unaffected by this repository cleanup.
- Shopify product drafts may now proceed through direct Shopify review. No external database record
  or queue is required.

### Retired external systems

- Supabase is not an approved Calapres dependency and must not be queried during normal work.
- No external Supabase project or historical data was deleted. Permanent data deletion is a
  separate irreversible action requiring exact owner authorization.
- Live n8n was audited read-only. The saved Calapres Supabase credential has eight dependent
  workflows, and all eight are archived and inactive.
- No active workflow uses the Calapres Supabase credential. The credential itself remains saved;
  deleting it is a separate irreversible credential action requiring confirmation at deletion
  time.
- The repository no longer carries a Supabase or supplier n8n implementation.

## Remaining blockers

1. The four Shopify drafts still need owner-approved inventory, final product data, and publication
   decisions; the stand also needs approved media.
2. The Calapres ownership page now identifies `مؤسسة عبق الخيل للتجارة` as the legal owner. Saudi
   compliance still needs the commercial-register number, VAT number if applicable, verified
   phone, and complaint-response commitments.
3. The live theme must be reconciled into `main` before theme-code changes are deployed safely.
4. The public free-shipping announcement still needs a fresh render check for the saved SAR 320
   threshold.
5. Opening a new market remains a commercial decision.
6. The dormant Calapres Supabase credential in n8n may be deleted after explicit confirmation;
   all workflows that reference it are already archived.
7. The approved observation runtime now exists but remains inactive, unpublished, and disconnected
   from live customer events until the persistent-access gate is approved.
8. A project-scoped Chatwoot Header Auth read credential now exists in n8n and is bound only to
   the existing Edge v2 Chatwoot GET nodes. Exactly one observation webhook exists and is subscribed
   only to `message_created`; the workflow is now published and active for observation.
   The recorded Shopify credential scopes still do not include `read_customers`; that access change
   remains a deliberate implementation gate.
9. Two project-scoped internal Crypto credentials are now bound to the existing Edge HMAC nodes:
   event/route fingerprints and baseline/reread fingerprints. The Chatwoot webhook HMAC credential
   is now populated from the single observation webhook; the workflow is active for observation and
   no customer message has been sent.

## Next safe action

Next, verify the existing Chatwoot read binding with a synthetic/private read fixture. A project-scoped
OpenAI credential now exists and passed n8n's connection test; the OpenAI project allowlist contains
only `gpt-5.4-nano-2026-03-17`, selected for the lowest-cost Arabic draft phase. It is not bound to
any model node and no model call is enabled. Create the remaining dedicated Calapres-scoped HMAC
and read-only Shopify bindings. Add the signed
ingress only after those checks and prove real four-channel observation. Keep the customer-egress
branch absent.

## Constraints

Never restore Supabase, the retired React application, a supplier crawler, or the retired
synchronization code. Never invent legal identity, inventory, pricing, media, or commercial terms.
Never overwrite the live theme until its newer source is reconciled into `main`.

## Theme delivery — 2026-07-31

- The Kimi-approved Calabriz static design (7 pages) is fully ported to a Shopify Liquid theme on `shopify-theme` (merge `65a5388`): dynamic products/variants, AJAX cart, engraving line item property «نص الحفر», and an editor-managed hero video.
- CI deploys `shopify-theme` only to the unpublished staging theme; the live theme stays untouched until the owner reviews the staging preview and publishes manually from Shopify Admin.

## WhatsApp display-name ownership proof — 2026-08-11

- Verified the canonical `main` branch at
  `2ab93ac3a7886c38d39b09d8353c56577a843f5e` before preparing this work.
- Published an isolated ownership page under `owner-site/` in commit
  `daf25f564c063a6f9066a56bf02293a68242bebc`. It states in Arabic and English that Calapres is
  owned and operated by `مؤسسة عبق الخيل للتجارة`, includes the literal relationship
  `Calapres by مؤسسة عبق الخيل للتجارة`, links to `https://calapres.com/`, and exposes crawlable
  Organization, Brand, and WebPage structured data.
- The page is intentionally separate from the Shopify theme and contains no other brand, Meta
  asset ID, phone number, secret, commercial-register number, or tax number.
- GitHub Pages deployment run `31469442562` completed successfully from `main`; the workflow
  publishes only `owner-site/` and cannot publish the Shopify theme.
- GitHub verified ownership of `awd-businesses.com`, and the repository Pages configuration now
  uses that custom domain.
- The authoritative and public DNS records now point the apex to GitHub Pages and `www` to
  `a-awd.github.io`. Google Workspace MX, SPF, DKIM, Facebook verification, Domain Connect, and the
  GitHub ownership-verification record were preserved.
- GitHub completed the DNS check, issued the custom-domain certificate, and HTTPS enforcement is
  enabled. `https://awd-businesses.com/` returns the ownership page from GitHub with status `200`;
  `https://www.awd-businesses.com/` redirects to the apex.
- The live HTTPS response has the expected title, statement, canonical URL, and `index,follow`
  directive. Its SHA-256 matches `owner-site/index.html` exactly.
- Public DNS resolvers point to GitHub. Some local resolvers may temporarily continue serving the
  former Squarespace page until their old cache expires.
- Live Meta verification on 2026-08-11 confirmed the selected Calapres WABA
  `1835160094133742` under Optix portfolio `3498131087080400`, phone-number ID
  `1202498582954919`, and display name `Calapres | كالابريز`.
- Meta approved that display name. The number is registered on Cloud API with status `CONNECTED`,
  platform type `CLOUD_API`, code verification `VERIFIED`, throughput `STANDARD`, and two-step
  verification enabled. The actual phone number remains intentionally masked in project records.
- The current two-step PIN is stored only in the local macOS Keychain under
  `Meta WhatsApp 2FA PIN - Phone ID 1202498582954919`; it is not stored in GitHub, documentation,
  workflow data, or chat.
- Chatwoot Cloud account `179973`, existing WhatsApp inbox `128058`, uses the same WABA and phone
  identifiers. Account Health reports the display name approved, phone connected, the 2K customer
  messaging tier, and the webhook configured successfully.
- A real bidirectional test passed: multiple messages sent from the owner's phone arrived in the
  Chatwoot conversation, a reply sent from Chatwoot reached the phone, and the owner's delivery
  acknowledgement returned to Chatwoot.
- Chatwoot accepted a manual WhatsApp-template synchronization request after the connection test.
- No duplicate WABA, phone number, Meta app, Chatwoot account, or Chatwoot inbox was created.
- No n8n customer-service workflow or automatic customer reply is active yet. Neither
  `calapres.com` nor the live Shopify store was changed.

## Calapres customer-service observation runtime — 2026-08-11

- The live Chatwoot audit covers account `179973` and the native Instagram `128031`, TikTok
  `128033`, WhatsApp `128058`, and Email `128326` inboxes. Website inbox `128028` is outside the
  pilot allowlist.
- Captain is not connected to an inbox, AgentBot is not connected, automation rules are empty, and
  no independent responder is active. The only Chatwoot agent is `خدمة عملاء كالابريز`; the four
  pilot inboxes use automatic assignment and have business availability disabled.
- The isolated n8n team project `Calapres Customer Service` (`0kVami0vGGBbT7Cy`) now contains eight
  empty operational Data Tables for deduplication, conversation jobs, verified identity links,
  the rebuildable order index, verification challenges, incidents, owner decisions, and audit.
  The paused catalog table was not reused or changed.
- Private Core workflow `uCBXuRjlv8NyeikO`, Calapres Edge workflow `e442GlRmKP4IO8pm`, Shopify
  Order Index workflow `cLHCuJ21r4RAuDTE`, and private Owner Review Desk
  `hU7sAMAQSg9Obgky` exist in that project. All four are inactive and
  unpublished, have no assigned credential or public webhook, contain no customer-egress or
  Shopify-write node, and have execution-payload retention disabled.
- The empty approvals, incidents, and audit tables now match the lossless owner-review contracts
  exactly: 34, 18, and 17 columns respectively. No row was inserted. The Owner Review Desk has no
  Data Table node, no public trigger, and caller policy `none`; it validates `reply_only`,
  `approve`, `approve_until`, and `correct` as no-write previews only. Sanitized execution `40631`
  passed with persistence, knowledge publication, and customer egress all false.
- The delay and post-delay cancellation stage is merged into the existing Edge. Its Wait carries
  identifiers, a canonical SHA-256 carrier fingerprint, the pinned baseline-HMAC key version, and
  opaque baseline status/assignee fingerprints only; it carries no raw status, assignee, message,
  or customer data. A fresh Chatwoot re-read must use the same pinned key version. The
  compiled channel policy is 30–75 seconds for Instagram, TikTok, and WhatsApp and 120–300 seconds
  for Email; the one-second path is synthetic-test-only. Live-shaped input keeps the brand kill
  switch on, and the current no-credential path fails closed before Wait because a trusted live
  baseline cannot yet be captured; the re-read slot also fails closed outside the synthetic fixture.
- Strict source-only contracts now define the future signed Chatwoot ingress, transient live
  re-read evidence, and post-delay cancellation decision. They cap the raw body at 1 MiB before
  parsing/HMAC, bind request replay identity to the signed request rather than the unsigned Delivery
  header, and separately derive stable business-event identity from an HMAC over the allowlisted
  account/inbox/event/conversation/message tuple. Their post-delay rule performs two independent,
  non-paginated reads from `anchor_message_id-1`; each raw response must contain 1–99 valid rows,
  include the exact incoming/public anchor, and yield the same canonical set. Any newer
  non-activity message—including another bot's output—cancels. They also compare
  generation/status/assignee and forbid
  the full evidence objects from Wait, Data Tables, or audit persistence. No live webhook or
  Chatwoot credential was created.
- The Edge now previews exact 10-column dedup, 10-column job, 18-column incident, and 17-column
  audit rows. These projections are explicitly synthetic and non-persistable:
  `write_executed=false`, `atomicity_guaranteed=false`, `persistence_ready=false`, and
  `persistable=false`. A future live dedup `event_key` must use the stable business-event HMAC,
  while the request replay fingerprint remains a separate short-lived transport check. Prior HMAC
  key versions must be dual-read through the dedup TTL; the unsigned Delivery header never defines
  event identity.
- The order-index preview maps a validated Calapres contract to the table's exact 12 columns. A
  live n8n run caught an embedded Shopify-GID regex error before activation; it was fixed, a
  permanent embedded-Code syntax test was added, and sanitized post-fix execution `40619` passed
  with both Data Table and Shopify writes false.
- Sanitized manual executions proved the Core/Edge happy path, all four allowlisted channel
  mappings, and fail-closed behavior for unknown account/inbox, outgoing/private/bot events,
  invalid signature evidence, duplicate delivery, stale generation, returns, uncertain intent,
  and non-low risk. Post-sync execution `40651` proved that the source-synchronized synthetic
  WhatsApp path used the configured Wait expression and exact no-write projections; the four-channel
  delay ranges are covered by local runtime tests. It also proved the stable event-identity key,
  exact Wait fingerprint, baseline key-version carry-through, null-reserved 10-column dedup
  preview, and post-Wait integrity check. Every tested result kept
  customer egress and persistence false. The Edge
  remains inactive and unpublished; the imported graph is source-identical to the frozen Edge v2
  source and carries only the two project-scoped PostgreSQL runtime credentials.
- GitHub now contains the brand registry, three append-only dated knowledge releases sourced from the live
  Calapres policy/FAQ pages, the approved response-style release, a proposed inactive model policy,
  generic Core contracts, stricter Calapres edge contracts, synthetic fixtures, and
  standard-library contract/runtime guard tests. Seventy-two local tests pass, including hostile
  request replay vs. event-idempotency, key rotation, body-binding, bounded re-read, same-second,
  PII-poisoning, static-fingerprint, and cancellation-matrix cases.
- Core grounding now verifies every cited knowledge ID and its authority against the selected
  context and verifies live-fact IDs exactly. It ignores the model's free-text draft and renders an
  `observe_draft` result only from versioned `customer_response_ar` or a verified live-source
  response fragment. The Edge rejects or strips malformed/extra Core output. Event-payload
  transport claims are ignored; only a topology-created trusted wrapper can reach normalization.
- The live observation connection is intentionally not granted yet. A project-scoped Chatwoot read
  credential is bound to the existing Edge GET nodes, and one observation webhook exists, but no
  live fixture has been processed because Edge remains inactive.
  Model-node binding and identity-HMAC material remain deliberate persistent-access gates. A new
  Shopify Dev Dashboard app `Calapres Customer Service Read` is installed on `calapres.com` with
  only `read_customers`, `read_orders`, `read_products`, `read_inventory`, and `read_locations`. The n8n Shopify
  OAuth2 credential was rejected and removed because the built-in type requested write scopes;
  the generic n8n OAuth2 credential is saved with Client Credentials and the same read-only scopes.
  Direct live evidence proved token issuance (`200`, `expires_in=86399`, read-only scope set) and
  a read-only Admin GraphQL query (`200`, no errors, shop name returned). It is bound only to the
  inactive Edge target. The Edge v2 source and target contain a read-only Shopify customer lookup
  branch using generic OAuth2, fail-closed exact-phone matching, and a strict Core-envelope adapter;
  no Shopify write has occurred. After the owner-approved scope update, a direct
  customer-ID-only GraphQL read returned `200` without errors; no customer fields were logged.
- The model budget guard was applied to real Neon and tested with a temporary `$0.05` ceiling: the
  first reservation committed, the next reservation was rejected as `monthly_budget_exhausted`,
  and the control was restored to `enabled=false`, `kill_switch=true`, `$45` ceiling. Test rows were
  removed. No model request was made.

### Next safe action

After an action-time owner confirmation for those persistent-access gates, implement the already
specified signed Chatwoot ingress and live re-read inside the existing Edge, bind only
Calapres-scoped credentials, capture the pre-Wait baseline with the pinned identity-HMAC key,
replace synthetic fingerprints with keyed live values, and test real
events as private internal observations. Keep automatic customer-facing replies structurally
absent until the separate activation decision and every safety gate pass.

## Multi-brand ownership-evidence standard — 2026-08-11

- Meta approved `Calapres | كالابريز` shortly after the permanent ownership page became available.
- The owner has accepted that result as the operating basis for reusing the evidence-page pattern
  for future brands.
- Decision 0009 requires a neutral ownership registry with a separate permanent page for every
  future verified brand. It does not authorize connecting or modifying another brand now.
