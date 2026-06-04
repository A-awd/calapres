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
const config = require('./config.js');

function applyPricing(input, options) {
  const strategy = (options && options.strategy) || config.PRICING_STRATEGY;
  if (strategy === 'custom') return applyCustomPricing(input, options);
  return applyFlatPlusMarkup(input, options);
}

function applyFlatPlusMarkup(input, options) {
  const supplierPrice = toMoneyNumber(input && input.supplierPrice);
  const supplierCompareAtPrice = toMoneyNumber(input && input.supplierCompareAtPrice);
  const markup = toMoneyNumber((options && options.markupSar) || config.MARKUP_SAR);

  if (supplierPrice === null) {
    return { price: null, compareAtPrice: null };
  }

  const price = roundMoney(supplierPrice + markup);
  let compareAtPrice = supplierCompareAtPrice === null ? null : roundMoney(supplierCompareAtPrice + markup);

  if (compareAtPrice !== null && sameMoney(compareAtPrice, price)) {
    compareAtPrice = null;
  }

  return { price, compareAtPrice };
}

function applyCustomPricing(input, options) {
  const table = (options && options.customTable) || {};
  const brand = cleanString(input && input.brand);
  const brandRule = brand && table.brands && table.brands[brand];
  const rangeRule = selectRangeRule(input && input.supplierPrice, table.ranges);
  const markup = toMoneyNumber((brandRule && brandRule.markupSar) || (rangeRule && rangeRule.markupSar) || config.MARKUP_SAR);
  return {
    ...applyFlatPlusMarkup(input, { markupSar: markup }),
    strategy: 'custom',
    rule: brandRule ? 'brand:' + brand : rangeRule ? 'range' : 'default_flat_plus_100'
  };
}

function selectRangeRule(price, ranges) {
  const value = toMoneyNumber(price);
  if (value === null) return null;
  for (const rule of ranges || []) {
    const min = rule.min === undefined ? -Infinity : Number(rule.min);
    const max = rule.max === undefined ? Infinity : Number(rule.max);
    if (value >= min && value <= max) return rule;
  }
  return null;
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

function cleanString(value) {
  return String(value || '').trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyPricing, applyFlatPlusMarkup, applyCustomPricing };
}
