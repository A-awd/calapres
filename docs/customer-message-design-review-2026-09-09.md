# Customer-message design review — 2026-09-09

Owner moved focus to email design, WhatsApp templates and Apple Branded Mail. This does not resolve or certify outstanding purchase tracking.

## Live inspection
- Shopify sender info@calapres.com is Authenticated.
- Native Order confirmation preview uses a text Calapres heading, Arabic notification copy and Shopify synthetic catalog/address data. Synthetic English product names in preview are not live catalog evidence.
- Current approved WhatsApp order_confirmation wording in canonical workflow is one paragraph with recipient name and order number. Production template was not changed or independently re-read in Meta in this turn.
- Apple Business signup is still on organization-details form. Do not infer absence of any other Apple organization from this tab alone. No form was submitted.
- Public DNS TXT _dmarc.calapres.com is v=DMARC1; p=none. MX points to Google. Shopify authenticated status does not prove all other senders pass aligned DKIM.

## Prepared for owner review
Relative iCloud deliverable: رسائل العملاء/معاينة الإيميل وواتساب.html
Self-contained HTML preview embeds existing wordmark and approved CR seal without modifying source assets. Three selectable cases: confirmation, shipment information and carrier-confirmed delivery. Saudi personalized-order 14-day note is conditional. Data is illustrative, not actual customer information. Header/body use the existing wordmark; sender/avatar uses CR. WhatsApp chat chrome is illustrative, not custom app styling.

Artifact JavaScript syntax verified. Browser file navigation was blocked by URL policy; no workaround attempted and no browser-render validation claimed. Codex file panel open was queued. File exists locally in iCloud path; cloud upload unverified.

## Implementation after visual approval
- Preserve native Shopify order/payment/delivery conditionals, item properties, discount/tax totals, addresses, and signed order URLs. Never claim paid unless financial state confirms it.
- Do not promise carrier possession merely because a shipping label or tracking number exists.
- Replace WhatsApp only with approved template revision and verified dynamic order/track URL mapping. Current sender has name/order parameters only, so proposed CTA requires implementation; do not activate duplicate workflows or extra messages.
- Klaviyo lifecycle work remains draft under decision0037; no campaigns or live flow activation was included.
- Apple: complete lawful organization registration under verified Optix legal identity; add Calapres brand and CR logo; add/verify calapres.com using Apple's TXT value; verify aligned DKIM for all intended senders; only then plan compliant DMARC quarantine/reject with pct=100. No DNS mutation performed. Wait for Apple approval, then separately verify real Apple Mail rendering.

Sources:
https://support.apple.com/en-ca/guide/business/abcb28ad2a2d/web
https://support.apple.com/en-ca/guide/business/abcb22cbade5/web
https://support.apple.com/guide/business/intro-to-branded-mail-abcb761b19d2/1/web/1
