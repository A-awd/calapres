# Agent Instructions

These instructions apply equally to Claude, Codex, ChatGPT, Hermes, and every future launcher.

## Start every session

1. Open the calapres repository and confirm the target branch and latest GitHub commit.
2. Read README.md, this file, STATE.md, HANDOFF.md, and relevant entries in DECISIONS.md.
3. Use ai-operating-system only for global rules; calapres operational memory belongs here.
4. Treat platform-local chats, memories, caches, and local copies as non-authoritative until reconciled with GitHub.

## Working rules

- Preserve useful code and Git history.
- Store only sanitized, project-specific context in this repository.
- Never commit credentials, customer or order data, raw conversations, unsanitized exports, or production secrets.
- Do not change live Shopify, Supabase, automation, hosting, repository settings, or other production state without explicit authorization.
- Prefer the latest approved GitHub state when sources conflict, and record durable resolutions in DECISIONS.md.

## End every meaningful session

Update STATE.md and HANDOFF.md, add a decision when one was made, then commit and push the approved work when authorized. Leave the next action precise enough for another launcher to continue without relying on platform memory.

## Canonical authority and entry contract

GitHub is the only permanent source of truth for approved, sanitized project state. Platform-local memory, chat history, launcher text, caches, and unpushed work are non-authoritative.

At session start, read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and `LAUNCHER.md`, plus relevant linked decisions and workflows. Continue only from the latest verified GitHub branch and commit.

## Required One Brain synchronization contract

Before work, every supported agent must verify the canonical remote `A-awd/calapres`, inspect the working tree, current branch, latest local commit, latest GitHub commit, and synchronization state, then continue only from the latest verified GitHub state. Read `README.md`, `AGENTS.md`, `STATE.md`, `HANDOFF.md`, `DECISIONS.md`, and `LAUNCHER.md`, plus relevant linked decisions, workflows, and security guidance.

After meaningful work, validate the exact change; update `STATE.md` and `HANDOFF.md`; update `DECISIONS.md` when a durable decision is made; record blockers, risks, and unfinished or unpushed work; commit and push when authorized; and verify that GitHub contains the reported revision. If push is unavailable or unauthorized, record the exact unpushed state and do not claim durable completion.

GitHub is the only permanent authority. Platform memory, chat history, launcher text, caches, local scratch files, and unpushed work are non-authoritative. Never leave GitHub behind the conversation.
