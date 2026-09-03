# 0034 — Prefer direct OpenAI API as the primary Calapres agent provider, subject to n8n Agent compatibility

Date: 2026-09-03

Status: accepted direction; financial and technical implementation pending

## Context

The restored `Calapres Operations Director` currently uses `GPT-5.6 Sol` through n8n's managed
Gateway trial path. The owner asked for the most durable, high-quality provider architecture for
the n8n Agent and explicitly wants n8n minimized rather than inserted as an unnecessary party in
every business flow. Provider choice, billing ownership, credential isolation, and fallback policy
are distinct from the agent capability boundary in decision 0033.

## Decision

1. Prefer a customer-owned direct OpenAI API connection as the primary production model path for
   the internal Calapres agent. Use a dedicated Calapres OpenAI project, service account or
   equivalent machine identity, API credential, and budget. Never store the secret value in GitHub,
   n8n instructions, or handoff documents.
2. Keep `GPT-5.6 Sol` as the primary quality model for the Operations Director. A lower-cost model
   may be introduced later only for a separately bounded, lower-risk, high-volume task with its own
   acceptance test; do not silently substitute models for operational decisions.
3. Keep n8n Gateway as the temporary trial and convenience path. Do not purchase Gateway credit or
   enable Gateway auto-top-up now. A later paid Gateway decision must compare current prices and
   supported features again at action time.
4. Do not use OpenRouter as the primary provider. It may be evaluated later only as a controlled
   fallback or comparison path with pinned models and providers, explicit privacy and zero-data-
   retention review, a spend ceiling, and deterministic failover rules. Never allow random provider
   switching for sensitive operational decisions.
5. Isolate every future brand in its own OpenAI project, credential, and budget. Do not reuse the
   Calapres credential across brands or repurpose an older n8n/OpenAI credential until its owner,
   project, model allowlist, dependencies, and scope are freshly verified.
6. Before implementation, verify read-only that the current first-class n8n Agent surface supports
   a user-owned OpenAI credential. If it does not, preserve the managed Gateway draft and return for
   a new decision; do not build an unapproved workflow or proxy workaround.
7. A hard monthly budget and alerts must be approved before credential attachment. USD 30 is only a
   planning proposal, not an approved or configured limit. Creating or funding an OpenAI project,
   creating or attaching a credential, changing the model binding, or running a paid canary each
   requires fresh action-time owner approval.

## Verification and execution boundary

This decision records provider direction only. On 2026-09-03, no OpenAI funds were added, no new
OpenAI project, service account, or credential was created, no direct credential was attached to
the agent, no Gateway top-up or auto-top-up was configured, and no OpenRouter account or route was
created. OpenAI API billing is separate from ChatGPT and Codex subscriptions.

The current first-class Agent's support for a customer-owned OpenAI credential remains unverified.
Current model prices, Gateway prices, taxes, credit balances, provider availability, and privacy
terms are drift-prone and must be refreshed from first-party sources before any financial or
technical action.

## Rollback

Because implementation is pending, no live rollback is required. If a direct credential is later
attached to the unpublished agent and must be reversed, first verify that no run is active, detach
only that model binding, restore the previously verified provider if needed, and rerun the bounded
instructions-only canary. Do not delete a credential until all dependencies are audited, and do not
publish the agent as part of provider rollback.
