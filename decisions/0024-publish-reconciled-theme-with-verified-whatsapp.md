/Users/awd/.zprofile:1: no such file or directory: /opt/homebrew/bin/brew
# 0024 — Publish the reconciled Calapres theme with a verified WhatsApp destination

Date: 2026-08-31

Status: accepted and executed

## Context

The owner approved the unpublished preview containing the official black Instagram, Snapchat,
TikTok, and WhatsApp glyphs plus the Calapres monogram favicon. Publication was expressly
conditional on proving that the WhatsApp icon would open the real Calapres account rather than a
guessed, historical, test, supplier, or Saudi Post number.

The canonical repository intentionally redacted the operational phone number. Public store pages
did not publish a current Calapres number, while the cart contained a separately labelled Saudi
Post helper. Therefore repository history, third-party directories, and the cart helper were not
sufficient identity sources.

## Decision

1. Treat the connected Chatwoot WhatsApp inbox and its Meta Account Health data, matched by the
   canonical WABA and phone-number identifiers, as the authority for the Calapres WhatsApp
   destination.
2. Use `https://wa.me/966508727687` for the footer WhatsApp glyph only after the public WhatsApp
   page displays the approved Business name `Calapres | كالابريز`.
3. Keep the Saudi Post helper destination `966112898888` confined to its explicitly labelled
   national-address assistance link. Never represent it as Calapres customer service.
4. Keep Instagram, Snapchat, and TikTok visible but disabled until each exact official account URL
   is separately verified. Do not infer destinations from handles, search results, or old records.
5. Publish the reconciled theme `165770887424` as Shopify `MAIN`. Preserve the former main theme
   `163004449024` as an unpublished rollback and do not delete it.
6. Do not use the existing GitHub theme deployment workflow until its obsolete theme-role
   assumptions and noncanonical branch are corrected in a separate reviewed stage.

## Executed record

[Verified identity]

- Authenticated Chatwoot account `179973`, inbox `128058`, and Account Health showed the same
  display phone number, approved `Calapres | كالابريز` display name, connected status, and green
  quality rating.
- Phone-number ID `1202498582954919` and WABA ID `1835160094133742` matched the canonical
  project record.
- `https://wa.me/966508727687` redirected through WhatsApp to a page headed
  `Calapres | كالابريز`. No conversation was started and no message was sent.

[Verified Shopify implementation]

- Only `config/settings_data.json` in unpublished theme `165770887424` was updated before
  publication. Shopify returned no user errors, and the file checksum became
  `d63fd05a769262c4248c65749115c950`.
- A fresh preview render exposed exactly `https://wa.me/966508727687` on the WhatsApp footer link.
- Authenticated Shopify Admin displayed the replacement confirmation and then showed the new theme
  as active.
- A fresh Admin GraphQL reread showed `165770887424` as `MAIN`, not processing and without a
  processing failure; `163004449024` became `UNPUBLISHED`.
- After exiting preview mode, the public footer exposed the exact WhatsApp link and the public head
  emitted the approved Calapres monogram favicon assets.

## Unchanged state

No product, inventory, customer, order, discount, payment, Paymob, shipping, checkout, tax, app,
Captain, n8n, Chatwoot, or Meta configuration changed. The Chatwoot and Meta surfaces were read
only. The other three social account URLs remain blank.

## Rollback

After the six-icon amendment, the immediate rollback theme is `165770887424`. Publish it only
after an explicit owner rollback request, then verify the live footer and favicon. It restores the
prior four-icon reconciled theme while retaining the verified Calapres WhatsApp link and monogram
favicon. Theme `163004449024` remains an older unpublished fallback, not the direct rollback
target. If only the WhatsApp destination must be withdrawn, clear `whatsapp_url` in the current
main theme instead of rolling back unrelated approved visual work. Do not delete any theme or run
the existing deployment workflow during rollback.

## Amendment — six-icon responsive footer — 2026-08-31

Status: accepted and executed

The owner found that the four-icon footer wrapped on mobile and requested X and email as well.
Live measurement proved that the wrap came from the half-width mobile footer column, fixed icon
boxes, and gap—not from a larger WhatsApp layout box.

The durable rules are:

1. Render Instagram, Snapchat, TikTok, WhatsApp, X, and email as one visually balanced set.
2. At mobile widths, let the social block span both footer columns and keep all six icons in one
   non-wrapping row at 320 px and wider.
3. Keep the exact verified WhatsApp destination `https://wa.me/966508727687`.
4. Link email only to the verified official address `info@calapres.com`.
5. Use X's official current glyph, but keep it disabled until an exact official Calapres X URL is
   verified. A search result or inferred handle is not authority.
6. Use duplicate `165774786816` for implementation and preview rather than editing the then-current
   main directly. After final confirmation, publish it as `MAIN` and retain `165770887424` as the
   immediate unpublished rollback.

The draft passed 320 px, 390 px, and 1280 px render checks with one icon row, exact WhatsApp and
email links, no X `href`, and no browser-console errors.

The owner then explicitly authorized publication. Authenticated Shopify Admin confirmed that
publishing `165774786816` would replace `165770887424`; after confirmation, a fresh Admin GraphQL
reread showed `165774786816` as `MAIN`, not processing and without a processing failure, and
`165770887424` as `UNPUBLISHED`. Both roles changed at `2026-08-31T13:01:23Z`.

After explicitly exiting preview mode, a fresh public 320 px render had no preview bar and showed
exactly six 40 px interaction boxes on one shared row. WhatsApp linked exactly to
`https://wa.me/966508727687`, email linked exactly to `mailto:info@calapres.com`, X remained a
disabled span without `href`, and the browser console contained no errors. This amendment did not
alter any product, checkout, shipping, payment, Paymob, customer-service, or automation
configuration.
