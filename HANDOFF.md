# Handoff

## Resume here — expand beyond verified Shopify and Metricool reads — 2026-09-04

Published owner Agent `سكرتيرة عبدالرحمن` is active on version
`27de4fbd-f4bf-47e3-b492-00abbfe56044`. It retains the two verified Calapres Shopify read tools and
now also has Metricool restricted to five read-only operations: brand settings, scheduled posts,
analytics metric discovery, analytics reads, and best-time reads. The Metricool operations that
create, update, or submit posts for review are explicitly excluded.

The live Metricool credential identified `Calapres | كالابريز` as brand `6694961`. A direct
Agent canary for that exact brand returned zero scheduled unpublished posts with `VERIFIED` and
performed no write. The account-wide credential can read other owner brands, so this is a
portfolio-owner read source, not a credential-level single-brand boundary. Preserve the instruction
gate: named-brand requests query only that brand, portfolio requests query brands separately, and
every result stays labeled.

The Telegram voice/text bridge remains unchanged. Its previously verified Shopify round trip still
proves the transport-to-Agent path; the new Metricool publication was verified through the Agent
canary, not a separate Telegram round trip.

Next, obtain or build one bounded read path for Chatwoot and OTO. Do not treat Shopify fulfillment
fields as OTO shipment proof. Do not attach generic Gmail, Drive, or Notion accounts until their
exact business scope is named. ChatGPT conversations are context, while canonical GitHub remains
durable authority. No customer send, shipment, commerce write, social publication, credential,
payment, schedule, or proactive alert is approved by this read-source expansion.

Read [decision 0036](decisions/0036-federate-owner-business-sources-read-only.md) before continuing.

## Resume here — expand the verified read-only business source federation — 2026-09-04

The owner secretary is no longer source-blind for Calapres Shopify. Published Agent
`سكرتيرة عبدالرحمن` has exactly two live business tools:
`calapres_shopify_orders_readonly` and `calapres_shopify_products_readonly`. Both use the existing
`Shopify-Calapres` OAuth credential and expose only `getAll` reads. The Agent is active on version
`465ba704-3580-4df4-b453-8093a6b59d7d`.

A direct canary returned zero Calapres orders created on 2026-09-04 Riyadh time. A catalog canary
returned three active products and three variants, with recorded quantity zero and inventory
tracking disabled. A real Telegram request through `Owner Telegram Voice Bridge` returned
`0 — VERIFIED`. This proves the published owner path can call the live Shopify read source.

Do not describe OTO, Chatwoot, mail, Drive, Notion, marketing platforms, ChatGPT history, or other
brands as connected. No clearly identified reusable n8n read credential was found for OTO or
Chatwoot. Generic Gmail, Drive, and Notion credentials remain unattached because their business
scope is not bounded. ChatGPT context is not operational authority; use canonical GitHub for durable
project state. Supabase remains retired for Calapres.

Next, verify and add one named source at a time with a live read canary. Keep brand-specific tool
names and credentials, omit customer contact and address fields when they are not needed, and never
expose write operations. Any send, update, fulfillment, refund, payment, credential, permission,
schedule, or proactive alert still requires its applicable action-time approval.

Read [decision 0036](decisions/0036-federate-owner-business-sources-read-only.md) and
[decision 0035](decisions/0035-adopt-private-owner-command-center.md) before continuing.

## Resume here — add read-only incident sources after verified voice bridge — 2026-09-04

The private owner command center is live for text and voice. Open the stable n8n Agent
`سكرتيرة عبدالرحمن`, agent ID `LKA07iWfCpjawVNB`, from the project Agents list and confirm active
version `0512e496-51e9-421e-8880-0a499efe2c95` before editing. Its authorized Telegram username is
`@A_Awdsh`. The numeric Telegram owner identity remains the actual allowlist and must not be placed
in GitHub, instructions, logs, or owner-facing reports.

Published workflow `Owner Telegram Voice Bridge` (`0EQB4mv5NknrXsHM`, active version
`454e29f5-b6dc-4569-8a1b-c3267470041c`) owns the webhook for
`@AbdulrahmanCommandCenterBot`. The Agent's direct Telegram integration is intentionally
disconnected to avoid webhook conflict. The workflow reuses credential `Qj1UoPHZNEEWn5dX`,
requires both the exact numeric user and private-chat allowlists, sends text to the existing Agent,
and uses the managed n8n OpenAI audio transcription operation for Arabic voice notes before sending
the transcript to that Agent. Do not reconnect the direct Agent integration while this workflow is
published unless first unpublishing the workflow.

Voice is verified, not proposed: a real 3-second owner note was transcribed exactly as
`أريد أن أسأل، هل هناك طلبات اليوم؟`; the Agent replied in Telegram and workflow execution
`45166` succeeded end to end. A separate two-message canary confirmed one stable conversation
session. The workflow-authored trusted transport context is valid only after the numeric user and
private-chat gates pass and never waives written action-time approval for risky or external actions.

The owner Agent's default scope is portfolio-wide. If the owner does not name a brand, treat the
request as covering every authorized and connected business, project, commercial operation, and
personal organizational matter. Return one consolidated view and group evidence by brand where
useful. Do not ask which brand merely because a source is absent; state the missing coverage as
`UNKNOWN` or `UNVERIFIED`. Ask a brand question only for a materially ambiguous request or
immediately before a brand-specific risky action whose target cannot be safely inferred. A live
Telegram canary for `وش الجديد اليوم في كل أعمالي؟` passed this behavior.

`Calapres Operations Director` (`olVB3TzKClXjuOei`) remains an unpublished bounded internal
specialist with its three approved skills and no channel, schedule, commerce tool, customer-send
authority, or expanded permission. Captain remains the only customer-facing automated responder.

The next stage is to define and separately approve the minimum read-only operational sources and
incident rules needed for meaningful P0/P1/P2 alerts. No live source, proactive trigger, or schedule
is attached yet. Do not send customer messages, alter commerce or fulfillment, create or expose
credentials, fund a provider, top up the Gateway, enable automatic top-up, or enable schedules by
assumption. Decision 0034's direct OpenAI path remains pending separate live compatibility and plan
verification plus action-time approval for credential and payment work.

Read [decision 0035](decisions/0035-adopt-private-owner-command-center.md) before continuing.

## Resume here — verify the restored agent and its direct-OpenAI path — 2026-09-03

Open the existing n8n Agent `Calapres Operations Director` from the project Agents list and confirm
stable agent ID `olVB3TzKClXjuOei` in project `AeQgtZlgJbiXCM2e`. Do not resume it from a saved
`/assistant/<uuid>` route: that route is a transient assistant artifact, not the stable agent
record. The saved draft was later observed as a blank `New Agent`; the cause is unproven, while
stale or concurrent editor state, autosave, and an interrupted connection remain observed risks.
The draft was restored and an instructions-only preview passed, but its former Shopify and
Firecrawl tools were deliberately not reattached. It remains unpublished with no channels,
schedules, sub-agents, episodic memory, or MCP access.

The immediate next action is read-only: verify the current live draft from the stable Agents list,
then establish whether this n8n first-class Agent can use a customer-owned OpenAI credential. The
accepted direction is a Calapres-dedicated direct OpenAI API project/key/budget with `GPT-5.6 Sol`;
implementation is pending. Do not top up n8n Gateway, enable auto-top-up, fund OpenAI, create or
attach a credential, configure OpenRouter, reattach a tool, or publish the agent without fresh
action-time approval. If direct credentials are unsupported in the current Agent surface, preserve
the Gateway draft and return for a new decision instead of building an unapproved workaround.

After any approved model binding, run one bounded instructions/model canary. Reattach Shopify and
Firecrawl only as two later, separately approved read-only canaries, one tool at a time. Keep Captain
as the only customer-facing responder and do not send messages or write to Shopify, orders,
shipping, Chatwoot, Meta, or payment systems.

Read [decision 0033](decisions/0033-adopt-calapres-operations-director-draft.md),
[decision 0034](decisions/0034-use-direct-openai-api-for-calapres-agent.md), and the
[detailed 2026-09-03 handoff](docs/handoffs/2026-09-03-calapres-agent-recovery-provider-and-whatsapp-history.md).
The detailed record also preserves the official WhatsApp-history export limits and the proposed
direct Chatwoot archive path; no archive was executed.

## Chatwoot conversation operations stage 1 — 2026-09-02

Resume from decision 0032. In live Chatwoot account `179973`, use the seven sidebar labels to route
attention. The `المجلدات` section contains eight saved filters: `بانتظار العميل`,
`يحتاج تدخل بشري`, `عملاء منزعجون`, `مهتم ولم يطلب`, `طلبات قائمة`, `مشكلات الشحن`,
`مشكلات الدفع`, and `سبام وخارج النطاق`. Before resolving a conversation, select one value in the
required `نتيجة المحادثة` (`conversation_outcome`) list.

This stage deliberately did not alter Captain assistant `2187`, its connected inboxes, the enabled
assignment automation, existing conversations, or Meta/WhatsApp templates. Auto-resolve remains
off. Do not bulk-label old conversations. The next separately approved stage should define who or
what applies each label, then test one new conversation per channel before expanding automation.

## Resume here — the live favicon is the transparent brown wax seal — 2026-09-02

The owner requested the brown Calapres seal without a background in the browser tab. The former
selected file, `calapres-favicon-monogram-2026-08-31.png`, was a flat gold monogram on a solid brown
RGB square. Live theme `165804638464` now selects the already-approved transparent RGBA file
`calapres-checkout-wax-seal.png` for its `favicon` setting.

Shopify saved the change, and a fresh public response emits the new file for the 16 px and 32 px
favicons, shortcut icon, and 180 px Apple touch icon. If Safari temporarily shows the prior icon,
reload or open a new tab because Safari may retain the old site icon locally; do not revert the
Shopify setting on that basis. No image was regenerated and no other storefront or checkout setting
changed.

## Resume here — Captain library v2 is live; outbound WhatsApp remains separate — 2026-09-02

The owner approved and the live Chatwoot Captain assistant `2187` received the full knowledge
cleanup. It now has seven authoritative documents and 18 curated manual FAQs. The separate order-
status topic is intentionally not a static FAQ; it must use the existing read-only order tool.
Do not restore the deleted product/sitemap documents or any set, stand, oud-box, or two-letter
engraving claim.

The assistant description, product and engraving guardrails, response guidelines, and enabled
handoff scenario are updated. General questions, missing answers, out-of-scope questions, and
inactivity must not hand off. `Wait for the customer` is selected. The limited scenario may hand
off only for an explicit employee request, an order mutation, cancellation/refund execution,
payment dispute or sensitive case, or verified order-tool failure after a safe attempt.

Playground verification passed for service scope, one-burner contents, no cash on delivery, the
SAR 25 / SAR 320 shipping thresholds using Western digits, and the changing-price boundary. A
stale two-letter engraving response appeared in the first test, so an explicit supersession
guardrail was added; the fresh rerun correctly returned name-or-logo engraving.

The next customer-service stage is separate: design and approve a Meta utility template for a paid-
order confirmation, normalize accepted Saudi phone forms to E.164, and send nothing when the number
is invalid. No proactive WhatsApp message, template, outbound workflow, checkout validation change,
or external-channel delivery test was created here.

## Resume here — OTO is connected; complete the pickup origin before a test shipment — 2026-09-01

The owner authorized installing and connecting shipping while keeping payment work for last. The
official Shopify app `OTO - Shipping Gateway` is installed, the existing `Calapres sa` account is
connected, OTO lists Shopify store `Calapres - 82929975552` as active, and the live OTO connection
test returned success. Shopify location `91940061440`, `SMSA Retail Shop`, was matched successfully
to OTO location `396002`, `SMSA Retail Shop`.

Cash on delivery is explicitly prohibited by the owner and is off in the OTO channel. Preserve the
two existing Shopify Saudi rates: SAR 25 for SAR 0–319.99 and free shipping from SAR 320. The OTO
discounted-rates checklist remains incomplete and no OTO rate was added to the Shopify delivery
profile. Do not press the embedded rate-activation action or alter the manual rates without a
separate commercial decision.

The remaining pickup blocker is factual, not technical. OTO's imported sender record has only the
name `SMSA Retail Shop` and city `RIYADH`; it lacks a confirmed phone, detailed physical pickup
address, district, postal code, and short national address. Ask whether the Shopify address
`SMSA Retail Shop, Al Wadi District, Uthman Bin Affan (Exit 7) Road, RIYADH, Saudi Arabia` is the
actual courier pickup origin. If not, obtain the exact short national address or complete pickup
address. Only then fill and activate the sender location. Next obtain the packaged weight and
dimensions and run one prepaid test order through order import, shipment creation, label, tracking,
and Shopify status writeback. No wallet funding, IBAN, paid plan, carrier booking, shipment, or live
order test has occurred.

## Resume here — realistic seal and pale-beige checkout are live — 2026-09-01

The owner explicitly approved the final unsaved mobile preview and then directed `Save`. Active
checkout profile `5133926656` now uses `calapres-checkout-wax-seal.png`, centered at 120 px. Main
is `#FAF8F5`; header and order summary are `#F7F4EF`; header accent, order-summary accent, shared
accent, and primary button are `#44271B`; input fills are transparent; headings and body use
Rubik. The surfaces are Shopify's very pale solid checkout colors, not actual glass blur.

The editor disabled Save after the operation. A fresh public Arabic checkout independently loaded
the new seal from Shopify CDN and computed the exact main, header, button, input, and Rubik values.
No guest-checkout rule, required email or phone field, address wording, shipping rate, payment
provider, Paymob state, product, price, inventory, customer, order, or social setting changed.

The Basic store still has one active checkout configuration and no draft. Shopify's Duplicate menu
did not respond through the authenticated interface; after the exact rollback values were recorded,
the owner approved saving the active configuration. Rollback only if explicitly requested: restore
`Artboard_4_2x-100-removebg-preview.png` centered at 100 px, main and header `#FFFFFF`, order summary
`#F5F5F5`, accents and button `#1B262D`, opaque input fills, and Almarai for headings and body. Do
not delete either logo asset or change checkout behavior during that rollback.

## Resume here — Western digits and review removal are live; social accounts remain deferred — 2026-09-01

The owner explicitly approved publishing the combined storefront bundle after the native Arabic-
checkout digit boundary had been stated, and explicitly excluded social-account setup. Shopify
theme `165804638464`, `Preview — Western digits 0-9 2026-09-01`, became `MAIN` at
2026-09-01T10:25:46Z. Former live theme `165777604864`,
`Preview — Calapres beige + burnt brown 2026-08-31`, is now `UNPUBLISHED` and is the immediate
rollback. Both themes are finished processing without failure; no theme was deleted.

The live theme now renders Western `0–9` digits across theme-controlled storefront surfaces and
removes the complete empty `تقييمات العملاء` product section. Native Arabic Shopify checkout is
unchanged and can still render Arabic-Indic digits because the Basic-plan checkout is outside theme
control. Do not describe the whole checkout as Western-digit complete.

Instagram, Snapchat, TikTok, and X remain blank and hidden exactly as the owner requested for this
publication. Only `https://wa.me/966508727687` and `mailto:info@calapres.com` are visible in the
footer. Add another platform only after receiving and verifying its exact official public URL in
the current theme's Footer settings.

Post-publication proof is complete: Shopify displayed `Theme published`; the Admin API returned
`165804638464` as `MAIN` and `165777604864` as `UNPUBLISHED`; an anonymous public homepage response
identified theme `165804638464` with role `main`, rendered Western prices, and exposed only the two
verified contact links; a public product response used the same theme and contained no review
heading or widget. Products, prices, inventory, checkout, payment, Paymob, shipping, tax, customer
and order data did not change. If rollback is requested, publish only theme `165777604864`, verify
the homepage, cart, footer, product page, and native checkout boundary, and do not delete either
theme.

## Resume here — empty product reviews are gone from the combined draft; live remains unchanged — 2026-09-01

The owner directed complete removal of the empty `تقييمات العملاء` section. Canonical GitHub
`main` implementation commit `28e890086f8466ea621ac22c9e9ec60dd528fccd` removes the heading,
Judge.me widget container, legacy metafield output, review-data script, empty spacing, and three
isolated CSS rules from the shared product section. It does not uninstall Judge.me or delete review
data. Decision 0029 records that authentic reviews may return only through a later owner-approved
implementation.

Shopify returned exactly three active products and `templateSuffix: null` for each, so white, beige,
and gray all use the corrected default product template. Only unpublished theme `165804638464`,
`Preview — Western digits 0-9 2026-09-01`, received the two files; their remote MD5 and sizes match
canonical source. Theme Check passed 181 files with zero errors and six existing remote-font
warnings. Fresh 390 px renders of all three product pages contained no review text or widget, had
only the intended `.pd` block inside the main wrapper, and had zero horizontal overflow.

Live theme `165777604864` remains unchanged. Do not publish the combined draft until the owner makes
the separate Western-digit decision already recorded below: accept Shopify's native Arabic-checkout
digit exception or switch the checkout to English. Preserve rollback theme `165774786816` and do
not delete any theme or review data.

## Resume here — Western digits are verified in draft; native Arabic checkout still uses Arabic digits — 2026-09-01

Canonical GitHub `main` commit `f49f3871c4c650936925a0b55175ff17f29b245a` contains the complete
theme-controlled implementation of the owner's `0–9` rule. Unpublished Shopify theme
`165804638464`, `Preview — Western digits 0-9 2026-09-01`, is a clean duplicate of live theme
`165777604864` plus the seventeen changed theme files. Remote MD5 and size match canonical source;
the draft is not processing or failed. Nothing was published to the live theme.

Theme Check has zero errors and the six existing remote-font warnings. Template and schema JSON
parse, the independent conversion suite passed all 680 Unicode decimal-number characters, and
browser checks passed the homepage, product, cart drawer, standalone cart, About, and 404 pages.
Dynamic cart quantity `2` and total `780` appeared with Western digits; the original cart quantity
`1` and total `390` were then restored. The 390 px storefront and drawer have no horizontal
overflow. Customer input is deliberately preserved exactly: a search for `١٢` continued to show
`١٢`, while the store-generated result count displayed `0`.

The unresolved boundary is real and visible in Shopify's native Arabic checkout: it shows
`١ عنصر` and `٣٩٠٫٠٠ ر.س.`. The theme cannot run there, and a direct
`ar-SA-u-nu-latn` locale test did not change the output. A fresh Admin API read confirms the plan is
Basic and not Plus; Shopify's current documentation says the information, shipping, and payment
checkout steps cannot receive UI extensions on Basic, and theme custom CSS does not apply to
checkout. Do not claim whole-site completion and do not publish draft `165804638464` without the
owner's explicit decision. The safe choices are: publish the verified storefront improvement while
accepting Shopify's Arabic-checkout exception, or switch checkout to English so its native numbers
are Western at the cost of an English checkout. Preserve live theme `165777604864` and rollback
theme `165774786816`; do not delete any theme.

## Resume here — the live offer is one elegant burner plus name-or-logo engraving — 2026-09-01

The owner explicitly superseded the earlier narrow terminology boundary: Calapres does not sell a
stand, an oud box, a set, or a three-piece bundle. The product-facing summary is exactly
`مبخر أنيق` and `حفر الاسم أو الشعار`. Canonical source commit
`ecbcbc3aa81514107f640d5b1ec925c28c1bab7d` corrects nine theme files: the shared product summary,
homepage engraving band, About page, Contact introduction, shopping labels, hero accessibility
copy, and reusable defaults. Those files are live in theme `165777604864` and match a fresh remote
pull byte-for-byte.

The three active Shopify products were audited read-only. Their titles, handles, descriptions, SEO
titles, SEO descriptions, and image alternative text already contain no `ستاند`, `علبة عود`,
`طقم`, `أطقم`, or multi-component claim, so no product record changed. The separate shop-level
homepage meta description still said `مع طقم متكامل`; it was corrected through Online Store
Preferences to one elegant burner with name-or-logo engraving. Shopify displayed `Settings saved`,
and a fresh API read returned the new value.

Theme Check inspected 181 files with zero errors and six existing remote-font warnings. Section
schema IDs are unique, changed templates parse, and fresh public checks returned 200 for the
homepage, all three products, About, Contact, and FAQ. None of those seven pages contains the
rejected composition terms. A fresh browser render of the white product shows `مبخر أنيق` directly
above `حفر الاسم أو الشعار`. No price, compare-at price, inventory, variant, status, handle, image,
cart behavior, checkout, payment, shipping, tax, or social setting changed.

## Resume here — combined beige and burnt-brown design is live and verified — 2026-08-31

The owner explicitly approved publication. Shopify theme `165777604864`,
`Preview — Calapres beige + burnt brown 2026-08-31`, is now `MAIN`; former live theme
`165774786816`, `Preview — six social icons mobile fix`, is `UNPUBLISHED` and remains the immediate
rollback. The role change completed at 21:19:02 Riyadh time. Neither theme is processing or failed,
and no theme was deleted.

Before publication, a full comparison detected corruption in six GitHub files caused by an unrelated
shell-startup line being included in two earlier base64 upload batches. Publication was stopped, the
three theme files were recovered from local commit `0836fac`, the three operating documents from
local commit `6854cd3`, and canonical `main` repair commit
`34cf93d03a63e9da80200d403d12dbca6fc825ae` restored them without rewriting history. The repaired
CSS, editorial section, and homepage template match the live Shopify theme by MD5. Theme Check has
zero errors and six existing remote-font warnings.

Fresh public checks after leaving preview mode confirmed no preview bar, the exact homepage heading
`حفر شخصي على كل طقم`, zero editorial media, live 62% beige cart glass, 74% beige item surface, and
zero document, drawer, or item overflow at the normal width, 390 px, and 320 px. The footer correctly
shows only WhatsApp and email because Instagram, Snapchat, TikTok, and X remain blank. Checkout,
payments, catalog data, and social settings were not changed.

Continue with the next owner-requested stage. If rollback is requested, publish only former live
theme `165774786816`, verify the public storefront, and keep both themes. Do not use the obsolete
repository deployment workflow and do not delete either theme.

## Resume here — lighter cart and image-free homepage band are staged; social URLs are the next input — 2026-08-31

Canonical GitHub `main` commit `73b2ae3c092e949f152a385cac66b705f6fee5e3` and unpublished
Shopify theme `Preview — Calapres beige + burnt brown 2026-08-31` (`165777604864`) contain the
owner-requested cart and homepage refinements. The cart now uses an 8% brown scrim, 62% beige drawer,
74% beige text-bearing surfaces, and the existing 30 px blur. The rounded product card and all cart
behaviour are unchanged. The homepage editorial band sets `show_media` to false and now follows the
video directly with `حفر شخصي على كل طقم`; the about-page image remains enabled by default.

Remote pulls matched the staged CSS and Liquid files byte-for-byte, and a second template push was
required before Shopify retained `show_media: false`; the final template pull then matched exactly.
Theme Check reported zero errors and six existing remote-font warnings. Fresh checks at 320 px,
390 px, and the normal in-app width found no document, drawer, or item overflow, zero editorial-band
media on the homepage, and the exact heading. Theme `165774786816` is still `MAIN`; do not publish
draft `165777604864` without a fresh explicit owner approval.

The social icons are not a rendering regression. Direct reads of both themes and the repository
confirmed blank Instagram, Snapchat, TikTok, and X values; only WhatsApp
`https://wa.me/966508727687` and `info@calapres.com` are configured. The draft intentionally hides
blank links instead of restoring the dead buttons still drawn by the live footer. Obtain the exact
owner-confirmed Instagram, Snapchat, and TikTok profile URLs, update only those three footer settings
in draft `165777604864`, and verify each destination. Keep X blank until its account is ready.

## Resume here — engraving copy uses `العرسان` in both preview surfaces — 2026-08-31

The owner's Arabic correction is complete in canonical GitHub `main` commit
`b14a6b3e486245e7640c41789fe59e113e3a45e2` and unpublished theme `165777604864`.
`sections/editorial-band.liquid` now says `إمكانية حفر اسم العرسان أو التاريخ على الطقم.`, and
the related answer in `templates/product.json` also uses `اسم العرسان`. Fresh homepage and product-
page preview checks found the corrected wording and no `اسم العروسين` occurrence. Theme Check
reported zero errors and the six existing Rubik remote-font warnings. The live theme remains
`165774786816`; do not publish the combined draft without the owner's separate approval.

## Resume here — rounded cart-item card is open in the combined unpublished preview — 2026-08-31

The owner rejected the sharp opaque-looking product band inside the glass cart drawer and asked to
see a corrected card before publication. Canonical GitHub `main` commit
`1735ce8f07165be6851a969736937ceff116c596` changes only `assets/calabriz.css`, and the same file is
staged in unpublished Shopify theme `Preview — Calapres beige + burnt brown 2026-08-31`
(`165777604864`). The card keeps the approved 60% beige readability layer but is now inset and
rounded: 16 px card radius, 10 px image radius, 14% brown border, soft 6% brown shadow, and a 12 px
gap between multiple products. New rules are scoped to `.drawer`, so the standalone cart page is
unchanged.

At 360 px and below, card padding is 12 px, the image is 64 px, and the quantity/price row can wrap;
fresh 320 px and 390 px checks found zero document, drawer, or card horizontal overflow. The normal
in-app preview also showed the correct rounded card with the drawer open. Theme Check inspected 181
files with zero errors and the six existing Rubik remote-font warnings. A fresh remote pull matched
`assets/calabriz.css` byte-for-byte at MD5 `4005f5b8a8769e70e1840127d41143fb`, 44,869 bytes.

The preview is open at `https://calapres.com/?preview_theme_id=165777604864`. Theme
`165774786816` remains `MAIN`; do not publish draft `165777604864` until the owner gives a new
explicit visual approval. If the owner requests another cart-card adjustment, keep it limited to
the drawer card and re-verify 320 px, 390 px, and the normal in-app width.

## Resume here — exact checkout seal and pale-beige glass-like direction approved; create the draft first — 2026-08-31

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
press Edit and Save on the active configuration. In the duplicate only, upload the exact realistic
wax seal staged as `assets/calapres-checkout-wax-seal.png`, center it, and choose its displayed
width only after visual preview; do not use the English wordmark or the old simplified seal. The
staged PNG is 755 x 840 with real alpha, 745,304 bytes, and SHA-256
`2ffe03f1bff302b781bbd882d18e971f878d154aa6f90413e42b6643f25024f1`. Use
`#FAF8F5` for the main background, `#F7F4EF` for the header and order summary, `#44271B` for
accent and button, transparent inputs, and Rubik for headings and body. Preview it before any
publication. The owner explicitly confirmed the background is very light beige and glass-like, not
blue, and approved the exact realistic seal. On Basic, do not claim actual glass blur or CSS
transparency: approximate the intended depth with the two pale solid surfaces and transparent input
fills above. A fresh browser attempt found the enabled `Duplicate` action, but Shopify's popover did
not open and no duplicate action fired. No draft was created and no live checkout value changed.
Authenticated schema inspection confirmed that the Basic store exposes no public checkout-profile
duplication or checkout-branding mutation, so do not attempt an API workaround; create the draft
through Shopify's Checkout settings interface.

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
change timestamp is `2026-08-31T13:01:23Z`; the fo…15694 tokens truncated…814`. Source/live parity verified and both CI workflows
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
