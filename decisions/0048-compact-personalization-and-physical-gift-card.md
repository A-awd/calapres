# 0048 — Compact personalization and physical gift card

- Date: 2026-09-24
- Status: Accepted for the published product page; later compact mobile card preview rejected.

## Decision

The default product page for the current burners uses four mutually exclusive personalization
paths: `بدون` (default), recommended image upload, exact text with optional explanation, and a
categorized ready-made phrase. Only the selected path expands. The customer chooses the content;
Calapres determines the feasible artistic engraving after the order. A required acknowledgement
records the relevant condition. The six fixed name-style examples in decision 0047 and all
customer-facing AI image-generation/credit flows are superseded for the storefront. Their source
history may remain, but is not a live feature or a mandate to publish it.

The base burner price is SAR 380 and each engraving customization choice adds SAR 19 through the
priced product variant. A separately priced, physical gift card adds SAR 19 when selected. The
card has three color options and a live front/back preview; optional To and From fields flank a
required message limited to 150 characters. Its message is for a printed card, not for engraving.
The card is a separate order line so manufacturing can distinguish it from the burner.

For each theme iteration, duplicate the currently published Shopify theme, change only the
relevant files, obtain mobile owner review, publish the approved copy, keep the former published
theme as rollback, and remove the older rollback. The final Shopify library should contain one
MAIN and one unpublished backup. Do not publish a design rejected by the owner.

## Consequences and open acceptance

The owner accepted the current published product-page design and rejected the later compact
mobile card preview. The concern about seeing the card while typing on a phone remains open; a
new design requires fresh visual approval. Product-page UI checks do not prove receipt of every
card and engraving property on a completed order or the final print workflow. Preserve these as
separate acceptance gates. Shopify theme roles and pricing are live facts and must be refreshed.

See [the dated live checkpoint](../docs/handoffs/2026-09-24-product-page-gift-card-live-checkpoint.md).
