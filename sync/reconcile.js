/**
 * Pure action planner for the recurring Calapres supplier sync.
 *
 * reconcile(supplierProducts, shopifyProducts) returns the five operational
 * buckets n8n needs: create, update, mark out of stock, skip enriched, unchanged.
 */
const CANONICAL_IMPORTED_TAG = 'imported-nader-dior';
const ARABIC_IMPORTED_TAG = 'مستورد-نوادر-ديور';
const IMPORTED_TAGS = [CANONICAL_IMPORTED_TAG, ARABIC_IMPORTED_TAG];

function reconcile(supplierProducts, shopifyProducts) {
  const plan = {
    toCreate: [],
    toUpdate: [],
    toMarkOutOfStock: [],
    toSkipEnriched: [],
    unchanged: []
  };
  const supplierIndex = indexSupplierProducts(supplierProducts, plan);
  const shopifyIndex = indexShopifyProducts(shopifyProducts);
  const matchedShopifyKeys = {};

  for (const key of Object.keys(supplierIndex)) {
    const supplier = supplierIndex[key];
    if (!isImportableSupplierProduct(supplier)) {
      plan.unchanged.push(action('invalid_supplier_product', supplier, null, { supplierKey: key }));
      continue;
    }

    const existing = shopifyIndex.bySourceUrl[supplier.sourceUrl] || shopifyIndex.bySupplierId[supplier.supplierId];
    if (!existing) {
      plan.toCreate.push(action('create_new_imported_product', supplier, null));
      continue;
    }

    matchedShopifyKeys[existing.matchKey] = true;
    const desired = desiredState(supplier);
    const current = currentState(existing);
    const enriched = hasTag(existing.tags, 'enriched');
    const changes = diffState(desired, current, enriched);

    if (enriched) {
      if (changes.priceAvailabilityChanged) {
        plan.toUpdate.push(
          action('enriched_price_availability_update', supplier, existing, {
            updateMode: 'price_availability_only',
            changes: changes.fields
          })
        );
      } else {
        plan.toSkipEnriched.push(
          action('enriched_presentation_guard', supplier, existing, {
            updateMode: 'skip_presentation',
            changes: changes.fields
          })
        );
      }
      continue;
    }

    if (changes.anyChanged) {
      plan.toUpdate.push(
        action('update_imported_product', supplier, existing, {
          updateMode: 'full_product',
          changes: changes.fields
        })
      );
    } else {
      plan.unchanged.push(action('already_current', supplier, existing));
    }
  }

  for (const product of shopifyIndex.products) {
    if (matchedShopifyKeys[product.matchKey]) continue;
    if (!isImportedProduct(product)) continue;
    const stock = currentState(product);
    if (stock.status === 'draft' && stock.inventoryPolicy === 'deny') {
      plan.unchanged.push(action('already_out_of_stock_missing_supplier', null, product));
    } else {
      plan.toMarkOutOfStock.push(
        action('missing_from_supplier', null, product, {
          updateMode: 'price_availability_only'
        })
      );
    }
  }

  return plan;
}

function indexSupplierProducts(products, plan) {
  const index = {};
  const seen = {};
  for (const raw of products || []) {
    const supplier = normalizeSupplierProduct(raw);
    const key = supplier.supplierId || supplier.sourceUrl || 'invalid:' + Object.keys(seen).length;
    if (seen[key]) {
      plan.unchanged.push(
        action('duplicate_supplier_id', supplier, null, {
          duplicateOf: seen[key].sourceUrl || seen[key].supplierId
        })
      );
      continue;
    }
    seen[key] = supplier;
    index[key] = supplier;
  }
  return index;
}

function indexShopifyProducts(products) {
  const bySourceUrl = {};
  const bySupplierId = {};
  const normalized = [];
  for (const raw of products || []) {
    const product = normalizeShopifyProduct(raw);
    product.matchKey = product.sourceUrl || product.supplierId || product.id || 'shopify:' + normalized.length;
    normalized.push(product);
    if (product.sourceUrl) bySourceUrl[product.sourceUrl] = product;
    if (product.supplierId) bySupplierId[product.supplierId] = product;
  }
  return { products: normalized, bySourceUrl, bySupplierId };
}

function normalizeSupplierProduct(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const sourceUrl = cleanString(item.sourceUrl);
  return {
    ...item,
    sourceUrl,
    supplierId: cleanString(item.supplierId || productIdFromUrl(sourceUrl)),
    name: cleanString(item.name),
    brand: cleanString(item.brand),
    category: cleanString(item.category),
    supplierPrice: toMoneyNumber(item.supplierPrice),
    supplierCompareAtPrice: toMoneyNumber(item.supplierCompareAtPrice),
    availability: normalizeAvailability(item.availability)
  };
}

function normalizeShopifyProduct(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const tags = normalizeTags(item.tags);
  const sourceUrl = cleanString(item.sourceUrl || readMetafield(item, 'supplier', 'source_url'));
  const supplierId = normalizeSupplierProductId(
    item.supplierId || readMetafield(item, 'supplier', 'product_id') || supplierIdFromTags(tags) || productIdFromUrl(sourceUrl)
  );
  const firstVariant = readFirstVariant(item);
  return {
    ...item,
    id: cleanString(item.id),
    title: cleanString(item.title),
    vendor: cleanString(item.vendor),
    tags,
    sourceUrl,
    supplierId,
    status: normalizeStatus(item.status),
    variantId: cleanString(item.variantId || firstVariant.id),
    price: toMoneyNumber(item.price !== undefined ? item.price : firstVariant.price),
    compareAtPrice: toMoneyNumber(item.compareAtPrice !== undefined ? item.compareAtPrice : firstVariant.compare_at_price),
    inventoryPolicy: normalizeInventoryPolicy(item.inventoryPolicy || firstVariant.inventory_policy),
    variants: item.variants
  };
}

function isImportableSupplierProduct(product) {
  return Boolean(product && product.sourceUrl && product.supplierId && product.supplierPrice !== null && product.availability !== 'missing');
}

function desiredState(supplier) {
  const price = supplier.supplierPrice === null ? null : roundMoney(supplier.supplierPrice + 100);
  let compareAtPrice =
    supplier.supplierCompareAtPrice === null ? null : roundMoney(supplier.supplierCompareAtPrice + 100);
  if (compareAtPrice !== null && sameMoney(compareAtPrice, price)) compareAtPrice = null;
  const inStock = supplier.availability === 'in_stock';
  return {
    title: cleanString(supplier.name),
    vendor: cleanString(supplier.brand) || 'Nawadirdior',
    sourceUrl: supplier.sourceUrl,
    supplierId: supplier.supplierId,
    status: inStock ? 'active' : 'draft',
    price,
    compareAtPrice,
    inventoryPolicy: inStock ? 'continue' : 'deny',
    tags: [
      CANONICAL_IMPORTED_TAG,
      'supplier:nawadirdior',
      supplier.supplierId ? 'supplier-id-p' + supplier.supplierId : ''
    ].filter(Boolean)
  };
}

function currentState(product) {
  return {
    title: cleanString(product.title),
    vendor: cleanString(product.vendor),
    sourceUrl: cleanString(product.sourceUrl),
    supplierId: cleanString(product.supplierId),
    status: normalizeStatus(product.status),
    price: toMoneyNumber(product.price),
    compareAtPrice: toMoneyNumber(product.compareAtPrice),
    inventoryPolicy: normalizeInventoryPolicy(product.inventoryPolicy),
    tags: normalizeTags(product.tags)
  };
}

function diffState(desired, current, enriched) {
  const fields = [];
  addChange(fields, 'price', current.price, desired.price, moneyEqual);
  addChange(fields, 'compareAtPrice', current.compareAtPrice, desired.compareAtPrice, moneyEqual);
  addChange(fields, 'status', current.status, desired.status);
  addChange(fields, 'inventoryPolicy', current.inventoryPolicy, desired.inventoryPolicy);
  const priceAvailabilityChanged = fields.length > 0;

  if (!enriched) {
    addChange(fields, 'title', current.title, desired.title);
    addChange(fields, 'vendor', current.vendor, desired.vendor);
    if (!containsAllTags(current.tags, desired.tags)) {
      fields.push({ field: 'tags', current: current.tags, desired: desired.tags });
    }
    addChange(fields, 'sourceUrl', current.sourceUrl, desired.sourceUrl);
    addChange(fields, 'supplierId', current.supplierId, desired.supplierId);
  }

  return {
    fields,
    priceAvailabilityChanged,
    anyChanged: fields.length > 0
  };
}

function action(reason, supplierProduct, shopifyProduct, extra) {
  return {
    reason,
    supplierProduct: supplierProduct || null,
    shopifyProduct: shopifyProduct || null,
    ...(extra || {})
  };
}

function addChange(fields, field, current, desired, comparator) {
  const same = comparator ? comparator(current, desired) : current === desired;
  if (!same) fields.push({ field, current, desired });
}

function containsAllTags(current, desired) {
  const currentSet = {};
  for (const tag of normalizeTags(current)) currentSet[tag.toLowerCase()] = true;
  return normalizeTags(desired).every((tag) => currentSet[tag.toLowerCase()]);
}

function isImportedProduct(product) {
  return IMPORTED_TAGS.some((tag) => hasTag(product && product.tags, tag));
}

function hasTag(tags, target) {
  const key = String(target || '').toLowerCase();
  return normalizeTags(tags).some((tag) => tag.toLowerCase() === key);
}

function readMetafield(product, namespace, key) {
  const metafields = Array.isArray(product.metafields) ? product.metafields : [];
  const found = metafields.find((field) => field && field.namespace === namespace && field.key === key);
  return found && found.value !== undefined && found.value !== null ? String(found.value) : '';
}

function readFirstVariant(product) {
  if (product && Array.isArray(product.variants) && product.variants[0]) return product.variants[0];
  return {};
}

function supplierIdFromTags(tags) {
  for (const tag of normalizeTags(tags)) {
    const match = tag.match(/^supplier-id-p(\d+)$/i);
    if (match) return match[1];
  }
  return '';
}

function productIdFromUrl(value) {
  const match = String(value || '').match(/\/p(\d+)(?=$|[/?#])/i);
  return match ? match[1] : '';
}

function normalizeSupplierProductId(value) {
  return String(value || '').replace(/^p/i, '').replace(/\D/g, '');
}

function normalizeAvailability(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'missing' || raw === 'not_found' || raw === 'not found') return 'missing';
  if (
    raw === 'in_stock' ||
    raw === 'available' ||
    raw === 'sale' ||
    raw === 'true' ||
    raw.includes('instock') ||
    raw.includes('in stock') ||
    raw.includes('/instock') ||
    Number(raw) > 0
  ) {
    return 'in_stock';
  }
  return 'out_of_stock';
}

function normalizeStatus(value) {
  const raw = cleanString(value).toLowerCase();
  if (raw === 'active' || raw === 'draft' || raw === 'archived') return raw;
  return raw || 'draft';
}

function normalizeInventoryPolicy(value) {
  const raw = cleanString(value).toLowerCase();
  if (raw === 'continue' || raw === 'deny') return raw;
  return raw || 'deny';
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toMoneyNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? roundMoney(number) : null;
}

function moneyEqual(left, right) {
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  return sameMoney(left, right);
}

function sameMoney(left, right) {
  return roundMoney(left) === roundMoney(right);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function cleanString(value) {
  return String(value || '').trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CANONICAL_IMPORTED_TAG,
    ARABIC_IMPORTED_TAG,
    IMPORTED_TAGS,
    reconcile,
    desiredState,
    normalizeSupplierProduct,
    normalizeShopifyProduct,
    isImportedProduct,
    normalizeSupplierProductId,
    productIdFromUrl,
    supplierIdFromTags
  };
}
