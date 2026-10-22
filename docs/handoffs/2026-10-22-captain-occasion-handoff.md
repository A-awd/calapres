# Captain occasion-deadline handoff — 2026-10-22

Status: live configuration saved and read back; private Playground behavior verified. Real-conversation execution of the new handoff scenario remains unverified.

## Owner authorization and scope

The owner explicitly authorized correcting the 14-day interpretation, collecting missing occasion details, handing the conversation to staff without rejecting or guaranteeing a date, and stopping when staff intervene. This is a narrow native Captain change in Chatwoot account `179973`, assistant `2187`; it does not activate an external response controller or the older owner/Telegram review proposal.

## Observed defect

The crawled shipping policy says delivery is **within 14 days** from booking confirmation, including preparation and shipping. Its generated FAQ said delivery **is 14 days**, losing the within/upper-bound meaning. The source's usage list included the reviewed conversation. Existing guideline and guardrail text asked for handoff but the real reply gave an unverified deadline judgment before collecting the latest customization detail. The old broad handoff scenario was disabled.

## Saved live delta

1. Updated the single 14-day delivery FAQ (question: `ما هي مدة التسليم للمبخرة المخصصة باسم أو كتابة أو شعار داخل السعودية؟`). The answer now preserves `خلال 14 يومًا`, explains this is neither a mandatory full 14-day wait nor evidence earlier delivery is impossible, and routes occasion-specific feasibility to staff. The public Shopify shipping policy was already correctly worded and was not edited.
2. Created and enabled scenario `مناسبة أو موعد تسليم محدد — مراجعة الفريق`, scenario id `2203`. Trigger examples include an occasion, wedding, dated gift, rush request, or arrival-before-date question, for prospective or existing orders.
3. The scenario collects only missing city, customization type, and requested arrival deadline, one short question at a time. It uses recent context, does not repeat supplied details, and does not ask a prospective buyer for an order number. A customer who declines details or asks for staff is handed off without blocking on the questions.
4. After details, use native `add_private_note` for a minimal team summary, native `add_label_to_conversation` with the existing `يحتاج-تدخل` label, and native `handoff`. A note/label failure must not delay handoff. The customer line is `أبشري، بخلي الفريق يراجع لك الموعد ويتابع معك هنا.` It prohibits an independent refusal, guarantee, unsupported date calculation, or claim that the owner was already consulted.
5. Replaced the existing occasion response guideline, aligned the existing general handoff guideline's occasion clause, and aligned the existing handoff guardrail. They refer to the new scenario, prohibit independent deadline judgments, and require silence after staff takeover or handoff until explicitly reassigned to Captain.
6. Preserved `Wait for the customer`, existing inbox attachments, existing custom read tools, the priority scenario, and the disabled old broad handoff scenario. No n8n, Shopify, Meta/template, credential, paid plan, or real customer-conversation write/send occurred.

## Validation and precise limits

Saved FAQ wording was visible after the edit dialog closed. The scenario readback showed enabled plus the three actual tool references. Both guideline edits and the guardrail save returned success; the final saved scenario was read back after navigation.

Private Playground test A:
- Synthetic customer mentions an occasion and a requested deadline, without city/customization.
- Reply: `أكيد، لأي مدينة التوصيل؟`
- Synthetic reply supplies Riyadh.
- Reply: `تمام، تبينها بدون تخصيص ولا حفر اسم/كتابة ولا شعار؟`
- Synthetic reply supplies two letters.
- Reply: `أبشري، بخلي الفريق يراجع لك الموعد ويتابع معك هنا.`
- Run details selected the new scenario and invoked all three native tools with the collected details, without a delivery verdict.

Private Playground test B supplied city, two-letter customization and deadline in one message. Captain immediately returned the same review/handoff line, did not repeat a question, and selected scenario `2203`.

**The tool calls in both tests returned `Conversation not found`.** The Playground session had no live conversation. This is not a successful note, label, or handoff execution and must not be reported as production handoff proof. Text behavior and tool selection passed; native effects are pending the next real eligible conversation. No real customer or owner-channel message was sent to manufacture that proof.

The previously existing real conversation independently shows an agent reply changed status to Open and subsequent staff replies continued without another Captain reply. This supports the existing native takeover behavior; it is not a new end-to-end test of scenario `2203`. The explicit stop instructions are now saved too. Do not promise zero possible in-flight race from prompt text alone.

Screenshot of enabled live scenario is held locally in the session deliverables, not committed with customer content.

## Next action

Read the next naturally occurring eligible conversation: verify exactly the missing-detail questions, minimal internal note, `يحتاج-تدخل`, handoff to Open, and no Captain replies after staff takeover. Treat accepted/attempted/successful actions as distinct. If a native action fails on a real conversation, inspect that error before changing the scenario or adding infrastructure. Do not send a customer test or reactivate the old n8n responder merely to obtain proof.

The September owner-assisted brief's Telegram decision/reply loop and 60–120-second external controller remain unimplemented and outside this change. This native staff handoff does not claim those capabilities.

## Bounded rollback

Disable only scenario `2203`, then restore the three edited guideline/guardrail entries from their recorded pre-edit text if the owner authorizes rollback. Restore the prior FAQ only if deliberately reverting the interpretation correction; the prior answer was `مدة التسليم للمبخرة المخصصة باسم أو كتابة أو شعار داخل السعودية هي 14 يومًا من تاريخ تأكيد الحجز، وتشمل هذه المدة التجهيز والشحن حتى الاستلام.` Preserve all unrelated knowledge, tools, routing, and existing conversation history. Do not enable the old broad handoff scenario as a shortcut.

## Pre-edit instruction snapshot for bounded rollback

Prior occasion response guideline:

> في سؤال عميل قبل الشراء عن الوصول قبل مناسبة: اجمع البيانات قبل تقييم الإمكان. إذا لم تُذكر مدينة التوصيل، اجعل الرد فقط «لأي مدينة التوصيل؟». إذا ذُكرت المدينة ولم يُذكر الحفر، اجعل الرد التالي فقط «تبغينها بحفر اسم/شعار ولا بدون؟». لا تقل في هاتين الخطوتين «ما أقدر أضمن» أو حكمًا على الموعد. لا تكرر يوم المناسبة ولا تحوّله إلى تاريخ، ولا تطلب رقم طلب. بعد اكتمال البيانات، لا تعد بوصول غير مؤكد ولا تدّعِ أنك سألت صاحب المتجر ما لم يحدث ذلك فعلًا.

Prior general handoff response guideline:

> إذا طلب العميل التحدث لموظف أو قال إن الرد لم يساعده، فعّل Handoff فورًا ولا تكرر الإجابة. قل: «أكيد، بخلي الفريق يتابع معك هنا.» لا تدّعِ أنك إنسان. إذا كان السؤال عن توصيل لمناسبة أو تعديل طلب مدفوع ويحتاج تحققًا، اجمع معلومة واحدة ضرورية ثم حوّل للفريق؛ لا ترفض أو تعد من دون تحقق.

Prior handoff guardrail:

> إذا طلب العميل موظفًا بشريًا بوضوح، أو قال إن الرد لم يساعده، استخدم Handoff فورًا. قل فقط: «أكيد، بخلي الفريق يتابع معك هنا.» لا تدّعِ أنك إنسان ولا تواصل الإجابة الآلية بعد طلب التحويل. وإذا احتاج السؤال قرارًا من المالك أو تحققًا من موعد تسليم غير مؤكد، اسأل سؤالًا واحدًا لازمًا ثم حوّل المحادثة للفريق بدل الرفض أو الوعد.
