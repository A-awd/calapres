# Style-example pivot — brief and handoff (2026-09-23, Claude)

Owner decision: [0047](../../decisions/0047-style-examples-instead-of-live-generation.md). Base: GitHub `main` `e65c872`.
This session could not push (repository not in its authorized set); everything below is delivered as patches for Codex to review and sync.

## 1. What changed in the owner's direction today

1. 19:31 — one batch of three generated designs per session, no customer counters, quality gate before any paid call.
2. 19:39 — **superseded by the pivot**: no on-page generation at all. Six fixed style examples showing «مثال»; the customer types her exact name, picks a style, and confirms the picture is only a style reference. Calapres makes the real artwork after the order.

The one-batch work was finished and tested before the pivot and is kept as an archive patch (section 7). It is not to be applied.

## 2. Assessment: can the backup implementation be simplified without a new Shopify app?

Yes. The pivot needs no backend, no app proxy and no app:

- Shopify line item properties already carry everything the order must keep: typed name, style ID and title, example image URL, and the acknowledgement text. They are stored on the order and visible in admin, the Admin API and order webhooks.
- The style examples are theme section blocks, so the owner uploads or swaps images in the theme editor without code.
- The only network call left on the page is Shopify's `cart/add.js`; its reply is checked for the exact name, style, example URL and acknowledgement.
- The existing `calapres-design` service and the installed «Calapres Name Design» app become unused by the storefront. Nothing was removed.

## 3. Patch B (apply this one): `B-style-examples-backup-theme.patch`

| File | Change |
|---|---|
| `sections/design-service.liquid` | Generation UI, API calls, counters and endpoint setting removed. New style path: exact name field with plain-text echo, six example cards each tagged «مثال على الأسلوب», a note that the pictures show the word «مثال» and are not her name, acknowledgement checkbox, cart verification. Upload path kept, with its own acknowledgement. Intro sentence no longer promises a preview. |
| `templates/product.design-service.json` | Six `style` blocks S1–S6, **no images**. Titles S1–S3 follow the designer reference compositions (متراكب، أفقي ممتد، دائري); S4–S6 are neutral («أسلوب ٤–٦») until the owner names them. |
| `services/design/ui.test.cjs` | Rewritten for the new section (JSDOM). |
| `decisions/0047-…`, `DECISIONS.md` | New decision, indexed. |
| `scripts/name-art-eval/` | Zero-cost Arabic checks (structural checker, self-test, skeleton composer, «مثال» candidate generator, font fetch with SHA-256). Not used by the storefront. |
| `docs/research/2026-09-23-style-example-candidates.png` | Evidence sheet of the rejected font-derived candidates. |
| `STATE.md`, `HANDOFF.md` | Dated entries pointing here. |

Order line properties for the style path:

| Property | Value | Customer sees it |
|---|---|---|
| `طريقة التخصيص` | اسم بأسلوب مختار | yes |
| `نص الحفر` | typed name; NFC, trimmed, single spaces; letters never changed | yes |
| `أسلوب التصميم` | e.g. `S3 — دائري` | yes |
| `_مثال الأسلوب` | https URL of the example image | no (underscore: hidden at checkout, kept on the order, in admin, API and webhooks) |
| `إقرار أسلوب التصميم` | the full acknowledgement sentence | yes |

Variant and price: the style path uses the existing «نص الحفر فقط» variant (as the generated path did); upload uses «تصميم مرفق (+10 ر.س)». No price or variant was changed.

Name rule (same as the service): Arabic letters and single spaces, up to 4 words and 30 letters; tashkeel, tatweel, digits, Latin and symbols are refused with a message, never silently corrected.

## 4. The six style assets: BLOCKED — placeholders shipped

I could verify spelling, but not visual quality, so no asset is wired:

- Font-derived «مثال» candidates (Amiri, Aref Ruqaa, Reem Kufi, Rakkas, Qahiri, Alkalami, Blaka) all pass the structural spelling check, but they look typeset, and the stacked ones put ل to the right so they read «لمثا». See the evidence sheet. None meets "curated visual style example".
- More important: an example must show a style that the person making post-order artwork can reproduce for **any** name. The right source is the fulfilment designer (the one behind the owner's reference photo), not a font or a model.

Asset specification for the designer:

1. Word «مثال» only: م ث ا ل, three dots on ث, no tashkeel, no extra letters, frames or ornaments beyond the style itself.
2. One ink colour on a plain background, square, at least 1200 × 1200 px, PNG, generous margins, similar visual weight across the six.
3. Six clearly different styles or compositions, each one the designer can produce for any customer name.
4. Before upload: the owner reads each image; then run `python3 scripts/name-art-eval/check.py --name "مثال" <file>` (expects `PASS-PREFILTER`; it is a prefilter, not proof).
5. Upload in the theme editor (backup theme only) into blocks S1–S6. After any order uses a style, never replace its image; add a new style ID.

Until at least one image is uploaded, the style option shows «أمثلة الأساليب قيد التجهيز» and cannot be chosen; each missing block shows a non-selectable «قيد التجهيز» card.

## 5. Credits

- The new storefront calls no model and costs nothing per customer.
- Creating the examples or the post-order artwork with a model would consume paid credit: every capable model reachable here (Magnific credits, OpenAI API balance, Gemini API) is paid, and this workspace has no GPU and cannot reach model hosts. No generation was run in this session.

## 6. Verification

Done:
- JSDOM suite for the new section passes: no generation/credit/counter/generate wording; six labelled examples; plain-text name echo; spelling kept for مدى، آلاء، رؤى، نورة، إيمان، عبدالإله; tashkeel, tatweel, digits, Latin, symbols and >30 letters refused; acknowledgement required and cleared on name or style change; exact cart properties; existing variants; placeholders not selectable; style path disabled with no ready example; non-Shopify image URL refused; upload path unchanged; an unconfirmed cart reply is reported, not trusted.
- Unchanged backend suite: 36/36 pass. Schema and template JSON parse. Desktop (1000 px) and mobile (390 px) renders checked with fixture images.
- Tests ran on Node 22.22; the repository targets Node ≥ 24.

Not done (Codex/owner):
- Shopify theme check, upload to backup theme `166572294400`, live preview on the product, an authorized non-payment test order showing all five properties in admin.

## 7. Patch A (archive only): `A-archive-one-batch-quality-gate.patch`

The 19:31 correction, finished before the pivot: lifetime limit of three possibly billed images per session with retry of refused slots only, batch bound to its first name, schema 3→4 migration, no counters in the API, and `QUALITY_GATE_APPROVED=<prompt>/<model>/<quality>/<evidence>` keeping provider calls off. 40 service tests and its UI suite pass. It conflicts with patch B in `sections/design-service.liquid` and `services/design/ui.test.cjs`. Keep it only if live generation ever returns.

## 8. Hidden risks

- **Deliverability**: showing a style the fulfilment side cannot reproduce for long or unusual names would break the promise. Hence designer-made examples only.
- **Spelling in production**: the order keeps the exact typed name; production must not "correct" it. Whether the customer approves the final artwork before engraving is an owner process decision; the page promises nothing about it.
- **Checkout enforcement**: on Basic, the acknowledgement is a storefront control; a cart built another way could lack it. Check the property on each order before production.
- **Running service**: the deployed service still reports `generation: true` and the current backup preview still calls it until patch B is synced. Recommended: set `GENERATION_ENABLED=false` on the VPS now (owner or Codex; not done here).
- **Cart display**: cart page and drawer show the typed name and variant, not the chosen style. Showing the style needs a change to shared cart files (`sections/main-cart.liquid`, `assets/calabriz-cart.js`), left out to keep this change inside the backup-only section.

## 9. Corrections to earlier records

- `e65c872` said the local skeletons were "exact by construction". Not fully: Aref Ruqaa and Rakkas draw final ن without its dot, so the Ruqaa «عبد الرحمن» sweep in that test lacked the ن dot. The checker now catches this.
- The DuwatBench figure was corrected earlier (best exact match 0.42, not below 0.18).

## 10. Next safe step

Codex: review and apply patch B on `e65c872`, run theme check, sync only `sections/design-service.liquid` and `templates/product.design-service.json` to backup `166572294400`, confirm the preview shows six «قيد التجهيز» slots and a working upload path, and record the remote revision. Owner: commission six «مثال» examples to the specification above.
