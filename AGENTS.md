# Calapres Agent Rules

This is the permanent coordination file for every AI agent working on Calapres.

## Session Startup

At the start of every session, read these root-level files in this order:

1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `WORKBOARD.md`

Do not scan the whole repo unless the task requires it.
Do not re-ask for information already written in these files.
Use GitHub as the shared memory and meeting point.
Markdown files are lightweight project memory.
Branches prevent conflicts.

No agent may say work is done unless the work is committed and pushed.
Never put secrets, tokens, API keys, customer data, or private credentials in chat or markdown files.

## Roles

### ChatGPT / Claude Chat

- Strategic brains.
- Analyze reports and decide the next move.
- Write prompts and instructions for executors.
- Do not make runtime changes unless explicitly connected to the right tool and asked.

### Codex

- Executor for GitHub repo work.
- Owns Supabase schema, migrations, sync code, tests, docs, and handoff files.
- Uses commits, branches, tests, and CI as proof of work.
- Must not execute n8n runtime unless explicitly possible and safe.

### Claude Code

- Executor for n8n workflows, Shopify runtime checks, Higgsfield runtime, live workflow execution, and credentials inside tools.
- Handles live automation and runtime wiring.
- Must not redesign database architecture unless explicitly requested.

### Owner

- Makes browser-based decisions.
- Does not need Terminal access.
- Should receive concise reports and single-click links whenever possible.

## Branch Strategy

- `main` = stable source of truth.
- `integration/claude-codex` = shared integration branch for sync, Supabase, n8n-supporting code, docs, and handoffs.
- `codex/<task-name>` = Codex task branch.
- `claude/<task-name>` = Claude Code task branch.
- `shopify-theme` = Shopify theme only.

Use one agent per branch at a time.
If a task branch is needed, branch from the correct base, commit, push, and record the handoff in `WORKBOARD.md` or `HANDOFFS.md`.

## Hard Boundaries

- Theme work only happens on `shopify-theme`.
- Theme work must not touch `sync/`, Supabase migrations, or n8n workflow code.
- Supabase, sync, and n8n-supporting code use the integration flow.
- Codex and Claude Code must not edit the same locked files or systems at the same time.
- If a file or system is locked in `WORKBOARD.md`, do not touch it.
- If a conflict exists, report it before changing anything.
- Claude Code must not redesign database architecture unless explicitly requested.
- Codex must not execute n8n runtime unless explicitly possible and safe.
- Do not delete products, records, migrations, or generated assets unless the owner explicitly approves.

## Coordination Rules

- Update `WORKBOARD.md` before starting and after finishing work.
- Record meaningful Codex <-> Claude Code handoffs in `HANDOFFS.md`.
- Keep reports short and categorized.
- Prefer targeted inspection over broad repository scans.
- Treat `PROJECT_STATE.md` as current memory, not as a replacement for source files when exact code evidence is required.
- If current evidence contradicts these files, update the markdown file and commit the correction.

## Completion Standard

Work is complete only when:

- Required files or systems are updated.
- Relevant checks have been run or a clear reason is documented.
- Changes are committed.
- Changes are pushed to GitHub.
- Any needed handoff is recorded.
