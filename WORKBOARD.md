# Calapres Workboard

Coordination board for agents (Claude / Codex / Gemini). One agent per domain at a time.
Take a lock before working a domain; release it when done.

## Locks

| Domain | Status | Holder | Since | Scope |
|---|---|---|---|---|
| n8n runtime | LOCKED | Claude | 2026-06-06 | Rebuild flow `Vsf1Epd3ssfbw10i` to the `calapres_*` RPC model + one real product live injection (supplierProductId 735368737). Runtime only: n8n + credentials-in-n8n + Shopify/Supabase at runtime. |
| Supabase schema / migrations / `sync/` | FREE (Codex domain) | — | — | NOT touched by Claude this session (read-only introspection only). |

## Active task (Claude — n8n runtime)

Goal: live n8n run injecting one real product through
`Supplier -> supplier_products -> calapres_* RPCs -> product_variants -> Shopify (draft)`,
Supabase = source of truth, Shopify = one parent product + one variant per size.

Status: IN PROGRESS (lock taken; rebuilding flow to RPC model).
