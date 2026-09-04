# 0035 — Adopt a private cross-brand owner command center

Date: 2026-09-04

Status: accepted and partially executed; private Telegram text path and Calapres delegation verified,
while voice, proactive alerts, live operational sources, and durable direct-provider funding remain
unverified or pending

## Context

The owner wants one private interface for material problems across Calapres and future brands rather
than reading every ordinary customer conversation. The owner also wants to send voice notes. This
interface must stay separate from customer service: Chatwoot Captain remains the only automated
customer-facing responder, and the owner command center must not become a second customer bot.

Decision 0033 already governs the bounded, unpublished `Calapres Operations Director`. This decision
does not publish or expand that agent. It establishes a separate owner-facing parent agent and uses
the Calapres agent only as an internal delegated specialist.

## Decision

1. Use one private n8n Agent named `سكرتيرة عبدالرحمن`, agent ID `LKA07iWfCpjawVNB`, in project
   `AeQgtZlgJbiXCM2e`, as the owner's cross-brand command center. Its configuration is in English,
   its owner-facing replies are in Arabic, and its primary model is `GPT-5.6 Sol`.
2. Use the private Telegram bot `@AbdulrahmanCommandCenterBot` as the initial owner channel. Restrict
   access with the owner's verified numeric Telegram identity, not only a changeable username. Never
   store the bot token, numeric owner identifier, personal phone number, or webhook secret in GitHub.
3. Work by exception. Ordinary customer conversations that Captain resolves do not need owner
   notification. Escalate material issues using P0/P1/P2 priority, concise evidence, affected brand,
   owner action required, and verified/unknown distinctions.
4. Attach `Calapres Operations Director` only as an internal specialist for Calapres launch-readiness
   audits, daily order operations triage, incident assessment, evidence classification, and internal
   recommendations. It must not contact customers, publish, change credentials, make payments, or
   perform external actions. Its output remains internal and `UNVERIFIED` unless supported by an
   attached authoritative source.
5. Keep every future brand isolated. A future brand gets its own specialist, credentials, budget,
   sources, and permissions before it can be delegated work. The owner command center is a routing
   surface, not a shared credential vault or cross-brand data store.
6. Voice notes are an intended input but are not an accepted capability until one real Telegram voice
   note is received, transcribed accurately, and answered in the same private conversation. If the
   first-class channel cannot do this natively, design a separately reviewed transcription bridge;
   do not imply support from a text-only test.
7. Keep risky or external actions approval-gated at action time. The owner agent may summarize,
   classify, delegate internal analysis, and recommend. It may not send customer messages, publish,
   alter commerce or fulfillment, create or expose credentials, fund providers, change security
   settings, or perform destructive actions without the applicable written approval and verification.
8. Continue using n8n's managed Gateway credits only as the temporary trial path. Do not top up the
   Gateway or enable automatic top-up. Decision 0034 continues to govern the proposed direct OpenAI
   provider architecture; no direct OpenAI credential, funded project, or approved USD 30 budget is
   created by this decision.

## Verified execution — 2026-09-04

- The owner agent was saved, validated, tested, and published as active version
  `ea5c657e-040a-48b6-b3bf-2c46c87c8321` using `openai/gpt-5.6-sol` through the managed Gateway.
- The Telegram credential `Qj1UoPHZNEEWn5dX` (`Telegram — Abdulrahman Command Center`) passed its
  connection test. The integration is private and uses the verified numeric owner identity.
- A real private Telegram round trip passed: the owner sent a text instruction and the bot returned
  the expected Arabic response `تم`. n8n recorded a successful Telegram execution. The earlier
  username-only allowlist was replaced after it silently rejected inbound messages.
- `Calapres Operations Director` was attached as the internal specialist with the bounded delegation
  description above. Validation, an internal delegation preview, and publication of the parent agent
  passed. The Calapres specialist itself remains unpublished and otherwise unchanged under decision
  0033.
- No customer message, commerce write, schedule, proactive alert, live operational-source attachment,
  Gateway top-up, automatic top-up, direct OpenAI credential, payment, or OpenRouter route was created.

## Remaining verification

Run one real voice-note canary from the owner's Telegram account. Separately design and approve the
read-only operational sources and incident triggers that will create meaningful owner alerts. Until
those tests pass, the command center is a verified private text-and-delegation interface, not a
verified voice assistant or proactive operations monitor.

## Rollback

First disable the private Telegram integration and verify that no run is active. Then unpublish or
detach only the owner command center if needed. Do not delete credentials until dependency checks
pass. Do not alter Captain, Chatwoot inboxes, Shopify, the Calapres specialist, or customer channels
as part of this rollback.
