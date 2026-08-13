# 0013 — Adopt capability-URL ingress for Calapres customer replies after the Chatwoot webhook HMAC defect

Date: 2026-08-13
Status: accepted

## Context

The protected Calapres customer-reply workflow required a valid
`X-Chatwoot-Signature` (`sha256=HMAC-SHA256(secret, "{timestamp}.{raw_body}")`) before parsing any
webhook payload. A real owner-phone WhatsApp inbound on 2026-08-13 (captured as n8n execution
`41243`, Chatwoot message `792970340`) was rejected with `signature_mismatch`: the delivery carried
well-formed `X-Chatwoot-Timestamp`, `X-Chatwoot-Signature`, and `X-Chatwoot-Delivery` headers, and
the Chatwoot source confirms the exact signing format the workflow already implements, but the
signature is computed with an internal `hmac_token` that Chatwoot exposes through neither the UI
nor the REST API (open upstream defect [chatwoot/chatwoot#13809](https://github.com/chatwoot/chatwoot/issues/13809), reported 2026-03-14). No obtainable secret can verify
genuine deliveries, so signature enforcement makes every real customer message fail closed.

## Decision

Remove delivery-signature enforcement from the ingress gate of workflow `kAyF0D3ZZHxc0Hwp` and
rely on the controls that authenticate the decision rather than the notification:

1. an unguessable capability webhook path known only to Chatwoot's webhook configuration;
2. structural ingress checks retained unchanged: raw-body capture, 1 MiB limit, JSON content type,
   JSON parsed only after the gate;
3. account `179973` / inbox `128058` pinned both in the workflow and inside the PostgreSQL
   functions;
4. the authoritative authenticated Chatwoot reread anchor, which requires the claimed inbound
   message to exist exactly once with matching account, inbox, conversation, incoming type, public
   visibility, contact sender, and byte-identical content before any durable claim consequence;
5. durable event claims, the atomic send lease, and budget controls, which bound a forged or
   replayed notification to at most the same reply the genuine event would have produced, exactly
   once.

Delivery headers are still recorded as advisory provenance. If Chatwoot ever exposes the real
signing key, signature enforcement should be reinstated ahead of the anchor checks.

## Consequences

- The frozen source drops the HMAC verify node (83 → 82 nodes); the `Crypto account 3` credential
  remains stored in n8n but is no longer bound to any node.
- A forged request to the secret path can trigger reads and processing, but cannot address a
  different conversation, invent message content, produce a duplicate send, or bypass the owner
  escalation and budget guards.
- The final owner-phone round trip remains the acceptance gate for the customer path.
