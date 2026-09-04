# 0037 — Establish Klaviyo technically and defer email visual design

Date: 2026-09-04

## Decision

Use Klaviyo as Calapres's Shopify-connected email lifecycle and audience-data layer, but separate
technical readiness from visual email design.

The technical layer consists of Shopify consent and market synchronization, product and onsite
event collection, one double-opt-in email list, the live signup form, Arabic RTL flow structure,
correct event-driven destinations, unsubscribe and organization data, sender identity, UTM
tracking, local-recipient timing, and order-state filters that stop obsolete abandonment messages.

Email visual design is delegated to a later specialist provider. Existing appearance is a working
placeholder, not an approved creative system. All lifecycle flows and their messages stay `draft`
until the visual work is imported, previews are accepted, and the owner gives fresh approval for
customer sending. No live customer email was sent by this decision.

Klaviyo WhatsApp is not adopted; Chatwoot remains the WhatsApp service surface. SMS and Marketing
Analytics remain off. Meta Ads, Google Ads, TikTok audiences, and Instagram are not bound from
Klaviyo without separate account authorization. Judge.me remains independent unless its paid
Klaviyo connection is separately approved; duplicate review requests are prohibited.

## Executed and verified

- Shopify integration is enabled and no longer requests an integration permission update.
- Shopify email subscribers feed list `XGX2zD`; Shopify Markets, the app embed, Viewed Product, and
  behavioral tracking are enabled. Klaviyo-to-Shopify sync is limited to profiles already present
  in Shopify, so Klaviyo does not create new Shopify customers.
- Signup form `XsiWvE`, version `27642620`, is live in the Klaviyo UI with onsite tracking enabled,
  double opt-in, URL exclusions for cart and checkout, existing-profile suppression, UTM consent
  capture, exit/time/scroll triggers, a 30-day close cooldown, and a working collection link. The
  live storefront HTML includes Klaviyo company script `Rf93xb`. A clean visual popup canary remains
  unverified because the available browser session is already identified.
- Six current Calapres lifecycle flows exist and remain draft: welcome `Y39TRB`, checkout
  abandonment `RXMMLx`, cart abandonment `UBeYDd`, browse abandonment `UyRJwi`, post-purchase
  thanks `VRHuL9`, and winback `WkkBUZ`. Old flow `Y6eq9T` remains explicitly retired.
- All eleven attached flow emails use `info@calapres.com`, Calapres labeling, UTM parameters, an
  unsubscribe link, and organization data. Render-only canaries resolved the checkout URL, product
  URL, product name, image, and price without leaving unresolved template variables or sending an
  email.
- Checkout abandonment excludes profiles who place an order after flow start. Cart and browse
  abandonment additionally exclude profiles who progress to later commerce stages. The winback
  delays were corrected from `US/Eastern` to each recipient's local timezone.

## Boundaries

Four hidden flow templates received partial palette/font changes before the owner delegated all
visual work externally: `RpQa6U`, `RjHf29`, `UpuXK2`, and `Y9Hvxg`. The operation was stopped
immediately; the remaining seven hidden templates were not visually changed. Do not treat either
set as approved final design, and do not continue or reverse visual work without the design handoff.

The account currently has too few consented profiles to treat advertising audience sync as ready.
Klaviyo shows only Shopify and its MCP server as enabled integrations; Meta Ads and Google Ads are
discoverable but unbound. No ad spend, subscription, trial with automatic renewal, campaign send,
flow activation, review request, SMS, or WhatsApp migration is authorized or executed.

On 2026-09-04, a live Meta setup audit found two Calapres-like ad-account candidates in Klaviyo,
`1055863030368089` and `1548956409428065`, both `Read-Only`. Shopify and Meta Business instead
verified the canonical Calapres pixel `2087512885182244` inside Optix portfolio
`3498131087080400` and Calapres asset group `1163328843541759`; that group has no ad account, and
neither candidate account is present in the portfolio. Therefore neither candidate may be bound by
name alone. A future remedy requires fresh owner approval for the exact Optix-owned Calapres ad
account, including its permanent currency/timezone choice, followed by full-control verification.
