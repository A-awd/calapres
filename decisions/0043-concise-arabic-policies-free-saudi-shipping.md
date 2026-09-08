# 0043 — Concise Arabic policies and free Saudi shipping

Date: 2026-09-08
Status: Owner approved; published and verified in Shopify

## Decision
Use Arabic-only concise refund, shipping, privacy and terms policies. One title per page:
سياسة الاسترجاع and سياسة الشحن. Preserve FAQ presentation.
Saudi shipping is free for every order, without a minimum. Personalized burners with a name,
text or logo are delivered within 14 calendar days of confirmed booking, including preparation
and delivery. Do not reinterpret this as 14 business days plus transit.
International delivery is chargeable when available; no international rate or country list was
invented. The current checkout only offers Saudi Arabia.

## Execution
Updated four Shopify legal bodies through authenticated admin. Privacy automatic English
template disabled. Policy titles updated in live theme 165804638464 language editor.
The existing two domestic price bands (0–319.99 SAR and 320+ SAR) now both cost zero.
Both use the name شحن مجاني داخل السعودية and checkout description:
المبخرة باسم أو شعار: التسليم خلال 14 يومًا من تأكيد الحجز
The optional, unchecked email marketing label is:
أوافق على استقبال الخصومات والعروض عبر البريد الإلكتروني

## Verification and boundaries
Public storefront verified all four Arabic bodies and one H1 per policy; checkout verified
both policy names, optional marketing copy, free shipping and the 14-day description.
No personal/payment details entered and no order submitted. Temporary cart item removed.
Shopify remains the operational source for policy bodies and shipping settings.
Theme-language edits are live admin changes; reconcile current live locale files before
any future theme deployment so these labels cannot be overwritten by older source.
Merchant shipping sync is enabled, but receipt of new rates and returns settings are not yet verified; clarity alone is not
an account approval guarantee. Plain-burner delivery time, merchant refund processing time,
official address and international service/rates need owner facts.
Privacy retention schedule and transfer safeguards require operational validation, not a
claim of completed legal certification.

See docs/handoffs/2026-09-08-arabic-policies-free-shipping.md.
