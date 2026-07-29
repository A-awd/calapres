# Launcher Protocol

Canonical project: `calapres`

Canonical repository: `A-awd/calapres`

Canonical branch: `main`

`main` is the only authoritative branch. ChatGPT, Claude, Codex, and future agents are
interchangeable launchers. Platform memory and chat history are background context, never durable
authority.

## Before work

1. Fetch and verify the latest `main` revision and working-tree status.
2. Read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and this file.
3. Verify the relevant live Shopify state before trusting a stored status claim.
4. Confirm scope, protected data, blockers, and the next authorized action.

## Runtime boundary

Shopify is the operational source of truth. GitHub is the technical source of truth.

Supabase is retired. Do not inspect it during normal Calapres work, do not restore its code, and do
not make it a prerequisite for Shopify operations.

## After meaningful work

1. Validate the exact change.
2. Update `STATE.md` and `HANDOFF.md`.
3. Add or update a numbered decision when architecture, scope, security posture, or policy changes.
4. Record blockers and unpushed work explicitly.
5. Commit and push authorized work to `main`, then verify the remote revision.
6. Never claim completion that GitHub does not contain.

Never expose restricted data. Never leave durable project state only in a conversation.
