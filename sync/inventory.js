/**
 * mapAvailability(availability) maps supplier stock to status fields only.
 * It never emits numeric quantities and never asks Shopify to delete a product.
 *
 * Example:
 * mapAvailability('in stock')
 * // -> { availability: 'in_stock', productStatus: 'active', inventoryPolicy: 'continue', shouldDelete: false, restockWhenSeen: true }
 *
 * Example:
 * mapAvailability('missing')
 * // -> { availability: 'out_of_stock', productStatus: 'draft', inventoryPolicy: 'deny', shouldDelete: false, restockWhenSeen: true }
 */
function mapAvailability(availability) {
  const normalized = normalizeAvailability(availability);
  return {
    availability: normalized,
    productStatus: normalized === 'in_stock' ? 'active' : 'draft',
    inventoryPolicy: normalized === 'in_stock' ? 'continue' : 'deny',
    shouldDelete: false,
    restockWhenSeen: true
  };
}

function normalizeAvailability(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (
    raw === 'in_stock' ||
    raw === 'available' ||
    raw === 'sale' ||
    raw === 'true' ||
    raw.includes('instock') ||
    raw.includes('in stock') ||
    raw.includes('/instock') ||
    raw.includes('product-status="sale"')
  ) {
    return 'in_stock';
  }
  if (Number(raw) > 0) return 'in_stock';
  return 'out_of_stock';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mapAvailability };
}
