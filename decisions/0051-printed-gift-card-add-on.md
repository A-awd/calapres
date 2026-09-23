# 0051 — Optional printed gift card as a separate sellable line

Date: 2026-09-23. Owner request relayed to a Claude cloud session. Status: **draft for review**,
not deployed. (Decisions 0048–0050 are referenced by theme comments but not yet recorded in this
repository; this number avoids colliding with them.)

## Decision

- Burner pages offer one optional **physical printed A6 card** for +19 SAR, independent of burner
  personalization. It is not a Shopify stored-value gift card.
- Price mechanism: a real Shopify product «كرت إهداء مطبوع» at 19 SAR, chosen in the product
  section's theme setting `gift_card_product`. Line-item properties never change price. With no
  product chosen (or an unknown burner colour) the row is not rendered, so the page is unchanged.
- Subtotals: 380 plain · 399 plain + card · 399 personalized · 418 personalized + card.
- One universal layout in three colourways matched automatically from the burner SKU:
  `-WHT` → عاجي (ivory), `-BGE` → رملي (sand), `-GRY` → حجري (stone). A card variant whose SKU
  contains `-IVR`/`-SND`/`-STN` or whose title is the colourway is preferred; otherwise the single
  variant is used and the colourway is carried as a property.
- Card line properties: `لون الكرت`, `للمبخرة`, optional `إلى`, required `رسالتك` (≤150 characters,
  printed exactly as typed), optional `من`, hidden `_كرت إهداء لـ`. The burner line gets hidden
  `_كرت الإهداء` with the same random value. No preprinted occasion phrases.
- Cart integrity: the card is added only after its burner is accepted; the card quantity always
  equals its burner's; removing the burner removes the card; an unlinked card is removed on the
  next cart read. Removing only the card is allowed. The cart page mirrors quantities before submit.
- The card is never listed (tag `calapres-addon` hides it from product grids) and its own product
  page shows a pointer to the burners instead of an add form.
- Accelerated checkout: the theme renders no dynamic checkout or wallet buttons on product or cart
  pages, so nothing bypasses the linked add. Direct cart permalinks remain an admin-level edge case;
  fulfilment treats a card without its burner as a question for the customer.

## Consequences

- One Shopify admin setup is required before the row appears (see the 2026-09-23 gift-card handoff).
- Existing variants, prices, personalization paths, acknowledgements and phrases are unchanged.
