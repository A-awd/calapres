# 0026 — Adopt Rubik as the shared Calapres interface typeface

Date: 2026-08-31

Status: accepted for implementation; storefront staged in an unpublished preview, checkout save and
theme publication pending visual approval

## Context

The owner wants one Arabic-capable typeface across the theme-controlled storefront and Shopify
checkout. The storefront currently uses Cairo, while decision 0022 records Almarai as the saved
checkout font. Shopify controls those surfaces separately.

Rubik supports Arabic, is licensed under the SIL Open Font License 1.1, and is available in both the
Headings and Body font pickers of the authenticated Calapres checkout editor. The current theme uses
only weights 300, 400, 500, and 700.

## Decision

1. Use Rubik for the theme-controlled storefront and password layout, loading only weights 300, 400,
   500, and 700.
2. Use Rubik for both checkout headings and body through Shopify's native typography controls.
3. Treat theme publication and the active-checkout save as separate production mutations. Coordinate
   them only after visual review so the public store is not intentionally left split between fonts.
4. Until the checkout save is confirmed and survives a full reload, decision 0022's executed Almarai
   setting remains the operational truth. Until theme publication is confirmed, Cairo remains the
   public-storefront truth.
5. Keep theme `165777604864` unpublished until the owner visually approves it. Do not claim full-store
   alignment until both production surfaces independently reread Rubik.

## Implemented preview record

Canonical GitHub `main` commit `57ba09ae875dbf97572aa6d133e4b488eedfd43e` changes only
`assets/calabriz.css`, `layout/theme.liquid`, and `layout/password.liquid`. The same files persist in
unpublished Shopify theme `165777604864`. Theme Check reports zero errors, and 320 px, 390 px, and
1280 px preview renders loaded Rubik without horizontal overflow, header overlap, or a second social
icon row.

Rubik was selected for Headings and Body in the active checkout editor only as an unsaved preview
state. Save was not pressed, and the checkout preview continued to render Almarai. No live theme or
checkout typography changed in this stage.

## Rollback

No production rollback is needed while the theme remains unpublished and checkout remains unsaved.
If the coordinated change is later published, preserve the former main theme as the immediate theme
rollback and restore both checkout typography fields to Almarai if the owner requests reversal.
Verify both rollbacks after a full reload; do not change unrelated checkout or theme settings.
