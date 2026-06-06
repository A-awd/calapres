# Calapres Workboard

This file prevents agent conflicts. Every agent updates it before starting and after finishing work.

Rules:

- If a file or system is locked by another agent, do not touch it.
- If a conflict exists, report it before changing anything.
- Keep locks narrow and remove them when work is finished.
- No agent says done unless work is committed and pushed.

## Active Ownership

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| None | - | No active owner | - | Open | 2026-06-06 |

## File/System Locks

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| None | - | No active locks | - | Open | 2026-06-06 |

## Current Handoffs

| From | To | Branch | Task | Files/Systems | Status | Last Update |
| --- | --- | --- | --- | --- | --- | --- |
| Codex | Claude Code | `integration/claude-codex` | Wire one real n8n product injection using the Supabase RPC contract | `CLAUDE_N8N_HANDOFF.md`, Supabase RPCs, n8n workflow runtime | Ready for Claude Code; Codex must not execute n8n | 2026-06-06 |

## Completed Milestones

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| Codex | `integration/claude-codex` | Calapres AI coordination system | `AGENTS.md`, `PROJECT_STATE.md`, `WORKBOARD.md`, `HANDOFFS.md` | Completed and pushed | 2026-06-06 |
| Codex | `integration/claude-codex` | Adopt Claude fragrance model and add n8n Supabase RPC contract | `AGENTS.md`, `PROJECT_STATE.md`, `WORKBOARD.md`, `CLAUDE_N8N_HANDOFF.md`, Supabase migrations | Completed; commit/push proof required | 2026-06-06 |
| Codex | `shopify-theme` | Theme deploy pipeline and staging homepage polish | Shopify theme files | Completed and pushed | 2026-06-05 |
| Codex | `main` | Product data lake and fragrance variant source files | `sync/`, Supabase migrations | Completed and pushed | 2026-06-05 |

## Next Decisions

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `integration/claude-codex` or `claude/<task-name>` | Run the first live n8n product injection against Supabase RPCs | n8n runtime, Supabase service-role credential inside tools | Pending | 2026-06-06 |
| Owner / ChatGPT / Claude Chat | `shopify-theme` | Decide whether staging homepage polish is ready for live publish | Shopify theme | Pending decision | 2026-06-06 |
