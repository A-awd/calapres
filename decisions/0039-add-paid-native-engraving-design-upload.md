# 0039 — Add paid native engraving design uploads

- Date: 2026-09-08
- Status: Accepted; live implementation saved and read back.
- Canonical baseline: `A-awd/calapres`, `main`, `c60557dfe87f0b39e97fb3129efb65a76aa43441`.

## Owner authorization

The owner requested a product-page image/logo upload for engraving, then explicitly directed
implementation on the current live store without creating a preview theme or test order, with
SAR 10 extra for this service. This is a narrow exception to the usual preview/publication gate
for this feature on the three current burners. It is not approval for other storefront campaigns,
email sending, artwork publication, credentials, accounts, funding or schedules.

## Decision and executed implementation

Use Shopify-native product variants and uploaded line-item properties. No external file-storage
service, app subscription, separate service product, supplier integration or Supabase dependency.

Each burner now has option `التخصيص`:
- Existing variant, renamed `نص الحفر فقط`: SAR 390. Existing variant ID and SKU preserved.
- New variant `تصميم مرفق (+10 ر.س)`: SAR 400. The extra SAR 10 is in Shopify's actual variant
  price per burner, not an informational line-item property. The paid variant has no invented
  compare-at price. Existing base compare-at price SAR 490 is unchanged.

| Burner | Product ID | Existing variant ID / SKU | Paid variant ID / SKU |
| --- | --- | --- | --- |
| White | 9575273300224 | 49095485653248 / CAL-BKH-WHT | 49704200241408 / CAL-BKH-WHT-DESIGN |
| Beige | 9575273332992 | 49095485686016 / CAL-BKH-BGE | 49704200306944 / CAL-BKH-BGE-DESIGN |
| Gray | 9575273365760 | 49095485718784 / CAL-BKH-GRY | 49704200339712 / CAL-BKH-GRY-DESIGN |

New SKUs were checked for collisions first. Options were created with `LEAVE_AS_IS`, then one
paid variant was created per product; existing variants were not deleted or replaced. New
variants mirror current `DENY`, untracked inventory, requires-shipping, taxable and zero weight
settings. These are copied operational settings, NOT verified stock or packaged measurements.
A later inventory-tracking rollout must account for both customization variants sharing physical
burners; no shared tracked-stock system was introduced here.

The Arabic product form offers:
- Native price selector; ordinary engraving text remains optional, maximum 40 characters.
- Required JPG/PNG upload only for the paid choice; browser limit 5 MiB and empty/type checks.
- Local image preview, original filename, remove/change through the file picker.
- Optional design notes, maximum 300 characters.
- Clear per-burner fee and a suitability-review statement before engraving.
- Updated main price, compare-at/savings visibility, main and sticky add buttons.
- JavaScript-disabled fallback permits the base text option; paid upload stays disabled.

Submission uses multipart `FormData` to `/cart/add.js`, preserving the real File object. Never
serialize uploads as JSON or save the local preview/blob URL as the order attachment.
Properties: `نص الحفر`, `تصميم الحفر`, `اسم ملف التصميم`, `ملاحظات التصميم`.
The cart drawer and cart page render the customization choice, escaped text/notes and an allowed
attachment link. Color continues to come from the product title rather than being mislabeled
with the new customization variant title. Empty attachment values do not produce a link.
Quantity changes retain existing line properties; this change does not replace customer carts.
During submission controls are disabled, a progress message is shown, and uncertain responses
do not automatically retry. An accepted add with an unconfirmed attachment directs the shopper
to review the cart instead of duplicating the addition.

## Live deployment and source preservation

Executed through the authenticated Shopify theme code editor on the existing MAIN theme
`165804638464`. Its legacy name contains “Preview”; its verified role is MAIN. No theme was
created or published/switched. Four live files were saved and read back exactly:
- `assets/calabriz-cart.js`
- `sections/main-product.liquid`
- `sections/main-cart.liquid`
- `templates/product.json`

The general CSS and JavaScript files were checked unchanged. Product media, base prices,
existing SKUs, payment settings and accounts were not altered. Product FAQ copy now distinguishes
ordinary text engraving from the paid uploaded-design option.

Pre-existing GitHub-only family engraving copy was NOT wholesale published or discarded.
The same functional change is applied to canonical source; its family placeholder/hint,
default second line, extra family FAQ and gift wording remain source-only where they previously
differed from live. For exact live reconstruction from canonical source:
- `sections/main-product.liquid`: remove the `engHint` small element and input
  `aria-describedby="engHint"`; use placeholder `مثال: سارة ومحمد — 1447هـ`; set schema line2
  default to `حفر الاسم أو الشعار`.
- `templates/product.json`: remove `qa_family` and its block_order entry; set line2 to
  `حفر الاسم أو الشعار`; qa3 answer remains
  `نعم — المبخرة مصمَّمة كهدية فاخرة، ويمكنك إضافة حفر الاسم أو الشعار لجعلها هدية شخصية.`
Do not treat these retained draft copy differences as an unrelated new publication approval.

## Verification and remaining limits

Later evidence (September 8): completed paid-owner-order attachment URL receipt is now verified
in STATE.md under the owner payment/upload canary audit. Image decoding, manufacturing acceptance
and fulfillment remain unverified. The original pre-order verification limits below are historical.


Verified: Shopify mutation responses with no user errors; preserved original IDs/SKUs/prices;
three paid variants at SAR 400; exact readback of all four edited MAIN-theme files; valid
JavaScript syntax and JSON; live product forms and required-file behavior by read-only UI
inspection, with the paid price reflected in primary and sticky price elements. No Liquid error
appeared in the rendered product page. The native multipart form encoding was inspected.
Existing cart display exposed and allowed correction of an empty-value attachment-link bug;
no cart item was added, removed or edited for verification.

No preview theme, sample-file upload, cart-add canary, checkout or test order was created,
as requested. Therefore successful file receipt on a completed order, phone file-picker upload,
image-preview decoding and payment-to-delivery are NOT end-to-end verified. Native form
requirements are browser-side; they are not a server-side prohibition on crafted requests.
Before fulfillment, confirm the paid variant and usable attachment; an arbitrary property
on a base variant is not evidence that the design fee was paid. Upload links use Shopify's
native CDN behavior; this does not introduce private authenticated document storage.

Paymob test-mode status, actual stock, engraving/dispatch time, pickup address and packaged
measurements retain their existing separate verification/approval gates. OTO stays prepaid-only.
Captain remains the only customer-facing automated responder. No agent sources were attached
or updated by this storefront task.

## References

- [Shopify product form and line-item properties](https://shopify.dev/docs/storefronts/themes/architecture/templates/product/overview)
- [Shopify Ajax Cart API and FormData](https://shopify.dev/docs/api/ajax/reference/cart)
