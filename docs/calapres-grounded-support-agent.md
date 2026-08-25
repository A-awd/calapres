# Calapres grounded support agent

## Purpose

The responder should understand the customer's meaning without becoming an open-ended assistant.
It must answer from Calapres facts, current Shopify reads, or a concise store boundary.

## Runtime flow

1. The existing Chatwoot ingress verifies the account, inbox, conversation, and inbound message.
2. The grounded router builds a classification request from the message, bounded recent context,
   and the Calapres brand pack.
3. The existing model returns only the strict classification object. It has no customer-answer or
   external-tool authority.
4. The policy engine validates the object and chooses one of: approved fact, Shopify product read,
   Shopify order read, store boundary, clarification, or human handoff.
5. Shopify responses are validated and rendered deterministically. The existing final reread,
   send reservation, digest proof, and one customer-egress edge remain unchanged.

## Sources of truth

- Shopify: live product, price, publication, and order facts.
- Versioned brand pack: identity, allowed categories, approved static facts, policies, and wording.
- Chatwoot: channel, conversation, message, and handoff state.
- GitHub: engine, brand-pack versions, workflow source, tests, decisions, and release lock.

The model is not a source of truth. It is an understanding component whose output is always
revalidated.

## Scaling to another brand

A future brand gets its own pack, store adapter credentials, inbox allowlist, and customer context.
The shared engine can be reused, but a message can resolve to only one exact brand before any fact
or store read is allowed. No pack may contain credentials or memorized live prices.

## Acceptance cases

- `أبغى أشتري سيارة`: identify an out-of-catalog purchase and return the customer to Calapres
  burners without searching the web.
- `ما هو طقس لندن اليوم؟`: do not answer the weather; return to store help.
- `بكم المبخره الخضراء المخططه بالبرتقالي`: search Shopify within Calapres; if no match exists,
  say so and list the current catalog alternatives without claiming availability.

Passing repository tests proves the policy and workflow shape. Only a physically visible channel
reply plus execution evidence proves end-to-end delivery.
