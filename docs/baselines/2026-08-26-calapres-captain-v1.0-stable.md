# Calapres Captain v1.0 — Stable

Date: 2026-08-26

Status: owner-approved behavioral baseline before further knowledge experiments

## Purpose

This is the named checkpoint for the first Captain configuration the owner considered successful.
It records the live operating meaning without renaming or modifying the live assistant. Future
experiments must be recorded as explicit deltas from this baseline and must not delete existing
knowledge or run the preserved n8n responder in parallel.

## Owner acceptance rationale

The owner accepted this as the best configuration reached so far in the project because its
physically visible WhatsApp reply was direct, natural, aware of the conversation and Calapres store
scope, and kept an unconfirmed shipping request inside the same chat instead of referring the
customer to email. It materially corrected the preceding repetitive fixed-response behavior.

This acceptance is the reason for protecting `v1.0` as the baseline. It proves the accepted final
behavior and delivery on WhatsApp only; it does not claim that Instagram and TikTok have equivalent
final-baseline proof, that Captain can read live orders, or that every pending business fact is
already loaded.

## Active responder and routing

- Chatwoot account: `179973`.
- Captain assistant: `Calapres Assistant` (`2187`).
- Connected Captain inboxes: WhatsApp `128058`, Instagram `128031`, and TikTok `128033`.
- Captain Audience: `Everyone`.
- Captain Schedule: `Anytime`.
- One active Chatwoot automation assigns newly created conversations from the four existing
  inboxes (`Calapres`, Instagram, TikTok, and WhatsApp) to `خدمة عملاء كالابريز`.
- The preserved n8n responder `kAyF0D3ZZHxc0Hwp` is unpublished with no active version and must
  never run alongside Captain.

## Assistant identity

The live description identifies Captain as the support assistant for a Calapres luxury-burner
store, currently referencing white, beige, and gray burner sets. It answers only from Calapres
sources, redirects external topics briefly, and hands off when a fact is not confirmed or the
customer requests a human.

## Behavioral baseline

Captain must:

- answer in concise, natural Saudi Arabic;
- understand each message using recent conversation context;
- begin with a direct answer and ask no more than one useful clarification;
- avoid menus and never use the rejected fixed phrase
  `وش حاب تعرف عن منتجات كالابريز أو طلبك؟`;
- never invent prices, stock, shipping times, or other facts;
- keep the customer inside the current conversation and never refer them to email or another
  channel;
- say it will check and return in the same chat, or hand off internally to a human, when a fact is
  unavailable;
- redirect cars, travel, weather, food, and other clearly external topics without answering the
  external question.

## Knowledge baseline

The last full inventory read recorded 22 documents and 72 approved FAQs. The knowledge set includes
useful Calapres pages plus unrelated or broad material that remains a quality risk. No document or
FAQ was deleted. Automatic FAQ generation, long-term memory capture, contact access, and citations
remain disabled.

The current knowledge has repeated a SAR 490 compare-at-price claim that was not independently
verified from Shopify. Treat that figure as unverified until the owner explicitly approves or
removes it.

## Current live-data boundary

Captain has no custom Shopify tool on the current plan. It can use stored/crawled knowledge and
conversation context, but it cannot safely read a live order. Order-status requests must remain in
the same chat and hand off to the human agent. Shopify remains the operational source of truth;
Neon is not in Captain's active reply path.

## Pending owner facts for the next version

The following facts were supplied after this stable behavior was accepted and are intentionally
not claimed as part of this baseline until added and verified as a separate version:

- Calapres sells the luxury leather burner itself, not incense or oud bundled with it.
- The product may be engraved with two letters, or two letters plus a date.
- Products and official prices should follow Shopify.
- Stock is treated as always available by owner policy.
- Saudi shipping is free; UAE, Kuwait, Bahrain, Qatar, and Oman shipping is SAR 40.
- Apple Pay, Visa, and mada are supported; Tabby and Tamara are not supported.
- Engraving price is not yet confirmed and must not be invented.
- Products are not returnable unless damaged or defective, including engraved products.

## Change and rollback discipline

1. Keep the live assistant ID and inbox connections unchanged.
2. Add one knowledge group at a time and record it as `v1.1`, `v1.2`, and so on.
3. Verify each group in Playground before relying on a real-channel observation.
4. Do not delete or rewrite baseline FAQs/documents during experiments.
5. If a new addition degrades replies, remove only that recorded addition and restore the exact
   baseline guidance above.
6. Never publish the n8n responder while Captain is connected.

This document on GitHub `main` and the GitHub branch `captain-v1.0-stable` are the durable checkpoint. They
do not create a native Chatwoot cloud snapshot; safe rollback depends on recording every later
delta and avoiding destructive knowledge edits.
