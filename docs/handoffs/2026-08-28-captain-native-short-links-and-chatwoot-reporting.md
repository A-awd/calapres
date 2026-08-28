# Captain native short links and Chatwoot reporting handoff

Date: 2026-08-28

## Purpose

This handoff records the owner-approved first-party short-link delta, the transient n8n
availability interruption, the successful Captain Playground retry, and a separate read-only
Chatwoot reporting review. It does not replace the protected Captain baselines or approve any
reporting implementation.

Canonical decision:
[0021 — Adopt Shopify-native short product links for Captain](../../decisions/0021-adopt-shopify-native-short-product-links.md).
Exact executed baseline:
[Calapres Captain v1.3 — Shopify-native short product links](../baselines/2026-08-28-calapres-captain-v1.3-shopify-native-short-links.md).

## Executed short-link state

The stage began from clean GitHub `origin/main`
`e1188212d6361c852778c88e1eff54dbf37d3226`. Exactly three Shopify-native URL redirects are live:

- `/p/white` to the canonical white burner path;
- `/p/beige` to the canonical beige burner path; and
- `/p/gray` to the canonical gray burner path.

Each returned HTTP `301` to its exact target and final HTTP `200`. No third-party shortener or
product-handle change was introduced.

Only `Shape Safe Product Link Result` changed in product-link workflow
`8jtjLu261ZzcipGq`. It maps each exact safe canonical Shopify URL to one exact approved short URL
and rejects every non-allow-listed output. Seven local test cases passed. The workflow still has
five linear nodes and was published under version name `روابط شوبيفاي المختصرة الأصلية` with
description `إرجاع روابط شوبيفاي المختصرة الأصلية`.

## Availability incident and accepted evidence

The first Playground prompt, `أبغى أطلب المبخرة البيضاء`, returned safe
technical-unavailable wording while the n8n host and production webhook separately returned HTTP
`503`; n8n Cloud displayed `In progress`. The host and webhook then recovered to HTTP `200`.

One retry used the same prompt. Captain returned exactly the live title
`مبخرة كالابريز الفاخرة — الأبيض` and one short URL:

`https://calapres.com/p/white`

It made no price, availability, inventory, discount, previous-price, or bundle-content claim. This
accepts the Playground path after recovery. It does not prove the short link was physically
delivered in WhatsApp or delivered on Instagram or TikTok. Do not report external-channel success.

## Protected state

Preserve all of the following:

- `Calapres Assistant` (`2187`) as the only automatic responder;
- WhatsApp `128058`, Instagram `128031`, and TikTok `128033` as its only connected inboxes;
- Audience `Everyone` and Schedule `Anytime`;
- the existing conversation-created assignment automation;
- Captain knowledge, two response guidelines, `Wait for the customer`, and both existing tools;
- the unchanged order bridge and its separately pending authorization-rotation stage;
- the five-node product-link workflow shape and its bounded read-only Shopify product query;
- every Meta WhatsApp setting and every customer conversation; and
- unpublished responder `kAyF0D3ZZHxc0Hwp`.

## Read-only Chatwoot reporting result

The live Chatwoot account currently has zero labels, zero custom attributes, and exactly one active
conversation-created assignment automation. Nothing in labels, attributes, filters, reports,
segments, or automation was created or changed.

For a future separately approved stage, keep customer truth and conversation workflow separate:

- Contact attribute `حالة الشراء`: `غير معروف`, `لم نجد طلبًا موثقًا`, `طلب موثق`, or
  `عميل متكرر`.
- Conversation attribute `نتيجة المحادثة`: `استفسار`, `أُرسل رابط`, `يحتاج تحقق`, `طلب موثق`,
  or `متابعة بشرية`.
- Labels: a small operational topic set such as `استفسار شراء`, `رابط منتج`, `متابعة طلب`,
  `شكوى`, and `تحقق من طلب`.
- Saved views: conversation filters for queues and contact segments for reusable customer groups.

An outgoing or incoming phrase such as `شكراً لطلبك` never proves a Shopify order. A future text
rule may set only `يحتاج تحقق`. `طلب موثق` requires a uniquely matched Shopify order; payment state
must remain a separate fact. A no-match by phone means unconfirmed, not proof that the customer did
not order.

The possible independent bridge name
`كالابريز | تصنيف العملاء حسب طلبات شوبيفاي` is proposed only. Its implementation, event source,
matching rules, Chatwoot writes, rollback, and acceptance test require a separate owner-approved
stage. No such bridge, label, attribute, filter, segment, or automation is live now.

## Next action and stop

Stop for owner review. The short-link implementation and Playground acceptance are complete; a
physical WhatsApp short-link result remains unknown. Do not send a customer-channel test or change
Chatwoot reporting configuration from this handoff. If the owner reopens either subject, handle
only one bounded stage and document its separate evidence.

## Rollback

Restore only the previous `Shape Safe Product Link Result` code and delete only the three Shopify
redirects. Verify with fresh HTTP requests because prior `301` responses may be browser-cached.
Do not disable either tool, change another workflow node, alter Captain or its channels, touch the
order bridge, change Chatwoot configuration, modify product records, or edit Meta settings.
