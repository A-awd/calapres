# Why the Google Ads cart signal remains old — bounded diagnosis

Read-only diagnosis completed within available evidence. Reporting latency remains plausible;
no concrete disabled-pixel, wrong-label or native-app connection error was observed. The cause
of the old last-event-signal timestamp and historical collector acceptance remain unproven.

Observed2026-10-27, Asia/Riyadh. The owner requested distinguishing normal update latency from
an event-send problem, with no repeated test or ad activation. Baseline Calapres main:
9c38c0efd3a23c019a41904a729f1dd79649b26d; global main:
d152dde8204a9c5666afe696066882decac3f75f. Official pages and live Ads UI below were read by the
executing parent in the same working Codex in-app tab. This note does not record a new event.

## Event and timing boundary

The already completed native Google & YouTube test produced one product_added_to_cart at
16:30:42 Riyadh on27October2026. The original cart quantity was restored at16:33:43. The latest
Ads-only check showed the correct action7713642682 still Enabled/Waiting for conversions,
Today All conversions0 and last event signal23October2026 at5:56PM. The Ads display timezone
was not independently established; the older date nevertheless predates the new test day.

A clock read at16:48:11 Riyadh was only17min29sec after the add. That interval is relevant to
normal refresh/reporting windows but does not independently prove either successful delivery
or failure. No waiting period, report counter or shared Google-tag activity can retrospectively
identify the exact16:30:42 event without event-specific evidence.

## What Google's current documentation establishes

The parent read the following primary Google sources in the Codex in-app browser:

- [Conversion-reporting latency](https://support.google.com/google-ads/answer/12674892?hl=en)
  describes a3–24-hour conversion-reporting window. This is report freshness guidance, not an
  independently verified3–24-hour service-level promise for the last-event-signal field.

- [Conversion tracking troubleshooting](https://support.google.com/google-ads/troubleshooter/13455130?hl=en)
  distinguishes Awaiting/Waiting status from recording a tag event. No attributed conversions
  over the preceding seven days can coexist with a paused or low-traffic campaign. Last activity
  can help inspect tag activity even when no attributed conversion is present.
  Its separate48-hour guidance for a new action is not a ready-made explanation here: this
  action was created8August2026, and remapping the native destination did not create a new one.

- [Conversion status guidance](https://support.google.com/google-ads/answer/10029065?hl=en)
  discusses an expected ten-minute update for an Unverified status in the conditional case of
  many conversions per hour, including unattributed activity. Direct navigation without an ad
  click may not appear as a reported Ads conversion. Do not turn that conditional ten-minute
  statement into an SLA for this single event or for the current Waiting status.

The test was a native store diagnostic, without a new qualifying ad click. Therefore All
conversions0 is not a raw count of cart-event delivery. Neither a zero report nor Waiting
alone establishes an event-send problem. Equally, normal report latency does not itself prove
that this specific event reached Google's collector or that last-event-signal will update.

## Independent exact destination match

In Ads, the parent opened the existing action7713642682 through Manage -> View event snippet.
The generated event snippet's exact destination was:

`AW-10837488053/KORbCLqxk94cELXj268o`.

That independently matches the saved native Google & YouTube cart destination and published
native add_to_cart configuration recorded by0055. It reduces the observed wrong-ID/label
hypothesis; the destination was not inferred from the action's name or numeric ID.

The snippet generator initially selecting Page load is a draft installation/example choice.
It is not a saved broad URL rule on this manual event action. Do not mistake the generator's
radio selection for a recurrence of the old Page-load rule. No snippet was copied/installed,
no Save was submitted and no manual gtag/custom pixel or GTM layer was added.

Old incorrect action954369731 remains recoverably Removed; it is not being reactivated to
compare activity. Existing Google & YouTube, its three linked services and the event-only
correction remain the intended source path.

## Transport and historical evidence limit

The native Pixel Helper established a single Shopify source event during the prior test. The
saved mapping, published native configuration and independent Ads snippet now agree on the
exact destination. None is a historical collector request/response or event-specific acceptance
receipt. The prior private receipts explicitly leave exact Ads receipt/count-once false.

The browser console buffer exposed only current Google Help UI errors, not retained store
transport evidence from16:30. This is not proof of clean delivery and is not a reason to claim
that no prior network, browser, privacy or application error occurred. Do not classify unrelated
Google Help UI console errors as a storefront tracking fault.

## Current native pixel/privacy/app readback

The parent inspected current Shopify Admin metadata only, without visiting the storefront or
opening Test. Native Customer Events showed Google & YouTube with **Server + Web** capability
flags and **Data always on** selected. Its activity referenced data access granted as Always On
on9September and detected signals on1August. Those are capability/data-access configuration
and dated activity, not consent captured from the16:30 browser session or a collector receipt.
Server + Web flags alone do not prove that this cart event was sent twice.

Current Customer Privacy cookie-banner regions showed31 selected out of299, the European
recommended set. Searching Saudi Arabia showed its checkbox unselected. The region modal was
cancelled without changes. Therefore the historical29August record of Saudi Arabia being in the
banner set is not the current configuration. Preserve that historical record as dated evidence;
do not use it as a present explanation for this test. No session-specific consent or geographic
context was established, and no consent setting was changed to force a signal.

The current native Google & YouTube overview showed three services Active, six offers Approved,
zero Limited/Rejected/Under review, and no add-to-cart migration warning or visible tracking
connection error in its full body. These support current native-app/connection health. They are
not event-specific transport diagnostics and do not show whether the16:30 cart hit was accepted.

## Qualified assessment

The independent exact label match, active native app and Always On pixel configuration provide
no observed wrong-label, off-pixel or disconnected-app explanation. Current Saudi banner
configuration also does not support the dated Saudi-banner hypothesis. None proves that all
browser, consent, network, application or collector gates succeeded for the historical event.

Normal reporting latency is plausible this soon after the single direct-navigation diagnostic
and remains compatible with Google's reporting guidance. It is too early to classify the old
signal as a transport fault from these observations alone. However, the3–24-hour reporting
window is not a service-level promise for the last-event-signal timestamp. The specific cause
of that timestamp not refreshing remains unestablished; an actual send problem is neither
proved nor ruled out without retained request/response evidence.

Exact Ads collector receipt and exact-once attribution remain unverified. A direct-navigation
store diagnostic without a qualifying ad interaction may not produce an attributed Ads
conversion even if its event transport succeeds. Do not promise a future conversion count,
identify a zero report as event loss or infer duplicate sending from the native capability flags.

## Next bounded observation

If a later check is requested, a reasonable single diagnostic checkpoint is after28October2026
16:30:42 Riyadh,24hours after the add. That gives the documented conversion-reporting window
room to mature; it is not a guaranteed last-signal refresh time, conversion count or per-hit
ledger. Read the exact action's activity, status and reporting again without repeating the add,
clicking ads or changing goals/count/source. Preserve any continued absence of fresh evidence
as unresolved rather than a fabricated delivery/failure diagnosis.

No automatic monitor, reminder or repeated polling was created. The current request authorizes
this diagnostic, not a new event, installation, consent change or activation to force a result.

## Protected scope

Only native read-only navigation and view controls were used. The cookie-region modal was
cancelled without changes. This diagnostic changes no campaign, budget, source/count/goal,
attribution, tag installation, consent region, app connection or permission. No storefront event, checkout, order, purchase,
shipment or customer send is performed. Captain stays paused; Easy Life stays stopped. The one
working Codex in-app tab is reused, and the owner's other tab is untouched.
