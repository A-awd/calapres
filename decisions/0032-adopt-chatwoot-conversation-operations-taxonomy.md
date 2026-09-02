# 0032 — Adopt the Chatwoot conversation operations taxonomy

Date: 2026-09-02

Status: accepted and implemented

## Decision

Use seven sidebar-visible labels in Chatwoot account `179973`:

- `يحتاج-تدخل`
- `عميل-منزعج`
- `مهتم-بالشراء`
- `طلب-قائم`
- `مشكلة-شحن`
- `مشكلة-دفع`
- `سبام`

Require the conversation list attribute `نتيجة المحادثة` (`conversation_outcome`) when resolving a
conversation. Its allowed values are `تم الشراء`, `انتهى الاستفسار`, `بانتظار العميل`,
`تم التحويل لموظف`, `مشكلة حُلّت`, `لم يتم الشراء`, and `سبام`.

Use eight saved filters under `المجلدات`: `بانتظار العميل`, `يحتاج تدخل بشري`,
`عملاء منزعجون`, `مهتم ولم يطلب`, `طلبات قائمة`, `مشكلات الشحن`, `مشكلات الدفع`, and
`سبام وخارج النطاق`. Keep auto-resolve disabled.

## Boundaries

This decision does not change Captain assistant `2187`, its inbox connections, the enabled
assignment automation, historical conversation state, or Meta/WhatsApp templates. It does not
authorize automatic label assignment. Any automation that applies labels requires a separately
verified stage and a one-conversation canary before broader use.

## Verification

The live UI confirmed seven labels in the sidebar, successful creation of the custom attribute,
`نتيجة المحادثة` under Attributes required on resolution, and all eight saved filters under the
conversation folders section.
