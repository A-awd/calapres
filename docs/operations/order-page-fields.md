# حقول تنظيم الطلبات — كالابريز

Implemented and verified in Shopify Admin on 2026-10-26 after direct owner authorization.
Native merchant-owned order fields, not an app or a new external integration.

## الحقول وترتيبها

| الحقل | المفتاح | النوع |
|---|---|---|
| التخصيص — حالة الاعتماد | `calapres.customization_approval` | `single_line_text_field / choice list` |
| التخصيص — النص المطلوب | `calapres.customization_text` | `multi_line_text_field` |
| التخصيص — صورة التصميم النهائي | `calapres.customization_design` | `file_reference / image` |
| التجهيز — المرحلة الحالية | `calapres.production_stage` | `single_line_text_field / choice list` |
| الموعد — تاريخ المناسبة | `calapres.occasion_date` | `date` |
| الموعد — الوصول المتفق عليه | `calapres.promised_delivery_date` | `date` |
| التوصيل — الطريقة | `calapres.delivery_method` | `single_line_text_field / choice list` |
| التوصيل — اسم المندوب أو الشركة | `calapres.courier_name` | `single_line_text_field` |
| التوصيل — تاريخ التسليم الفعلي | `calapres.actual_delivery_date` | `date` |
| الهدية — نص الكرت | `calapres.gift_card_message` | `multi_line_text_field` |
| الهدية — التغليف المطلوب | `calapres.gift_wrapping` | `single_line_text_field` |
| الهدية — الإضافات المطلوبة | `calapres.gift_additions` | `multi_line_text_field` |

## اعتماد التخصيص

القيم المتاحة: `بحاجة إلى مراجعة`، `بانتظار موافقة العميلة`، `معتمد من العميلة`،
`يحتاج تعديل`، `لا يحتاج تخصيص`.

ابدأ بمراجعة اختيار المنتج ونص الحفر والصورة الأصلية. اكتب النص المطلوب كما ورد،
ثم أرفق صورة التصميم النهائية عند توفرها. وجود صورة لا يعني موافقة العميلة.
اختر «معتمد من العميلة» فقط بعد موافقة فعلية موثقة في سجل الطلب.
التعريفات المثبتة تظهر داخل قسم Metafields على جميع الطلبات، مع قيم مستقلة لكل طلب.
لا يوجد افتراض موافقة أو تعبئة تاريخ تلقائية.

## التجهيز والتوصيل والهدية

مراحل التجهيز: `بانتظار الاعتماد`، `جاري التجهيز`، `جاري الحفر`، `فحص الجودة`،
`جاهز للتوصيل`، `تم التسليم`. يحدّثها الفريق يدويًا.

طرق التوصيل: `مندوب خاص`، `شركة شحن`، `طريقة أخرى`.
استخدم تاريخ الاستلام الحقيقي المؤكد، لا تاريخ التحديث الإداري.
سجل تاريخ المناسبة منفصلًا عن موعد الوصول الذي أكده الفريق.
لا تملأ نص الكرت أو التغليف أو الإضافات دون معلومة فعلية.

## Configuration and acceptance

- Twelve ORDER definitions were created in authenticated `unywbe-ub` Admin and pinned.
- All twelve saved definitions were read back after reload; pins were reordered via native UI.
- All twelve fields appear in the intended order on #1007 and #1006; no new order was created.
- A real review state and requested text were saved and retrieved on #1007. Customer text,
  identity and design content are intentionally excluded from this sanitized guide.
- One internal comment records the observed variant/customization mismatch for staff review.
- Storefront API access is disabled; Customer Account API is No access on these fields.
- Approval, production and delivery method have order-list/Admin API filtering enabled.
- Unknown values on all orders remain blank; no bulk historical migration or guessed approval.
- These are manually maintained operational fields. They do not block fulfillment, transmit
  messages, confirm a deadline, create a shipment, or synchronize other systems automatically.
- Original catalog, variant, line-item inputs, payment and fulfillment statuses were preserved.
- No customer communication, new file upload, app install, subscription or permission expansion.

## Recovery and source boundary

Native Shopify Admin owns definitions and values; this guide is the sanitized schema record.
Unpinning a field is the reversible display rollback; do not delete definitions or values to hide
fields. No local source checkout was reset or cleaned. Remote docs were published atomically
against current main, preserving unrelated newer continuity and existing history.

Official reference: https://help.shopify.com/en/manual/custom-data/metafields/pinning-metafield-definitions
