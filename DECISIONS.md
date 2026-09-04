
# Decision Index

Durable Calapres decisions live in the `decisions` directory. GitHub `main` is the authoritative
decision record.

Latest clarification (2026-09-05): decision 0025 requires the original flourished CALAPRES wordmark
asset in the family campaign, not generic lettering. This does not change the live site or checkout.
The owner also authorized a two-concept campaign comparison against the existing burnt-brown CR
seal; this is a creative comparison, not a replacement of the live wordmark (decision 0025).
Subsequent owner approval accepts BOTH campaign identities for alternating future ads. Decision 0025
also records compact upper text, visible incense smoke, family/newlywed/bridal audiences, and no bridal
faces or full figures. This does not itself authorize publishing a campaign or changing the storefront.
Latest creative expansion: retain earlier images, but use distinct full-photograph/no-copy concepts
and actual gray/beige product references, with only the approved logo (decision 0025).
The owner subsequently approved logo-free photography and requested removal of overlaid branding
from all four new concepts while retaining originals and the physical burner ornaments (0025).

## Active decisions

- [0001 — Adopt the One Brain repository foundation](decisions/0001-one-brain-foundation.md)
- [0002 — Retire Nawadir Dior and adopt an owner-curated catalog](decisions/0002-retire-nawadir-dior.md)
  — supplier retirement remains permanent; its former database architecture is superseded by
  decision 0006.
- [0003 — Calapres SKU format](decisions/0003-calapres-sku-format.md) — existing SKU immutability
  remains active; database-issued SKUs are superseded by decision 0006.
- [0004 — `main` is the single canonical branch](decisions/0004-single-canonical-branch.md)
- [0006 — Retire Supabase and adopt Shopify-native operations](decisions/0006-retire-supabase.md)
- [0007 — Publish an isolated Calapres ownership-proof site](decisions/0007-publish-ownership-proof-site.md)
- [0008 — Adopt the Optix multi-brand customer-service architecture](decisions/0008-optix-customer-service-architecture.md)
  — approved for design and a Calapres-only pilot; n8n remains an orchestration layer and every
  brand's knowledge, credentials, customer context, and store adapter stay isolated.
- [0009 — Adopt a multi-brand ownership-evidence registry](decisions/0009-adopt-multibrand-ownership-evidence-registry.md)
  — repeat the successful permanent ownership-proof pattern for each future verified brand while
  keeping Calapres as the only active implementation.
- [0010 — Adopt the Calapres customer-service runtime](decisions/0010-adopt-calapres-customer-service-runtime.md)
  — use a Calapres brand edge plus an immutable credential-free Core, direct structured LLM calls,
  a separate private Shopify index, a private no-write Owner Review Desk, scoped operational
  tables, channel-aware delay, signed-request replay protection, and a no-send observation gate;
  Captain and AgentBot do not respond and pre-activation row projections are non-persistable.
- [0011 — Require transactional customer-service state](decisions/0011-require-transactional-customer-service-state.md)
  — keep n8n Data Tables as no-send previews rather than atomic authority; require a provider-neutral
  exactly-one-winner contract backed later by an owner-approved, dedicated managed PostgreSQL
  boundary before durable internal observation or customer egress. The contract also governs a
  bounded four-inbox Chatwoot reconciliation scan and per-conversation cursor without claiming
  complete discovery, and separates signed-webhook, reconciliation, and owner database roles. No
  provider or database is created by this decision, and Supabase remains prohibited.
- [0015 — Adopt the governed Calapres response library and scope gate](decisions/0015-adopt-governed-calapres-responder.md)
  — keep one existing responder and send path; select customer replies only from versioned
  Calapres knowledge or exact Shopify read-only capabilities, and redirect external questions.
  Its fixed grammar as the primary understanding layer is superseded by decision 0016.
- [0016 — Adopt a grounded support agent with isolated brand packs](decisions/0016-adopt-grounded-support-agent.md)
  — use the existing restricted model only for strict semantic classification, validate its output
  deterministically, read live Shopify facts through bounded brand-filtered queries, and render
  replies from an isolated brand pack without web search or cross-brand access. Its requirement for
  deterministic customer-visible prose is superseded by decision 0017.
- [0017 — Adopt grounded natural response composition](decisions/0017-adopt-grounded-natural-response-composer.md)
  — preserve deterministic facts and send controls, but express each grounded draft through a
  context-aware natural composer with strict output parsing and deterministic hallucination checks.
- [0018 — Adopt Chatwoot Captain for the prelaunch customer-service pilot](decisions/0018-adopt-chatwoot-captain-prelaunch-pilot.md)
  — make the existing Captain assistant the only automatic responder on WhatsApp, Instagram, and
  TikTok and keep the failed n8n responder unpublished. Its former plan/tool restriction is
  superseded by decision 0019.
- [0019 — Adopt isolated Captain external-tool bridges](decisions/0019-adopt-isolated-captain-external-tool-bridges.md)
  — keep Captain as the only responder, permit one small independently removable n8n bridge per
  external feature, and adopt the first read-only Shopify order bridge without claiming a carrier
  connection, order-number lookup, Shopify write, or proven real matched-order response.
- [0020 — Adopt a Captain product-link bridge and concise-response policy](decisions/0020-adopt-captain-product-link-bridge-and-concise-replies.md)
  — add a second independently removable, title-and-canonical-link-only Shopify bridge; keep reply
  length and live-product-fact boundaries as two separate Captain guidelines; wait for the customer
  after silence; preserve the first failed Playground acceptance as diagnostic history; correct the
  n8n URL-sandbox validator and Chatwoot `response.*` template paths; require the tool for explicit
  Arabic purchase/link intent; verify the exposed authorization's replacement and retired-value
  rejection; and accept the final two-line title-plus-canonical-link Playground reply.
  External-channel delivery remains unverified.
- [0021 — Adopt Shopify-native short product links for Captain](decisions/0021-adopt-shopify-native-short-product-links.md)
  — add exactly three first-party Shopify redirects for the white, beige, and gray burners and map
  only their exact canonical URLs to an exact short-URL allow-list in the existing five-node
  product-link bridge. Shopify redirect and local mapping checks passed; after a transient n8n
  HTTP `503`, the recovered host returned a successful exact title-plus-short-link Playground
  reply. Physical external-channel delivery remains unverified, and Chatwoot classification
  remains a documented proposal only.
- [0022 — Adopt a low-friction Shopify checkout with the live Calapres identity](decisions/0022-adopt-low-friction-shopify-checkout.md)
  — preserve guest checkout, require first and last name, keep one-page checkout and address
  autocompletion, save the bounded Arabic labels including
  `( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )`, and require separate email and
  shipping-phone fields. The former Almarai, white, dark `#1B262D`, and simplified-seal presentation
  is now rejected; duplicate the active checkout before previewing the exact realistic wax seal,
  owner-approved pale-beige glass-like treatment, burnt-brown, and Rubik replacement. On Basic,
  glass-like is a pale solid-surface approximation rather than actual blur or checkout CSS. The
  English wordmark is not the checkout logo.
  The implemented shipping amendment names
  both domestic manual rates `التوصيل داخل السعودية` without changing their prices or thresholds,
  and places the compact Saudi Post WhatsApp helper only in the theme-controlled cart before
  checkout. Native Shopify cannot enforce a fixed Saudi mobile pattern; a public validation app
  remains an unapproved separate choice on Basic. Apple Pay stays native, no Gulf shipping zone
  exists, and Paymob remains in test mode, so real payment settlement is still unverified.
- [0023 — Set Saudi VAT collection to zero pending obligation review](decisions/0023-set-saudi-vat-collection-zero-pending-review.md)
  — based on the owner's statement that Calapres has no VAT registration, set the Saudi Manual Tax
  country rate from 15% to 0% while preserving tax-inclusive pricing off, tax on shipping off, and
  no overrides or import-duty collection. A fresh 390 SAR checkout showed no tax line and a 390 SAR
  total with the currently applicable free shipping. Zero is a no-collection configuration, not a
  legal zero-rating claim. The connected Shopify store has zero sales in the prior 12 months, but
  entity-wide and forecast supplies remain unknown and require prompt confirmation.
- [0024 — Publish the reconciled Calapres theme with a verified WhatsApp destination](decisions/0024-publish-reconciled-theme-with-verified-whatsapp.md)
  — make the reconciled four-glyph and Calapres-favicon theme the live Shopify theme only after
  matching the destination against the connected Chatwoot/Meta identity and opening the public
  WhatsApp Business page headed `Calapres | كالابريز`. Keep Instagram, Snapchat, and TikTok
  disabled until their official URLs are individually verified, preserve the former main theme as
  rollback, and do not use the Saudi Post helper number as Calapres contact information. The
  2026-08-31 amendment adds a verified email link and an official X glyph without guessing an X
  destination, requires all six footer icons to remain in one row at 320 px and wider, and is now
  executed in live theme `165774786816` with `165770887424` preserved as rollback. A later
  amendment optically normalizes the unequal SVG paint bounds and gives all six glyphs the same
  hover motion in unpublished preview `165777604864`, without inventing links for disabled
  platforms.
- [0025 — Adopt the Calapres beige and burnt-brown storefront palette](decisions/0025-adopt-two-colour-storefront-palette.md)
  — use source ground `#DFD4C3` and ink `#44271B`, with interface layers derived only by
  transparency; recolour the exact header wordmark silhouette and existing social glyph geometries
  while preserving link rules; use a cart-specific 46% glass surface above a 12% scrim with 60%
  text panels; keep media, product swatches, native third-party branding, and checkout outside this
  theme-palette claim; and require owner approval before publishing the verified unpublished preview.
- [0026 — Adopt Rubik as the shared Calapres interface typeface](decisions/0026-adopt-rubik-shared-typeface.md)
  — use Rubik weights 300, 400, 500, and 700 for the storefront and password layout and use Rubik
  separately for checkout headings and body; keep the verified theme draft unpublished and retain
  Cairo on the public storefront and Almarai in active checkout until the coordinated production
  changes are independently confirmed.
- [0027 — Use one `مبخر أنيق`, not a set or multi-piece bundle, in customer-facing copy](decisions/0027-use-mibkhara-in-product-copy.md)
  — includes the owner-approved family-name campaign text and bounded Magnific trial; single-burner
  composition remains mandatory and trial generation is not publication approval.
  — remove every stand, oud-box, set, and three-piece claim; show the exact product summary
  `مبخر أنيق` plus `حفر الاسم أو الشعار`; and keep product data, storefront pages, reusable theme
  defaults, and the homepage meta description aligned to that physical offer.
- [0028 — Use Western `0–9` digits across customer-facing storefront numerals](decisions/0028-use-western-digits-across-storefront.md)
  — render every store-authored decimal numeral with Western digits in every storefront locale,
  normalize late theme-DOM content, preserve exact customer-authored and machine-readable values,
  and verify native checkout as a separate Shopify-controlled surface. The owner approved and
  executed storefront publication on 2026-09-01 while accepting the documented native Arabic-
  checkout exception.
- [0029 — Hide the empty product-review section until authentic reviews exist](decisions/0029-hide-empty-product-reviews.md)
  — remove the complete review heading, widget container, page data, unused spacing, and isolated
  styling from every product page; keep review-app data untouched and restore a review surface only
  through a later owner-approved implementation backed by authentic reviews. This presentation
  change is live in theme `165804638464`.
- [0030 — Adopt OTO as the prepaid-only Shopify shipping bridge](decisions/0030-adopt-oto-prepaid-only-shipping-bridge.md)
  — connect the existing Calapres OTO account and map the Shopify fulfillment location while
  keeping cash on delivery off and preserving the current manual Saudi rates. Complete the exact
  physical pickup address and packaged measurements before one prepaid end-to-end shipment test;
  do not fund OTO, book a carrier, or enable OTO checkout rates by assumption.
- [0031 — Rebuild Captain knowledge and limit human handoff](decisions/0031-rebuild-captain-knowledge-and-limit-handoff.md)
  — keep the governed Captain knowledge and `Wait for the customer`, but do not hand off merely
  because a customer requests a human/employee or challenges the reply as AI. Continue service
  without claiming to be human or exposing system limitations. The former handoff scenario is
  disabled after a fresh repeated-request canary; urgent priority labeling remains enabled, while a
  durable 24-hour owner alert is still unimplemented. A future valid transfer must use a brief
  apology and `الموظف المختص`.
- [0032 — Adopt the Chatwoot conversation operations taxonomy](decisions/0032-adopt-chatwoot-conversation-operations-taxonomy.md)
  — organize conversations with seven visible operational labels, require one controlled outcome
  before resolution, and keep automated routing changes outside this bounded stage.
- [0033 — Adopt a bounded Calapres Operations Director draft](decisions/0033-adopt-calapres-operations-director-draft.md)
  — keep one unpublished owner-facing n8n agent with three English skills, Arabic owner responses,
  and no channel, schedule, sub-agent, episodic memory, MCP, customer send, or commerce write
  authority. Shopify and Firecrawl remain eligible for later separately approved read-only canaries
  but are not currently attached after the documented recovery.
- [0034 — Prefer direct OpenAI API as the primary Calapres agent provider, subject to n8n Agent compatibility](decisions/0034-use-direct-openai-api-for-calapres-agent.md)
  — prefer a Calapres-dedicated customer-owned OpenAI project, credential, and budget for the
  internal Operations Director; keep Gateway as the unpaid trial path, do not adopt OpenRouter as
  primary, keep compatibility verification pending, and require fresh approval for payment,
  credential creation, and binding work.
- [0035 — Adopt a private cross-brand owner command center](decisions/0035-adopt-private-owner-command-center.md)
  — use `سكرتيرة عبدالرحمن` as the private Telegram-facing parent, with portfolio-wide default
  scope across all owner businesses and personal organizational matters. Published owner-only
  workflow `Owner Telegram Voice Bridge` handles text, Arabic voice transcription, verified
  transport identity, and one stable owner session. Delegate bounded Calapres analysis to the
  unpublished `Calapres Operations Director`; customer contact, live operational actions,
  proactive alerts, provider funding, and future-brand access remain behind their stated gates.

- [0036 — Federate owner business sources through brand-isolated read-only tools](decisions/0036-federate-owner-business-sources-read-only.md)
  — keep one owner interface, connect live sources read-only first, label every result by brand,
  and report unattached coverage as `UNKNOWN`. Calapres Shopify orders/products are live and
  verified through Telegram. Metricool is also live for five account-wide read operations with all
  create, update, review, and publish tools excluded; named-brand isolation is instruction-enforced,
  not credential-level. OTO, Chatwoot, generic mail/Drive/Notion, and ChatGPT-derived knowledge
  remain separately scoped or unverified.
- [0037 — Establish Klaviyo technically and defer email visual design](decisions/0037-establish-klaviyo-technically-defer-email-design.md)
  — keep Klaviyo connected to Shopify for consented email, markets, products, and onsite events;
  establish Arabic RTL lifecycle flows with verified dynamic links and fail-closed order filters;
  keep every email flow and message in draft until external visual design and fresh send approval;
  retain Chatwoot for WhatsApp, keep SMS and paid analytics off, and require separate approval to
  bind ad accounts, start paid review integration, or incur spend.

## Superseded decisions

- [0005 — Agentic discovery cannot bypass catalog governance](decisions/0005-agentic-catalog-governance.md)
  — superseded by decision 0006.

Add a numbered decision when scope, architecture, security posture, source authority, or operating
policy changes.
