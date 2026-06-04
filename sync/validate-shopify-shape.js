/**
 * Validates the Shopify REST Admin product shape emitted by the sync.
 *
 * The sync writes REST product payloads, so this guard deliberately uses REST
 * field names such as body_html, compare_at_price, and inventory_policy.
 */
const PRODUCT_FIELDS = {
  id: true,
  title: true,
  body_html: true,
  vendor: true,
  tags: true,
  status: true,
  images: true,
  metafields: true,
  variants: true
};

const VARIANT_FIELDS = {
  id: true,
  price: true,
  compare_at_price: true,
  inventory_policy: true
};

const IMAGE_FIELDS = {
  src: true
};

const METAFIELD_FIELDS = {
  namespace: true,
  key: true,
  value: true,
  type: true
};

const FORBIDDEN_FIELDS = {
  inventory_quantity: 'The sync is status-only and must never write numeric inventory.',
  inventoryQuantity: 'Use REST inventory_policy only; inventoryQuantity is not a REST Product field.',
  shouldDelete: 'Supplier-missing products are drafted, never deleted.',
  delete: 'Supplier-missing products are drafted, never deleted.',
  destroy: 'Supplier-missing products are drafted, never deleted.',
  deleted_at: 'Supplier-missing products are drafted, never deleted.',
  customer: 'Product sync payloads must never contain customer data.',
  customer_id: 'Product sync payloads must never contain customer data.',
  customerEmail: 'Product sync payloads must never contain customer data.',
  email: 'Product sync payloads must never contain email addresses.',
  access_token: 'Secrets must never be present in Shopify payloads.',
  api_key: 'Secrets must never be present in Shopify payloads.',
  password: 'Secrets must never be present in Shopify payloads.',
  bodyHtml: 'REST Admin product payloads use body_html.',
  compareAtPrice: 'REST Admin variants use compare_at_price.',
  inventoryPolicy: 'REST Admin variants use inventory_policy.'
};

function validateShopifyProductShape(value, options) {
  const config = options && typeof options === 'object' ? options : {};
  const product = value && value.product ? value.product : value;
  const errors = [];
  const warnings = [];
  const fields = [];

  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    errors.push('Product payload must be an object or { product: object }.');
    return { valid: false, errors, warnings, fields };
  }

  validateKeys(product, PRODUCT_FIELDS, 'product', errors, fields);
  validateForbidden(product, 'product', errors);
  validateSecretValues(product, 'product', errors);
  validateStatus(product.status, errors);

  if (Array.isArray(product.variants)) {
    product.variants.forEach((variant, index) => {
      validateKeys(variant, VARIANT_FIELDS, 'product.variants[' + index + ']', errors, fields);
      validateForbidden(variant, 'product.variants[' + index + ']', errors);
      validateSecretValues(variant, 'product.variants[' + index + ']', errors);
      validateInventoryPolicy(variant.inventory_policy, errors, 'product.variants[' + index + '].inventory_policy');
    });
  } else if (product.variants !== undefined) {
    errors.push('product.variants must be an array when present.');
  }

  if (Array.isArray(product.images)) {
    product.images.forEach((image, index) => {
      validateKeys(image, IMAGE_FIELDS, 'product.images[' + index + ']', errors, fields);
      validateForbidden(image, 'product.images[' + index + ']', errors);
      validateSecretValues(image, 'product.images[' + index + ']', errors);
    });
  } else if (product.images !== undefined) {
    errors.push('product.images must be an array when present.');
  }

  if (Array.isArray(product.metafields)) {
    product.metafields.forEach((metafield, index) => {
      validateKeys(metafield, METAFIELD_FIELDS, 'product.metafields[' + index + ']', errors, fields);
      validateForbidden(metafield, 'product.metafields[' + index + ']', errors);
      validateSecretValues(metafield, 'product.metafields[' + index + ']', errors);
      validateMetafield(metafield, errors, warnings, index);
    });
  } else if (product.metafields !== undefined) {
    errors.push('product.metafields must be an array when present.');
  }

  if (config.mode === 'price_availability_only') {
    const allowed = { id: true, status: true, variants: true };
    for (const key of Object.keys(product)) {
      if (!allowed[key]) errors.push('price_availability_only payload must not write product.' + key);
    }
    if (!Array.isArray(product.variants) || product.variants.length !== 1) {
      errors.push('price_availability_only payload must write exactly one variant.');
    } else {
      const allowedVariant = { id: true, price: true, compare_at_price: true, inventory_policy: true };
      for (const key of Object.keys(product.variants[0])) {
        if (!allowedVariant[key]) errors.push('price_availability_only payload must not write variant.' + key);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, fields };
}

function assertValidShopifyProductShape(value, options) {
  const result = validateShopifyProductShape(value, options);
  if (!result.valid) {
    throw new Error('Invalid Shopify product shape: ' + result.errors.join('; '));
  }
  return result;
}

function validateKeys(object, allowed, path, errors, fields) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    errors.push(path + ' must be an object.');
    return;
  }
  for (const key of Object.keys(object)) {
    fields.push(path + '.' + key);
    if (!allowed[key]) errors.push(path + '.' + key + ' is not a sync-approved Shopify REST Admin field.');
  }
}

function validateForbidden(object, path, errors) {
  for (const key of Object.keys(object || {})) {
    if (FORBIDDEN_FIELDS[key]) errors.push(path + '.' + key + ': ' + FORBIDDEN_FIELDS[key]);
    const value = object[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) value.forEach((item, index) => validateForbidden(item, path + '.' + key + '[' + index + ']', errors));
      else validateForbidden(value, path + '.' + key, errors);
    }
  }
}

function validateSecretValues(object, path, errors) {
  for (const key of Object.keys(object || {})) {
    const value = object[key];
    const nextPath = path + '.' + key;
    if (typeof value === 'string' && /(shpat_|shpss_|bearer\s+[a-z0-9._-]+|api[-_ ]?key|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(value)) {
      errors.push(nextPath + ' looks like a secret or direct personal contact value.');
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value)) value.forEach((item, index) => validateSecretValues(item, nextPath + '[' + index + ']', errors));
      else validateSecretValues(value, nextPath, errors);
    }
  }
}

function validateStatus(status, errors) {
  if (status === undefined) return;
  if (!{ active: true, draft: true, archived: true }[String(status).toLowerCase()]) {
    errors.push('product.status must be active, draft, or archived.');
  }
}

function validateInventoryPolicy(value, errors, path) {
  if (value === undefined) return;
  if (!{ continue: true, deny: true }[String(value).toLowerCase()]) {
    errors.push(path + ' must be continue or deny.');
  }
}

function validateMetafield(metafield, errors, warnings, index) {
  if (!metafield || typeof metafield !== 'object') return;
  if (!metafield.namespace) errors.push('product.metafields[' + index + '].namespace is required.');
  if (!metafield.key) errors.push('product.metafields[' + index + '].key is required.');
  if (metafield.value === undefined || metafield.value === null) errors.push('product.metafields[' + index + '].value is required.');
  if (!metafield.type) warnings.push('product.metafields[' + index + '].type is recommended for REST metafield writes.');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateShopifyProductShape,
    assertValidShopifyProductShape
  };
}
