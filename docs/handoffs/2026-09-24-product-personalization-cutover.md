# Product personalization cutover — 2026-09-24

The published Shopify theme is **Calapres — تخصيص المنتج 2026-09-23** (theme ID 166620201216). The previous published theme **Calapres — أساسي** (166066389248) is retained, unpublished, as rollback. The older draft **Calapres — احتياط** (166572294400) was not deleted.

The product page uses mobile layout B, right to left: **بدون** (default), **صورة** (recommended), **نص**, **عبارة**. Only the selected path expands. Image accepts JPG/PNG up to 5 MB. Text asks for exact engraving and optional design explanation. Phrase offers the nine agreed phrases. Customization paths require their own acknowledgement. There is no generation or credit system.

All three burner colors (white, beige, grey) have two variants: **بدون تخصيص** at SAR 380.00 and **مع تخصيص** at SAR 399.00. The add-on is exactly SAR 19.00. The product page reads variant prices dynamically; the cart shows the selected method and text/explanation, and hides the internal review flag.

The six source files in this commit were read from the published Shopify theme after cutover. Five local MD5 checksums match Shopify's file checksums exactly. `templates/product.json` content was compared character-for-character to Shopify's returned body, though Shopify's reported MD5 did not match the body bytes. No unrelated theme files were changed.

Live checks after publishing: Shopify reports theme 166620201216 as MAIN; all six variant prices/titles returned correctly. The white product page displayed SAR 380 default and SAR 399 on each customization path. A text test added a SAR 399 line with its explanation to cart; the test line was removed. Existing legacy cart lines may still have engraving properties on the plain variant from the old theme; review these before engraving.

Rollback: republish theme 166066389248, then restore the three plain variants to their old title `نص الحفر فقط` and SAR 390.00, and the three custom variants to `تصميم مرفق (+10 ر.س)` and SAR 400.00. Do not change prices before the theme rollback; the old theme permits text engraving on its plain variant.
