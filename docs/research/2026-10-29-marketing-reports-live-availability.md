# Shopify marketing reports — live Calapres availability

Observed 2026-10-29, Asia/Riyadh. Scope: owner-requested authenticated, read-only inspection of the
reports actually available to Calapres and their useful relationship to the existing Metricool
report. No store, marketing, analytics, connection, attribution, privacy, campaign or billing
configuration was changed.

Inspection baseline: Calapres main `a7af42cc4ff192812e75f1f5a459c087a6a18de8`;
publication preserves the newer Onwan review at `882b46818a942ee74166993ee40a7e1fb25e0bd9`;
global launcher/routing main `b5a7bbf9c249fbf13745598ec85cb8bc60299cad`.
A Shopify Editions announcement is context, not proof of feature availability. The availability
findings below come from the actual authenticated Calapres admin.

## Available in the inspected account

The current native navigation exposes **Growth → Attribution**. Both **Performance** and
**Path to purchase** opened and displayed populated data. This establishes access to those
specific account surfaces; it does not establish that every announced Fall '26 feature is
available or enabled.

The date filter was successfully set to **27 September–26 October 2026**, matching the calendar
period of the existing private native Metricool PDF. **Shopify's reporting timezone was not
independently verified**. This establishes matching calendar dates only; it does not establish
identical time boundaries or metric definitions across the two systems.

### Performance

- Current attribution model displayed **Last non-direct click**.
- The model menu also exposes **Last click**, **First click**, **Any click** and **Linear**.
  This review did not change the saved attribution configuration.
- A **30-day attribution window** was visible.
- Traffic controls expose **All**, **Marketing**, **Paid** and **Organic** views.
- Tables support the visible **channel + traffic** and **campaign + channel + traffic**
  breakdowns.
- **Ad spend**, **ROAS**, **CPA** and **CAC** columns are present, but displayed unavailable
  marks in the inspected period. A visible column is not proof of populated paid reporting,
  complete ad-cost ingestion or measurable paid performance. Missing values must not be
  converted into zero spend, zero return or a connection-failure diagnosis.
- Several traffic rows were labeled **Unknown**. Their presence is observed; the cause was not
  established. No missing tag, consent issue, traffic source or integration fault is inferred
  merely from that label.

### Native report controls, dimensions and comparison limits

The full native **performance_by_marketing_channel** report opened successfully. Export, Print
and other report controls were visible; visibility is not a completed export or a saved report.
The Add dimension control was inspected. Marketing channel and Traffic type were selected,
while Marketing and Stores were the only enabled dimension categories for the combined
datasets in this inspected report. **UTM dimensions were not verified**. This bounded dimension
menu is not proof that UTM or acquisition reports are unavailable elsewhere in the account.

The query interface displayed a warning that, beginning **21 September 2026**, results based on
the sessions and searches datasets may shift because session and derived-metric calculations
change. The comparison period **28 August–26 September 2026** straddles that change. A displayed
period-over-period decrease therefore cannot be attributed purely to marketing performance.

The top Sessions KPI's built-in query explicitly filters `human_or_bot_session = 'human'`;
the channel table query did not contain the same filter. Those views have different query
boundaries. Do not sum the table and equate its result with the top KPI, infer missing visits
from their difference, or present a cross-view discrepancy as a tracking fault. No query was
saved or applied as a persisted report configuration.

### Path to purchase

The available surface exposes median marketing touchpoints, time to purchase and time between
touchpoints. Direct paths were visible. These views can help describe journeys represented in
the report, but are not a complete event-level ledger or proof of one particular customer's
journey.

The existing store history includes owner-paid experimental orders that were not globally
removed from analytics by the daily-work Orders view. The sample and test-order contamination
therefore prevent a reliable customer-funnel or marketing-success conclusion from the inspected
aggregate paths. No orders were retagged, refunded, canceled, deleted or created to clean or
inflate this review.

## Using Shopify and Metricool together

The existing native Metricool PDF for **27 September–26 October 2026** was reused as a dated
private baseline. Metricool was not freshly audited in this task. Its saved template covers
Summary, Facebook, Instagram, TikTok, Google Ads and TikTok Ads; native report availability and
prior configuration must not be presented as a new account-health verification.

Use the two systems to answer connected but different questions:

| Question | Appropriate source and limits |
| --- | --- |
| Which content obtained exposure, engagement or link clicks? | Metricool's applicable social-network measures for the same period; platform definitions vary. |
| Which recorded sources or campaigns brought measurable store sessions and attributed orders? | The available Shopify attribution breakdowns, using the stated model/window and qualifying Unknown rows and test records. |
| Which visits reached an observable purchase path? | Shopify Path to purchase, subject to sample, attribution and test-order limits. |
| Did one exact Google Ads event arrive and count once? | Requires its own provider receipt evidence; neither this aggregate Shopify report nor social engagement proves it. |

A social click need not equal one measurable Shopify session. Attribution models can assign credit
differently, and several platforms may claim the same sale. Do not add platform-attributed revenue
together as real total revenue or claim Metricool subscription ROI from this inspection.

For a future owner-approved content cycle, use one agreed naming scheme for tagged links by
network, campaign and content item. Compare the resulting social performance with the existing
Shopify/GA4 measurement. That is a proposal for later exact-link preparation and approved use;
no link, pixel, integration or tracking setting was changed here. Future tagging cannot
retroactively restore missing historical campaign attribution.

## Further-inspection service limitation

Later navigation to the Reports library displayed a blank page. Reload timed out and the
browser runtime was reset. The sole existing Codex in-app tab was recovered; a final return
to the known Growth/Attribution surface explicitly displayed **504 Gateway Time-out / nginx**.
This is a bounded service/access failure during further inspection, not proof that the already
observed populated reports are unavailable to the plan or that a tracking connection is broken.
No complete Reports-library or UTM-dimension audit is claimed. No external browser or extra
working tab was used to bypass the error.

## Read-only execution and evidence boundary

Only report navigation, view/date selection and inspection were performed. A full-report
drilldown showed unsaved query changes produced by built-in date filtering; **Save as** was
not used, no report was saved and no configuration was submitted. The inspected view/date/query
changes were display operations and were not submitted as a saved report configuration. Report display controls and an unsaved query are not a persisted
analytics setup change.

No campaign activation, ad spend, conversion test, storefront purchase, order, customer/staff
message, schedule, monthly email, OAuth connection, pixel installation, permission expansion,
privacy edit, subscription action or new automation occurred. Captain remains paused and Easy
Life remains stopped. One Codex in-app working tab was used throughout.

Raw analytics, private figures, customer/order/account identifiers, native screenshots/exports
and authenticated report URLs remain outside this repository. Private evidence belongs only in
the project's verified Ai-Work location. This is a sanitized availability/interpretation record,
not a raw report export or event-delivery receipt.

## Next safe action

Once the service is available, inspect the existing acquisition/UTM reporting read-only and
verify the displayed reporting timezone and applicable filters. Continue a paired review with
Metricool on matching calendar/time boundaries, stating the attribution model/window and
calculation-change limitation. Separate owner test records wherever the actual report controls
permit before drawing a sales or customer-funnel conclusion.

Agree future UTM names alongside the three existing content ideas and actual approved original
assets. A future tagged-link plan can make a later content cycle more interpretable, but
requires exact content/destination/timing approval and does not authorize automatic publishing,
retroactive attribution claims, changed settings or new tracking infrastructure.
