# Calapres Captain v1.1 — Engraving

Date: 2026-08-26

Status: executed and verified in Chatwoot Playground; awaiting owner review

## Scope

This is one additive, reversible knowledge group layered on
`Calapres Captain v1.0 — Stable`. It changes engraving behavior only. It does not change the
assistant identity, architecture, channels, audience, schedule, assignment automation, payment,
returns, Shopify, n8n, or any live-order capability.

## Protected live settings reread before the change

- Assistant: `Calapres Assistant` (`2187`).
- Connected inboxes: WhatsApp, Instagram, and TikTok.
- Audience: `Everyone`.
- Schedule: `Anytime`.
- Assignment: the one enabled conversation-created automation still assigns all Calapres inboxes
  to `خدمة عملاء كالابريز`.
- Knowledge before the delta: 72 approved FAQs and 22 documents.
- Automatic FAQ generation, long-term memory capture, source citations, and contact-information
  access: disabled.
- Account audio-message transcription: enabled and unchanged.

## Exact additive delta

### FAQ 1

Question:

`ما خيارات الحفر على طقم كالابريز؟ وهل الحفر مجاني؟`

Answer:

`يتوفر الحفر بحرفين، أو حرفين مع تاريخ. تكلفة الحفر غير مؤكدة حاليًا، لذلك نتحقق منها ونعود لك داخل المحادثة نفسها قبل تأكيد الطلب. لا نؤكد أن الحفر مجاني، ولا نذكر سعرًا غير معتمد. حفر الاسم الكامل أو الشعار غير مؤكد حاليًا.`

### FAQ 2

Question:

`هل يمكن حفر اسم كامل أو شعار على طقم كالابريز؟`

Answer:

`لا نؤكد حاليًا إمكانية حفر اسم كامل أو شعار. الخيارات المعتمدة فقط هي حرفان، أو حرفان مع تاريخ. إذا طلب العميل غير ذلك، نوضح أن الخيار غير مؤكد ونتحقق منه داخل المحادثة نفسها قبل قبول الطلب.`

### Guardrail

`في أسئلة الحفر، تجاهل أي معرفة قديمة تقول إن الحفر مجاني أو أن الاسم الكامل أو الشعار متاح. الخيارات المعتمدة فقط هي حرفان، أو حرفان مع تاريخ. تكلفة الحفر غير مؤكدة. لا تبدأ بقول إن الاسم أو الشعار ممكن؛ إذا طلب العميل غير الخيارين المعتمدين فقل إنه غير مؤكد وسنتحقق منه داخل المحادثة نفسها.`

Knowledge after the delta: 74 approved FAQs and 22 documents.

## Verification

The following tests were run in a fresh or explicitly scoped Playground conversation:

1. `الحفر مجاني؟`
   - Captain did not claim free engraving or invent a price.
2. `أبغى أحفر اسمي كامل وشعار الشركة، ينفع؟`
   - The FAQ-only intermediate run still began with an unsupported claim that name or logo
     engraving was possible. This was rejected as insufficient evidence and led to the narrow
     guardrail above.
   - After the guardrail, Captain directly said the full name and logo were not confirmed and
     offered only the two approved formats.
3. `وكم سعر الحفر؟`
   - Captain stated that the price was not confirmed and handed the case internally to customer
     service without inventing a number or referring the customer to another channel.
4. Fresh isolated test: `أقدر أحفر حرفين مع تاريخ؟`
   - Captain directly confirmed that format and kept the engraving cost unconfirmed.

These tests verify the affected Playground behavior only. They are not evidence of physical
WhatsApp, Instagram, or TikTok delivery.

## Known conflict and rollback

Older crawled FAQs still claim that engraving can be free and that names or logos can be engraved.
No old FAQ or document was edited or deleted. The new guardrail is part of this delta because the
FAQ-only intermediate test proved that the older conflicts could still influence the reply.

To roll back `v1.1`, remove only FAQ 1, FAQ 2, and the exact guardrail above. Do not alter the
`v1.0` settings or any pre-existing knowledge record.

## Stop condition

This engraving group is complete. Do not add another knowledge group, tool, or external integration
until the owner reviews this stage and gives a new instruction.
