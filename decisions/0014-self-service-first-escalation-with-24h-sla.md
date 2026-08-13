# 0014 — Self-service-first escalation with a durable 24-hour unresolved-case SLA

Date: 2026-08-13
Status: accepted

## Context

The protected Calapres customer-reply workflow originally added the Chatwoot `human` label
and stopped replying immediately on: cancellation/refund/complaint/damaged-item language, any
Shopify API or credential failure, a missing phone or order number, an ambiguous or not-found
order/customer match, and any model budget denial or untrusted model output. In production this
silenced conversation #3 the moment the customer's Shopify order lookup failed (the n8n Shopify
credential had an invalid access token), and separately treated an ordinary "الغي طلبي" as an
instant, silent handoff. The owner explicitly rejected this interpretation: none of those cases
should trigger an immediate human label or silence. Only an explicit request to speak to a human,
or a case that stays genuinely unresolved for 24 continuous hours, should escalate.

## Decision

1. **Immediate escalation is reserved for one trigger only**: an explicit customer request for a
   human/employee/customer service, detected by the router as `error_code:
   customer_requested_human`. `Build Human Escalation` now has exactly one inbound edge
   (`Route Customer Service Decision` output 5), verified by a graph test.
2. **Every other previously-escalating case now self-serves**:
   - cancellation/refund/return/exchange/complaint/damaged-item/payment-concern language routes
     to the same Shopify order-lookup lane as an order query (`decision_kind: 'sensitive_request'`),
     asks for the order number if missing, reads the live order status, and replies with the
     verified status plus an explicit statement that no cancellation/refund has been executed yet;
   - a Shopify API/credential failure, an ambiguous or not-found order/customer match, a missing
     phone or order number, and a not-found product all reply with a bounded clarification asking
     for the minimum missing identifier;
   - an identity mismatch (order found but the phone doesn't match) never reveals whose order it
     is — it asks the customer to recheck the number, identical wording to "not found";
   - a cancelled/refunded order is reported as a plain verified fact (Shopify is already the
     source of truth for that state), not escalated;
   - a model budget/kill-switch denial or an untrusted/unsafe model reply now returns one of two
     fixed, non-invented bounded fallback sentences instead of failing to `send_ready: false`.
3. **A durable 24-hour unresolved-case SLA replaces those old immediate escalations as the
   backstop.** Migration `0014_calapres_cs_customer_reply_sla_escalation.sql` adds
   `calapres_cs.customer_reply_sla_cases` (one open case per conversation, enforced by a partial
   unique index) and three `SECURITY DEFINER` functions mirroring the existing outbox/recovery
   contract shape:
   - `atomic_upsert_customer_reply_sla_case` — `touch` opens a case on the first unresolved
     message in a conversation and reuses it for every later unresolved message without moving
     `first_unresolved_at`; `resolve` closes it only when a genuinely resolved answer was sent;
   - `atomic_claim_due_customer_reply_sla_escalation` — the same `FOR UPDATE SKIP LOCKED` +
     lease pattern as `atomic_claim_due_customer_reply_recovery`, gated to cases open ≥23h (clock
     skew guard) and ≤48h (sanity bound);
   - `atomic_finalize_customer_reply_sla_escalation` — commits `escalated` after Chatwoot confirms
     the label, `resolved` when a live reread shows the case is already ineligible (human-labelled,
     resolved, closed, or route/brand mismatched), or releases back to `open` for retry on a
     transient Chatwoot failure — mirroring migration 0013's retry-without-resend guarantee.
   All three functions are `EXECUTE`-granted only to `calapres_cs_webhook_runtime`/`_login` (the
   same roles already used by the reply-outbox and send-recovery functions); the table itself
   stays revoked from every runtime role, same as `customer_reply_events`.
4. **The scheduler is reused, not duplicated.** The existing `Recover Ambiguous Sends Every 15
   Minutes` trigger gains one additional, fully isolated fan-out branch (claim → live Chatwoot
   reread → eligibility check → apply the label via a dedicated HTTP node reusing the same
   `Header Auth account 3` credential → finalize). It shares the trigger and the Postgres
   credential with the existing send-recovery branch but has no connection into it or into `Send
   Reply`; graph tests assert neither the trigger nor the SLA sub-branch can reach `Send Reply`.
5. **SLA bookkeeping runs off the existing reply path, not inline with it.** A single new
   `Prepare SLA Case Update` → `Postgres Customer Reply 14 Update SLA Case` pair is fanned out
   (not inserted) from `Human Delay` (the converge point every resolved/clarification/fallback
   reply already passes through) and from the explicit-human-request branch. It never gates or
   delays the actual customer reply.

## Consequences

- `Build Human Escalation`'s reachable set shrank from four inbound sources to one; every removed
  source now terminates in a customer-visible bounded reply instead of silence.
- The frozen source grew from 82 to 99 nodes (17 new: 2 for reply-path SLA bookkeeping, 1 shared
  model-fallback builder, 14 for the scheduled SLA-escalation sub-branch). No new workflow,
  webhook, or credential was created; the Shopify credential itself remains a separate, still
  broken (invalid access token) issue tracked outside this decision.
- This SLA implementation is not yet applied to the live Neon database in this pass — the
  executing session had no Neon MCP access. The migration is checked in and statically tested;
  the live workflow will 500/fail closed on the new function calls until `0014` is applied.
