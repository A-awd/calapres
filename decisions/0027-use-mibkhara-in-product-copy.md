# 0027 — Use one `مبخر أنيق`, not a set or multi-piece bundle, in customer-facing copy

Date: 2026-09-01

Status: accepted and executed in production

## Context

The three active Shopify products are individual Calapres burners. Their shared product-page FAQ
and Shopify descriptions and metadata first incorrectly described them as a `طقم`, including a
complete `ماذا يتضمّن الطقم؟` accordion and a `هل الطقم مناسب للإهداء؟` question. After that first
correction, the owner explicitly clarified the complete physical offer: there is no stand, oud box,
set, or multi-piece bundle. The item is only `مبخر أنيق` with `حفر الاسم أو الشعار`. This broader
owner correction supersedes the earlier boundary that temporarily left homepage and About-page set
wording unchanged.

## Decision

1. Remove the complete contents-of-the-set accordion from the shared product template and keep the
   exact gift question `هل المبخرة مناسبة للإهداء؟`.
2. Show the exact shared product summary as two lines: `مبخر أنيق` and
   `حفر الاسم أو الشعار`.
3. Remove every customer-facing claim of a stand, oud box, set, three pieces, or an integrated
   multi-piece bundle from the homepage, About page, Contact page, and reusable theme defaults.
4. Use `مبخرة` or `مبخر` consistently in the remaining storefront copy, and describe engraving as
   the name or logo wherever the corrected marketing surfaces summarize the offer.
5. Keep every active product description, SEO title, SEO description, and image alternative text
   free of the rejected composition claims. Do not mutate a clean product record merely to repeat
   an equivalent value.
6. Keep the shop-level homepage meta description aligned with the same physical offer so search and
   social previews do not restore `طقم متكامل` outside theme source.

## Production record

Canonical GitHub `main` commit `0887beaab5b769505c51fccdeb772faab79b3d06` contains the first
product and FAQ terminology correction. Commit `ecbcbc3aa81514107f640d5b1ec925c28c1bab7d`
contains the owner's broader composition correction across nine theme files. The latter sets the
two explicit product-summary values in `templates/product.json`, corrects the homepage and About
instances, and updates reusable defaults so the rejected claim cannot return when a section is
added later. The nine files were pushed to live theme `165777604864`, and a fresh pull matched them
byte-for-byte.

The live descriptions, SEO titles, SEO descriptions, and image alternative text of the white,
beige, and gray products were audited after the broader correction and required no new mutation;
none contained a rejected composition term. The shop-level homepage meta description was changed
from the value containing `مع طقم متكامل` to
`تسوّقوا مبخر كالابريز الأنيق بالأبيض والبيج والرمادي، مع إمكانية حفر الاسم أو الشعار. توصيل داخل المملكة العربية السعودية وشحن مجاني للطلبات فوق 320 ر.س.`
through Online Store Preferences; Shopify displayed `Settings saved`, and the Admin API reread the
same value.

Theme Check inspected 181 files with zero errors and the six existing remote-font warnings. Section
schema IDs are unique, the changed templates parse, and fresh public checks of the homepage, all
three product pages, About, Contact, and FAQ returned 200 with no stand, oud-box, set, three-piece,
or integrated-bundle term. A fresh browser render showed the exact two-line summary on the white
product page.

## Rollback

If the owner reverses this factual offer definition, restore only the nine theme files from the
parent of commit `ecbcbc3aa81514107f640d5b1ec925c28c1bab7d`, restore the prior shop-level meta
description from this production record, and then recheck the homepage, all three product pages,
About, Contact, FAQ, and the Shopify product records. Do not change prices, inventory, variants,
media, cart behavior, checkout, or payments during such a rollback.
