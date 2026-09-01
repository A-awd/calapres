# 0029 — Hide the empty product-review section until authentic reviews exist

Date: 2026-09-01

Status: accepted and executed in the live storefront

## Context

The shared product section displayed the heading `تقييمات العملاء` and an empty Judge.me review
container on every active product even though Calapres has no customer reviews to show. The empty
section added a misleading heading and unused space at the end of each product page.

All three active Shopify products use the default product template. The repository has only one
product template, and that template renders the shared `main-product` section containing the review
markup.

## Decision

1. Remove the complete visible review section from the shared product page, including its heading,
   Judge.me container, legacy metafield output, and page-level review-data script.
2. Remove the three CSS rules used only by that deleted section so no empty review spacing or dead
   styling remains.
3. Do not fabricate ratings, testimonials, review counts, or structured review data.
4. Do not uninstall Judge.me or delete any review app data or metafields as part of this storefront
   presentation change. Authentic reviews can be introduced later through a separate owner-approved
   implementation.
5. Keep products, prices, inventory, variants, media, cart behavior, checkout, payments, shipping,
   and customer data unchanged.

## Verified preview record

Canonical GitHub `main` implementation commit
`28e890086f8466ea621ac22c9e9ec60dd528fccd` removes the complete review block from
`sections/main-product.liquid` and its isolated rules from `assets/calabriz.css`. The two files were
uploaded only to Shopify theme `165804638464`, `Preview — Western digits 0-9 2026-09-01`, which
remains `UNPUBLISHED`, is not processing, and has no processing failure. Live theme `165777604864`
was not changed or republished.

Shopify reread the two preview files at the same local MD5 and byte size. Theme Check inspected 181
files with zero errors and the six existing remote-font warnings. A fresh Shopify product audit
returned exactly three active products, each with `templateSuffix: null`. Fresh 390 px browser
checks of the white, beige, and gray products found no `تقييمات العملاء` text, no review selector
or widget container, only the intended `.pd` product content inside the main wrapper, and zero
horizontal overflow.

## Production execution

The owner approved the combined storefront publication. Shopify theme `165804638464`,
`Preview — Western digits 0-9 2026-09-01`, became `MAIN` at 2026-09-01T10:25:46Z, and former live
theme `165777604864` became the preserved unpublished rollback. Shopify reported no processing
failure. A fresh anonymous public product response identified `165804638464` as the main published
theme and contained no `تقييمات العملاء` heading, Judge.me widget container, or legacy review
markup. Judge.me was not uninstalled and no review data or metafield was deleted.

## Rollback

Restore only `sections/main-product.liquid` and `assets/calabriz.css` from parent commit
`be6d32296e22137cd4a1887dafefd7de668245a7` into an isolated unpublished preview, then verify all
three product pages. Do not reinstall, uninstall, or delete any app or review data during rollback.
