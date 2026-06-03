/**
 * applyPricing({ supplierPrice, supplierCompareAtPrice }) applies Calapres markup.
 *
 * Example:
 * applyPricing({ supplierPrice: 805, supplierCompareAtPrice: null })
 * // -> { price: 905, compareAtPrice: null }
 *
 * Example:
 * applyPricing({ supplierPrice: 650, supplierCompareAtPrice: 805 })
 * // -> { price: 750, compareAtPrice: 905 }
 */
function applyPricing(input) {
  const supplierPrice = toMoneyNumber(input && input.supplierPrice);
  const supplierCompareAtPrice = toMoneyNumber(input && input.supplierCompareAtPrice);

  if (supplierPrice === null) {
    return { price: null, compareAtPrice: null };
  }

  const price = roundMoney(supplierPrice + 100);
  let compareAtPrice = supplierCompareAtPrice === null ? null : roundMoney(supplierCompareAtPrice + 100);

  if (compareAtPrice !== null && sameMoney(compareAtPrice, price)) {
    compareAtPrice = null;
  }

  return { price, compareAtPrice };
}

function toMoneyNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function sameMoney(left, right) {
  return roundMoney(left) === roundMoney(right);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyPricing };
}
