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

Publish former main theme `163004449024` only after an explicit owner rollback request, then
verify the live footer and favicon. That rollback removes the reconciled official glyph set,
Calapres monogram favicon, and verified Calapres WhatsApp footer link together. If only the
WhatsApp destination must be withdrawn, clear `whatsapp_url` in the current main theme instead of
rolling back unrelated approved visual work. Do not delete either theme or run the existing
deployment workflow during rollback.
