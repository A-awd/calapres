# Shopify Saudi VAT zero-collection handoff

Date: 2026-08-30

Last verified: 2026-08-30 13:57 Asia/Riyadh

## Identity and bounded scope

- Project: Calapres.
- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- GitHub baseline: `cad21a8f16b644d2bb98a6df20d4626200d00604`.
- Included: Saudi Manual Tax diagnosis, one base-rate change, post-reload persistence verification,
  and a fresh no-payment Saudi checkout calculation.
- Excluded: legal or accounting audit, ZATCA registration, tax-number handling, invoices, product
  price changes, shipping changes, real customer data, orders, cards, payments, refunds, payouts,
  Paymob configuration, theme code, policies, pixels, and every non-tax integration.

This is a sanitized operational record. It contains no Tax ID, registration certificate, customer
information, payment identifier, card data, or raw browser payload.

## Owner statement and legal boundary

The owner stated that Calapres has no Saudi VAT registration and instructed that checkout must not
add VAT. This was the authorized business input for the Shopify change. Calapres taxable supplies,
forecasts, entity-specific exceptions, and ZATCA registration status were not independently
audited. A Shopify rate of zero is a no-collection control, not proof that the underlying supply is
legally zero-rated.

ZATCA's current published guidance describes mandatory registration above 375,000 SAR in taxable
supplies under the applicable prior or expected 12-month test and voluntary eligibility above
187,500 SAR in taxable supplies or expenses, with special rules and exceptions. Recheck the actual
business position across the entity now. Reopen immediately if registration or collection is
already required, becomes required, or a VAT registration takes effect.

Official references:

- [ZATCA VAT registration threshold FAQ](https://zatca.gov.sa/en/HelpCenter/FAQs/Pages/FAQArchiveEservices.aspx?page=FAQ_024)
- [ZATCA prior and expected 12-month VAT tests](https://zatca.gov.sa/en/HelpCenter/guidelines/Documents/VAT-Guideline-for-Electronic-Contracts.pdf)
- [ZATCA VAT penalties](https://www.zatca.gov.sa/ar/RulesRegulations/VAT/Pages/Penalties.aspx)
- [Shopify Manual Tax settings](https://help.shopify.com/en/manual/taxes/manual-tax-settings)
- [Shopify tax overrides](https://help.shopify.com/en/manual/taxes/tax-overrides)
- [Shopify Saudi billing VAT](https://help.shopify.com/en/manual/your-account/manage-billing/billing-charges/types-of-charges/taxes/billing-taxes-saudi-arabia-uae)

## Verified pre-change state

[Live, read-only]

- Saudi Arabia appeared in Tax regions as collecting through active Manual Tax.
- The Saudi country base rate was 15%.
- The shop-level flags and Admin controls showed tax-inclusive pricing off and tax on shipping off.
- The Saudi tax-override list was empty.
- Duties and import taxes displayed a setup action rather than an active collection state.
- The owner stated that no Saudi VAT registration exists; no Tax ID or certificate was requested,
  read, or stored.

## Executed live change

[Owner-approved and verified]

1. The Saudi country base tax-rate field was changed from 15 to 0.
2. Save was submitted. Shopify displayed a successful-save notice.
3. The Saudi tax page was fully reloaded.
4. The reloaded Manual Tax page reread the country rate as 0%.

No other field on the tax page changed. In particular, tax-inclusive pricing and tax on shipping
remained off, overrides remained absent, and duties and import-tax collection remained unconfigured.

## Fresh checkout verification

- A live product search reread all three active burner products at 390 SAR each.
- A fresh guest checkout was opened with one 390 SAR burner.
- Synthetic, non-personal Saudi test data was entered only far enough to calculate delivery and
  tax. No real customer information was used.
- Checkout displayed `التوصيل داخل السعودية` as free, no estimated-tax or tax line, and a total of
  390 SAR.
- No card data was entered. The payment button was not submitted. No order, charge, authorization,
  capture, refund, payout, or settlement occurred.

The owner had reported 10 SAR shipping in an earlier open checkout. That amount was not reproduced
in this fresh test, whose free rate is consistent with the documented 320 SAR free-shipping
threshold. The discrepancy was not investigated because shipping was outside this tax stage. No
shipping setting changed.

## Shopify sales-history boundary

- A read-only Shopify analytics query for 2025-08-30 through 2026-08-30 returned zero orders, gross
  sales, discounts, reversals, net sales, shipping charges, taxes, and total sales.
- This proves only that the connected Shopify store recorded no sales in that period. It does not
  include entity-wide taxable supplies outside Shopify or the expected next-12-month test.
- Therefore the zero rate remains a temporary protective configuration based on the owner's
  no-registration statement, not a legal conclusion that registration is unnecessary.

## Unchanged state

- Product price, product taxability flags, shipping rates and thresholds, carriers, and fulfillment.
- Paymob test mode, payment methods, and provider configuration.
- Customer-account rules, checkout language and branding, theme code and favicon.
- Privacy, policies, pixels, Customer Events, products, inventory, Captain, Chatwoot, n8n, Meta,
  customer conversations, and the preserved local storefront prototype.

## Exact next action

Refresh any checkout opened before the save; stale sessions can retain an earlier calculation.
Promptly confirm the entity's taxable supplies outside Shopify for the prior 12 months and its
expected next 12 months. If registration or collection is already required, becomes required, or a
VAT registration takes effect, obtain licensed advice and open a separate activation stage. That
stage must record the registration effective date outside GitHub, configure the correct collection
and invoice treatment, verify a fresh checkout without payment, and stop before the first order for
which VAT collection is required after the effective date if any legal or commercial input remains
unresolved.
