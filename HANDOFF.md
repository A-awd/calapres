# Handoff

## Resume from

The supplier architecture is disconnected in the live systems. GitHub is behind the live state
until the accompanying commit lands on `main`.

## Done and verified live

1. Eleven Nawadir Dior n8n workflows deactivated and archived.
2. Supplier tables moved to a read-only `archive` schema in Supabase.
3. Active catalog decoupled from supplier foreign keys and relinked to the canonical product.
4. `+100 SAR` pricing rule and `CAL-ND` SKU generator removed from the database trigger.
5. Owner-curated product, pricing, inventory, and media model installed.
6. Manual intake functions and the approval-gated Shopify sync queue created and tested.
7. Reconnect guards installed and proven to fire.

## Not done

1. The new Supabase -> Shopify push workflow does not exist in n8n yet. Building it before any
   product is approved would push an empty queue, so it is sequenced after the first approvals.
2. Legacy Shopify products still carry supplier vendor and supplier tags. They stay as-is by
   explicit owner decision.
3. The archived n8n workflow JSON has not been exported into GitHub. Archiving already preserves
   them inside n8n, so this is an audit convenience, not a recovery dependency.
4. `.env` is still tracked in Git.

## Next operator action

1. Apply this bundle to `main` using `apply-to-main.sh`, then verify the remote revision.
2. Untrack `.env`.
3. Review `public.legacy_product_review` and record decisions.
4. Create the first owner-curated products, approve them, then build the new sync workflow.

## Do not do

Do not reactivate any archived workflow. Do not write to the `archive` schema. Do not bulk-Draft or
delete the live catalog. Do not change existing SKUs. Do not treat
`migration/one-brain-foundation` as canonical after this bundle lands.
