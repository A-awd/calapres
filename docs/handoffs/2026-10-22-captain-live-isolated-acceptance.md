# Real isolated Captain handoff and staff-takeover acceptance — 2026-10-22

Status: passed on a real, isolated website inbox. This is real Chatwoot conversation evidence, not only Playground. It does not prove external WhatsApp/Instagram/TikTok delivery or an in-flight interruption race.

## Authorization and isolation

The owner explicitly requested a real test on a test conversation with no customer sends. Created website inbox `149093`, named `TEST — Captain handoff 2026-10-22`, using a non-routable `.invalid` website. It was not installed on the production storefront. Email collection and email continuity were disabled in this test inbox, and neither synthetic contact had a supplied phone or email. Used the existing service agent and temporarily connected existing Captain `2187` to this isolated inbox only. Existing production inbox connections were preserved.

## Test A — actual occasion handoff, conversation 38

The synthetic visitor requested a burner for an occasion before a stated deadline. Captain asked the city, then customization. After synthetic city and two-letter customization replies, the real conversation contained:

- Captain private note with the city, customization and requested deadline, explicitly requiring verification without a promise or rejection.
- Existing `يحتاج-تدخل` label added.
- A second native handoff-reason note.
- Status event: conversation marked **Open by Calapres Assistant**.
- Assignment event: **assigned to خدمة عملاء كالابريز by Default Policy**.
- Native system Handoff Message delivered in the test widget: `أعتذر لك، سيتابع معك الموظف المختص هنا.`

There was no delivery guarantee or refusal. The actual native handoff uses the configured system Handoff Message, rather than the neutral review wording shown by the earlier conversation-less Playground. No global handoff-message edit was made in this acceptance test.

Opaque synthetic evidence: initial inbound `940782584`, city question `940782708`, customization question `940783067`, customization inbound `940784882`, private summary `940784965`, handoff reason `940785043`, handoff line `940785109`.

An operator reply was then sent only to this synthetic web visitor. It is not a real-customer send.

## Test B — staff takeover before completion, conversation 39

A second synthetic conversation began while Captain was active/Pending. Captain asked for the delivery city (`940790781`) and the UI explicitly said it was currently handled by Calapres Assistant.

Used native **Take over** before giving the missing details. The UI recorded reopening by the service agent and assignment to that service agent, enabled the public reply composer, and removed the Captain-handled banner. Sent a clearly marked internal-test staff reply (`940794079`).

Returned through a local SDK test harness to the same synthetic visitor session and sent the remaining city/customization/deadline as a new inbound message (`940795534`). This would satisfy the occasion scenario if Captain still controlled the conversation.

Verified from both visitor and agent views that no further Captain message appeared, no typing indicator remained, and the conversation stayed Open with the service agent. Observation ran at least from 06:59:36 to 07:00:20 Asia/Riyadh after the follow-up was already present (44 seconds), before disconnecting the test inbox. Captain's baseline reply latency in these tests was a few seconds. The observation is bounded evidence of native takeover silence; it does not certify an infinite wait or a message that was already in flight when takeover occurred.

## Cleanup

After capturing the evidence, disconnected only test inbox `149093` from Captain. The connected-inbox readback again showed exactly the original WhatsApp, TikTok and Instagram inboxes. The isolated inbox remains as a clearly named test-only evidence container, not installed anywhere. Both synthetic conversations were marked resolved. Preserve their evidence; no permanent deletion was performed.

Stopped the local-only test HTTP server. No n8n workflow, Shopify setting, Meta template, customer conversation, external WhatsApp/Instagram/TikTok message, subscription, permission grant or production website installation was changed. Test messages were exclusively between the operator and synthetic visitors in inbox `149093`.

## Continuation

Decision 0049 now has real native handoff and staff-takeover acceptance. Normal operation can proceed under the saved narrow scenario. Inspect actual errors if a future conversation fails; do not equate a sandbox's absent-conversation error with live native-tool failure. Do not revive the external n8n responder, Telegram approval loop or response-delay controller from this result.

Screenshots are retained in the local session deliverables. Public website tokens and browser conversation/session tokens are excluded from GitHub.
