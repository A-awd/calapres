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
| Codex | `integration/claude-codex` | Create Calapres AI coordination system | `AGENTS.md`, `PROJECT_STATE.md`, `WORKBOARD.md`, `HANDOFFS.md` | Completed and ready to push | 2026-06-06 |

## File/System Locks

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| None | - | No active locks | - | Open | 2026-06-06 |

## Current Handoffs

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| Codex | `integration/claude-codex` | Establish shared command center | `HANDOFFS.md` | Ready for next agent | 2026-06-06 |

## Completed Milestones

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| Codex | `shopify-theme` | Theme deploy pipeline and staging homepage polish | Shopify theme files | Completed and pushed | 2026-06-05 |
| Codex | `main` | Product data lake and fragrance variant source files | `sync/`, Supabase migrations | Completed and pushed | 2026-06-05 |

## Next Decisions

| Agent | Branch | Task | Files/Systems Owned | Status | Last Update |
| --- | --- | --- | --- | --- | --- |
| Owner / ChatGPT / Claude Chat | `integration/claude-codex` | Decide when to let Claude Code apply live Supabase/n8n runtime changes | Supabase, n8n | Pending decision | 2026-06-06 |
| Owner / ChatGPT / Claude Chat | `shopify-theme` | Decide whether staging homepage polish is ready for live publish | Shopify theme | Pending decision | 2026-06-06 |
