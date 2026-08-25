# 0015 — Adopt the governed Calapres response library and scope gate

Date: 2026-08-25
Status: accepted and live

## Context

The previous responder could continue conversations about subjects outside the store. The owner
required a durable response library and an enforceable boundary: questions such as London weather
or camel prices must not be answered, and the customer must be returned to Calapres. The owner
explicitly approved live activation after offline testing.

## Decision

1. Keep the existing responder `kAyF0D3ZZHxc0Hwp`; do not create another workflow, webhook,
   Chatwoot inbox, Captain, AgentBot, credential, or customer-send path.
2. Insert one deterministic governed router after the verified Chatwoot anchor and before the
   existing decision switch. The router selects only versioned Calapres response IDs.
3. External questions receive the exact approved store redirect. The governed path never
   authorizes a language model, and repeated notices remain subject to the existing durable
   suppression claim.
4. Dynamic facts are limited to exact Shopify read-only product catalog and order-status
   capabilities. No Shopify write is permitted, and product wording must not infer availability
   from active status or inventory alone.
5. Explicit human requests keep the existing human route. Ambiguous store questions receive an
   approved clarification; they do not open an unrelated model conversation.
6. Preserve the single authorized inbound edge to `Send Reply`, the final Chatwoot reread, send
   lease, recovery no-send boundary, and the exact Instagram, TikTok, and WhatsApp inbox allowlist.

## Live record

The existing workflow was published as active version
`1afb2f65-0f5c-4a87-9525-03a11088d6ff` with 100 nodes. Local targeted tests passed 50/50, and a
fresh live reread confirmed active/draft parity, the governed-router edges, and the unchanged single
send authorization edge. Version `aa654b47-1b8f-4132-979e-0199454028a2` is the rollback target.
Real platform delivery remains a separate owner acceptance test for TikTok, Instagram, and
WhatsApp.

The first owner WhatsApp test then exposed a false-negative boundary: valid green and
green/orange-striped burner price descriptions were classified as external-merchant text. The
closed product grammar was corrected without broadening unrelated price requests. Corrected active
version `d3d320d6-63be-4134-b333-a4941bf2480a` passed 51/51 targeted tests; immediate rollback is
`1afb2f65-0f5c-4a87-9525-03a11088d6ff`. Owner-visible delivery is still pending and is not implied
by publication.
