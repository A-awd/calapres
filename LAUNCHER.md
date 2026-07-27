# Launcher Protocol

Canonical project: `calapres`
Canonical repository: `A-awd/calapres`
Canonical branch: `main`

`main` is the single canonical branch. `migration/one-brain-foundation` was the governance source
that was migrated into `main` and is retained only as history. It is no longer canonical and must
not be treated as an alternative source of truth.

Claude, Codex, ChatGPT, and future agents are interchangeable launchers. GitHub is the only
permanent authority. Platform memory and chat history are background, never authoritative.

## Before work

1. Verify the remote and the latest commit on `main`.
2. Read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, `LAUNCHER.md`.
3. Verify the live state of n8n, Supabase, and Shopify before trusting any document.
4. Confirm scope, protected data, blockers, and the next authorized action.

## After meaningful work

1. Validate the exact change against the live system.
2. Update `STATE.md` and `HANDOFF.md`.
3. Add a numbered decision when architecture, scope, security posture, or policy changes.
4. Record blockers and unpushed work explicitly.
5. Commit and push when authorized, then verify the remote revision.
6. Never claim completion that GitHub does not contain.

Never expose restricted data. Never leave GitHub behind the conversation.
