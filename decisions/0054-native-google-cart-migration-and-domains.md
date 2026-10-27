# 0054 — Native Google add-to-cart migration and Calapres domains

Date: 2026-10-27. Status: accepted and applied; saved configuration and bounded native
add-to-cart acceptance verified. Actual provider receipt/purchase attribution remain separate,
unverified evidence.

## Decision

The owner authorized resolving the remaining legacy add-to-cart migration and configuring the
two Calapres domains, while preserving the current Google & YouTube connection and explicitly
prohibiting reinstall of legacy GTM-PX2N44V. Keep Google measurement in the existing native app;
do not add a manual gtag layer, custom pixel, new app, campaign or broader data permission.

Migrate only the existing AW-10837488053 / f2qDCMONiscDELXj268o add-to-cart candidate. Native
migration exposed an overlap with Google Shopping App Add To Cart. Use one linked existing Ads
action as the sole Added to cart destination, with the additional custom ID/label destination
unchecked. Preserve the other six event mappings and the conversion actions' historical data;
do not delete Ads actions or change campaign/goal-counting settings as a shortcut.

Configure only `calapres.com` and `unywbe-ub.myshopify.com` in the current AW Google tag object
(account 6276252564/container 210282495), using the native proposed Exactly matches rules.
That object is separate from legacy GTM account 6009248341/container 68698194.

## Evidence boundary

Native migration and the corrected one-destination mapping were saved. Fresh Settings navigation
and reopened conversion dialog verified exactly one existing linked Arabic add-to-cart action,
without the prior Google Shopping App Add To Cart or extra Custom destination. The other six
mappings remained unchanged. Fresh reopened domain readback verified the two saved Exactly
matches rules. Public pixel-manager configuration independently showed one Ads action label
AW-10837488053/f2qDCMONiscDELXj268o for add_to_cart alongside the separate GA4 destination.
A new native Pixel Helper check observed exactly one product_added_to_cart for one plain-product
add and restored the pre-existing cart. No purchase or event replay was performed.

Fresh reopened Overview no longer showed the migration warning or its Get started migration
button; three connected services remained Active and six offers Approved. The last explicit
wizard progress was 2/3 / No tags to migrate. No OK/Complete submit or 3/3 receipt is claimed.
Fresh account settings also confirmed the same three native connections, conversion/enhanced
measurement On and Customer Match Off. Configuration saves, native/runtime event counts, actual
provider receipt and purchase acceptance must not be conflated. Five remaining loader nodes do not prove duplicate receipt;
no arbitrary script removal or legacy GTM installation was used.

The earlier capture-phase cart fix stays intact. No manual event or synthetic/paid purchase is
required merely to complete the native mapping/domain correction. Legacy GTM remains untouched.

## Recovery

Restore only the exact prior Added to cart mapping if needed; keep the Ads action/history and
the native Google account connection. Restore only the exact prior domain rules. Native migration
undo/warning reset is not established as one-click recovery. Never restore a whole old theme,
activate GTM, remove content_for_header or bulk-delete Google tags for this rollback.

See [configuration, acceptance evidence and recovery](../docs/operations/google-native-cart-migration-and-domains.md).
