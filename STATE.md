# Project State

## Calapres Operations Director restored; instructions-only preview passed — 2026-09-03

[Current verified draft] The n8n Agent `Calapres Operations Director` retains stable agent ID
`olVB3TzKClXjuOei` in project `AeQgtZlgJbiXCM2e` and uses `GPT-5.6 Sol`. Its configuration and
three skills are in English, and owner-facing replies are instructed to be in Arabic. The skills
remain `Calapres Launch Readiness Audit`, `Daily Order Operations Triage`, and `Operational
Incident Command`. The draft is unpublished, custom routing and episodic memory are off, session
memory remains at its default, MCP is off, and there are no channels, schedules, or sub-agents.
Captain remains the only customer-facing responder.

[Recovered state] The saved draft was later observed as a blank `New Agent` while preserving the
stable agent ID. The approved name, icon, model, instructions, skills, and safety settings were
restored. The cause is unproven; stale or concurrent preview/editor state, autosave, and an
interrupted connection remain the leading observed risks. An `/assistant/<uuid>` page is a transient
assistant artifact, not an agent identity or safe resume target. Open the agent from the project
Agents list and verify the stable agent ID before editing.

[Verification] A safe instructions-only preview passed after restoration: it replied in Arabic,
used the required source hierarchy, respected the prohibited-action boundaries, prioritized work as
P0/P1/P2, and marked tool-dependent facts `UNVERIFIED`. No Shopify or Firecrawl tool is currently
attached after the restoration, and neither connection has been tested. No customer message,
commerce write, publication, payment, provider credential, Gateway top-up, or OpenRouter setup was
performed.

[Provider direction and next action] Decision 0034 accepts a direct, Calapres-dedicated OpenAI API
project and credential as the preferred future production model path, while leaving implementation,
budget approval, and current n8n Agent compatibility verification pending. n8n Gateway remains the
temporary trial path; it must not be topped up or given auto-top-up by assumption. OpenRouter is not
the primary provider. First refresh the live agent read-only from its stable listing and verify that
the current first-class Agent supports a user-owned OpenAI credential. Only after fresh owner
approval may a budget, credential, or model binding be created. Then run one bounded model canary
before separately approving and reattaching one read-only tool at a time. Keep the agent unpublished.

Decisions: [0033 — Adopt a bounded Calapres Operations Director draft](decisions/0033-adopt-calapres-operations-director-draft.md)
and [0034 — Prefer direct OpenAI API as the primary Calapres agent provider, subject to n8n Agent compatibility](decisions/0034-use-direct-openai-api-for-calapres-agent.md).
Detailed record: [2026-09-03 Calapres agent recovery, provider direction, and WhatsApp history](docs/handoffs/2026-09-03-calapres-agent-recovery-provider-and-whatsapp-history.md).

## Chatwoot conversation operations stage 1 — 2026-09-02

The live Chatwoot account `179973` now has a bounded conversation-operations layer without changing
Captain, its inbox connections, the existing assignment automation, historical conversations, or
Meta templates. Seven sidebar-visible labels were created: `يحتاج-تدخل`, `عميل-منزعج`,
`مهتم-بالشراء`, `طلب-قائم`, `مشكلة-شحن`, `مشكلة-دفع`, and `سبام`.

A conversation list attribute named `نتيجة المحادثة` with key `conversation_outcome` was created
with seven allowed outcomes: `تم الشراء`, `انتهى الاستفسار`, `بانتظار العميل`,
`تم التحويل لموظف`, `مشكلة حُلّت`, `لم يتم الشراء`, and `سبام`. Chatwoot now requires this
attribute when an agent resolves a conversation. Auto-resolve remains disabled.

The seven labels are available as direct filtered lists in the conversation sidebar. Eight saved
filters were created under `المجلدات`: `بانتظار العميل`, `يحتاج تدخل بشري`, `عملاء منزعجون`,
`مهتم ولم يطلب`, `طلبات قائمة`, `مشكلات الشحن`, `مشكلات الدفع`, and `سبام وخارج النطاق`.
No labels or outcomes were retroactively applied to historical conversations.

Decision: [0032 — Adopt the Chatwoot conversation operations taxonomy](decisions/0032-adopt-chatwoot-conversation-operations-taxonomy.md).

## Transparent brown Calapres seal is now the live browser icon — 2026-09-02

[Owner direction and root cause] The owner rejected the flat gold monogram favicon on its solid
brown square and requested the brown Calapres seal without a background. A fresh public-head read
proved that Shopify was still emitting `calapres-favicon-monogram-2026-08-31.png`; that selected
file is RGB and has no alpha channel. The approved checkout seal already existed in Shopify Files
as `calapres-checkout-wax-seal.png` and is RGBA with a transparent background.

[Live execution and verification] In live theme `165804638464`, the theme setting `favicon` now
selects the existing transparent wax-seal file. Shopify saved the setting successfully. A fresh
anonymous public request returns the new seal URL for 16 px, 32 px, shortcut-icon, and 180 px Apple
touch-icon declarations. No logo was regenerated and no product, checkout, payment, shipping,
social, customer-service, or automation setting changed.

## Captain knowledge rebuilt; ordinary questions no longer hand off — 2026-09-02

[Owner approval and live execution] The owner approved the complete Captain library rebuild. Live
Chatwoot assistant `2187` now retains exactly seven authoritative storefront documents: FAQ,
privacy, About, Contact, terms, refund, and shipping policy. Fifteen duplicative or obsolete
documents were deleted, including product pages and sitemap sources that carried retired set copy.
All old FAQs were removed and 18 curated manual FAQs were created. Order status is intentionally the
nineteenth tool-only topic and was not stored as a static answer.

[Behavior] The assistant now treats the product as one burner with name-or-logo engraving, uses
live sources for price, availability, order status, and tracking, and uses Western digits. The
enabled scenario is `تحويل محدود لخدمة العملاء`: general questions, missing FAQs, out-of-scope
questions, and customer inactivity do not cause handoff. Explicit human requests, order mutations,
refund/cancellation execution, payment disputes, sensitive cases, and verified order-tool failure
remain valid handoff reasons. `Wait for the customer` is still selected.

[Verification and boundary] Fresh Playground tests passed for other-services scope, one-burner
composition, prepaid-only payment, shipping thresholds, and the no-invented-price boundary. An
initial stale two-letter engraving answer was caught and superseded with an explicit guardrail; the
fresh rerun returned name-or-logo engraving. No proactive WhatsApp message, Meta template, outbound
order workflow, Shopify checkout rule, or external-channel delivery test was created in this stage.

## OTO shipping channel connected; pickup activation awaits the physical address — 2026-09-01

[Owner authorization and live execution] The official `OTO - Shipping Gateway` Shopify app is
installed and connected to the existing OTO account `Calapres sa`. OTO shows the Shopify channel
for store `Calapres - 82929975552` as active, and its connection test returned success. The owner
explicitly rejected cash on delivery, so `Accept cash on delivery orders` remains off. No OTO
wallet credit, IBAN, paid plan, shipment, carrier booking, or cash-on-delivery service was created.

[Location mapping and preserved checkout rates] Shopify location `91940061440`, `SMSA Retail Shop`,
is matched to OTO sender location `396002`, `SMSA Retail Shop`. The current Shopify Saudi rates
remain unchanged: SAR 25 from SAR 0 through SAR 319.99, and free delivery from SAR 320. No OTO
carrier rate was added to the Shopify delivery profile, and the embedded app's discounted-rate
setup remains incomplete. OTO's auto-create setting is on, but no real order has yet proved order
ingress, shipment creation, label generation, tracking, or status writeback.

[Genuine blocker and next safe action] The imported OTO sender location is not ready for courier
pickup: it has only the label `SMSA Retail Shop` and city `RIYADH`; phone, detailed pickup address,
district, postal code, and Saudi short national address are not confirmed. The repository also
contains no verified packaged weight or dimensions. Obtain the owner's exact physical pickup
address, complete and activate that sender location, then record real packaged measurements before
creating one prepaid test order and shipment. Do not guess the address or package data, enable cash
on delivery, fund OTO, book a carrier, or replace the manual Shopify rates without a separate
verified decision.

## Live checkout identity corrected and verified — 2026-09-01

[Owner approval and live save] After reviewing the unsaved mobile preview, the owner explicitly
directed `Save`. Shopify saved the one active checkout configuration, profile `5133926656`, with
the approved realistic wax seal `calapres-checkout-wax-seal.png`, centered at 120 px. The old
`Artboard_4_2x-100-removebg-preview.png` asset remains in Shopify Files for rollback but is no
longer the live checkout logo.

[Exact live presentation] Checkout main background is `#FAF8F5`; header and order-summary
backgrounds are `#F7F4EF`; header accent, order-summary accent, shared accent, and primary button
are burnt brown `#44271B`; input fills are transparent; headings and body use Rubik. These are
very pale solid Shopify checkout surfaces, not true backdrop blur. No checkout flow, required
contact field, address wording, shipping rate, payment provider, Paymob state, product, price,
inventory, customer, order, or social setting changed.

[Verification] Save became disabled after the operation. A fresh public Arabic checkout loaded
the new Shopify CDN seal at a rendered width of 120 px, main `rgb(250, 248, 245)`, header
`rgb(247, 244, 239)`, burnt-brown `rgb(68, 39, 27)` payment action, transparent input fill, and
Rubik on the visible checkout controls and headings. The active Basic store still has no checkout
draft; Shopify's duplicate action did not respond, so the owner-approved change was applied to the
active profile only after its exact rollback values had been recorded.

## Western-digit storefront and empty-review removal published live — 2026-09-01

[Owner approval and production role change] After being told that native Arabic Shopify checkout
would remain outside the theme-controlled Western-digit guarantee, the owner explicitly directed
publication of the completed bundle while excluding all unverified social-account links. Shopify
published theme `165804638464`, `Preview — Western digits 0-9 2026-09-01`, as `MAIN` at
2026-09-01T10:25:46Z. Former live theme `165777604864`,
`Preview — Calapres beige + burnt brown 2026-08-31`, automatically became `UNPUBLISHED` and is the
immediate rollback. Neither theme is processing or reports a processing failure; no theme was
deleted.

[Published scope] The live storefront now uses Western `0–9` digits on theme-controlled customer
surfaces and no longer renders the empty `تقييمات العملاء` section on product pages. Exact
customer-authored input remains preserved. The publication did not change products, prices,
inventory, checkout configuration, payment, Paymob, shipping, tax, customer or order data. Native
Arabic Shopify checkout remains a documented exception and can still display Arabic-Indic digits.

[Social boundary] The owner explicitly excluded social-account setup from this publication.
Instagram, Snapchat, TikTok, and X remain blank and hidden. Only the already verified WhatsApp
destination `https://wa.me/966508727687` and email destination `mailto:info@calapres.com` are
visible and clickable. No social URL setting changed.

[Post-publication proof] Shopify Admin displayed `Theme published`. A fresh Admin API reread returned
theme `165804638464` as `MAIN`, theme `165777604864` as `UNPUBLISHED`, and no processing failure.
An anonymous public HTTP response identified `165804638464` with role `main` and
`themePublished: true`; the homepage rendered `390`, `490`, and `2026` with Western digits and
exposed only the verified WhatsApp and email footer links. A fresh public product response used the
same main theme and contained no customer-review heading or review widget markup. Preserve theme
`165777604864` as the immediate rollback.

## Empty customer-review section removed in the combined unpublished preview — 2026-09-01

[Owner direction and canonical implementation] Because Calapres has no customer reviews, the owner
directed that `تقييمات العملاء` be removed completely from the product pages. Canonical GitHub
`main` implementation commit `28e890086f8466ea621ac22c9e9ec60dd528fccd` deletes the full shared
review block from `sections/main-product.liquid`, including the heading, Judge.me container, legacy
metafield output, and page review-data script. It also deletes the three now-unused review rules
from `assets/calabriz.css`. No app was uninstalled and no review data or metafield was deleted.

[Shopify template and preview scope] A fresh Shopify read returned exactly three active products —
white, beige, and gray — and all three have `templateSuffix: null`, so they use the one shared
default product template. The two changed files were uploaded only to unpublished theme
`165804638464`, `Preview — Western digits 0-9 2026-09-01`. Remote MD5 and byte size match canonical
source; the draft is not processing and has no processing failure. Live theme `165777604864` was
not changed or republished.

[Validation] Theme Check inspected 181 files with zero errors and the six existing remote-font
warnings. Repository search found no remaining customer-review heading, Judge.me widget, review
container, or product-review CSS. Fresh 390 px browser checks of all three products found zero
`تقييمات العملاء` text, zero review selectors, only the intended product block inside the main
wrapper, and zero horizontal overflow. Publication remains pending the owner's separate decision
on the combined preview and its native Arabic-checkout digit boundary.

## Western digits completed in an isolated storefront preview; native Arabic checkout is blocked — 2026-09-01

[Owner requirement] Every store-generated amount, quantity, duration, date, year, count, and other
number must use Western `0–9` digits in Arabic and English. Canonical GitHub `main` commit
`f49f3871c4c650936925a0b55175ff17f29b245a` removes the former Arabic-Indic conversion, replaces
the static Arabic-Indic values, directs the cart quantity control to an English digit presentation,
and adds a guarded normalizer for every Unicode decimal-number system introduced into the visible
theme DOM later. Exact customer-authored engraving, names, addresses, search terms, rich-text input,
and gift-card codes remain unchanged; URLs, identifiers, submitted values, data attributes, scripts,
and JSON-LD are not rewritten.

[Isolated Shopify preview] Live theme `165777604864` was duplicated to unpublished theme
`165804638464`, `Preview — Western digits 0-9 2026-09-01`. Seventeen canonical theme files were
uploaded only to the duplicate and reread with MD5 and size matching local source. The draft is not
processing and has no processing failure. The live theme was not changed or republished.

[Validation] Theme Check inspected 181 files with zero errors and the six existing remote-font
warnings; all template JSON and 16 section schemas parse. An independent audit passed all 680
Unicode decimal-number characters and the customer-data, machine-attribute, dynamic-DOM, syntax,
and batching-performance checks. Fresh browser checks found only Western digits in the homepage,
product, cart drawer, standalone cart, About, and 404 surfaces. Product prices display `390` and
`490`, the footer year displays `2026`, About values display `01`, `02`, and `03`, and a dynamic
cart change displayed quantity `2` and total `780` before the original quantity `1` and total `390`
were restored. At 390 px the document and drawer had zero horizontal overflow. A synthetic search
term `١٢` remained exact as customer input while the store-generated result count displayed `0`.

[Genuine platform blocker] The separate native Arabic Shopify checkout rendered `١ عنصر` and
`٣٩٠٫٠٠ ر.س.`. Adding the standard locale numbering extension `ar-SA-u-nu-latn` left those values
unchanged. The connected store is currently Basic, not Plus. Theme code and theme custom CSS do not
run in checkout, and Shopify documents that information, shipping, and payment-page UI extensions
are Plus-only. No documented Basic-plan control can change Shopify's native Arabic number formatting.
Do not publish the draft as satisfying the owner's whole-site requirement without the owner's
explicit choice between accepting this checkout exception or using an English checkout. No payment,
checkout setting, checkout configuration, customer data, or live theme changed.

## Product composition corrected to one burner plus engraving across the live storefront — 2026-09-01

[Owner correction] The owner clarified the physical offer exactly: there is no stand, oud box, set,
or multi-piece bundle. The product summary is only `مبخر أنيق` and `حفر الاسم أو الشعار`. The
earlier product-noun correction in commit `0887beaab5b769505c51fccdeb772faab79b3d06` was therefore
expanded beyond the product FAQ to every active storefront surface that still made the false
composition claim.

[Canonical theme source] Commit `ecbcbc3aa81514107f640d5b1ec925c28c1bab7d` sets the shared
product-page summary to the two exact owner-approved lines, corrects the homepage engraving band,
rewrites the About page around one elegant burner, changes the contact and shopping labels from
sets to burners, and corrects every reusable section default that could restore the rejected copy.
Nine files changed; product structure, pricing, availability, cart behavior, media, and styling did
not change.

[Shopify operational data] A fresh read-only GraphQL audit of the three active products — white,
beige, and gray — found no `ستاند`, `علبة عود`, `طقم`, `أطقم`, or multi-component claim in title,
handle, description, SEO title, SEO description, or image alternative text. No product record
needed or received another mutation. Shopify Online Store Preferences separately contained the old
homepage meta description `مع طقم متكامل`; it was replaced with an accurate one-burner description
that includes `إمكانية حفر الاسم أو الشعار`, and Shopify displayed `Settings saved`.

[Live deployment and verification] The nine canonical theme files were pushed to live theme
`165777604864` and pulled back byte-for-byte. Theme Check inspected 181 files with zero errors and
the six existing remote-font warnings; section schema IDs are unique and the changed template JSON
is valid. Fresh HTTP checks of the homepage, all three product pages, About, Contact, and FAQ
returned 200, contained their expected corrected copy, and contained none of `ستاند`, `علبة عود`,
`طقم`, `أطقم`, `ثلاث قطع`, `ثلاثة قطع`, or `متكامل`. A fresh browser render of the white product
showed `مبخر أنيق` followed by `حفر الاسم أو الشعار`, and the Shopify API reread the corrected
homepage meta description.

## Beige and burnt-brown combined design published and verified live — 2026-08-31

[Owner approval and publication] The owner explicitly approved publishing the reviewed combined
design. Shopify switched theme `165777604864`, `Preview — Calapres beige + burnt brown 2026-08-31`,
to `MAIN` at 2026-08-31T18:19:02Z. The former live theme `165774786816`,
`Preview — six social icons mobile fix`, automatically became `UNPUBLISHED` and is preserved as the
immediate rollback. Neither theme is processing or reports a processing failure; no theme was
deleted.

[Prepublication integrity guard] The full-theme comparison caught six corrupted canonical files
before the role change: the three latest theme files and their three operating-document records had
been damaged by an upload that included an unrelated shell-startup line in base64 input. Publication
was paused. The exact theme files were recovered from local commit `0836fac`, the exact documentation
from local commit `6854cd3`, and GitHub `main` repair commit
`34cf93d03a63e9da80200d403d12dbca6fc825ae` restored all six without rewriting history. The repaired
theme files match the published Shopify theme by MD5, and Theme Check again inspected 181 files with
zero errors and the six existing remote-font warnings.

[Live verification] A public storefront tab was exited from preview mode and contained no preview
bar. The homepage showed the exact heading `حفر شخصي على كل طقم` directly after the hero with zero
editorial media nodes. The live cart computed to 62% beige, its item surface to 74% beige, and the
document, drawer, and item had zero horizontal overflow at the normal width, 390 px, and 320 px.
The footer exposed only the verified WhatsApp and email destinations, and no browser error-level log
was produced. Checkout branding, payment configuration, products, cart data, and social URL settings
were not changed by publication.

[Rollback] If the owner rejects the live result, publish only former live theme `165774786816` and
recheck the public homepage, cart, footer, favicon, and mobile widths. Do not delete either theme.

## Lighter cart glass and text-only engraving band staged; social URLs still required — 2026-08-31

[Owner refinement] The owner asked to make the beige visibly lighter inside the cart without
changing the rest of the storefront, remove the beige-product image immediately below the homepage
video, and restore the missing configured social accounts. Canonical GitHub `main` commit
`73b2ae3c092e949f152a385cac66b705f6fee5e3` changes only `assets/calabriz.css`,
`sections/editorial-band.liquid`, and `templates/index.json`. The cart scrim is reduced from 12% to
8% brown, the drawer increases from 46% to 62% beige, and its text-bearing header, item, empty, and
footer surfaces increase from 60% to 74% beige. The 30 px blur, rounded card, cart data, helper,
checkout action, and global storefront colours are unchanged.

[Homepage result] The editorial section now has a Shopify-native `show_media` setting. Only the
homepage sets it to false and uses the exact heading `حفر شخصي على كل طقم`, so the text follows the
hero video directly with no product image. Other instances, including the about page, retain the
default visible image. The supporting engraving sentence and collection link are unchanged.

[Social-link boundary] A fresh repository and direct Shopify audit confirmed that the unpublished
and live themes have identical footer settings: Instagram, Snapchat, TikTok, and X are blank;
WhatsApp is `https://wa.me/966508727687`; email is `info@calapres.com`. The unpublished footer
correctly hides blank destinations, whereas the live footer still draws those blanks as disabled
glyphs. No verified public profile URL exists in the repository, so no social setting changed.
Exact owner-confirmed Instagram, Snapchat, and TikTok URLs are still required; X remains hidden.

[Persistence and validation] Unpublished theme `165777604864` persists `assets/calabriz.css` at MD5
`2d6ed2e322c5617b4fd49dadfa702b38` and 45,042 bytes,
`sections/editorial-band.liquid` at `b66f92ce9448687140d647e8cf8f3dae` and 2,345 bytes, and
`templates/index.json` at `9380bb06a7c85648dba502c64e815f9d` and 860 bytes. Theme Check inspected
181 files with zero errors and the six existing remote-font warnings. Fresh 320 px, 390 px, and
normal-width checks found no document, drawer, or item overflow; the homepage band contained zero
media nodes and the exact heading; and the footer contained only the verified WhatsApp and email
anchors. Theme `165774786816` remains `MAIN`; no publication occurred.

## Engraving copy corrected from `العروسين` to `العرسان` in the unpublished preview — 2026-08-31

The owner confirmed that `إمكانية حفر اسم العرسان أو التاريخ على الطقم.` is the correct Arabic
copy. Canonical GitHub `main` commit `b14a6b3e486245e7640c41789fe59e113e3a45e2` updates both the
homepage editorial-band default and the related product-page gift FAQ answer. The two old
`العروسين` occurrences were removed. Both files were uploaded only to unpublished theme
`165777604864`; fresh homepage and product-page preview checks found the corrected phrase and no
old phrase. Theme Check inspected 181 files with zero errors and the six existing Rubik remote-font
warnings. Theme `165774786816` remains `MAIN`; no publication occurred.

## Rounded cart-item card staged for owner review; combined theme remains unpublished — 2026-08-31

[Owner correction and implementation] The owner rejected the cart drawer's sharp opaque-looking
product band and asked to see the proposed correction before publication. Canonical GitHub `main`
commit `1735ce8f07165be6851a969736937ceff116c596` changes only `assets/calabriz.css`. The drawer
still uses the approved 46% beige glass and each product still uses the same 60% beige readability
surface, but the product surface is now a contained card with a 16 px radius, a 14% brown border,
a soft 6% brown shadow, and a 10 px image radius. Multiple cards receive a 12 px gap. The existing
cart page is unchanged because every new rule is scoped to `.drawer`.

[Narrow-screen containment] At 360 px and below, the card padding reduces to 12 px, its image reduces
to 64 px, and the quantity/price row may wrap. The product-information flex child now has
`min-width: 0`. These rules prevent the new inset card from causing narrow-screen overflow without
changing the cart data, controls, focus order, or checkout action.

[Draft persistence and validation] Unpublished theme `165777604864` persists the exact CSS with MD5
`4005f5b8a8769e70e1840127d41143fb` and size 44,869 bytes; a fresh remote pull matched the local file
byte-for-byte. Theme Check inspected 181 files with zero errors and the six existing Rubik remote-
font warnings. Fresh populated-cart browser checks at the normal in-app width, 320 px, and 390 px
confirmed the 16 px radius, 10 px image radius, 30 px drawer blur, zero document/drawer/item
horizontal overflow, and a wrapped narrow quantity/price row at 320 px. Theme `165774786816`
remains `MAIN`; draft `165777604864` remains visibly labelled `Draft` and open for owner review.
Do not publish it without the owner's next explicit approval.

## Exact checkout seal and pale-beige glass-like direction approved; draft creation remains blocked — 2026-08-31

[Cart cause and implementation] The owner reported that opening the cart restored the rejected dark,
opaque beige treatment. Fresh computed-style inspection confirmed that the draft drawer used a 72%
beige surface above a 22% burnt-brown scrim, with an additional 26% beige header layer. Canonical
GitHub `main` commits `2e1cbb90e2ed61ad52724937dede5ccbb2bb272d` and
`a7e3c96a01112a8bf371003df9a1a958bbd6ffe4` change only
`assets/calabriz.css` and `snippets/cart-drawer.liquid`. The drawer now uses 46% beige with
30 px blur, the page scrim is 12% brown, and the drawer's text-bearing header, item, empty, and
footer regions use 60% beige. The 320 px Saudi Post helper now wraps instead of overflowing its
box. No global glass token or navigation surface changed.

[Preview persistence and validation] Unpublished theme `165777604864` persists
`assets/calabriz.css` with MD5 `91f46f1d04a2b30d1f25677fb5054567`, size 44,422 bytes, and
`snippets/cart-drawer.liquid` with MD5 `8e99438d4ff949d5269c2bac1488eebc`, size 2,938 bytes. It
remains `UNPUBLISHED`, is not processing, and has no processing failure. Theme Check inspected
181 files with zero errors and the six existing Rubik remote-font warnings. Fresh populated-cart
checks at 320, 390, and 1280 px matched the intended values and found zero document or drawer
horizontal overflow; the 320 px helper overflow fell from 10 px to zero. The public theme
`165774786816` remains `MAIN` with CSS MD5 `c5503cec29f1c5c4baf72e1742f6972a` and cart snippet
MD5 `842f3966eaec4a2280b5d811774c5cb9`, so production was not edited or published.

[Checkout read-only audit] The owner rejected the active checkout's stark white treatment and old
simplified seal, initially requested the wordmark, and then corrected the intended identity before
implementation to the exact realistic wax seal from the supplied 1280 x 1280 colour-source image.
The owner then explicitly approved that exact seal and clarified the surrounding treatment as a
very light beige, glass-like background rather than blue. Burnt brown and Rubik remain the intended
supporting identity. Shopify's Basic checkout editor cannot reproduce the storefront's actual
backdrop blur or translucent CSS, so `glass-like` means very pale beige solid surfaces with subtle
tonal separation inside the isolated checkout draft.
The connected Basic store has exactly one checkout profile,
`gid://shopify/CheckoutProfile/5133926656` (`My Store configuration`), and it is published;
there is no checkout draft. Browser inspection confirmed the active logo is
`Artboard_4_2x-100-removebg-preview.png` at 100 px centered, main and header backgrounds are
`#FFFFFF`, order-summary background is `#F5F5F5`, actions are `#1B262D`, and headings and body
use Almarai. Shopify also displays a paused-rollout warning in that active editor. The
`preview_theme_id` theme parameter does not preview checkout branding. No checkout value was
changed and Save remained disabled.

[Checkout asset and safe path] The realistic seal was isolated from the exact source image without
redrawing it and staged as `assets/calapres-checkout-wax-seal.png`: 755 x 840 PNG with real alpha,
745,304 bytes, SHA-256
`2ffe03f1bff302b781bbd882d18e971f878d154aa6f90413e42b6643f25024f1`. Shopify supports a
separate draft checkout configuration on Basic, so the safe sequence is to duplicate the active
profile, upload this exact transparent seal, set very pale beige solid backgrounds, set actions to
`#44271B`, set headings and body to Rubik, preview, and publish only after owner approval. The
target draft values remain `#FAF8F5` for main, `#F7F4EF` for header and order summary, and
transparent inputs. After the owner's explicit approval, a fresh attempt confirmed the enabled
`Duplicate` action exists, but Shopify's popover still did not open through the trusted browser
interface and no duplicate action fired. Fresh authenticated schema inspection also confirmed that
this Basic store exposes no public checkout-profile duplication or checkout-branding mutation; the
draft must be created in Shopify's Checkout settings interface. No draft was created and the active
checkout was deliberately left untouched.

[Saudi phone boundary] Email remains the checkout contact method and the shipping-address phone is
required, producing two separate required fields as intended. Native Shopify settings cannot lock
`+966`, add an input mask, or enforce a nine-digit local number beginning with 5. A server-side
cart-and-checkout validation rule can enforce the normalized value
`^\+9665[0-9]{8}$`, including accelerated checkout, but this Basic store must obtain that
Function through a public Shopify App Store app; custom Function apps require Plus. No app was
selected or installed, and no validation rule was added.

## Unconfigured social glyphs are hidden; official account URLs remain required — 2026-08-31

[Owner correction and canonical rule] The owner rejected visible footer glyphs that behaved like
buttons but had no destination, confirmed that Instagram, Snapchat, and TikTok are the accounts to
connect next, and stated that X is not ready. Canonical GitHub `main` commit
`12a3ca53cb53ef4a09a0d9628ddc19265640b2cc` changes only `sections/footer.liquid`: each social
glyph now renders only when its corresponding theme URL is nonblank. The existing URL settings stay
Shopify-native, so adding a verified account URL later makes that glyph appear and become clickable
without another code change. Blank X is hidden rather than rendered as a dead button.

[Verified data boundary] Fresh Shopify and repository reads found no official public URL or handle
stored for Instagram, Snapchat, or TikTok. Chatwoot inbox numbers are internal identifiers and must
not be converted into public profile links. The draft therefore currently renders only the verified
WhatsApp link `https://wa.me/966508727687` and email link `mailto:info@calapres.com`; the three
account URLs remain an owner-supplied input, and X remains blank.

[Preview and validation] Unpublished theme `165777604864` contains the new footer file with MD5
`909b23bc8b16f2818d7fdc85fa3b3f16` and size 8,594 bytes. Theme Check inspected 181 files with zero
errors and the six existing Rubik remote-font warnings; the footer schema contains 16 unique setting
IDs. A fresh preview DOM contained exactly two footer anchors, no `.social-link--disabled`, no X
glyph, and no horizontal overflow. Theme `165774786816` remains `MAIN`; its footer checksum remains
`b9ead771d07e6a6fdbc6f86e9fe65bc8`, so production was not edited or published.

## Scrollbar gutter removed and the beige palette restored as layered glass in the combined unpublished preview — 2026-08-31

[Owner correction and cause] The owner rejected the visible beige page-scrollbar column and the
flat solid-beige page treatment. The former draft combined a 15 px native scrollbar gutter, a solid
beige track, a beige border around the brown thumb, a solid beige body, 88% beige header glass, and
72% beige panels. Because the glass sat over the same solid beige, blur could not create visible
depth and the whole page read as one colour block.

[Canonical implementation] Canonical GitHub `main` source commit
`9c6d580c5d90f36e15081cf02b3c9ea856352a6b` changes only `assets/calabriz.css`. WebKit browsers now
receive a 4 px brown-derived thumb, a fully transparent track and corner, and no beige thumb border;
Firefox retains its native thin treatment in a Firefox-only feature query. The page tint is 16%
beige, normal surfaces 20%, panels 26%, header glass 58% with 24 px blur, and floating navigation and
cart surfaces 72% with blur for legibility. Text, controls, logo, and interaction states remain
derived only from `#DFD4C3` and `#44271B`; the search field was corrected from beige text to brown.

[Shopify preview and production boundary] The exact final asset persists in unpublished theme
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`) with MD5
`5059457f36d3dd3331be762a8eaa1b64` and size 44,236 bytes. Shopify reread shows the draft as
`UNPUBLISHED`, not processing, and without a processing failure. Theme `165774786816` remains
`MAIN`; its CSS checksum is still `c5503cec29f1c5c4baf72e1742f6972a`, so production was not edited
or published.

[Validation and remaining review] Theme Check inspected 181 files with zero errors and the six
existing Rubik external-font warnings. A fresh in-app 1280 by 720 preview reduced the reserved
scrollbar gutter from the measured 15 px baseline to exactly 4 px, removed the beige track, and had
no horizontal overflow. Visual checks covered the page top, the light content area, the header over
dark product photography, the footer, the cart drawer, and the navigation panel. Computed values
matched the intended 16% page tint, 58% header glass, 24 px header blur, and 4 px gutter. Layout
breakpoints were not changed, but a fresh final mobile screenshot was not available after the
browser-session handoff; mobile owner review therefore remains part of the publication gate.

## Hero-video action is transparent and slightly lower in the combined unpublished preview — 2026-08-31

[Owner correction and implementation] The owner rejected the brown rectangle around the first
homepage video's `تسوقوا الآن` action and asked for the action to sit slightly lower. Canonical
GitHub `main` commit `bce7d159670147f365ac43eadbb2d4361ed04209` changes only
`assets/calabriz.css`: the normal and hover backgrounds are transparent, the full rectangular
border is removed, a single beige underline remains, and the wrapper is translated 12 px downward.
A brown-derived text halo preserves legibility across changing video frames, and keyboard focus has
an explicit beige outline. The label, arrow animation, and exact destination
`https://calapres.com/collections/all` are unchanged.

[Shopify preview and production boundary] The same asset persists in unpublished theme
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`) with MD5
`6157d7918151a17a2d8d77889349fe04` and size 42,705 bytes. Shopify reread shows that draft as
`UNPUBLISHED`, not processing, and without a processing failure. Theme `165774786816` remains
`MAIN` and was not edited or published.

[Validation] Theme Check inspected 181 files with zero errors and the six existing Rubik
external-font warnings. Fresh preview renders at 320 by 700, 390 by 844, and 1280 by 900 px had no
horizontal overflow. The action's bottom gap changed from 36 to 24 px on both mobile checks and from
27 to 15 px at 1280 by 900; the in-app 1280 by 720 viewport measured 9.6 px after the same 12 px
translation. Computed normal state is fully transparent with no box, one 1 px beige underline, and
the intended brown shadow. The mobile visual read shows the action unobstructed above the video's
lower edge.

[Contrast boundary] This owner-directed transparent treatment supersedes the previous backed hero
action and its unconditional 5.25:1 worst-frame contrast claim. The beige underline and brown halo
remain derived only from the approved two-colour palette and improve practical legibility, but a
single guaranteed contrast ratio cannot be claimed for every moving video frame. Publication of the
combined draft still requires the owner's visual approval.

## Footer icons optically normalized in the combined unpublished preview — 2026-08-31

[Cause and bounded implementation] The owner reported that the X glyph appeared higher and larger
than the other footer platforms and that only WhatsApp enlarged on hover. Fresh browser geometry
proved that all six interaction boxes were already aligned at 40 by 40 px. The mismatch came from
the SVG paint bounds: X filled almost its complete viewBox while the other platform glyphs retained
internal whitespace. Instagram, Snapchat, TikTok, and X also have blank settings, so Liquid renders
them as disabled spans and the former disabled-hover rule cancelled the shared transform.

[Canonical source and Shopify preview] Canonical GitHub `main` commit
`3e9e57423cd8b5b8ffc2f02f8aba47d026f5ea5d` changes only `assets/calabriz.css`. It optically
calibrates Snapchat, WhatsApp, X, and email, lowers TikTok by 0.03 rem, and lets disabled platform
glyphs inherit the same hover transform while retaining `cursor: default` and no `href`. The
same file now persists in unpublished theme `165777604864` with MD5
`ab04e90808c4306f42b34ce432dd728b` and size 42,475 bytes. Theme `165774786816` remains
`MAIN` and unchanged.

[Validation and boundary] Theme Check inspected 181 files with zero errors and six pre-existing
external-font warnings. Fresh 320 px, 390 px, and 1280 px preview renders kept the six 40 px boxes
on one row with no horizontal overflow. Their painted platform heights are now approximately
25.6 px, and an in-app pointer test returned the same
`translateY(-2px) scale(1.04)` transform for Instagram, Snapchat, TikTok, WhatsApp, X, and email.
WhatsApp still links exactly to `https://wa.me/966508727687`, email to
`mailto:info@calapres.com`; Instagram, Snapchat, TikTok, and X remain deliberately unlinked.
Publication is pending owner visual approval of the combined preview.

## Rubik selected as the shared Calapres typeface; storefront preview only — 2026-08-31

[Owner choice and compatibility] The owner selected Rubik as the intended common typeface for the
storefront and checkout. The current Google Fonts source confirms Arabic support and the SIL Open
Font License 1.1. Authenticated Shopify Checkout inspection showed Rubik in both the Headings and
Body typography pickers; their saved values remain Almarai.

[Canonical and unpublished storefront implementation] The bounded source change started from clean
GitHub `origin/main` commit `51388fd8d97d7eb45ab96031d67c20e27d0fbc17` and reached canonical
GitHub `main` commit `57ba09ae875dbf97572aa6d133e4b488eedfd43e`. Only
`assets/calabriz.css`, `layout/theme.liquid`, and `layout/password.liquid` changed: the shared family
is Rubik and the layouts request only weights 300, 400, 500, and 700. Shopify draft
`Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`) remains `UNPUBLISHED`, not
processing, and without a processing failure. The three persisted files exactly match the canonical
source:

- `assets/calabriz.css`: MD5 `6024e3040c7482a9b7bdf62951b8b97f`, 42,290 bytes.
- `layout/theme.liquid`: MD5 `2050521984003899b13538d938fd10b3`, 3,762 bytes.
- `layout/password.liquid`: MD5 `5c19d2d396eb36780f41bbfe4db90c0d`, 1,812 bytes.

[Validation] Theme Check inspected 181 files with zero errors and six `RemoteAsset` warnings for the
existing external-font loading pattern, now pointing to Rubik. Fresh renders at 320 px, 390 px, and
1280 px loaded `Rubik, sans-serif`, passed `document.fonts.check`, had no horizontal overflow or
header overlap, and retained all six footer glyphs on one row. WhatsApp and email destinations
remained exact. The in-app preview console contained no errors or warnings.

[Checkout and production boundary] In the active checkout editor, Rubik was selected for both
Headings and Body only as an unsaved editor state; the Save action became enabled but was not
pressed. The checkout preview and saved configuration therefore remain Almarai. Theme
`165774786816` remains `MAIN`, so the public storefront also remains Cairo. Do not claim full-store
alignment until theme `165777604864` is visually approved and published and the separate checkout
save is confirmed, then survives a full reload with Rubik in both fields. Decision 0026 records this
boundary.

## Two-colour Calapres storefront palette ready in an unpublished preview — 2026-08-31

[Canonical source and Shopify roles] This bounded palette stage started from clean GitHub
`origin/main` commit `0b18953b8823bc254ff28406ae21be90f70cb7e0`. Its implementation source
reached GitHub `main` commit `0030abf2cf99229426a29a63591c2cacce4ffdc3`. A fresh authenticated
Shopify reread confirms theme `165774786816` remains `MAIN`, immediate rollback theme
`165770887424` remains `UNPUBLISHED`, and the new palette preview `165777604864` remains
`UNPUBLISHED`, not processing, and without a processing failure.

[Owner direction and exact values] The owner selected the supplied Magnific-created wax-seal image
as the colour authority and requested one light beige ground plus one burnt-brown ink for writing
and the storefront logo. Magnific creation `DoBCSVCpcl` described deep cocoa brown on warm ivory or
soft cream but contained no hex codes. Sampling the owner's 1280 x 1280 source image, SHA-256
`fb47a383ba18532aa2c90dfa4888b442f18f5af40130f95138e5599e6a4edaaa`, produced ground
`#DFD4C3` and ink `#44271B`, with 9.24:1 contrast. Decision 0025 records the exact scope and the
production-approval gate.

[Implemented interface] The storefront uses only those two source colours. Panels, borders,
shadows, overlays, selection, hover states, and focus indicators are transparency derivatives.
Black, gray, gold, white, and red interface literals were removed. Scrollbar track and thumb, all
text, buttons, cart quantity badge, cart drawer, form controls, browser `theme-color`, the exact
header wordmark silhouette, and all six footer glyph shapes now follow the beige/brown …25214 tokens truncated…biguous Sends Every 15 Minutes` trigger gained one isolated
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
