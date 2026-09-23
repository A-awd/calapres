# Arabic artistic-name generation: evidence comparison

Date: 2026-09-23.
Author: Claude.
Scope: research only. No implementation, installs, subscriptions, paid generation, vendor contact or theme changes were made for this report.
Evidence labels: **D** = demonstrated (seen directly), **V** = vendor claim (official listing or docs), **U** = unknown.

---

## ملخص القرار للمالك

**الجواب المباشر:**
لم أجد تطبيقاً جاهزاً يثبت بالدليل أنه يولّد تصاميم فنية لأسماء عربية بحروف صحيحة.
الحكم: لا يوجد تطابق موثّق، لكن ذلك ليس مستحيلاً.

**لماذا:**
- كل تطبيق فحصته إما يكتب الاسم بخطوط جاهزة، أو يولّد صوراً عامة بنماذج ذكاء اصطناعي لا تذكر العربية في وثائقها.
- لم أجد أي مثال رسمي منشور لاسم عربي مولَّد داخل أي تطبيق.
- التطبيق لا يكون أدق من النموذج الذي يستخدمه، لذلك خطأ «مدى» الذي ظهر مثل «م م ى» قد يتكرر داخل أي تطبيق.
- أقوى ادعاءات رسمية للعربية جاءت من نموذجين خارج متجر التطبيقات، وهي ادعاءات لم أختبرها.
- لم أجرّب أي عرض تجريبي، لأن هذه الجلسة بلا متصفح تفاعلي، والعروض كلها تحتاج متصفحاً أو رفع صورة أو حساباً.

**الترتيب المقترح للتجارب:**
1. مقارنة صغيرة بين النماذج نفسها قبل أي تطبيق: اسمان فقط، مع صورة مرجعية للحروف الصحيحة، والحكم بعين المالك. هذه تحسم أصل المشكلة.
2. إضافة الذكاء الاصطناعي في تطبيق مثبت عندك مسبقاً، وهي الأرخص بين التطبيقات:
Cloudlift Live Product Options
3. تطبيق يولّد حتى أربع صور لكل طلب ويختار العميل منها، لكنه الأغلى، ويبدأ بعرضه المجاني أولاً:
Zakeke

**التكلفة لكل ١٠٠ تصميم، بالريال، مقربة للأعلى، بدون ضرائب:**
- النموذج الحالي: سقف محجوز ٢٥ ريالاً، بلا اشتراك جديد.
- التطبيق المثبت المقترح: ٤ إلى ٢٧ ريالاً للتوليد، مع اشتراك شهري ثابت ٦٨ إلى ٧٢ ريالاً.
- التطبيق الثالث: ٣٨ إلى ٤٥ ريالاً للتوليد، مع اشتراك ٢٦٣ ريالاً شهرياً ورسم ١٫٩٪ على الطلبات.

**بوابات القبول:**
حروف صحيحة يمكن التعرف عليها، ثلاثة تكوينات مختلفة فعلاً، تسعة اختيارات ظاهرة قابلة للاسترجاع، الأصل المختار مرفق بالطلب، تكلفة محدودة، وزمن انتظار مقبول.

**الخطوة التالية المقترحة:**
تجربة مقارنة مغلقة بسقف ١٥ ريالاً، دون أي تعديل على المتجر، وتحتاج موافقتك قبل أي طلب مدفوع.
لا تنفيذ قبل أن ترى النتائج.

---

## 1. What was checked, and what was not

- Four research passes read official Shopify App Store listings, vendor help centres, vendor pricing pages and provider documentation on 2026-09-23.
- Installed candidates first: Customily, Teeinblue, Cloudlift Live Product Options, Zepto. Then other apps with shopper-facing AI generation, Arabic calligraphy tools outside Shopify, and direct image-model providers.
- **No vendor demo was exercised.** Exact reasons:
  - This session has no interactive browser.
  - The page reader returns static page text and does not execute JavaScript. Every personalizer demo checked renders its widget in JavaScript (Customily, Teeinblue, Cloudlift, Zepto, Zakeke).
  - Teeinblue's AI demo also requires a photo upload. Several Arabic generators require sign-up.
  - Shell access to vendor sites is blocked by this workspace's network allowlist.
- Therefore **no real output for the two test names exists in this report**, and no mockup is presented as output.
- Existing trials were not changed. Their recorded status is in `docs/research/2026-09-22-engraving-app-trials.md`.

Test names used throughout (owner-specified), on their own line:

مدى — عبد الرحمن

### Artistic benchmark

The designer reference photo attached in this conversation was inspected.
It shows one short name in three compositions:
1. A compact block with the letters stacked and interlaced.
2. A horizontal composition with one tall vertical stroke and a sweeping tail.
3. A looped composition with the letters wrapped around a curve.

All three use one heavy black stroke weight, calligraphic letterforms, a white background, and no tashkeel, frames or ornaments.
The three differ in composition, not only in font.
This is the bar for "three genuinely different designs".

---

## 2. Classification

| Class | Meaning | Candidates |
|---|---|---|
| a | Text-font preview | Zepto; the text tools of Customily, Teeinblue, Cloudlift, Zakeke |
| b | Templated personalization | Zepto, Customily, Teeinblue, Cloudlift, Zakeke |
| c | Merchant-only AI artwork | Customily AI mockups, Printify AI generator, Personalify, and others |
| d | Shopper-triggered generation | Customily (text-to-image), Cloudlift AI extension, Zakeke AI, FramoAI, PODai, Qstomizer, SnapArt, BrandLift; photo-only: Teeinblue, Autopictura and others |
| e | Verified Arabic artistic-name generation | **None found** |

Classes a and b do not answer the owner's request.
Class d only means the shopper can trigger a generic model.
It says nothing about Arabic letter accuracy.

---

## 3. Installed candidates

### 3.1 Cloudlift Live Product Options

Classes a/b, plus d through a paid AI extension (V).

| Check | Finding | Label |
|---|---|---|
| Shopper generation on product page | Shoppers "generate new images, or upload their own images to be edited" | V |
| What generates | "the most recent AI image models from the leading providers"; unnamed. On failure it retries "with the next model in the list, and then with cheaper models" | V; model U |
| Prompt control | Merchant prompt template with `{name}`-style placeholders; hidden "AI styles" preset prompts shown as cards; the docs note the prompt is visible in the browser console | V |
| Negative prompt / reference image | Negative prompt not documented; image editing from an upload exists | U / V |
| Outputs per request, history, selection | Not documented | U |
| Arabic / RTL / shaping | Not mentioned in any doc | U |
| Order file | Full-resolution preview saved as an `_original` link on the order line; Export extension renders PDF/PNG at order creation, up to 4000 px | V |
| Output size | 1024×1024; upscaled to 4096 only after purchase | V |
| Limits / spend | 5 requests/min and 60/h per user; credits must be pre-bought; no merchant spend cap documented | V / U |
| Mobile | Not documented | U |
| Basic plan / unpublished-theme isolation | No plan restriction stated; app embed plus Online Store 2.0 block; isolation to one theme not documented | V / U |
| Current state in store | Installed; setup pending; trial not verified (2026-09-22 record) | D (by Codex) |

Pricing (V): plans Startup 9 USD (100 orders/mo), Basic 19, Pro 29, Unlimited 49.
The AI extension is "+ 9 USD/month" on the vendor page.
Its demo product page shows 10 USD, which conflicts.
Extensions are prorated and have no trial.
Credits: 100 credits = 1 USD; generation costs 1–7 credits per image; 1,000 free credits once.

Sources:
- https://docs.cloudlift.app/article/221-ai-image
- https://www.cloudlift.app/pages/app-live-product-options
- https://www.cloudlift.app/products/live-product-options-ai-extension
- https://docs.cloudlift.app/article/97-how-can-i-save-an-original-print-file-of-the-live-preview
- https://docs.cloudlift.app/article/165-export
- https://docs.cloudlift.app/article/166-app-extensions-options
- https://apps.shopify.com/live-product-options

### 3.2 Customily

Class d for generic images (V). Its text tools are a/b.

| Check | Finding | Label |
|---|---|---|
| Shopper generation | "Text to image with OpenAI": the shopper can edit a default prompt and generate a new image | V |
| What generates | DALL·E 3 through the merchant's own OpenAI key (2024 post); photo filters via Gemini, OpenAI and others | V |
| Outputs per request, history, negative prompt | Not documented | U |
| Arabic / RTL / shaping | Text-box docs are silent; app languages exclude Arabic | U |
| Order file | Order shows a preview link and a production-file link (PDF, AI, PNG, JPG, EPS, DXF) | V |
| Retention of order files | Not documented | U |
| Limits / spend | No shopper or store limits documented; Shopify approval showed a 10,000 USD usage cap that could not be lowered | V / D (by Codex) |
| Trial | Ends 2026-10-01 | D (by Codex) |

Pricing (V): 49 USD/month plus 1 USD per personalized item for the first 100 items/month, falling to 0.10 USD.
Model cost is paid to OpenAI separately.
Whether DALL·E 3 is still offered by OpenAI today was not verified.

Sources:
- https://help.customily.com/articles/8302778120-image-placeholder
- https://www.customily.com/post/how-to-integrate-customily-product-personalizer-with-open-ai-s-dall-e-3
- https://help.customily.com/articles/2111674173-text-box
- https://help.customily.com/hc/en-us/articles/15743483961499
- https://www.customily.com/pricing
- https://apps.shopify.com/customily-product-personalizer

### 3.3 Teeinblue

Class d, but only as photo-to-image (V). Not usable for a typed name.

- "Gen AI Effect" transforms a photo the shopper uploads, using a merchant prompt (V).
- Models: GPT Image, Flux Kontext, Gemini (V).
- No text-to-image was found (V/U).
- Design image URL saved as `_customization_image` on the order line (V).
- AI output about 1024×1024 to 1536×1024; 10–16 s per generation (V).
- Upload limit per device per hour (V).
- Providers may block "religious content" (V), a risk for names containing religious words.
- Arabic: U.
- Pricing (V): 49 USD/month; no fee for the first 100 orders/month; model cost paid to the provider (GPT-image-1 medium listed at 0.042 USD).
- Trial ends 2026-10-06 (D, by Codex).

Sources:
- https://support.teeinblue.com/en/article/how-to-use-gen-ai-effect-feature-to-create-custom-image-effects-l8mqej/
- https://support.teeinblue.com/en/article/gen-ai-effect-faqs-1t47d9o/
- https://support.teeinblue.com/en/article/comparison-between-each-gen-ai-effect-models-177tevn/
- https://teeinblue.com/pages/pricing

### 3.4 Zepto Product Personalizer

Classes a/b only (V). No AI found.

- Custom fonts and text effects; RTL and Arabic not mentioned (U).
- Order files are stored on the Shopify CDN and converted to webp (V).
- Known conflicts with drawer carts and sticky add-to-cart buttons (V).
- 9.99–49.99 USD/month; trial ends 2026-10-07 (D, by Codex).

Sources:
- https://apps.shopify.com/product-personalizer
- https://productpersonalizer.com/docs/text-element-related-features/
- https://productpersonalizer.com/docs/personalization-customization-customers-options-missing-in-order/

---

## 4. Other Shopify apps with shopper-triggered generation

| App | What the shopper gets | Model | Outputs per request | Order file | Arabic evidence | Rating |
|---|---|---|---|---|---|---|
| Zakeke | AI Image Generator (styles, Logos mode) and AI Design Generator | U | Merchant sets 1–4; shopper picks one (V) | Through print-file pipeline (V) | RTL works in its non-AI text tool with Amiri, Cairo, Mada (V); AI Arabic U | 4.7 (99) |
| FramoAI | Prompt plus style; variations | GPT Image 1, or merchant's OpenAI or fal.ai key (V) | U | "linked to the order" (V) | U | 0 reviews; launched Dec 2025 |
| PODai | Image, text or combined modes; merchant guiding prompt | U | U | U | U | 1 review |
| Qstomizer | "AI Images" text-to-image | SDXL (V) | U | U | U | 4.7 (116) |
| SnapArt | Prompt to image | SDXL (V) | U | U | U | 1 review |
| BrandLift | "AI image generation" | U | U | V | U | 0 reviews |

No app in this list shows an Arabic output sample.

Sources:
- https://apps.shopify.com/zakeke-interactive-product-designer
- https://zakeke.zendesk.com/hc/en-us/articles/23868482378524-AI-Image-Generator-Editor
- https://zakeke.zendesk.com/hc/en-us/articles/24190036352924-AI-Design-Generator
- https://zakeke.zendesk.com/hc/en-us/articles/360013488299-Are-RTL-and-Asian-languages-supported
- https://apps.shopify.com/framo-ai
- https://apps.shopify.com/podai-1
- https://apps.shopify.com/qstomizer
- https://apps.shopify.com/snapart-customizer
- https://apps.shopify.com/live-designer

Photo-only generators (Autopictura, Podtrait, ARTIFY, CPrint-ai) do not accept a typed name.
InkyBay, Kickflip, Gelato, Printful's tool and Customer's Canvas showed no AI on the pages checked.

---

## 5. Arabic calligraphy tools outside Shopify

| Tool | Engine | API | Letter accuracy claim | Label |
|---|---|---|---|---|
| calligraphy-generator.com | Font engine (Diwani, Thuluth) | Yes; 100 renders/mo free, 19 USD per 1,000 | Deterministic font output; licence U | V |
| arabicdesign.ai | AI, model undisclosed | No | "up to 95%" text preservation | V |
| namedesignai.com | AI, model undisclosed | U | None; 8 style previews shown | V |
| andalusi.app | Own AI trained on classical script | No (mobile app) | None | V |
| NightCafe | General models | No | Warns complex scripts may not render perfectly | V |

None of these offers a Shopify integration.
The font engine is deterministic but is font switching, which the owner rejected as the product.
It remains useful as a correct reference image for an AI restyle (section 7).

Sources:
- https://calligraphy-generator.com/arabic
- https://arabicdesign.ai/en
- https://www.namedesignai.com/arabic-calligraphy
- https://andalusi.app/en/features/arabic-calligraphy
- https://creator.nightcafe.studio/tools/arabic-calligraphy-generator

---

## 6. Direct providers (official evidence only)

| Provider / model | Arabic evidence | Reference input | Price per image, 1024 px | Label |
|---|---|---|---|---|
| OpenAI gpt-image-2 (current prototype) | No language claim on the model page; one launch poster includes Arabic among 8 scripts; guide says it "can still struggle with precise text placement and clarity" | Up to 16 input images; masks are prompt-based and approximate | Tokens: 2.50 USD text in, 4 USD image in, 15 USD image out per 1M (pricing page read 2026-09-23) | V |
| OpenAI gpt-image-2.5 (2026-09-08 snapshots) | No Arabic claim found | As above | Tokens: 5 / 8 / 30 USD per 1M | V |
| Google Gemini 3.1 Flash Image / 3 Pro Image | Firebase docs list ar-EG for text inside images; DeepMind page warns of spelling errors | 3.1 Flash: up to 10 object references | 0.067 USD (3.1 Flash), 0.0336 (Flash-Lite), 0.134 (3 Pro) | V |
| Google Gemini 2.5 Flash Image | Text in images "only English"; DeepMind says it often hits "100% failure" on Arabic | — | — | V (negative) |
| ByteDance Seedream 5.0 Pro | Claims correct right-to-left cursive Arabic; admits "room to improve in finer-grained text rendering" | Editing supported | U | V |
| Ideogram | Docs: non-Latin scripts "often produce unpredictable results"; 4.0 claims text across languages | U | 0.03–0.10 USD | V |
| Recraft, FLUX.2, Qwen-Image | No Arabic text-in-image claim found | Yes | 0.03–0.04 USD | V |

Brand reputation is not evidence.
No model here has demonstrated Arabic letter accuracy in this project.

Project rule to respect: AGENTS.md restricts Calapres creative image work to Magnific (2026-09-06).
The design service's OpenAI provider was approved separately (decision 0046).
Any new provider in a trial needs an explicit owner decision.
Whether the owner's Magnific account exposes Gemini or Seedream models is U.

Sources:
- https://developers.openai.com/api/docs/models/gpt-image-2
- https://developers.openai.com/api/docs/pricing
- https://openai.com/index/introducing-chatgpt-images-2-0
- https://firebase.google.com/docs/ai-logic/generate-images-gemini
- https://deepmind.google/models/gemini-image/pro
- https://ai.google.dev/gemini-api/docs/pricing
- https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro

---

## 7. Can letter fidelity be improved? Honest limits

1. **Stronger instructions.** Spell the letters one by one, state the count, forbid extra letters, marks and tashkeel.
   This helps a model but guarantees nothing; OpenAI's own guide admits text struggles.
2. **Reference image.** Render the exact name correctly shaped (a calligraphic font through a proper shaping engine) and pass it as an input image, asking the model to recompose the same letters.
   This gives the model the true letter skeleton.
   OpenAI masks are approximate, and gpt-image-2 ignores `input_fidelity` (V).
   Gemini 3.1 Flash accepts up to 10 object references (V).
   The effect on Arabic accuracy is **U** until tested.
3. **Separate Arabic check after generation.**
   - Google Vision OCR reads printed Arabic, not handwriting; about 1.50 USD per 1,000 after the first 1,000 free each month (V).
   - Azure Read: printed Arabic only (V). AWS Textract: no Arabic (V).
   - Open-source Tesseract, EasyOCR and Qari-OCR read printed Arabic; none claims calligraphy (V).
   - A vision-language model could act as a checker; its accuracy on interlaced calligraphy is **U**.
   - Any checker must first be measured on a labelled in-house set that includes known failures such as the prototype's three-letter confusion. Without that, a pass means nothing.
   - Each rejected image is still paid for, so filtering raises the cost per visible design and adds seconds of latency.
4. **Human check before production** stays necessary whatever the model. The customer approves what they see; staff confirm the letters before manufacture.

A bespoke vector composition engine is possible in principle but is a large project, not a quick guarantee. It is not recommended now.

---

## 8. Cost normalized to 100 designs

Assumptions: 100 designs = 100 generated images at about 1024 px, standard tier, no retries.
1 USD = 3.75 SAR (SAMA official peg).
SAR rounded up to the whole riyal.
Taxes excluded; Saudi VAT may apply to app charges.
Monthly fees are shown separately, not spread across designs.

| Option | Generation per 100 designs | Fixed per month | Per order | Label |
|---|---|---|---|---|
| Current prototype, gpt-image-2 low | ≤ 25 SAR (6.55 USD) reserved ceiling; actual usage lower, not re-read today | 0 new (existing VPS) | 0 | Price V; ceiling = own config |
| Gemini 3.1 Flash Image | 26 SAR (6.70 USD) | 0 | 0 | V |
| Gemini 3.1 Flash-Lite Image | 13 SAR (3.36 USD) | 0 | 0 | V |
| Gemini 3 Pro Image | 51 SAR (13.40 USD) | 0 | 0 | V |
| Seedream 5.0 Pro | U | U | 0 | U |
| Cloudlift AI extension | 4–27 SAR (1–7 USD); 1,000 free credits once | 68–72 SAR (Startup 9 USD + AI 9 or 10 USD) | Plan order caps | V |
| Zakeke AI | 38 SAR per 100 images, 45 SAR per 100 logos (10–12 USD); minimum pack 500 credits = 188 SAR (50 USD) | 263 SAR (69.90 USD) | 1.9% transaction fee | V |
| FramoAI | 38 SAR (9.99 USD plan with 100 generations) | Included | U | V |
| Customily with own OpenAI key | Provider cost; DALL·E 3 price not re-verified | 184 SAR (49 USD) | 4 SAR (1 USD) per item, first 100/month | V |
| Teeinblue (photo only; not fit) | 16 SAR (4.20 USD, GPT-image-1 medium) | 184 SAR (49 USD) | 0 for first 100 orders/month | V |
| Font engine as reference renderer | 8 SAR (1.90 USD); first 100/month free | Plan-dependent | 0 | V |
| OCR check | 1 SAR (0.15 USD); first 1,000/month free | 0 | 0 | V |

Illustrative first month: 100 designs and 10 personalized orders at 390 SAR.
- Current prototype: ≤ 25 SAR.
- Cloudlift: 72–98 SAR (19–26 USD); free credits may cover the first month's generation.
- Zakeke: about 524 SAR (450 SAR for plan plus minimum credit pack, plus 75 SAR transaction fees).
- Customily: 222 SAR (59 USD) plus model cost.

This is not a ranking by cheapness.
The options differ in quality, control and evidence, and none has passed the letter gate.

---

## 9. Ranking: up to three candidates worth a real trial

### 1. Model bake-off with a reference image (not an app)

Why first:
- The failure the owner saw is letter accuracy.
- Every app delegates to a general model, and no app documents Arabic.
- A bake-off answers the real question for a few riyals, and its result applies to any host.

What it compares:
- gpt-image-2 text-only (the current baseline).
- gpt-image-2 with the reference image.
- Gemini 3.1 Flash Image with the same reference (the only official listing of Arabic text-in-image support).
- Seedream 5.0 Pro, only if reachable without a new commercial commitment.

### 2. Cloudlift Live Product Options AI extension

Why:
- Already installed.
- Documented shopper text-to-image with a name placeholder and style presets.
- Order-line file link.
- Cheapest app route, with 1,000 free credits.

Risks:
- The model is unnamed and may fall back to cheaper models.
- Three outputs per request and result history are U.
- The extension has no trial; it is prorated at 9–10 USD.

### 3. Zakeke

Why:
- The only app that documents N images per prompt with the shopper choosing one.
- Has a Logos mode.
- Mature listing (4.7, 99 reviews).
- The only app with any Arabic or RTL evidence, though only in its text tool.

Risks:
- Most expensive.
- Model unknown.

Start with its public demo store before any install.

Reserve: FramoAI.
Its own-key plan could host a bake-off winner, but it has no reviews yet.

Not recommended for this need:
- Customily: DALL·E 3, no Arabic docs, uncappable 10,000 USD usage cap.
- Teeinblue: photo-to-image only.
- Zepto: no AI.
- Qstomizer and SnapArt: SDXL.
- Photo-only apps.

---

## 10. Acceptance gates

| Gate | Pass condition (proposed; the owner may tighten) |
|---|---|
| G1 Exact letters | The owner grades each image: same letters in the same order and count, correct joins, essential dots, original hamza, no extra letters, marks, tashkeel or frames. Pass if at least 2 of 3 in every batch pass and at least 5 of 6 per test name overall. |
| G2 Three distinct layouts | Each batch shows three different composition families, comparable to the benchmark's compact, horizontal and looped designs. The owner judges them visibly different. |
| G3 Nine visible choices | Three batches yield 9 visible designs. Failed or blocked images do not consume the customer's 9. All 9 stay selectable after reload and return. |
| G4 Chosen original on the order | An authorized test order carries a durable link to the exact selected file. Its SHA-256 matches the approved design, and the link still works after 7 days. |
| G5 Bounded cost | A server-side SAR ceiling per day and in total. Measured cost per 100 visible designs at or below the owner's target (suggested ≤ 30 SAR). No open-ended vendor usage cap. |
| G6 Usable latency | p90 time to show 3 designs ≤ 30 s on a phone over mobile data across at least 5 batches. The page stays usable while waiting. |

Current prototype against these gates:
- **G3–G6, D:** proxy, storage, cart, one 3-image batch in 14.5 s, prior designs retained, durable cart URL.
- **G1–G2:** not met (owner rejected the output).
- **G4:** completed-order proof still pending.
- **G3:** quota counts possibly billed images, not 9 visible designs.
- The customer report of 8 images in two batches is unexplained.

---

## 11. Recommended next trial

**Step 0. Free public demos.**
This needs a browser session (Codex) and uses only the two test names.
No sign-up, no payment, no account change.
Demos:
- Zakeke: https://store.zakeke.com
- FramoAI: https://framo-ai.myshopify.com
- Cloudlift AI: https://www.cloudlift.app/products/live-product-options-ai-extension
- Customily: https://customily.myshopify.com/collections/meta-ai-filters
- Name Design AI: https://www.namedesignai.com/arabic-calligraphy

Save real screenshots of the outputs.
Where a demo needs an account or payment, record that as the exact reason and stop.

**Step 1. Closed model bake-off.**
This is paid, needs owner authorization, and has a ceiling of 15 SAR.
No Shopify change.
- Configurations A–D from section 9.
- Each configuration: 2 names × 3 styles = 6 images; 24 images total.
- Estimated ceiling: under 4 SAR for the two OpenAI configurations; about 2 SAR for Gemini; Seedream U.
- Access:
  - The existing restricted OpenAI key may cover A and B; the edit endpoint is U until tried.
  - Gemini and Seedream need new API access, which is an owner decision (or Magnific, if it exposes them).
- Follow decision 0038: record prompt, model, settings, inputs, output and cost. One pilot, at most one targeted correction.
- The owner grades G1 and G2.

**Step 2. Only if a configuration passes G1 and G2.**
Choose the host by G3–G6 evidence:
- Cloudlift AI (installed).
- The existing prototype.
- Zakeke.

If no configuration passes for both names, stop paid iteration and report back.
Do not build more integration.

Owner decisions needed before Step 1:
1. Authorize up to 15 SAR of test generation.
2. Allow Gemini and, optionally, Seedream API access, or confirm Magnific as the route.
3. Decide on the Customily trial before it ends on 2026-10-01; nothing was cancelled by this research.

---

## 12. Repository state

- Canonical `main` fetched on 2026-09-23 is `02ed548` (docs-only: backup name restoration record).
- The Claude transfer head `373e118` (base `7997978`) is still not imported.
- Reconciliation must preserve `02ed548` and any newer checkpoint.
- This report is delivered as a separate docs-only change on `02ed548`, so it does not alter the transfer head.

## Sources for pricing and conversion

- SAMA peg 3.75 SAR/USD: https://www.sama.gov.sa/en-US/MediaCenter/News/Pages/news-557.aspx
- Google Vision OCR languages: https://docs.cloud.google.com/vision/docs/languages
- Cloudlift, Customily, Teeinblue, Zakeke, FramoAI: see sections 3–4.
