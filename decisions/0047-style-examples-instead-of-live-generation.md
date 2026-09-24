# 0047 — Style examples instead of live name generation

> Historical source-only experiment. Its six-example storefront path was superseded on
> 2026-09-24 by [decision 0048](0048-compact-personalization-and-physical-gift-card.md).
> It is not part of the current published product page.

Date: 2026-09-23. Owner direction relayed in the Claude continuation. Supersedes the storefront
parts of decisions 0045 and 0046; their backend decisions stay recorded but the storefront no
longer uses the design service.

## Decision

- The storefront shows SIX fixed, curated style EXAMPLES. Each example image shows only the word
  «مثال», spelled exactly م ث ا ل. It is never presented as a preview of the customer's name.
- The customer types her exact name, selects one example, and confirms: «أفهم أن الصورة مثال على
  الأسلوب بكلمة «مثال» وليست معاينة لاسمي، وأن كالابريز ستصمم اسمي كما كتبته بالأسلوب المختار بعد
  الطلب». Changing the name or the style clears the confirmation.
- No on-page image generation, provider calls, credits, counters, reset times or generate button.
- After the order, Calapres creates the artwork in the chosen style. The typed spelling is kept
  exactly (letters, dots, hamza, order); the page promises no exact appearance.
- The order line keeps: `طريقة التخصيص` = «اسم بأسلوب مختار», `نص الحفر` (typed name),
  `أسلوب التصميم` (style ID and title), `_مثال الأسلوب` (example image URL; underscore = kept on the
  order, admin, API and webhooks, hidden from the customer at checkout) and `إقرار أسلوب التصميم`.
- The existing upload path, variants and prices are unchanged. The style path uses the existing
  «نص الحفر فقط» variant, as the generated path did.
- Implemented in the backup theme source only (`sections/design-service.liquid`,
  `templates/product.design-service.json`). No new Shopify app. The published theme is untouched.
- Style examples are theme blocks (image, style ID, title). A block without an image shows a
  «قيد التجهيز» placeholder that cannot be chosen; with no ready example the style path is disabled.
- An example image may be published only after its spelling (م ث ا ل, three dots on ث) and quality
  are verified by the owner, and only if the fulfilment designer can reproduce that style for any
  name. Once an example has been ordered, never replace its image in place; add a new style ID.

## Consequences

The design service, app proxy and the installed «Calapres Name Design» app are no longer needed by
the storefront. Nothing is removed by this decision. Recommended next: set `GENERATION_ENABLED=false`
on the running service so nothing can spend while it is unused, then decide separately whether to
retire it. Cart and checkout show the typed name and the chosen style, not the example image.
