# Arabic artistic-name lettering — evidence continuation (2026-09-23, Claude)

Continues [the name-design chat-reset handoff](../handoffs/2026-09-23-name-design-chat-reset.md) and decision 0045.
Scope: recovery cross-check, read-only live checks, web evidence and one zero-cost local test.
No paid request, no theme/price/server/subscription/credential change, no publication.

## ملخص للمالك

**الحكم:**
لا يوجد حتى الآن تطبيق أو نموذج أثبت بالاختبار أنه يرسم الاسم العربي فنياً بحروف صحيحة تماماً.

**ما اختُبر فعلاً عندنا:**
- النموذج الحالي حوّل «مدى» إلى حروف خاطئة، والتصاميم كانت متشابهة. مرفوض.
- اختبار محلي مجاني: الحروف تُبنى من الخط نفسه فتبقى كاملة، لكن التداخل بين المقاطع جعل «عبد الرحمن» يُقرأ مرة «الزحمن» ومرة «عبل». الشكل أيضاً قريب من الخط العادي وأقل من مستوى المصمم.

**النتيجة العملية:**
- ضمان وجود كل حرف ونقطة ممكن بالبناء.
- ضمان القراءة الصحيحة بعد التداخل لا يتحقق آلياً، لأن التداخل المسموح به هو نفسه مصدر الخطأ.
- لذلك يبقى اعتماد العين البشرية شرطاً: المالك في التجربة، والعميل في المتجر.

**الخطوة التالية المقترحة، وتحتاج موافقة قبل أي طلب مدفوع:**
مقارنة مغلقة خارج المتجر على «مدى» و«عبد الرحمن» مقابل صورة المصمم، بمرحلتين وسقف ١٢ ريالاً، مع تجربة كل نموذج بطريقتين: الوصف فقط، والوصف مع هيكل حروف دقيق.

---

## 1. Recovery cross-check

While this session ran, `main` advanced to `78c8d07` ("Recover Claude design service source and Arabic name research"): the owner-side recovery downloaded `calapres-transfer.patch` (SHA-256 `764e98a0…8d45`, matched) and the research attachments. This session independently checked that result:

| Check | Result |
|---|---|
| Research markdown recovered here from the old chat's `Write` call vs `main` | **Byte-identical**, SHA-256 `379bdcb10d8491800ffcf30c6e35a477837781818c851ce36ba5f3401237e6f5` |
| HTML report recovered here vs `main` `docs/research/calapres-name-art-research.html` | **Byte-identical**, SHA-256 `741a7def289490d82c144ac15c4342df0748b69595a387722bbb41cf7a422fc5` |
| `main` `sections/design-service.liquid` vs live backup `166572294400` | **MD5 identical** `3d7bd498dffe4c357ceec14db8c91923` (21,260 bytes) |
| `main` `templates/product.design-service.json` vs live backup | **MD5 identical** `0d8c974971a8529e153641647940d09e` |
| Remote `refs/heads/main` | `78c8d0731c79de1f636d109ac85980c5686700a3` (ls-remote) |
| Deployed backend runtime vs `main` `services/design/` | **Not verified here**: no read access to the Hostinger project from this session. |

The old chat's transcript interface exposes tool calls only, so the patch itself could not be rebuilt here; the owner-side download superseded that blocker. The prompt that failed on `مدى` is prompt-only (`PROMPT_VERSION 'p1'`, nine layout sentences), as in `services/design/provider.mjs`.

## 2. Live state (read-only, 2026-09-23 ~14:45Z)

Exactly two themes: MAIN `166066389248` “Calapres — أساسي”, last updated 2026-09-22 17:57Z; `166572294400` “Calapres — احتياط” unpublished, last updated 2026-09-23 01:29Z. Service health, spend ledger and trial billing were not re-read in this session; see the first section of `STATE.md` for the owner-side health check.

## 3. Evidence grades

Grades: **T** tested by Calapres; **A** independent third-party output; **B** vendor/reseller claim only; **C** no Arabic claim; **D** published evidence of failure.
Prices: list prices at 3.75 SAR/USD, before 15% VAT and card/FX fees; per image, not verified against an invoice.

### Tested by Calapres

| Approach | Result on مدى / عبد الرحمن | Grade |
|---|---|---|
| OpenAI `gpt-image-2-2026-04-21`, low, prompt-only (deployed backup) | `مدى` rendered roughly as «م م ى»; three designs too similar — **rejected by owner**. One `عبد الرحمن` design reached the cart; its spelling was never formally judged. | T — fail |
| Local exact-letter skeleton (this session, zero cost; `2026-09-23-skeleton-test/`) | Letter inventory exact by construction (HarfBuzz glyph names, e.g. `meem.init + dal.fina + alefMaksura.isol`; no `.notdef`). But: first stacked `عبد الرحمن` put the ب dot over ر → reads «الزحمن» (caught by a new relative dot-ownership gate); the variant that passed the gate still reads «عبل» because د collides with ا/ل; polar-warped emblems are unreadable yet pass the dot gate. Visual quality font-like, far below the designer photo. | T — letters kept, reading not guaranteed |

### Shopify apps (all shopper-facing wrappers)

| App | What the shopper can trigger | Grade | Cost note |
|---|---|---|---|
| Customily | Text-to-image placeholder (OpenAI/Gemini on own key); name only enters a prompt | C | ≈184 SAR/mo + 0.375–3.75 per item; **trial ends 2026-10-01** |
| Teeinblue | Gen-AI effect needs an uploaded photo | C | ≈184 SAR/mo; trial ends 2026-10-06 |
| Cloudlift LPO | AI image option; `{name}` placeholder into a prompt; model undisclosed | C | app 34–109 + AI ext ≈34 SAR/mo |
| Zepto | No AI generation (fonts/uploads) | C | trial ends 2026-10-07 |
| Zakeke | “Generate with AI” image/logo; model undisclosed | C | ≈262+ SAR/mo + 1.5–1.9% |

None documents exact Arabic lettering or three retained variants. An app cannot be more accurate than the model it wraps.

### Models (API)

| Model | Arabic evidence | Grade | ≈SAR/image |
|---|---|---|---|
| Gemini Nano Banana Pro (3 Pro Image) | Al Jazeera reports the claim «يستطيع الآن توليد نصوص عربية سليمة وصحيحة» without a test; one Arabic video shows short plain phrases correct. No calligraphic composition tested. | weak A (plain text only) | 0.50 |
| Seedream 5.0 Pro (2026-07-08) | ByteDance: “correctly process the right-to-left cursive script of Arabic”. No independent test found. | B | 0.17–0.34 (reseller) |
| Ideogram 4.0 | Reseller claim of non-Latin precision. Ideogram's own docs (v3): “Non-Latin scripts often produce unpredictable results.” | B / D | 0.11–0.375 |
| gpt-image-2 / 1.5 | Our own failure; OpenAI lists other scripts, not Arabic | D | 0.02 (low) – 0.79 (high) |
| Recraft V3 / Qwen-Image | Arabic outside character set / reviewer-reported RTL flaws | D | 0.13 |
| FLUX.2 / Kontext, Magnific Mystic, Recraft V4 | No Arabic claim | C | 0.11–0.33 |
| AnyText (glyph-conditioned) | Arabic recognition accuracy **0.0000** (STELLAR paper, Table 2) | D | open source |

Dedicated Arabic-name tools: ArabicDesign.ai says it “preserves the requested text at up to 95%” (vendor admits errors); an independent review found gdesign.ai letter errors in two of four generations. Neither exposes a store API.

### Automated checking

DuwatBench (2026) — best vision-language model exact-match on Arabic calligraphy transcription is 0.4167 (Gemini 2.5 Flash); Diwani and Thuluth are hardest. Reading-based automatic gates would pass wrong names. (A figure of “<0.18” circulated in an earlier draft of this research is wrong.)

## 4. Engineering conclusions

1. Prompt-only generation (any model, any app) cannot guarantee the owner's rule. Evidence for exact Arabic exists only for short plain text, never for bent/interlaced compositions.
2. Letter inventory can be guaranteed by construction (shaping the exact string); **reading** cannot, because the owner-permitted overlaps are exactly what creates «الزحمن»/«عبل»-type misreadings.
3. Structural gates (glyph sequence, dot ownership vs plain typesetting) are useful pre-filters, not acceptance.
4. The only defensible acceptance is human: owner in evaluation, and the customer's explicit approval in production — which already exists in the design-service flow and must stay mandatory.
5. The approach worth testing is **skeleton-conditioned generation**: an exact-letter composition as input, restyled by a model toward the designer reference, then gated and approved. Whether the model keeps the letters when restyling toward hand-made calligraphy is unknown and is what the bake-off measures.

## 5. Proposed comparison (NOT approved; owner decision)

Aligned with [the evaluation gate](2026-09-23-name-art-evaluation-gate.md): outside the product page, the designer reference, only `مدى` and `عبد الرحمن`, three structurally different briefs per name, human inspection, every paid attempt counted. OpenAI outputs stay as the failed control.

Addition from this session: test each model in **two modes**, because prompt-only is the mode that already failed:

- Mode P: prompt + designer reference image.
- Mode S: prompt + designer reference + an exact-letter skeleton image of the same composition (from `2026-09-23-skeleton-test/`, only variants that pass the dot gate and read correctly to a human).

| Stage | Model | Images | List-price estimate |
|---|---|---|---|
| 1 | Gemini 3 Pro Image (Nano Banana Pro) | 2 names × 3 briefs × 2 modes = 12 | ≈6 SAR |
| 2, only if stage 1 fails | Seedream 5.0 Pro | 12 | ≈2–4 SAR |

- Proposed hard cap: **12 SAR** for both stages, one pilot plus at most one correction per mode, stop on repeated failure.
- Score per image: exact letters/dots/hamza/order (pass/fail), reads without doubt, three genuinely different compositions, closeness to the reference (1–5), latency, actual charge.
- Access route still to be chosen by the owner: an existing Magnific account (approved creative tool; its restyle list includes `restyle-seedream-5-pro` and `restyle-imagen-nano-banana-2`; whether it exposes Nano Banana Pro generation must be checked) or a new Gemini API credential (new credential binding needs explicit approval). This session's Magnific connector lacks upload/generate/show tools.

## 6. Hidden risks

- Customily's trial ends **2026-10-01**; none of the four installed apps has Arabic-generation evidence. Owner must decide before that date to avoid an unintended subscription (no change made here).
- The deployed backend is not yet proven identical to `main` `services/design/`; compare the Hostinger runtime files before any further deployment.
- Customer approval of a misread design would go to manufacturing; keep approval explicit and show the typed name next to the design.

## Sources

- https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro
- https://arxiv.org/html/2601.19898 (DuwatBench)
- https://arxiv.org/html/2511.09977 (STELLAR; AnyText Arabic 0.0000)
- https://docs.ideogram.ai/using-ideogram/getting-started/prompting-guide/2-prompting-fundamentals/text-and-typography
- https://www.aljazeera.net/tech/2025/11/23/بعد-سنوات-الذكاء-الاصطناعي-يولد-صور
- https://lilys.ai/ar/notes/nano-banana-pro-20251127/nano-banana-pro-accurate-arabic-photo-text
- https://runware.ai/docs/models/bytedance-seedream-5-0-pro/guides/multilingual-text-rendering
- https://runware.ai/docs/models/ideogram-4-0/guides/text-and-design
- https://ai.google.dev/gemini-api/docs/pricing
- https://developers.openai.com/api/docs/pricing
- https://www.recraft.ai/docs/recraft-studio/image-generation/working-with-text-and-prompts/adding-text-to-an-image
- https://help.customily.com/articles/8302778120-image-placeholder
- https://support.teeinblue.com/en/article/how-to-use-gen-ai-effect-feature-to-create-custom-image-effects-l8mqej/
- https://docs.cloudlift.app/article/221-ai-image
- https://www.zakeke.com/blog/july-2026-release-notes-zakeke/
- https://arabicdesign.ai/en
- https://www.bbkiwi2011.com/2026/07/arabic-calligraphy-ai-gdesign.html
- Skeleton test fonts (OFL, fetched from github.com/google/fonts): Amiri Bold, Aref Ruqaa Bold, Reem Kufi. Re-run: put fonts in `fonts/`, `python3 compose.py && python3 render.py`.
