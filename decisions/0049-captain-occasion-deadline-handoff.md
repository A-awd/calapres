# 0049 — Route occasion deadlines to staff without an autonomous verdict

Date: 2026-10-22
Status: owner approved; saved native configuration and actual isolated website-conversation handoff/staff-takeover acceptance passed on 2026-10-22.

## Decision

The owner explicitly approved a narrow native Captain path for an occasion, rush request, or requested arrival date. Correct the FAQ interpretation of `خلال 14 يومًا`: the general policy is neither a minimum wait nor evidence earlier arrival is impossible. Keep the public policy unchanged.

Captain asks only missing delivery city, customization type and requested deadline, one question at a time, then uses the existing native private note, existing intervention label and Handoff tools. Staff decide feasibility and communicate the final date. Captain cannot independently reject or guarantee the occasion deadline and must stop after handoff or staff intervention until explicitly reassigned.

This bounded occasion path supersedes decision 0031's general no-handoff constraint only for this owner-approved situation. It does not revive its disabled broad scenario, add an n8n responder, implement a Telegram approval/reply loop, change storefront policies or assert delivery availability.

## Evidence and limitation

See [the execution record](../docs/handoffs/2026-10-22-captain-occasion-handoff.md). Scenario `2203` is enabled. Two synthetic Playground tests covered missing versus complete details. The correct native tools were selected, but all their effects returned `Conversation not found` in the conversation-less Playground; a live handoff is not proven. Previously observed staff takeover moved the real conversation to Open and stopped Captain. Inspect the next natural eligible conversation without sending a customer test.

## Subsequent real isolated acceptance

The owner explicitly authorized real test conversations without customer sends. In isolated test
website inbox `149093`, conversation `38` proved the actual private note, intervention label, Open
handoff and staff assignment. In independent conversation `39`, Take over while Captain was
Pending, a staff reply, and a new visitor follow-up proved silence during a 44-second observed
window. This supersedes the earlier Playground-only action-effect uncertainty above. Production
channel delivery and already-in-flight message races remain outside this proof. The test inbox
was disconnected after evidence capture; the original three Captain inbox attachments were
preserved, and both synthetic conversations were resolved. See
[the acceptance record](../docs/handoffs/2026-10-22-captain-live-isolated-acceptance.md).
