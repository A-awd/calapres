# Printed gift-card add-on — reviewable draft (2026-09-23)

Branch `claude/vigilant-thompson-azq78e`, based on `main` `4b5aaa2`. Decision
[0051](../../decisions/0051-printed-gift-card-add-on.md). **No Shopify write, theme upload,
publication, price change or purchase was made.** Read-only check at the time of writing: three
active burners (`CAL-BKH-WHT/BGE/GRY`), each 380 «بدون تخصيص» / 399 «مع تخصيص»; no card product.

## What changed

| File | Change |
| --- | --- |
| `sections/main-product-personalize.liquid` | Card row under personalization, above Add to Cart; `gift_card_product` setting; card's own page guard |
| `assets/calapres-personalize.js` | Toggle, fields, message validation, button/sticky total = burner + card |
| `assets/calabriz-cart.js` | Linked two-step add, quantity sync, orphan removal, card display in drawer |
| `sections/main-cart.liquid` | Card details; card quantity mirrors burner (read-only box) |
| `snippets/product-card.liquid` | Hides products tagged `calapres-addon` from grids |
| `tests/theme/` | Liquid-rendered Chromium test, 15 scenarios incl. 390/320 px |

Plain and personalized burner submissions are byte-for-byte unchanged when the card is not ticked.

## Verification

`cd tests/theme && npm install && CHROMIUM_PATH=… npm test` → 15/15 pass: hidden when unconfigured;
unchecked by default; order personalization → card → button; totals 380/399/399/418; RTL fields,
placeholder, 150 limit, empty/whitespace message blocked with no request; combined add creates two
linked lines with exact message and total 418; +/− on burner syncs card; removing burner removes
card; removing card keeps burner; orphan card removed on load; card add failure keeps burner with a
clear message; 3-variant card picks the stone variant for grey; card page has no form; grid hides
the card; cart page mirrors quantity and reloads after reconcile; no horizontal overflow at 390/320.
Against the old `calabriz-cart.js`, 7 of these fail as expected. The Liquid is rendered by liquidjs
with small Shopify stand-ins; Shopify's own theme check and a live preview are still required.

## One-time Shopify admin setup (later, by owner/operator)

1. Create product **كرت إهداء مطبوع**, vendor كالابريز, status Active, price **19.00 SAR**, SKU
   `CAL-GIFTCARD` (or three variants عاجي/رملي/حجري with SKUs `CAL-GIFTCARD-IVR/-SND/-STN`).
   Physical product, requires shipping, inventory not tracked (or tracked with stock), same tax
   setting as the burners. Not a Shopify gift card.
2. Add tag `calapres-addon`. Add to no collection. Publish to the **Online Store** channel only
   (required for the AJAX cart). Set the product to hide from search engines
   (`seo.hidden` = 1) if desired.
3. Add a product image of the card (the approved Claude Design mockup) so the cart line has a thumbnail.
4. Upload this branch's five theme files only to an **unpublished** theme whose files were first
   verified to match the currently published theme (the published theme was changed on 2026-09-24
   per the cutover handoff; re-read theme IDs live). Never edit the published theme directly. Then in
   the theme editor → product page section → «منتج كرت الإهداء المطبوع» pick the card product.
5. Preview white, beige and grey pages at 390 and 320 px; add card + burner; check cart and checkout
   totals; remove the test lines. Publishing remains a separate owner approval.
6. Fulfilment: print from the card line properties; place the card inside the box away from heat.

## Open items

- The card artwork files (A6, three colourways, real logo) live in the private Claude Design
  conversation; they are not in this repository.
- If the owner prefers one card for several identical burners, change the quantity rule in
  `giftUpdates()` (currently one card per burner box).
