# 0023 — Set Saudi VAT collection to zero pending obligation review

Date: 2026-08-30

Status: accepted and executed as a temporary control; current legal threshold position is unknown

## Context

The owner encountered an estimated-tax line during a live checkout and stated that Calapres has no
Saudi VAT registration. The owner wants the burner sold at its configured product price without a
separate VAT charge. A live inspection found that Saudi Arabia used active Manual Tax with a 15%
country base rate even though tax-inclusive pricing and tax on shipping were off.

Shopify customer tax collection is separate from the Tax ID field used for VAT on Shopify's own
billing. The storefront configuration must reflect the owner's actual registration position, but
Shopify cannot determine whether Calapres is legally required to register.

## Decision

1. Based on the owner's statement that Calapres is not VAT-registered, keep the Saudi Manual Tax
   country base rate at 0% as a temporary protective configuration so checkout does not collect VAT
   before the current obligation and effective date are established.
2. Keep tax-inclusive product and shipping pricing off, keep tax on shipping off, keep the Saudi
   tax-override list empty, and keep duties and import-tax collection unconfigured unless a separate
   verified stage establishes a legal and commercial need.
3. Treat 0% as a technical no-collection configuration. Do not describe Calapres products as
   legally zero-rated, advertise a VAT-inclusive price, issue VAT invoices, or display a VAT
   registration number while the business is not registered.
4. Preserve the live product price and shipping profile. Tax collection must not be implemented by
   silently changing product or shipping prices.
5. Promptly establish Calapres's entity-wide taxable supplies for the prior 12 months and expected
   next 12 months. Reopen this decision immediately if registration or collection is already
   required, becomes required, or a VAT registration becomes effective. Obtain ZATCA or licensed
   Saudi tax advice for the effective collection date, invoices, product-price display, and
   shipping treatment.
6. Do not enter or remove a Tax ID in Shopify Billing during a customer-tax stage. That field
   governs VAT treatment of Shopify's bill to Calapres, not tax charged to Calapres customers.

## Executed record

[Verified live in authenticated Shopify Admin]

- Before the change, Saudi Arabia used active Manual Tax with a 15% country rate.
- Shop-level reads and Admin controls showed tax-inclusive pricing off and tax on shipping off.
- The Saudi tax-override list was empty. Duties and import taxes displayed `Set up`, not an active
  collection state.
- Only the Saudi country base rate was changed from 15% to 0%.
- Shopify displayed a successful-save notice. A full reload reread the Saudi country rate as 0%.

[Verified fresh checkout]

- One active burner was reread at 390 SAR.
- A new guest checkout using synthetic, non-personal Saudi test data showed the applicable
  `التوصيل داخل السعودية` option as free, no estimated-tax or tax line, and a 390 SAR total.
- No payment information was entered, and no order or payment was submitted.
- The owner's earlier open checkout reported 10 SAR shipping. The fresh checkout did not reproduce
  that amount, and this tax stage did not change any shipping rate or condition.

[Verified Shopify sales boundary]

- A read-only Shopify analytics query from 2025-08-30 through 2026-08-30 returned zero orders,
  gross sales, net sales, taxes, and total sales.
- This covers the connected Shopify store only. It does not include entity-wide taxable supplies
  outside Shopify or the expected next-12-month test.

## Compliance boundary

ZATCA currently describes mandatory VAT registration above 375,000 SAR in taxable supplies under
the applicable prior or expected 12-month test and voluntary eligibility above 187,500 SAR in
taxable supplies or expenses, with special rules and exceptions. The owner did not provide
revenue, forecast, or registration evidence in this stage, so this decision does not conclude that
Calapres is legally below the threshold. The configuration implements the owner's explicit
no-registration statement and is temporary pending the current threshold check.

## Unchanged state

- Product prices, variants, inventory, collections, and product taxability flags.
- Shipping zones, rate names, prices, thresholds, carriers, apps, and fulfillment settings.
- Paymob test mode, payment methods, provider credentials, and all payment records.
- Checkout language and branding, the live theme, privacy settings, policies, pixels, Captain,
  Chatwoot, n8n, Meta, customer conversations, and the preserved storefront prototype.

## Rollback and activation trigger

Do not automatically restore 15%. When Calapres receives a VAT registration or verified advice
requires collection, open a separate bounded stage, record the registration effective date without
placing the tax number or certificate in GitHub, configure the correct rate and price-display
treatment, verify shipping and invoices, complete a no-payment checkout calculation, document the
result, and stop before the first order for which VAT collection is required after the effective
date if any business input remains unresolved.
