# Calapres agent recovery, provider direction, and WhatsApp history handoff

Date: 2026-09-03

Last verified: 2026-09-03 20:04:02, Asia/Riyadh (UTC+03:00)

Pre-publication canonical baseline: `922763037f719f3104eb05e86bbbc185673313b5`

## Identity and scope

- Project: Calapres
- Canonical repository: `A-awd/calapres`
- Canonical branch: `main`
- GitHub is the technical source of truth. Shopify is the live commerce source of truth.
- This record closes the phase that configured and recovered the owner-facing n8n Operations
  Director, compared model-provider and credit paths, and researched official WhatsApp-history
  preservation.
- Documentation publication is the only action authorized by this handoff. It does not authorize a
  live account change, payment, credential operation, model call, tool call, archive export,
  deployment, customer message, or conversation deletion.

No stable source-conversation identifier was available for a safe one-way provenance fingerprint.
This record is therefore identified by its date, scope, baseline revision, and repository history.

## Coverage merge

The following material was already canonical and was not copied again:

- Storefront, checkout, favicon, Western-digit, product-copy, palette, font, review, social-link,
  VAT, and publication results are covered by decisions 0022 through 0029 and the corresponding
  newest sections in `STATE.md` and `HANDOFF.md`.
- The prepaid-only OTO connection, preserved manual Saudi rates, disabled cash on delivery, and
  pickup-address/package-measurement blocker are covered by decision 0030.
- The Captain v2 knowledge rebuild and limited handoff policy are covered by decision 0031.
- The Chatwoot labels, required conversation outcome, and eight saved filters are covered by
  decision 0032.
- The bounded internal Operations Director design is covered by decision 0033.

This handoff adds only the later material delta: the agent overwrite and recovery, the successful
instructions-only test, the current no-tool state, the provider and cost-governance direction, the
official WhatsApp-history limits, and unresolved Meta channel observations. It also removes two
accidental tool-output lines that had been committed at the start of `STATE.md` and `HANDOFF.md`.

## Executive state

[Verified] The n8n Agent `Calapres Operations Director` exists under stable agent ID
`olVB3TzKClXjuOei` in project `AeQgtZlgJbiXCM2e`. It has been restored with the `Chart Network`
icon, `GPT-5.6 Sol`, English main instructions, Arabic owner-facing responses, and exactly three
English skills:

1. `Calapres Launch Readiness Audit`
2. `Daily Order Operations Triage`
3. `Operational Incident Command`

[Verified] The restored draft is unpublished. Custom routing and episodic memory are off, session
memory remains at its default, MCP is off, and there are no channels, schedules, or sub-agents.
There is no customer-send or commerce-write authority. Chatwoot Captain remains the only
customer-facing responder.

[Verified] Shopify and Firecrawl were not reattached after the restoration. The current draft has
no external tool. No live-fact read or tool-approval behavior is proven.

[Verified] A post-restoration instructions-only preview succeeded. It returned Arabic, followed the
required authority order, honored the no-write/no-send restrictions, prioritized issues as
P0/P1/P2, and marked tool-dependent facts as `UNVERIFIED`.

[Accepted direction, not implemented] A direct customer-owned OpenAI API connection, isolated to a
Calapres project/key/budget, is the preferred future production model path. n8n Gateway remains the
temporary trial path. OpenRouter is not the primary provider. The current first-class Agent's
ability to accept a user-owned OpenAI credential has not yet been proven.

## n8n Agents enablement and recovery

[Verified] The Agents tab was initially absent despite the relevant n8n version/account surface.
n8n Support enabled the feature for the account, after which the Agents area became available. The
feature gate, not a newly purchased plan, was the resolved access blocker.

[Failed state] During later editing, the saved agent appeared as a blank `New Agent` under the same
stable agent ID. The prior `/assistant/<uuid>` page was a conversational assistant artifact, not the
agent's durable identity. The exact server-side cause cannot be proven without n8n audit evidence.
The observed sequence is consistent with stale/default preview state being autosaved during
parallel editor/preview use, with a WebSocket disconnect or race increasing the risk.

[Recovered] The agent's approved identity, model, instructions, skills, and safety settings were
restored in place. No duplicate agent was created. External tools were intentionally left detached
because reattaching credentials is a separate action-time approval.

Future editing rule:

1. Use one browser tab and one active session.
2. Open the agent from the n8n project Agents list.
3. Confirm stable agent ID `olVB3TzKClXjuOei` before editing.
4. Do not treat an `/assistant/<uuid>` URL as the agent record.
5. After autosave, reread the name, icon, model, instructions, every skill, tools, and safety
   settings from the durable agent surface.
6. Keep the draft unpublished while provider and tool canaries are incomplete.

## Model provider and cost governance

Decision [0034](../../decisions/0034-use-direct-openai-api-for-calapres-agent.md) records the
accepted architecture. The durable rules are provider ownership and isolation, not the prices in
this dated snapshot.

### Observed n8n snapshot on 2026-09-03

- n8n Cloud displayed version `2.38.2`.
- The managed Gateway showed USD 1.96 remaining from USD 2.00 of free credit after the successful
  preview consumed USD 0.04.
- The free credit was shown as added on 2026-08-28 and expiring on 2027-08-28.
- Manual Gateway top-up choices were USD 20, USD 50, and USD 100; taxes may apply.
- Gateway auto-top-up was off. The displayed minimum trigger balance was USD 10, minimum refill
  target USD 30, and default monthly cap USD 100.
- No top-up, auto-top-up, or payment was executed.

No saved payment-method detail is retained here. Recheck payment eligibility only if the owner
later approves a charge.

### Dated price comparison

The authenticated n8n pricing surface displayed these managed-Gateway rates per one million tokens:

| Model | Input | Output |
|---|---:|---:|
| `gpt-5.6-sol` | USD 5.00 | USD 30.00 |
| `gpt-5.6-terra` | USD 2.50 | USD 15.00 |
| `gpt-5.6-luna` | USD 1.00 | USD 6.00 |

It also displayed USD 0.0032 per Firecrawl crawl/search request. The official OpenAI API pricing
surface at the same stage displayed USD 4.00/20.00 for Sol, USD 2.00/12.00 for Terra, and USD
0.20/1.20 for Luna input/output per one million tokens. OpenRouter documented provider/model price
pass-through plus a 5.5% credit-purchase fee with a USD 0.80 minimum.

These values are evidence for the 2026-09-03 decision only. They may change and must be refreshed
before spending. First-party references:

- <https://docs.n8n.io/deploy/use-n8n-cloud/gateway-credits>
- <https://app.n8n.cloud/service-pricing>
- <https://openai.com/api/pricing/>
- <https://developers.openai.com/api/docs/models>
- <https://openrouter.ai/docs/faq>
- <https://openrouter.ai/docs/guides/routing/provider-selection>
- <https://openrouter.ai/docs/guides/features/zdr>

### Accepted architecture and unexecuted work

- Use a dedicated OpenAI project, machine credential, and hard budget for Calapres if direct
  credentials are supported by the current first-class Agent surface.
- Keep `GPT-5.6 Sol` as the primary quality model. Consider Terra or Luna later only for explicitly
  bounded lower-value/high-volume work.
- Give each future brand a separate OpenAI project, credential, and budget.
- Keep Gateway for the current trial and managed conveniences; do not top it up now.
- Do not make OpenRouter primary. Any later fallback evaluation must pin the model/provider, review
  privacy and zero-data-retention controls, and set deterministic spend/failover limits.
- OpenAI API billing is separate from ChatGPT/Codex subscriptions.
- USD 30 is a proposed monthly budget, not an approved or configured limit.
- No OpenAI funding, new project, service account, API key, n8n model binding, Gateway payment,
  OpenRouter setup, or provider migration was executed.

## WhatsApp historical-conversation preservation

[Research conclusion] There is no official one-click native WhatsApp or WhatsApp Business feature
that exports every historical conversation as one complete readable archive.

- Native `Export chat` is per conversation. It produces a text/media package for external retention
  and cannot be imported back into WhatsApp as live history.
- WhatsApp backup/transfer is the official whole-account preservation path for restoration or phone
  migration, but it is not a general readable business archive.
- `Request account info` does not include message contents.
- For eligible WhatsApp Business App users onboarding through Meta Coexistence, Meta documents a
  one-time history sync of up to 180 days. It must be requested within 24 hours of onboarding,
  excludes group conversations, and exposes media details only for the preceding 14 days.
  Eligibility and these limits must be rechecked before onboarding.
- Chatwoot does not currently prove a complete import of phone history from before the inbox was
  connected. A historical thread-sync change remains under development; do not describe it as a
  current migration guarantee.
- Chatwoot's official Conversations List and Get Messages APIs can export the conversations and
  messages already stored in the Calapres Chatwoot account. That archive can be built directly;
  n8n is not required.

Official references:

- <https://faq.whatsapp.com/1180414079177245/>
- <https://faq.whatsapp.com/209942271778103/>
- <https://faq.whatsapp.com/526463418847093/?locale=ar_AR>
- <https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/>
- <https://developers.chatwoot.com/api-reference/conversations/conversations-list>
- <https://developers.chatwoot.com/api-reference/messages/get-messages>
- <https://github.com/chatwoot/chatwoot/pull/12149>

[Proposed, not approved or executed] Preserve the official WhatsApp backup, create a one-time direct
Chatwoot API archive for all history Chatwoot already holds, and individually export only the
critical older phone-only chats that are absent from Chatwoot. Define encryption, retention,
access, redaction, and deletion rules before exporting customer messages. Do not use unofficial
backup-extraction tools for customer data without a separate security and privacy decision.

## Customer messaging and Meta observations

[Owner-approved communication rule] When Captain must transfer a valid case, begin with a brief
apology and say that `الموظف المختص` will follow up. Do not expose the distinction by saying human,
human agent, or support employee. The live persistence of this latest wording was not re-read at
closeout; decision 0031 now records the rule and the verification gap.

[Owner-reported, not re-verified] In Meta Business Suite, an instant-reply setup was first scoped to
Messenger by mistake. The owner manually reversed the selection so Instagram, not Messenger, was
the intended channel. The business goal is to acknowledge a first-contact Instagram message so the
existing Chatwoot/Captain inbox can continue the conversation. This handoff does not prove that the
automation remains enabled, that it accepts every Instagram message request, or that Meta exposes
those first-contact messages to Chatwoot. Verify the current automation and run a first-contact
canary from an unrelated account before relying on it.

[Not implemented] Equivalent TikTok settings suggested during exploration were not present in the
actual account interface. No verified TikTok auto-accept or first-reply automation was created. Use
a real first-contact canary if this work resumes; do not rely on generic setting names.

[Reported unresolved] The portfolio previously rejected creation of a Calapres advertising account,
and a payment-required notice was visible during Meta exploration. The exact current restriction,
affected payment account, and remediation were not established in a durable verified result. No ad
account, campaign, charge, or payment was created in this phase. Refresh those surfaces read-only
before any future advertising action.

[Deferred presentation item] The owner remained dissatisfied with the exact centering of the Meta
cover image. No canonical final cover asset or verified final geometry was captured in this phase.
Do not regenerate or replace it unless the owner explicitly resumes that design task.

## Current systems and dependencies

- Shopify remains the operational authority for products, orders, inventory, checkout, and the live
  theme. Payment-provider work remains deliberately deferred.
- Cash on delivery is prohibited. OTO remains the approved prepaid-only shipping bridge, with the
  exact pickup address and packaged measurements still required before a real test shipment.
- Chatwoot Captain remains the only customer-facing responder on its connected inboxes.
- The Operations Director is an internal, owner-facing, unpublished draft and must not become a
  second responder or source of truth.
- GitHub `main` remains the only durable technical record. n8n Agent autosave, browser sessions,
  assistant pages, and Chatwoot/Meta UI state are drift-prone and must be reread.
- The official social URLs remain deferred as recorded in decision 0024. Do not infer profile links
  from internal inbox identifiers.
- The live transparent Calapres favicon is recorded in the current state, but Google search-result
  icon refresh timing is controlled by Google's crawl. The exact timing/status of any earlier
  Search Console reindex request was not recoverable as verified evidence; recheck Search Console if
  this SEO item resumes.

## Constraints and safety rules

- Do not publish the Operations Director, enable MCP, add a channel/schedule/sub-agent, or attach a
  write/send tool.
- Do not reuse the older project-scoped OpenAI credential merely because it exists. Its project,
  model allowlist, dependencies, and scope differ and require a fresh audit.
- Do not create, fund, rotate, attach, expose, or delete a credential without fresh approval and a
  dependency check.
- Do not top up Gateway, enable auto-top-up, fund OpenAI, or make any Meta/payment charge without
  explicit action-time owner authorization.
- Do not add n8n to the WhatsApp archive path; use the direct Chatwoot API if the proposal is later
  approved.
- Do not send proactive WhatsApp messages or create Meta message templates in this stage. Template
  data must come from verified Shopify order facts through a separately approved architecture.
- Do not enable cash on delivery, guess the OTO pickup address or package dimensions, or book a
  carrier before the recorded test gate.
- Do not copy secrets, raw customer messages, payment data, or unredacted exports into GitHub.

## Open items and risks

1. The current first-class n8n Agent may or may not support a user-owned direct OpenAI credential;
   this must be established read-only before the accepted provider direction can be implemented.
2. The restored agent has no attached tools. Shopify and Firecrawl connectivity, approval prompts,
   data minimization, and answers remain unverified.
3. Agent autosave has no proven published-draft rollback. Parallel/stale editor sessions can cause
   loss; use the stable Agents list and verify every field after each edit.
4. Provider prices, credits, model availability, and privacy terms are dated observations and may
   drift.
5. WhatsApp/Chatwoot archive completeness is bounded by the history each supported system actually
   exposes. Phone-only history may require per-chat native export.
6. Instagram request acceptance, TikTok first-contact behavior, Meta ad-account eligibility, and
   the Meta payment notice remain live-state questions, not verified completions.
7. The exact status/time of any Google Search Console reindex request is unknown and is not needed
   to preserve the verified Shopify favicon setting.

## Next actions

1. Read-only: open the current agent from the n8n project Agents list, confirm stable ID
   `olVB3TzKClXjuOei`, and reread the complete restored configuration. In the same read-only stage,
   determine whether the first-class Agent supports a user-owned OpenAI credential.
2. If supported, present the current OpenAI/Gateway costs and a proposed hard budget to the owner.
   Only after explicit approval create/fund the dedicated Calapres OpenAI project and credential,
   attach it to the unpublished agent, and run one bounded model/instructions canary.
3. Only after that model canary, obtain a separate approval to attach and test Shopify read-only
   access with a maximum of 20 records. Remove or disable it if the scope cannot be proven.
4. Obtain another separate approval before attaching and testing Firecrawl against one public
   `calapres.com` page. Reject any redirect or request outside the domain.
5. Keep the agent unpublished after both canaries and return an evidence-backed launch-readiness
   report. Publication is a separate decision.
6. Separately, if the owner approves a WhatsApp-history archive, define encryption, retention, and
   destination first, then export only Chatwoot-held history through the official direct API before
   evaluating per-chat phone-only gaps.
7. Resume OTO only after obtaining the exact physical pickup address and packaged measurements;
   then run one prepaid shipment canary without cash on delivery.

## Verification and provenance

- The canonical repository was freshly cloned from `main` at
  `922763037f719f3104eb05e86bbbc185673313b5` before documentation edits.
- The working tree was clean at that baseline.
- Existing documentation was compared before writing. Unchanged storefront, OTO, Captain, and
  Chatwoot taxonomy facts remain in their earlier canonical decisions instead of being duplicated.
- New provider architecture is recorded once in decision 0034; dated prices and research live only
  in this detailed handoff.
- The stale two-tool/current-no-tool contradiction is reconciled in `STATE.md`, `HANDOFF.md`, and
  decision 0033.
- This handoff intentionally excludes secrets, raw customer conversations, private account data,
  payment-card details, repetitive chat, screenshots, and transient browser/tool logs.
- This is a sanitized operational record, not a verbatim transcript or legal-evidence archive.
