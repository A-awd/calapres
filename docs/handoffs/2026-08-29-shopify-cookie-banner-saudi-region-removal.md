# Shopify cookie-banner Saudi-region removal handoff

Date: 2026-08-29

Last verified: 2026-08-29 18:50 Asia/Riyadh

## Identity and bounded scope

- Project: Calapres.
- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- GitHub baseline: `38a28429f749eda9d66142d0e7d568ddcc685408`.
- Included: one owner-approved Shopify Customer Privacy region edit and its immediate verification.
- Excluded: policy translation, theme work, pixels, Customer Events, Shopify products, Captain,
  Chatwoot, n8n, Meta, redirects, customer conversations, and the local storefront prototype.

This is a sanitized operational record. It contains no credentials, customer information, raw
browser responses, pixel identifiers, or platform payloads.

## Starting state

[Verified live in authenticated Shopify Admin]

- The native cookie banner remained enabled.
- Automated region settings were off.
- The manual region editor showed 32 of 299 regions selected.
- Saudi Arabia was checked and was the only selected Asian region.
- Europe showed 31 selected recommended regions, including the United Kingdom.
- The banner content was Arabic and the existing preview remained available.

The connected Shopify MCP was not used for the live edit. Its Admin GraphQL authorization still
lacked `read_privacy_settings`, and the previously identified mutation path could only disable the
banner globally rather than remove one region.

## Executed delta

[Owner-approved and executed live]

1. Opened `Settings -> Customer privacy -> Cookie banner -> Regions -> Edit`.
2. Unchecked only Saudi Arabia.
3. Confirmed the editor changed from 32 to 31 selected regions, Asia changed from 1 of 47 to 0 of
   47, Europe remained 31 of 53 on the full list, and the United Kingdom remained checked.
4. Selected `Done`.
5. Submitted the enabled `Save` action.

No other control was changed.

## Save and persistence evidence

[Verified persisted in authenticated Shopify Admin]

- After save, the save action disappeared.
- After a full page reload, the regions summary read Austria, Belgium, and 29 other regions.
- Reopening the editor showed 31 of 299 selected.
- The editor defaulted to the Recommended tab and showed Europe 31 of 31.
- The United Kingdom remained checked.
- No Asian region was selected.

This post-reload reread proves that the Saudi-only removal reached Shopify rather than remaining a
temporary local form state.

## Storefront evidence

[Observed post-save Saudi storefront context]

- A newly opened `https://calapres.com/` page rendered Arabic and SAR.
- Its inline Shopify storefront country value was `SA`.
- Shopify's native privacy-banner and consent-tracking scripts still loaded.
- No visible cookie-banner heading, accept or decline controls, or preferences control was present.

This is consistent with the saved Saudi exclusion, but it is not an independent clean-visitor
proof because the browser profile's prior consent state was not inspected or reset.

[UK evidence boundary]

- The post-save Admin reread proves the United Kingdom remains in the selected region set.
- A direct `?country=GB` storefront attempt did not create a UK context; the page still rendered
  `SA` and SAR. It is therefore not claimed as a live UK-IP or UK-geolocation presentation test.

## Unchanged state

- Cookie-banner content, color, position, checkout setting, and automated-settings choice.
- Privacy policy and legal text.
- Theme files and the live theme.
- Analytics and marketing pixels and Customer Events configuration.
- Shopify products, catalog, redirects, orders, and customers.
- Captain, Chatwoot, n8n, Meta, inboxes, workflows, and conversations.
- The untracked local storefront prototype and all of its assets.

No per-pixel consent behavior was measured. This stage is an implementation of the owner's
commercial preference, not a legal determination.

## Rollback

If the owner later authorizes rollback, add only Saudi Arabia back to the same manual region list,
select `Done`, save, reload Admin, verify the region count returns to 32 with Saudi Arabia checked,
and verify the Saudi storefront banner in a fresh eligible visitor context with no prior consent
state. Do not alter any other privacy, theme, pixel, or customer-service setting during rollback.

## Stop and next action

The owner-approved Admin mutation and its post-reload persistence verification are complete. A
clean-visitor Saudi presentation and a live UK presentation were not independently verified in
this session. Stop without expanding the privacy scope.

The next separate design action is owner visual review of the preserved mobile prototype. Only
after explicit approval should another clean stage reconcile the live Shopify theme, translate the
approved design into Liquid, deploy it to an unpublished preview theme, verify mobile behavior,
and stop before live publication.
