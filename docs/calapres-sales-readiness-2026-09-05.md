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

## Original wordmark correction trial — 2026-09-05

The owner requested the existing flourished CALAPRES wordmark, not a generic spelling. The live
homepage header's mask resolves to `assets/calapres-wordmark.png`; its actual public asset was
visually inspected and imported as Magnific reference `9ZcYPitNYZ`. The source PNG is gold, while
the approved website mask renders its original silhouette in burnt brown (#44271B).

One targeted logo-only edit used the preceding single-burner draft and actual logo as references,
with GPT 2, requested 2k/high quality. [Result](https://www.magnific.com/app/creation/ovHQXKq829)
completed; returned metadata reports 768 x 1024 while the authenticated creation UI shows
1536 x 2048. Do not silently resolve that discrepancy as verified export dimensions. The edit cost
700 existing credits; fresh balance is 7021 (previously 7721). No payment or top-up occurred.
The wait tool returned HTTP 504, but a subsequent creation read independently confirmed completion.
Visual inspection rejected the result for this request: the distinctive logo flourish was not
faithfully preserved. Do not claim that supplying the reference pasted the exact asset. No additional
generation is authorized by that failure alone. Use deterministic original-asset placement in an
editable design instead of repeatedly asking a model to redraw the wordmark. No publication occurred.
The authenticated Design UI exposes blank-canvas creation and local PSD/IDML/PDF/PPTX/HTML/image
import. Inspection did not complete a deterministic logo-layer placement; no design was imported or
created, and no export with the exact original logo was verified. This remains incomplete.

## Owner-requested wordmark versus CR seal comparison — 2026-09-05

The owner explicitly requested two new visual concepts, one with the original English wordmark,
the other with the approved burnt-brown CR seal. This fresh request permits that comparison after
the earlier failed logo-only edit; it does not choose a permanent logo replacement or approve ads.

Both use `s7691a0l8e` as the same single-burner scene reference. Wordmark reference is `9ZcYPitNYZ`.
Seal reference `5j7wrCTKxe` was imported from canonical `assets/calapres-checkout-wax-seal.png`, whose
SHA-256 was verified as `2ffe03f1bff302b781bbd882d18e971f878d154aa6f90413e42b6643f25024f1`, matching
decision 0022. The seal was visually inspected before use; no new CR icon was invented.

- [English wordmark concept](https://www.magnific.com/app/creation/ovHFhuI829): completed and visually
  inspected. The prominent top wordmark now visibly includes the C/first-A flourish and is closer
  to the approved identity than the preceding plain-font attempts. Exact asset geometry is not
  independently guaranteed by this generated rendering.
- [Burnt-brown CR seal concept](https://www.magnific.com/app/creation/bxwUrsM5Y2): completed and visually
  inspected. Shows the referenced wax-seal identity above the headline, and one burner without
  tray or box. No publication or owner creative approval is implied.

Model: Google Nano Banana 2 (`imagen-nano-banana-2-flash`), two 3:4 requests at 2k, 75 credits each;
150 total existing credits. Fresh balance: 6871 (previously 7021). No top-up/payment. Both were
rendered together in the Magnific widget and completion was verified. Typography, spacing and
background tones are not identical between outputs, so this is a visual-direction comparison,
not a controlled performance A/B test. Rubik-style prompting is not proof of real Rubik typesetting.

Assistant visual preference, not owner approval: wordmark for immediate brand-name recognition;
seal for a quieter gifting-oriented treatment. Preserve the actual logo assets and apply the
approved font as editable text in final production. No Shopify, Klaviyo, campaign or customer-send
change occurred. Do not queue more variants without further owner direction.

## Both identities approved; family, newlywed and bridal batch — 2026-09-05

The owner approved BOTH prior identity treatments for alternating future advertisements. Approval
is not restricted to a family audience: newlyweds and brides are explicitly included. The owner
requested a higher/smaller text area to reveal smoke, plus bridal hand/wrist, satin, watch and jewelry
details without any bride face or full figure. These are approved creative rules (decision 0025),
not an instruction to publish ads, change Shopify, activate Klaviyo, or fund an account.

Eight first-pass variants completed with Google Nano Banana 2 (`imagen-nano-banana-2-flash`), 3:4,
requested 2k, 75 existing credits each. All eight were rendered and visually inspected. No faces,
heads or full figures appeared. The vanity scenes contain adult hands/wrists only; all contain one
burner without tray/box. Watch/jewelry/satin are scene props, not offered merchandise.

The first-pass header reduction was partial: headers generally remained around the upper third
rather than the requested quarter. Some smoke faded into the header. Two outputs repeated Arabic
phrases. They are review drafts, not eight ready-to-publish advertisements. Four compact headline-only
corrections were therefore requested within the owner's multi-model task, removing the panel/body.

| Concept | First-pass asset | Visual review |
| --- | --- | --- |
| مجلس العائلة — الاسم الإنجليزي | [fHxr54TCDY](https://www.magnific.com/app/creation/fHxr54TCDY) | Repeated family-name phrase; superseded by compact revision. |
| مجلس العائلة — ختم CR | [SyR39pbUb8](https://www.magnific.com/app/creation/SyR39pbUb8) | Smoke clearer; header still taller than requested. |
| بداية بيت للعرسان — الاسم الإنجليزي | [1lyOUWMr4r](https://www.magnific.com/app/creation/1lyOUWMr4r) | Smoke clearer; header still tall and typography needs final checks. |
| بداية بيت للعرسان — ختم CR | [jU94JpZLD0](https://www.magnific.com/app/creation/jU94JpZLD0) | Repeated body phrase and unwanted bottom wordmark; superseded by compact revision. |
| العروسة والساعة والمجوهرات — الاسم الإنجليزي | [MBavISuDCm](https://www.magnific.com/app/creation/MBavISuDCm) | Adult hands/wrists only; watch/jewelry context; header can be lighter. |
| العروسة والساعة والمجوهرات — ختم CR | [tC5bQ6nmZJ](https://www.magnific.com/app/creation/tC5bQ6nmZJ) | Adult hands/wrists only; unwanted bottom wordmark and upper fade remain. |
| هدية للعروس بتفاصيل الستان — الاسم الإنجليزي | [MBavIlCDCm](https://www.magnific.com/app/creation/MBavIlCDCm) | Satin/jewelry still life, no person; hard header edge remains. |
| هدية للعروس بتفاصيل الستان — ختم CR | [XmQuayaBfo](https://www.magnific.com/app/creation/XmQuayaBfo) | No person; satin/jewelry still life; header can be lighter. |

New Arabic copy in this batch is proposed campaign variation, not a change to the previously
approved long family paragraph: `بداية بيت… باسمكما`, `تفاصيل تشبهكِ`, and `هدية تحمل اسمها`.
The two approved original logo files remain the identity sources. Rubik-style generated glyphs
do not prove real Rubik font application or pixel-exact logo reproduction. No new engraving finish,
physical dimension, jewelry inclusion, safety rating, price or delivery promise was introduced.

### Compact revisions and curated review set

Four headline-only corrections completed and were individually inspected:

| Revision | Asset | Outcome |
| --- | --- | --- |
| Family, English wordmark | [BhFQC2BoQR](https://www.magnific.com/app/creation/BhFQC2BoQR) | Keep for review: repeated body removed, no hard panel, more open smoke area. |
| Newlyweds, CR seal | [3zMVcxsREY](https://www.magnific.com/app/creation/3zMVcxsREY) | Reject: model replaced the burner's physical emblem with CR and retained unwanted bottom wordmark. |
| Bride/watch, English wordmark | [gO3i9CkSXO](https://www.magnific.com/app/creation/gO3i9CkSXO) | Reject: model changed the burner's physical emblem into an Arabic letter. |
| Bridal gift, CR seal | [EbLj1DhuuO](https://www.magnific.com/app/creation/EbLj1DhuuO) | Keep for review: body removed, lighter header, single original-style burner emblem; no person. |

Do not describe the excluded generated emblems as an approved engraving preview. For the last
revision, wait returned completed without an asset URL; creations_get then returned its URL and
the image was visually inspected. All twelve generations completed, but completion is not approval.

Curated review set (eight, rendered together): `BhFQC2BoQR`, `SyR39pbUb8`, `1lyOUWMr4r`,
`MBavISuDCm`, `tC5bQ6nmZJ`, `MBavIlCDCm`, `XmQuayaBfo`, `EbLj1DhuuO`.
Excluded four: `fHxr54TCDY`, `jU94JpZLD0` (repeated text), `3zMVcxsREY`, `gO3i9CkSXO`
(invented physical emblems). Keep all assets recoverable; none was deleted. Some retained first-pass
variants still have a large header or unwanted small footer text and require final typography/layout
cleanup. The compact family and gift revisions improve smoke visibility; do not claim that every
variant satisfies a measured 17% or 28% header limit. No face/full-figure restriction was violated.

Cost: twelve requests at 75 credits = 900 existing credits (600 first pass + 300 revisions). Fresh
balance 5971, from 6871. No payment or top-up. The owner-approved existing logo treatments remain
approved; the newly created imagery/copy is a curated draft set for review, not a live ad campaign.
No Shopify, Klaviyo, ad-account, customer-message, payment, or shipment operation was performed.

## Alternate-color, logo-only photographic concepts — 2026-09-05

After asking to keep all earlier assets but change the concept completely, the owner received the
fresh 5971-credit balance and answered yes to starting. Four distinct photo-first concepts were
scoped and completed at 75 credits each (300 total), without any headline, paragraph or top panel.
The references were the canonical `assets/product-gray.jpg` and `assets/product-beige.jpg`, visually
inspected before upload as `9ZcW0npNYZ` (gray) and `SyR3ZNTUb8` (beige). Their historical short box
and tray were explicitly excluded; only the tall burner was requested. The corresponding existing
front ornaments in these original color photos differ from the white photo, so do not mistake all
color-reference ornament differences for generated inventions or claim they are a new approved
personalization design. Color and exact production finish still need final asset fidelity review.

Model: Google Nano Banana 2 (`imagen-nano-banana-2-flash`), requested 2k. All four completed, were
shown together in Magnific and individually visually inspected. Full photograph fills the canvas;
no ad headline/body or upper banner appears. No faces/full figures, extra box or tray appeared.

| Concept | Asset | Review result |
| --- | --- | --- |
| Gray cinematic, 4:5 | [0emthm5TfW](https://www.magnific.com/app/creation/0emthm5TfW) | Distinct dark photograph and sweeping smoke. Model added an unrequested extra seal and used generic lettering; logo cleanup needed. |
| Beige overhead bridal detail, 1:1 | [aFr1xkHfSh](https://www.magnific.com/app/creation/aFr1xkHfSh) | Strongest brief compliance: top-down composition, adult hand/wrist only, watch/jewelry/satin, unlit empty bowl and CR reference. Still a generated draft, not a real product photograph. |
| Beige sunlit hospitality, 4:5 | [s76NiNSl8e](https://www.magnific.com/app/creation/s76NiNSl8e) | New architectural light/shadows and off-center product. Invented a hybrid seal/wordmark badge instead of original logo; must correct branding. Coffee items are contextual props only. |
| Gray material close-up, 3:2 | [xS4P9P8jfW](https://www.magnific.com/app/creation/xS4P9P8jfW) | Distinct macro/detail crop with CR; smoke origin reads disconnected from burner and near seal, and fine texture fidelity is unverified. Fix before final use. |

No regeneration was queued after this review. Fresh balance after the four was 5671 (from 5971).
No top-up, payment, deletion, overwriting, live publication or Shopify/Klaviyo mutation occurred.
All prior and new creations remain available. These are concept directions for review, not four
publication-ready advertisements. Preserve original logos as literal assets in final composition.
