# 0049 — Route occasion deadlines to staff without an autonomous verdict

Date: 2026-10-22
Status: owner approved; native configuration saved; private text/tool-selection acceptance passed; new real-conversation handoff effects pending.

## Decision

The owner explicitly approved a narrow native Captain path for an occasion, rush request, or requested arrival date. Correct the FAQ interpretation of `خلال 14 يومًا`: the general policy is neither a minimum wait nor evidence earlier arrival is impossible. Keep the public policy unchanged.

Captain asks only missing delivery city, customization type and requested deadline, one question at a time, then uses the existing native private note, existing intervention label and Handoff tools. Staff decide feasibility and communicate the final date. Captain cannot independently reject or guarantee the occasion deadline and must stop after handoff or staff intervention until explicitly reassigned.

This bounded occasion path supersedes decision 0031's general no-handoff constraint only for this owner-approved situation. It does not revive its disabled broad scenario, add an n8n responder, implement a Telegram approval/reply loop, change storefront policies or assert delivery availability.

## Evidence and limitation

See [the execution record](../docs/handoffs/2026-10-22-captain-occasion-handoff.md). Scenario `2203` is enabled. Two synthetic Playground tests covered missing versus complete details. The correct native tools were selected, but all their effects returned `Conversation not found` in the conversation-less Playground; a live handoff is not proven. Previously observed staff takeover moved the real conversation to Open and stopped Captain. Inspect the next natural eligible conversation without sending a customer test.
