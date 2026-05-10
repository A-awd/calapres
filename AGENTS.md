# AGENTS.md

This repository participates in the A-awd GitHub-first AI operating system.

## Repository Role

`calapres` is a React/Vite app with Supabase integration and an existing test posture. Preserve testability and use it as a stronger template for similar Lovable-era apps.

## AI Role Contract

- Claude: product architecture and design direction.
- Codex: implementation, tests, Supabase safety, CI hardening.
- Gemini: research, critique, second-pass review.

## Operating Rules

- Read `docs/ai/OPERATING_MODEL.md` before substantial work.
- Never commit Supabase service keys, auth secrets, customer data, or private business data.
- Keep tests current for user-facing behavior and Supabase boundaries.
- Prefer deterministic scripts and migrations over prompt-driven operations.
- Use GitHub issues/PRs as durable memory.
