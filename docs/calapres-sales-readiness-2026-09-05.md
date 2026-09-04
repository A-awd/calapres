# Calapres sales readiness — 2026-09-05

Baseline: GitHub `A-awd/calapres` main at `ad3ea3fa499729152896cc2c92465c9d666d1a0a`.
This is an audit and bounded family-copy preparation, not a launch approval.

## Fresh evidence

- Shopify identity: Calapres, calapres.com, SAR, Basic.
- Payments UI: Paymob Native Checkout remains in Test mode and states that no actual transactions
  will be processed. PayPal shows Activate PayPal. Manual payment methods were not inspected.
- Exactly three active products, white/beige/gray, each with one image and one variant at SAR 390.
- Exact-variant reads: all three inventory quantities are zero, inventoryPolicy DENY, tracked false.
  This is not a stockout finding and does not establish physical supply.
- Public white product: one picture, personal/couple engraving example, no family example.
- Source: main-product.liquid renders only the selected/featured image and does not render
  product.description. A gallery is required to show future added media on this product surface.
- Live theme 165804638464 remains MAIN. Before editing, the product-section checksum was
  7da56b35545fe6c70119e9c84f90165d and product-template checksum 427ad64d4ae822a3f2ab115615e74d3f;
  both matched the canonical local source.
- Public shipping policy: Saudi-only, SAR 25 below SAR 320, free from SAR 320; no delivery duration.
- Public footer currently has WhatsApp and email links only. Other profile/button states are unknown.

## Minimum path to selling

1. Owner facts: available units per color, actual engraving process/capacity, engraving lead time,
   dispatch lead time, real pickup origin, and packaged weight/dimensions. Confirm margins after
   production, engraving, packaging, payment fees, shipping subsidy, and expected advertising cost.
2. Payments: complete the deferred provider's live approval, then verify a permitted real prepaid
   order and settlement. Keep cash on delivery prohibited. Do not treat test checkout as settlement.
3. Fulfillment: refresh OTO configuration, complete pickup/package facts, then verify order import,
   label, actual handoff, tracking and Shopify status. Its prior connection test is not this proof.
4. Customer journey: ensure exact family engraving reaches cart, checkout, order, and fulfillment
   instructions; publish credible preparation/delivery times and a clear process for logo files
   and final engraving approval. The current text box is not a graphic-logo upload path.
5. Owner handling: have a named daily manual support review for a small launch. Proactive Chatwoot
   incidents reaching the Telegram secretary are still unimplemented in the canonical record.
6. Acquisition: ready approved content, verify product-view/cart/checkout/purchase events without
   duplicate reporting, resolve the documented Meta full-control/ownership gap, and obtain a bounded
   campaign budget. Current Meta access was not inspected in this audit.

Klaviyo visual approval and activation can follow: six current lifecycle flows with eleven emails
are prepared, and the obsolete seventh flow remains retired, according to the 2026-09-04 verified
record. Keep messages/forms draft. Extra apps and more agents are not prerequisites to first sales.

## Graphic deliverables to commission

These are proposed deliverables, not generated images or claims of a finished creative package:

- A majlis/home scene showing the exact burner, with a family-name engraving detail.
- A believable use scene with scale reference, preserving the real form, finish, color and safe use.
- A close-up of an achievable engraving finish; generated mockups must not promise unsupported work.
- A gift/new-home scene containing only the actual offered product and verified packaging.
- A short vertical use/detail clip suitable for the first social campaign.

Keep product reference fidelity. Confirm dimensions and packaging from real evidence. Do not add a
stand, oud box, multi-piece set, accessories, or invented construction/heat-resistance claims.

## Owner-approved campaign copy — 2026-09-05

Campaign heading: **مبخرة تحمل اسم عائلتكم**

Supporting copy: **اجعلوا لمجلسكم قطعة تحمل اسم عائلتكم. خصّصوا مبخرة كالابريز بحفر اسم العائلة، لبيتكم أو هدية بمناسبة منزل جديد.**

The owner explicitly approved this shorter campaign wording and requested a Magnific content
experiment. It supersedes the earlier proposed campaign body with named family examples. Approval
of this text and an image experiment does not authorize live publication, marketing activation,
new payment, top-up, or changes to the single-burner offer.

### Previously prepared product-page support copy (not deployed)

Product summary: `مبخر أنيق` / `حفر اسمك أو اسم العائلة أو الشعار`.

Input example: `مثال: آل العواد`.

Helper: `لبيتكم أو هدية لأهلكم: آل العواد، مجلس آل العواد، أو سارة ومحمد.`

Family FAQ: `هل يمكن حفر اسم العائلة على المبخرة؟`

Answer: `نعم، اجعلوا لمجلسكم قطعة تحمل اسم عائلتكم. اختاروا حفرًا مثل «آل العواد» أو «مجلس آل العواد»،
واكتبوا النص المطلوب في خانة الحفر قبل إضافة المبخرة إلى السلّة.`

Prepared source changes affect only the shared product section and product template. No Shopify
write, live theme deployment, image generation, marketing activation, payment, shipment, or send
was performed at the initial source-preparation checkpoint. Production verification remains pending. Theme Check inspected 182 files with
zero errors and six existing external-font warnings. `git diff --check` passed.

## Magnific experiment result — 2026-09-05

Two 1728 x 2304 (3:4, 2k) Seedream 5 Pro drafts completed using the existing Premium balance,
100 credits each (200 total). No subscription change, payment, or top-up was performed.
Reference upload: `XmQETEXBfo`, imported from the white Shopify product photo `final-white`.
The historical photo includes a box and tray, but decision 0027 overrides its implied bundle.

- [Initial draft](https://www.magnific.com/app/creation/fHx1I6fCDY): rejected. The initial prompt
  incorrectly retained the box/tray from the photograph; this was an assistant composition error,
  not owner approval of a bundle. The result also lost product emblems and distorted Arabic.
- [Corrected single-burner concept](https://www.magnific.com/app/creation/s7691a0l8e): completed and
  visually inspected. The majlis scene now shows the tall burner alone, without the box/tray.
  Arabic text is not a faithful final typesetting of the approved copy, and product details are
  not an exact photographic match. Review concept only; not approved or suitable for publication
  without correction. Do not mistake successful image generation for creative acceptance.

Next safe creative step: preserve the actual single-product photograph in a controlled composition
and typeset the approved Arabic as editable text; review product fidelity and wording before any
customer-visible publication. No more generation was queued in this trial. No generated asset was
uploaded to Shopify or Klaviyo, and no storefront, ad, or customer message was published.
