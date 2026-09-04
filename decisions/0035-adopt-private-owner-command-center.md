# 0035 — Adopt a private cross-brand owner command center

Date: 2026-09-04

Status: accepted and partially executed; private Telegram text, Arabic voice, stable owner session,
and Calapres delegation are verified, while proactive alerts, live operational sources, and durable
direct-provider funding remain unverified or pending

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
6. Accept voice notes through the owner-only `Owner Telegram Voice Bridge`. The workflow must
   enforce the numeric user and private-chat allowlists, download the Telegram voice file, transcribe
   Arabic audio through the existing managed Gateway capability, and pass the transcript to the same
   owner Agent and stable owner session. The direct Agent Telegram integration stays disconnected
   while the workflow owns the bot webhook.
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

## Voice bridge amendment and verified execution — 2026-09-04

- The first-class Agent received Telegram voice attachments but had no attached transcription
  capability, so it returned a text fallback. This was a deterministic missing-path defect, not a
  Telegram delivery failure.
- Published workflow `Owner Telegram Voice Bridge` (`0EQB4mv5NknrXsHM`, active version
  `454e29f5-b6dc-4569-8a1b-c3267470041c`) now owns the Telegram webhook. It reuses the existing
  Telegram credential and managed n8n OpenAI audio-transcription credential; no credential,
  payment, Gateway top-up, or automatic top-up was created.
- The workflow requires the verified numeric owner user and private-chat identities, routes text to
  the existing Agent, and downloads and transcribes Arabic voice before routing. Its trusted
  transport marker is generated only after these gates pass and does not remove written action-time
  approval requirements.
- The incorrect owner username spelling in Agent instructions was corrected to `@A_Awdsh`. The
  Agent was validated, tested, and republished as active version
  `a95de83d-1275-4aae-9cff-bb5b2747634d`.
- End-to-end execution `45166` transcribed a real owner voice note exactly as
  `أريد أن أسأل، هل هناك طلبات اليوم؟` and returned the Agent's Arabic follow-up in the same
  Telegram conversation. A separate two-message canary proved that text and voice use one stable
  owner session.
- The direct Agent Telegram integration was disconnected to avoid competing webhook ownership. To
  roll back, first unpublish the workflow, then reconnect the Agent integration with the existing
  private numeric allowlist.

## Remaining verification

Voice is verified. Separately design and approve the read-only operational sources and incident
triggers that will create meaningful owner alerts. Until those later gates pass, the command center
is a verified private text, voice, memory, and delegation interface, not a proactive operations
monitor.

## Rollback

First disable the private Telegram integration and verify that no run is active. Then unpublish or
detach only the owner command center if needed. Do not delete credentials until dependency checks
pass. Do not alter Captain, Chatwoot inboxes, Shopify, the Calapres specialist, or customer channels
as part of this rollback.
