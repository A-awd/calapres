# Calapres customer-service source checkpoint — 2026-08-12

## Continuation freeze — 2026-08-13

The working MVP was preserved before hardening. Existing workflow `kAyF0D3ZZHxc0Hwp` still runs
rollback version `8c518aeb-22c2-4ab9-bcef-7418029386da`; its protected 83-node update is draft
`941205ae-dab2-4684-b897-dee3655a2af7`. The sanitized frozen source is
`n8n/deployments/calapres-cs-bot-protected-draft.json` with SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`.
No duplicate workflow was created and Edge v2 `e442GlRmKP4IO8pm` was preserved.

Neon migrations 0011–0013 add the customer-reply outbox, one-winner recovery queue, and transient
recovery-read rescheduling. The protected graph requires raw-body HMAC, a durable claim before
204, bounded Chatwoot rereads, exact send lease, reply-digest reconciliation, deterministic
scope handling, model budget/kill switch, owner escalation, and Shopify read-only GraphQL.
Targeted n8n executions `41145`–`41160` passed without external customer send, private note,
model call, or Shopify write. The remaining live proof is one owner-only cycle after publishing
this exact draft; the existing active version remains the rollback.

The exact draft was subsequently published on the same workflow after both GitHub checks passed.
Live active version is `941205ae-dab2-4684-b897-dee3655a2af7`; rollback remains
`8c518aeb-22c2-4ab9-bcef-7418029386da`. Live HMAC binding was proven with a signed outgoing
fixture returning 204 and an invalid signature returning 401. No third Chatwoot webhook was
created. No real model request or Shopify write occurred. One fresh owner-phone inbound and its
resulting reply remain the final real customer-path observation.

Status: preserved work in progress; source-only; not approved for import, credential binding,
publication, activation, model calls, durable writes, or customer egress.

## Continuation evidence — 2026-08-12

The preserved source was completed on the checkpoint branch; its final source hash is
`c3f2e3f00c6cfeeeba42966639303056fd178e7b67ed512a6d39c6da6e22d991`. It was originally pushed at
`aa35fa84fbdbe69c109bca1250c1b616f3b0430e` on
the checkpoint branch. Existing Edge v2 workflow `e442GlRmKP4IO8pm` is published and active in
observation/no-send mode at final version `55ff93fc-8400-4a55-8338-3cc5301f7f71`. The existing Chatwoot
webhook secret binding was corrected in place; a signed synthetic POST returned HTTP 200. The
full pinned fail-closed graph test completed as n8n execution `40798`. No customer message,
private note, model call, or Shopify write occurred. A permitted synthetic event was then sent
for existing test conversation `3`; the endpoint returned HTTP 200, but PostgreSQL still
contained zero rows in `conversation_jobs`, `conversation_job_queue`, `request_replay_claims`, and
`audit_events`. Root cause was isolated to `_edge_key_bundle_valid`: its FULL OUTER JOIN included
unrelated registry namespaces. Migration 0009 scopes that join to the requested namespace, and migration 0010 grants the exact callable surface to the n8n LOGIN roles; direct
Neon verification now returns `committed / processing_claimed`. The existing target was updated and
published at version `55ff93fc-8400-4a55-8338-3cc5301f7f71`; observation/no-send remains enabled.
HTTP acceptance alone did not prove durable persistence.

## Why this checkpoint exists

This checkpoint preserves the complete Calapres-only customer-service work completed after GitHub
revision `bfb191c1d1c573e2911df46661246e37b2ec808d`. It is intentionally isolated from `main` so the
large unfinished source set can be resumed without rebuilding it or misrepresenting it as a
production release.

Checkpoint branch: `agent/preserve-calapres-customer-service-checkpoint`

## Preserved implementation

- the source-only Calapres Edge v2 update candidate targeting existing workflow
  `e442GlRmKP4IO8pm` only;
- signed Chatwoot ingress stages, same-item native-Crypto boundaries, transport replay and stable
  business-event identities;
- identifiers-only waiting, bounded double Chatwoot re-read, generation cancellation, due-job
  recovery, and best-effort four-inbox reconciliation building blocks;
- a provider-neutral atomic-storage contract with thirteen logical operations, an in-memory
  concurrency reference, a fixed-function PostgreSQL adapter, and migrations `0001`–`0007`;
- separated signed-webhook, reconciliation, and owner database roles;
- deterministic brand-context compilation, fixed trust pins, provider-neutral model contracts,
  adversarial sanitization, and deterministic approved-response rendering;
- read-only Shopify identity adapter contracts, strict schemas, synthetic fixtures, CI source, and
  security/concurrency tests;
- decision 0011 and the accompanying pilot, operations, and provider-evaluation documentation.

## Exact stop point

- Current Edge v2 source SHA-256:
  `de60f93cf038307a1ed56389831aa2dbf81dc1327c5c42b06ce4fdcab9224756`.
- The deployment manifest still pins the prior SHA-256
  `3d5de2eaa8b87deb35601c072e3b2c2590dc7fe02911fb1395b5c66ba91b82bd`.
- Current Node suite: 225 of 226 tests pass. The single failure is that intentional stale-manifest
  mismatch.
- Current Python suite runs 92 tests and reports two failures with the same root cause: the direct
  manifest assertion and the Node-wrapper assertion.
- The account-wide reconciliation building blocks and database operations are preserved, but the
  final reconciliation graph has not yet been integrated and frozen inside Edge v2.
- `customer-service-release-lock.json` has not been emitted because the source is not frozen.

## Live boundary at checkpoint time

The existing live n8n Core, Edge v1, Shopify Order Index, and Owner Review Desk remain inactive and
unpublished, with no active version, no production trigger, no assigned credential, and execution
payload retention disabled. Edge v2 was not imported. No PostgreSQL instance, credential, webhook,
model connection, Shopify scope, customer message, private note, or customer-facing action was
created by this unfinished batch.

## Required resumption sequence

1. Resume from this checkpoint branch; do not regenerate or recreate the existing artifacts.
2. Integrate the bounded reconciliation graph into the same Edge v2 while preserving the separate
   reconciliation credential and the no-send/model-off boundary.
3. Freeze Edge v2, update the deployment-manifest hash once, and emit the final release lock.
4. Run the full Node, Python, JSON, syntax, graph, secret/PII, and independent red-team checks.
5. Update `STATE.md` and `HANDOFF.md` with the final frozen evidence.
6. Merge to `main` only after review. Live PostgreSQL compile/concurrency/role/backup validation and
   all persistent credentials remain later owner-approved gates.

## Minimal-token resumption prompt

Copy the following text into a new task. Use one agent and a cost-efficient model with medium
reasoning for implementation; reserve higher reasoning for one final review only.

```text
أكمل مشروع خدمة عملاء كالابريز من الـcheckpoint المحفوظ، ولا تبدأ من الصفر ولا تعِد بناء أي
جزء موجود.

المصدر الملزم:
- المستودع: A-awd/calapres
- الفرع: agent/preserve-calapres-customer-service-checkpoint
- Draft PR: https://github.com/A-awd/calapres/pull/4
- نقطة البداية المحفوظة: commit b34d2fa772994d4c04bdc95d8a647c212befcd48
- اقرأ أولًا AGENTS.md وREADME.md وSTATE.md وHANDOFF.md وLAUNCHER.md والقرارين 0010 و0011،
  ثم docs/calapres-customer-service-checkpoint-2026-08-12.md. تحقق من GitHub وorigin قبل التعديل.

قيود صارمة لتقليل التوكنز:
1. استخدم وكيلًا واحدًا فقط. ممنوع إنشاء subagents أو parallel agents.
2. لا تعِد البحث أو التصميم أو تدقيق المستودع كاملًا. اقرأ فقط الملفات المرتبطة مباشرة بالمرحلة.
3. لا تضف أي براند آخر، ولا Supabase، ولا Captain/AgentBot، ولا تعدّل الكتالوج أو Shopify theme.
4. لا تنشئ Workflow جديدًا لكالابريز؛ حدّث Edge V2 الحالي فقط، واستهدف workflow ID
   e442GlRmKP4IO8pm عند الوصول إلى بوابة الاستيراد المعتمدة.
5. لا توسّع المعمارية أو تكتب وثائق جديدة إلا لتسجيل الحالة النهائية المطلوبة.
6. استخدم اختبارات مستهدفة أثناء التنفيذ، ثم شغّل الحزمة الكاملة مرة واحدة فقط عند التجميد.
7. لا تطبع ملفات أو مخرجات طويلة. أعطِ تحديثات عربية قصيرة ومحددة.
8. اعمل على checkpoints صغيرة وادفع كل مرحلة مستقرة إلى الفرع نفسه. إذا كان عداد الاستخدام
   متاحًا، توقف وقدم كشف تقدم كل 25 ألف توكن، ولا تتجاوز 200 ألف توكن دون موافقتي.
9. لا تلمس live n8n أو credentials أو PostgreSQL أو Chatwoot أو Shopify أو الإرسال للعملاء دون
   موافقتي عند البوابة التي تتطلب ذلك.
10. اكتب اسم البراند بالعربية دائمًا: كالابريز.

الهدف العملي، دون إعادة هندسة:
- إكمال الحد الأدنى الإنتاجي لخدمة عملاء كالابريز بالذكاء الاصطناعي دون موظف بشري للطلبات
  الروتينية، مع تحويل الحالات الحساسة أو غير الموثوقة إلى المالك أو no-send بدل التخمين.
- أبقِ البراندات الأخرى خارج النطاق.

ترتيب العمل الملزم:
1. تحقق أن الـcheckpoint لم يتغير، وشغّل الاختبارات المستهدفة التي تثبت أن العائق الحالي هو hash
   الـdeployment manifest والمسار غير المجمّد فقط.
2. أكمل دمج مسار Chatwoot reconciliation الموجود داخل Edge V2 نفسه باستخدام العقود والـruntime
   وعمليات PostgreSQL الموجودة؛ لا تنشئ بنية بديلة.
3. جمّد Edge V2، حدّث source_sha256 مرة واحدة، وأنشئ customer-service release lock.
4. أصلح الاختبارات الحالية فقط حتى تصبح Node وPython وJSON وsyntax وgraph وsecret/PII checks
   خضراء، ثم حدّث STATE.md وHANDOFF.md والوثائق القائمة باختصار.
5. commit وpush إلى الفرع نفسه، وحدّث Draft PR #4. لا تدمج إلى main قبل المراجعة.
6. بعد اكتمال المصدر، اطلب مني فقط المدخلات الخارجية الضرورية بالترتيب: اعتماد PostgreSQL، ثم
   Chatwoot secret/read credential، ثم مفتاح النموذج، ثم Shopify read scopes. لا تطلبها قبل الحاجة.
7. عند توفرها، اختبر PostgreSQL الحقيقي والعزل والسباقات، ثم signed Chatwoot fixture، ثم observation
   بلا إرسال. بعد نجاح ذلك اربط النموذج وShopify للقراءة واختبر low-risk replies.
8. لا تفعّل customer send إلا بعد اختبار end-to-end ناجح وموافقتي الصريحة النهائية.

ابدأ بالتنفيذ مباشرة من الأدلة الحالية. لا تقدم خطة طويلة؛ أعطني في البداية خمس نقاط كحد أقصى عن
الحالة، ثم نفّذ المرحلة الأولى.
```
