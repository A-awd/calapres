# Calapres handoff

## Active task — design services, 2026-09-23

Continue decision 0045 and `services/design/README.md`. The two-path UI is deployed
only to backup 166572294400 at product view `design-service`; native upload uses
the existing paid-upload variant. No price changes, publication or default product
template reassignment. AI is deliberately unavailable in preview until a real
backend is activated. The global reservation ledger is source-only and tested;
the provider, app proxy, hosting, image storage and receipts are still unimplemented.
Owner was asked for a numerical trial budget (20/50 SAR or keep disabled); no answer
was received during this checkpoint. Do not confuse UI or synthetic tests with a
live generation or manufacturing-ready design. Next: establish exact cap and
dedicated provider access, finish/deploy backend, then run a bounded actual Arabic
generation and exact-selection/order test. Main and prior trial files were preserved.

Updated: 2026-09-13

Canonical repository: `A-awd/calapres`. Approved branch: `main`.

## Telegram owner-bridge live root cause — 2026-09-22

The bridge is published and Telegram ingress works. Live executions `52691` and `50456` both fail
at `Ask Owner Agent From Text` because n8n Gateway credits are depleted; the current credit balance
was displayed as zero. The reply node is therefore never reached. The workspace also completed an
n8n 2.41.0 restart and returned Online, but the same depleted-credit error predates that restart.

No production setting was changed. Resume only after the owner chooses either Gateway funding or a
separately approved dedicated direct OpenAI credential. Bind only the chosen model path, run one
bounded owner text canary and one owner voice canary, and verify the Telegram reply before claiming
recovery.

## MCP-first operations health checkpoint — 2026-09-22

A source-only, inactive Calapres operations-health MCP gateway now exists. It exposes one fixed
read-only tool and cannot manage n8n, send messages, modify commerce/ads, read credentials, or
return customer content. The Easy Life MCP gateway was intentionally left unchanged.

This is not a live repair or proof of current Telegram/Chatwoot state. Resume by reviewing decision
0044, the gateway template, deployment manifest, schema, tests, and documentation. The next
production step requires explicit owner approval: import inactive, bind dedicated least-privilege
credentials, deploy the separate sanitized producer, run synthetic cases, verify exactly one tool,
and only then decide whether to activate and register the connector.

## Chatwoot routing checkpoint — 2026-09-14

Chatwoot is an existing, project-owned operational system for Calapres, not an unconnected future
source. Canonical decisions record Captain attached to the WhatsApp, Instagram, and TikTok inboxes,
with the legacy all-purpose n8n responder unpublished. Two isolated read-only Captain bridges and
the separately approved paid-order WhatsApp workflow are also recorded as implemented.

The paid-order owner canary reached Chatwoot and was recorded as delivered, with a normal replay
stopped before a second send. The unresolved proof is narrower: the next fresh production payment
event and new-contact path remain unobserved end to end, and every dated Chatwoot/n8n configuration
fact must be refreshed before current operational claims.

If Easy Life lacks a Chatwoot reader or credential, report `monitoring unavailable`; do not convert
that access limitation into `Chatwoot missing` or `disconnected`. No live platform was changed by
this checkpoint.

## Resume here

Read `README.md`, `AGENTS.md`, `STATE.md`, `DECISIONS.md`,
`LAUNCHER.md` and the directly relevant decision. Refresh live Shopify,
Chatwoot, OTO, analytics or campaign facts only when the selected task needs
them.

The latest safe continuation is a read-only check of the MDA
partnership/publication state and existing purchase-attribution evidence. The
`/mda` redirect was verified on 2026-09-11, but campaign publication and
purchase attribution were not. The owner's acceptance report supersedes older
text that says the partnership was pending; live acceptance remains unverified.

## Current boundaries

- Do not repeat an owner payment merely to test telemetry.
- Do not create a shipping label at booking. Current policy releases it manually
  after customization is ready.
- Do not send customer messages, buy shipping, activate a campaign, publish a
  theme, delete history or change permissions without the applicable authority.
- Keep private evidence and media in the verified iCloud project location.
  GitHub receives sanitized locators and outcomes only.
- Preserve Drive originals. The 42-file identity/size match is not remote byte
  identity, version-history completeness or deletion approval.
- Treat all dated live observations as stale until refreshed.

## Confirmed continuation state

The latest recorded theme fixed duplicate add-to-cart tracking. Apple Pay
succeeded on owner test order #1003, while purchase telemetry remained
unverified. Chatwoot was set to reopen the same conversation; historical
experimental conversations remain. Customer-message drafts exist but were not
activated. Embedded OTO label automation was most recently recorded off;
standalone rules remain unchecked.

## Durable history and rollback

The complete former root handoff is preserved byte-for-byte at
[`HANDOFF.full-through-2026-09-11.md`](HANDOFF.full-through-2026-09-11.md).
The adjacent `receipt.json` records its SHA-256, byte count and source commit.
Restoring those archived bytes to the root paths reverses this compaction.

Detailed current campaign evidence is in
[`docs/handoffs/2026-09-11-mda-snapchat-continuation.md`](docs/handoffs/2026-09-11-mda-snapchat-continuation.md).

## Completion

This next step is complete only when the live partnership/publication and
existing purchase evidence are read, their timestamps and unavailable sources
are explicit, no new payment or production mutation was used as a shortcut, and
`STATE.md` records confirmed results, pending work, blockers and the exact next
action.

## Engraving personalization research — 2026-09-22

- Research only: [Arabic decision report](docs/research/2026-09-22-engraving-personalization.md) compares seven Shopify apps with a custom three-template theme experience.
- Live read-only observation: Calapres is on Basic; the white burner page shows the existing text-only and uploaded-design paths. No three-design approval interface was observed.
- Recommended evaluation: deterministic approved templates, no runtime generative-image dependency; Customily first for documented manufacturing exports, Cloudlift with its paid Export extension as a conditional economical alternative. Arabic shaping, simultaneous previews, output fidelity, machine compatibility, and performance remain untested acceptance gates.
- Basic constraint: custom apps containing Shopify Functions require Plus; a theme-only required checkbox is not server-side checkout enforcement. Any new backend/storage boundary remains a proposal, not an approved architecture change.
- No app installation, theme/product/cart change, order, customer/vendor message, payment, or deployment occurred. No new recurring automation was created.
- Next safe action: obtain the three intended design examples and manufacturing area/file requirements; then scope a bounded unpublished pilot. Do not infer permission to install a paid app or publish a theme from this research request.


## Engraving app trials installed — 2026-09-22

Owner explicitly approved all four installations and GitHub-based unpublished theme experiments. Shopify Installed apps now verifies Customily, Cloudlift LPO, Zepto and Teeinblue. Customily trial ends Oct 1, Teeinblue Oct 6, Zepto Oct 7; Cloudlift is installed with setup pending and no subscription trial date verified. No theme was published or edited in this installation step. Live theme is 166066389248 despite its “test” name. App-created global resources require an audit before preview activation; do not equate an unpublished theme with isolated app installation. See [trial evidence and next action](docs/research/2026-09-22-engraving-app-trials.md). Earlier manual-install blocker is resolved. Daily deadline follow-up is recorded as automation-2. Next: identify GitHub binding, prepare an unpublished experiment target, configure and compare the apps, then retain the proven winner and cancel three losers before trial renewal.
