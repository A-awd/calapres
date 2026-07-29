# AI Operating Model

## Role

`calapres` is a Shopify theme and operations repository. AI launchers continue the existing
Shopify-native implementation from the latest verified GitHub state.

## Durable memory

- GitHub issues: product tasks, theme bugs, SEO, performance, and Shopify operations.
- Pull requests: implementation notes, validation, and risk notes.
- `AGENTS.md`: binding execution rules.
- `STATE.md` and `HANDOFF.md`: current state and continuity.
- `DECISIONS.md`: durable architecture and policy decisions.

## Workflow

1. Verify `main` and read the operating documents.
2. Inspect live Shopify before making operational claims.
3. Reuse existing theme code and Shopify-native features.
4. Validate changes in proportion to risk.
5. Update state and handoff documents, then commit and push authorized work.

## Retired systems

Supabase, the legacy React application, and the retired supplier synchronization stack are not
approved Calapres components. Do not restore or recreate them.
