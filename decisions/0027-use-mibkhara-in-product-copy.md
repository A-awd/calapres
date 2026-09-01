# 0027 — Use `مبخرة`, not `طقم`, in product copy

Date: 2026-09-01

Status: accepted and executed in production

## Context

The three active Shopify products are individual Calapres burners. Their shared product-page FAQ
and Shopify descriptions incorrectly described them as a `طقم`, including a complete
`ماذا يتضمّن الطقم؟` accordion and a `هل الطقم مناسب للإهداء؟` question. The owner explicitly
corrected the product noun to `مبخرة` and asked for every product to be checked.

## Decision

1. Remove the complete contents-of-the-set accordion from the shared product template.
2. Use the exact product-page question `هل المبخرة مناسبة للإهداء؟` and use `مبخرة` in its answer.
3. Use `مبخرة` in the remaining engraving answer and in every active product description. Remove
   the separate `محتويات الطقم` paragraph from those descriptions.
4. Apply the same correction to the standalone FAQ and to both FAQ-section schema defaults so a
   newly added block does not restore the rejected wording.
5. Keep this correction bounded to product descriptions, the product-page FAQ, and the standalone
   FAQ. Do not silently rewrite separately approved homepage or About-page marketing copy.

## Production record

Canonical GitHub `main` commit `0887beaab5b769505c51fccdeb772faab79b3d06` changes
`templates/product.json`, `templates/page.faq.json`, `sections/main-product.liquid`, and
`sections/main-page-faq.liquid`. Those four files were pushed to live theme `165777604864` and a
fresh remote pull matched every file byte-for-byte.

The live descriptions of the white, beige, and gray products were updated through Shopify without
changing titles, prices, variants, inventory, status, media, or handles. Fresh public checks of all
three product pages found the new question and neither rejected question. Fresh product reads found
no `طقم` in any of the three descriptions. Theme Check inspected 181 files with zero errors and the
six existing remote-font warnings.

## Rollback

If the owner reverses this terminology decision, restore the prior four files from the parent of
commit `0887beaab5b769505c51fccdeb772faab79b3d06`, push only those files to the same theme, and
restore the three prior descriptions from their recorded pre-change values. Recheck all three
public product pages and Shopify product records after either rollback.
