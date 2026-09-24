# Product page and gift card checkpoint — 2026-09-24

This is a sanitized continuation record. Shopify owns the current operational state; refresh
theme roles, products, and prices before further changes. GitHub `main` owns the approved source.
Older theme IDs and rollback instructions in historical handoffs are superseded by this dated
checkpoint.

## Owner-approved direction

- Work on the current published theme by duplicating it once, editing only the needed product-page
  files, reviewing the draft, publishing the approved copy, retaining the former MAIN as rollback,
  then removing the older rollback. End with exactly one MAIN and one unpublished backup; do not
  accumulate experiments in Shopify.
- The owner wants Claude to perform future coding/design work from a well-structured English brief.
  Codex relays requirements and verifies outcomes. Do not interrupt an active Claude task with
  successive prompts; an additional prompt can interrupt the current run.
- The accepted mobile product selector is compact and RTL: `بدون` by default, recommended `صورة`,
  `نص` with exact text plus optional explanation, and categorized `عبارة`. Only the chosen path
  expands. No customer-facing generation, style-example gallery, quota, credits, or daily reset.
  This supersedes decision 0047's proposed six-example storefront flow.
- All three burner colors have a plain variant at SAR 380 and a personalized variant at SAR 399;
  personalization adds SAR 19. Do not infer inventory availability from these prices.
- A physical printed gift card is an optional separate SAR 19 item. The customer chooses one of
  three colors and sees a live front/back preview; `إلى` and `من` are optional, `رسالتك` is
  required and capped at 150 characters. With both personalization and the card, the product
  page total is SAR 418. Manufacturing and print method remain an owner decision.
- The engraving acknowledgement remains required. Its short validation message is
  `يجب الموافقة على الشرط.` The page avoids promising an exact artistic engraving from an example.

## Verified Shopify and storefront state

Read-only Shopify theme query after the owner-requested deletion on 2026-09-24 returned exactly:

| Role | Theme | ID |
| --- | --- | --- |
| MAIN | Calapres — تبديل العبارة وتكبير الصورة 2026-09-24 | `166625181952` |
| UNPUBLISHED rollback | Calapres — تصحيح العبارات 2026-09-24 | `166623314176` |

The later `Calapres — كرت الإهداء على الجوال 2026-09-24` draft (`166628622592`) was
**rejected visually by the owner, never published, and deleted from Shopify**. Do not publish or
recreate that compact-card draft. Claude's screenshot and patch were preview evidence only. The
current live theme remains the owner's preferred version.

Codex inspected the live white-burner product page after publication: the default plain path,
recommended upload path, text/explanation path, phrase list, gift-card fields and three colors,
RTL, short checkbox validation, phrase deselection on a second tap, product-image zoom, and the
absence of the unwanted floating Add to Cart bar were visible/interactive. The ten phrases include
`الحمدلله على السلامة`, `منزل مبارك`, and `عاد عيدكم`. The card form changed the displayed total
from SAR 380 to SAR 399 when selected. The unwanted sticky purchase bar that had obscured the
mobile footer was removed before the current theme was published.

These checks are UI evidence, not a completed-order test. No fresh paid order, checkout, or
end-to-end verification of card/text/attachment properties in Shopify Orders was performed in
this continuation. Claude reported that the separate card product lacks a cart thumbnail; verify
live before treating that as a current defect. The owner will handle physical card production
later. Avoid customer-identity examples from prior real orders in placeholder copy.

## Source preservation and limits

The current Shopify MAIN theme has 78 files. Compared with GitHub `main` at `4b5aaa2`, 24 live
file checksums differed or were absent. The handoff source synchronization imported the returned
live bodies for those files into an isolated worktree. Sixteen imported files match Shopify's
reported MD5 exactly. For eight Shopify JSON files, the API-returned body and reported checksum
do not match byte-for-byte; the returned JSON bodies were retained and parsed after their
Shopify-generated comment headers. Seven tracked files changed and ten new files were added; the
other requested bodies were unchanged on disk. Twelve older source-only experimental theme files
remain in Git history/tree and are not evidence that those experiments are live. Do not upload
them while reconciling the current theme.

The gift-card work was previously present in Claude's local branch but GitHub push was denied
there as `Out-of-Place Publication`. This checkpoint's GitHub revision, once verified on the
approved ref, is the durable source receipt; do not rely on a Claude conversation or a Shopify
draft as the canonical backup.

The owner rejected the latest compact mobile card proposal even though its mock test showed more
fields in view. The original concern remains open: while typing on a phone, the current full-size
card can move out of view. Do not change it again until a new visual proposal is approved. The
rejected draft's simulated-keyboard results do not establish real iPhone acceptance.

## Next continuation

1. Read the latest GitHub `main` and this checkpoint; verify the two Shopify theme roles again.
2. Preserve the current live design. Ask for or present a visual option for the open card-editing
   concern only when the owner resumes that specific issue; do not restore the rejected draft.
3. If separately requested, verify a safe non-payment cart/order path for the gift-card fields and
   resolve the cart thumbnail/print handoff. Do not place a paid order without authorization.
4. For any approved theme change, work from the latest published copy and finish with one MAIN
   plus one rollback, with real mobile owner review before publication.
