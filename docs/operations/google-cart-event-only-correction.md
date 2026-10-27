# Event-only Google Ads cart conversion through the native Shopify app

Applied and independently reopened on 2026-10-27, Asia/Riyadh. The wrong broad Page-load action
is archived, the existing manual cart action is the sole native destination, and one controlled
post-change cart add produced one native event. These establish saved configuration and bounded
native acceptance, not exact Ads per-hit receipt or a universal provider-deduplication guarantee.

Initial source baseline: Calapres main `2c3dad0120ccf50742c5193f7698813a494163f2`;
global launcher/routing main `d152dde8204a9c5666afe696066882decac3f75f`.

The owner explicitly authorized correcting cart measurement to count real additions instead of
page loads, preventing overlap, preserving Google & YouTube, and making no ad activation, order
or test purchase. This corrects the source issue identified by the
[Ads-side receipt check](../research/2026-10-27-google-ads-cart-receipt-check.md) and supersedes
only the cart destination/source-selection portion of
[decision0054](../../decisions/0054-native-google-cart-migration-and-domains.md).

## Exact prior issue and source choice

The preceding native Added to cart mapping selected the existing Arabic action
`إضافة إلى سلة التسوّق (https://calapres.com)`, action `954369731`, label
`AW-10837488053/f2qDCMONiscDELXj268o`. Its Ads definition independently represented a broad
Page load rule: URL begins with calapres.com/, empty suffix. One native destination did not
exclude that separate URL/page-load path. The Event type input was read-only in the exposed UI;
converting this source in place was not offered by the inspected control.

The correction uses the pre-existing event-only action, not a new conversion action or a manual
gtag/custom-pixel layer. Count Every was not changed to One, and Primary/Secondary, account goals,
attribution, campaign and budget settings were not changed to conceal the source problem.
The native cart capture-phase handler and its successful-AJAX event source were preserved.

## Existing manual replacement inspected and retained

| Field | Verified readback |
| --- | --- |
| Name | Google Shopping App Add To Cart |
| Conversion action ID | `7713642682` |
| Created | 8 August 2026; pre-existing, not created by this correction |
| Status | Enabled, including fresh post-change readback |
| Data source | Calapress; manually configured event |
| Broad Page-load Event row | Not present in the inspected definition |
| Optimization | Secondary, unchanged |
| Count | Every, unchanged |
| Account-default goal inclusion | Excluded, unchanged |
| Published native Ads tag/label | `AW-10837488053/KORbCLqxk94cELXj268o` |

The replacement's manual source was inspected before it was selected. Its identity was not
inferred from the display name, and the conversion label was not derived from the numeric
action ID: the subsequent published native pixel configuration independently exposed the label.

## One native Added to cart destination saved and reopened

In native Google & YouTube conversion-event settings, only Added to cart was changed from the
old Arabic action to **Google Shopping App Add To Cart**. The row and settings dialog were saved.
Fresh Settings navigation/reload and a reopened dialog independently showed the same single
linked-account destination. Opening its edit view showed the correct detected action selected,
Add custom conversion ID/label unchecked and unchanged Save disabled. That edit view was then
cancelled and closed without another mutation.

| Shopify event | Final saved destination |
| --- | --- |
| Checkout completed | Google Shopping App Purchase — preserved |
| Checkout started | Google Shopping App Begin Checkout — preserved |
| Added to cart | Google Shopping App Add To Cart — sole destination |
| Page viewed | Google Shopping App Page View — preserved |
| Product viewed | Google Shopping App View Item — preserved |
| Search submitted | Google Shopping App Search — preserved |
| Payment info submitted | Google Shopping App Add Payment Info — preserved |

The published homepage's native Shopify pixel-manager add_to_cart configuration exposed exactly
these destinations:

- GA4: `G-3YZFD1XGVL`.
- One Ads action: `AW-10837488053/KORbCLqxk94cELXj268o`.

The previous f2qDCMONiscDELXj268o label was absent from the inspected published script text, and
legacy GTM-PX2N44V was absent from the inspected page. A separate GA4 destination is not a second
Ads action label. These DOM/configuration observations do not purport to cover every possible
page/frame/worker or prove the provider's exact network-hit count.

## Old broad action archived, with history retained

Exactly one old row was selected and its identity as action `954369731` was verified before
native Edit -> Remove. The native UI reported removal of one conversion action in progress,
then the server-rendered table showed the old Arabic action as **Removed**. All-status view
retained its historical row; the total remained21 actions. No other action was selected or
created by this correction.

A final fresh Ads reload, with All-status/30-row view and virtual-table scrolling as needed,
independently showed the old action as **Removed**, with tracking status **Removed**, while
Google Shopping App Add To Cart remained **Enabled**. The retired Page-load action is therefore
excluded from the active cart-measurement path. This is archival of that action, not an assertion
that its historical rule text was physically erased from all Google tag configuration.

The executing agent read Google's official
[individual conversion-action status guidance](https://support.google.com/google-ads/answer/10918269?hl=en)
in the Codex in-app browser. Removed is the supported archival state with retained history and
a normal recovery path: include removed actions using All, then restore Enabled when explicitly
appropriate. No account, native Google tag, native app or GTM container was deleted.

## Preserved native connections, tags and domains

Fresh Shopify settings matched:

- Merchant Center `582442539`.
- Google Ads customer `3301213892`.
- GA4 measurement `G-3YZFD1XGVL`.

Conversion measurement and enhanced conversions remained On; Customer Match remained Off.
The three existing Google tag IDs `AW-10837488053`, `G-3YZFD1XGVL` and `GT-P3NC2SXW` were
unchanged, including a fresh Google-tag dialog readback; GT-P3NC2SXW displayed Merchant
destination MC-QEZTVYYNZQ. The two previously saved Exactly matches domain rules, calapres.com and
unywbe-ub.myshopify.com, were not modified by this correction. Their earlier saved/reopened
acceptance remains in decision0054; no DNS, primary-domain or redirect change was made here.
Google & YouTube was not disconnected/reconnected. Legacy GTM remained untouched/uninstalled.

## New bounded native acceptance for the changed source/destination

The executing agent used the native Google & YouTube Pixel Helper in the same working tab,
without GTM Preview, an extension, manual event injection or an attributed ad click.

| Step | Native observed result |
| --- | --- |
| Plain-product page at16:30:21 Riyadh | page_viewed + product_viewed; two events; original cart quantity1 |
| One Add press at16:30:42 | exactly one product_added_to_cart; total events3; cart quantity2 |
| Targeted decrease at16:33:43 | one cart-removal event; total events4; original quantity1 restored |

The physical card was unchecked. This avoids a legitimate second product-add request being
mistaken for duplicate tracking. The pre-existing plain-white cart item was preserved. No
checkout, order, payment, purchase, synthetic conversion or historical replay was performed.
This was one new bounded acceptance for the changed Ads-source/native-destination configuration,
not a repetition of the old14:10 test merely for a continuity checkpoint.

The manual Ads action's fresh details still showed Waiting for conversions. No exact provider
per-hit receipt/count ledger was obtained. The native one-add result, one published Ads label,
one saved native mapping and archival of the wrong broad action establish the bounded correction;
they do not establish exact Google Ads receipt or universal server/provider deduplication.

The old14:10:46 cart add and preceding14:10:25 page view shared the minute displayed by the old
last-signal UI. This correction does not retrospectively make that old test uniquely received or
counted once inside Ads. Keep that historical receipt ambiguity separate from this new native
acceptance. Neither waiting status nor a zero attributed total alone proves loss of the event.

## Acceptance outcome and limits

| Question | Outcome |
| --- | --- |
| Wrong broad Page-load action active for cart measurement | No; exact old action freshly read back Removed |
| Manual replacement active and definition inspected | Yes; Enabled, manually configured event |
| Native Added to cart destinations | One linked action; custom additional label off; fresh readback |
| Published Ads add_to_cart labels | One replacement label; prior label absent in inspected script text |
| Other six native mappings and Google connection | Preserved and reopened |
| One native add event for one controlled post-change Add press | Verified; cart restored |
| Actual post-change Ads per-hit receipt/count-once | Not established |
| Universal future provider duplicate-event prevention | Not claimed |

## Targeted recovery

Before any rollback, read the exact current mappings/statuses to preserve unrelated or concurrent
changes. Restore only fields changed by this correction. The prior native cart mapping was the
single Arabic action954369731, with additional custom destinations off.

If a genuine rollback requires that old action, use its verified normal All-filter -> Enabled
recovery and restore only the old native mapping. This also restores the known broad Page-load
measurement risk, so do not reactivate it automatically or describe rollback as event-only.
Keep action7713642682 and both histories; do not delete either action merely to restore a mapping.
The old source-rule values are retained as a recovery reference.

No old theme/GTM version restoration, native app disconnection, bulk action/tag deletion, new
campaign/goal/count setting, DNS/domain-rule reversal or customer-data permission belongs to
this bounded recovery.

## Preserved operational scope

No new Ads action was created. No campaign was activated; no budget, attribution, Count,
Primary/Secondary/default-goal setting, customer/order record, checkout/payment, shipping,
customer send, privacy/permission or media setting was changed. Captain stays paused. Existing
operational Flows, OTO, private media, both exact domain rules and other six Google mappings
remain protected. The adjacent JSON is a declarative record, not a native export/import file.
