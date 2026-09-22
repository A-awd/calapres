# 0044 — Adopt a least-privilege Calapres operations-health MCP

Date: 2026-09-22
Status: Accepted for source design; production deployment remains unapproved.

## Context

The owner requires Codex to prefer an available official connector or MCP path before browser
automation. The current Easy Life workflow-scoped MCP gateway intentionally exposes only Start Day
and run-result tools. Expanding it into an n8n administration surface would grant unrelated
workflow and credential visibility and would weaken brand isolation.

Calapres needs a durable way to distinguish a healthy Telegram owner bridge, a stale or failed
bridge, available Chatwoot monitoring, and an unavailable monitoring connector without requiring a
browser session.

## Decision

Create a separate Calapres-owned, owner-only MCP gateway that exposes exactly one read-only tool:
`Get_Calapres_Operations_Health`.

The tool may call only one fixed authenticated GET endpoint and may return only the closed,
sanitized operations-health schema. It must not search, edit, activate, or execute arbitrary n8n
workflows; send Telegram or Chatwoot messages; modify Shopify or advertising systems; reveal
credentials or webhook URLs; or return customer content.

The health producer remains a separately deployed dependency. Stale or missing evidence must fail
closed to `unknown` or `monitoring_unavailable`; it must never be reported as confirmed
`disconnected` without live evidence.

## Consequences

- Codex gains a future MCP-first diagnostic path without broad n8n authority.
- The Easy Life MCP gateway remains unchanged and least-privileged.
- Repository source, schema, manifest, tests, and documentation can be reviewed before any live
  change.
- Production import, credential binding, activation, connector registration, and any modification
  to Owner Telegram Voice Bridge require fresh explicit approval and a live canary.
- Until that deployment is approved and verified, current Telegram and Chatwoot health remains
  unverified; source existence is not operational proof.
