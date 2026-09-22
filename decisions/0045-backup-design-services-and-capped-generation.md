# 0045 — Backup-only upload and generated-name services

Owner instruction: 2026-09-23, current conversation.

Implement two choices: upload an existing logo/name image, or type an Arabic name
and select a generated calligraphic design. Independent artwork below the product;
never overlay it on the burner. Plain-font substitutions do not meet the request.
Generate in batches of three up to nine, retaining every earlier choice. No login
gate. The owner accepts browser-identifier limitations and wants a global spend
cap rather than elaborate identity tracking. No exact cap has been approved yet.

The mentioned SAR 19 unification and SAR 380 product price were explicitly
withdrawn: do not change prices, variants or service fees. Reuse the existing
upload/text variants and display their actual prices while experimenting.

Work only in unpublished theme 166572294400. No new theme, publication, default
product template reassignment, customer messages, or order/payment is authorized
by this step. Preserve the published primary theme and prior experiments.

This narrowly authorizes preparation of a generation backend and design-asset/
quota storage, superseding the earlier no-external-storage and Magnific-only
creative defaults solely for this personalization experiment. It does not
reintroduce Supabase or change Shopify's catalog/order authority. Provider choice
remains subject to actual Arabic correctness and lowest usable cost. Funding,
commercial account creation, credential binding and a numerical cap remain
unconfigured; source defaults to no generation spending.

Implemented stage: dedicated product.design-service template, two-path interface,
native Shopify upload submission, unchecked approval reset, accumulated gallery
client contract, and a tested persistent quota/reservation ledger. Only the theme
files are deployed. The ledger and generated-image backend are NOT running.
No provider adapter, app proxy, hosting, immutable generated-image storage or
order receipt verification is deployed; end-to-end generation is incomplete.

Validation: Shopify theme check passed; live backup preview and disabled-provider
state observed; synthetic UI test verified 3/6/9 accumulation, first-item selection,
approval reset and name reset. Ledger tests verified restart persistence, duplicate
pending request reuse, cap across new sessions, failed-request reservation and
zero-budget rejection. No real generated artwork or new completed test order.

## 2026-09-23 continuation amendment

Owner explicitly defers the credential workflow until the remaining implementation
is prepared, and directs continuation in the existing Claude Calapres conversation.
This overrides any credential-first workflow for this task. Keep paid generation
disabled; preserve backup-only, no-price-change and no-publication boundaries.
Direct OpenAI GPT Image 2 low is the current candidate, pending actual Arabic
quality/cost validation. A prompt cannot guarantee exact spelling or uniqueness.
