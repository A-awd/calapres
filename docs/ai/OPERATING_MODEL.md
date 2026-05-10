# AI Operating Model

## Role

`calapres` is a React/Vite/Supabase app with a stronger testing posture than several sibling app repos. It can serve as a reference for app hardening patterns.

## Durable Memory

- GitHub issues: product tasks, bugs, Supabase work, UX changes.
- Pull requests: implementation notes, tests, risk notes.
- `AGENTS.md`: AI execution rules.
- `docs/ai/REPO_HEALTH.md`: maturity and hardening backlog.

## Workflow

1. Claude owns architecture and product decisions.
2. Codex owns implementation, tests, migrations, and verification.
3. Gemini can review product positioning, UX, and external references.
4. CI and deterministic scripts should be preferred over manual checks.

## Supabase Safety

- Never expose service-role keys in browser code.
- Prefer additive migrations.
- Keep RLS explicit and tested.
- Do not commit private data, exports, or logs.
