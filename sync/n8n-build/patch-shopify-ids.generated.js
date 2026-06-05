// Code: Extract Shopify IDs (update / create)
// Runs after Shopify REST write. Reads the returned product object and
// forwards shopify_product_id, shopify_variant_id, shopify_handle, and
// supabaseProductId to the Supabase PATCH node.
const shopifyProduct = ($json.product || {});
const variantId = shopifyProduct.variants && shopifyProduct.variants[0]
  ? shopifyProduct.variants[0].id : null;
const supabaseProductId = $('Extract Supabase Context').item.json.supabaseProductId;
return {
  json: {
    supabaseProductId,
    shopify_product_id: String(shopifyProduct.id || ''),
    shopify_variant_id: String(variantId || ''),
    shopify_handle: shopifyProduct.handle || ''
  }
};
