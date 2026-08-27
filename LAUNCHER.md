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

For customer-service work, start from decisions 0008, 0010, 0011, 0018, 0019, and 0020 plus
`docs/calapres-customer-service-operations.md`. Trust only the workflow states proved in `STATE.md`.
Never create a duplicate Calapres Edge, attach another brand's credential, acknowledge a webhook
before its durable ingress job exists, treat n8n Data Tables or execution history as atomic
authority, enable a second model/customer-send path, or provision PostgreSQL without the
separately recorded gates.

When decision 0018 is active, keep Captain as the only responder on its connected inboxes and keep
the preserved n8n responder unpublished. Never run both responders on the same inbox.

When decisions 0019 and 0020 are active, each separately owner-approved external capability may use
its own small, independently removable bridge. Naming or specifying a capability does not approve
implementation. Give every approved bridge an owner-readable Arabic display name and define its
bounded input, output, source authority, acceptance test, and rollback. Do not combine product
links, price, stock, orders, shipping, outbound messaging, or future capabilities in one bridge.

## After meaningful work

1. Validate the exact change.
2. Update `STATE.md` and `HANDOFF.md`.
3. Add or update a numbered decision when architecture, scope, security posture, or policy changes.
4. Record blockers and unpushed work explicitly.
5. Commit and push authorized work to `main`, then verify the remote revision.
6. Never claim completion that GitHub does not contain.

Never expose restricted data. Never leave durable project state only in a conversation.
