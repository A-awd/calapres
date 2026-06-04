const SHOP_DOMAIN = 'unywbe-ub.myshopify.com';
const API_VERSION_STANDARD = '2026-04';
const API_VERSION_DEPLOYED = '2025-01';
const MARKUP_SAR = 100;
const CHUNK_SIZE = 300;
const REQUEST_DELAY_SECONDS = 1;
const SUPPLIER_SITEMAP = 'https://nawadirdior.sa/sitemap.xml';
const SUPPLIER_NAME = 'nawadirdior';
const PRICING_STRATEGY = 'flat_plus_100';
const HIGGSFIELD_IMAGE_MODEL = 'higgsfield-soul';
const SUPABASE_PROJECT_REF = 'pbiiqlpgchrcgagemclt';

const TAGS = {
  imported: 'imported-nader-dior',
  importedArabic: 'مستورد-نوادر-ديور',
  supplier: 'supplier:nawadirdior',
  idPrefix: 'supplier-id-p',
  enriched: 'enriched',
  aiImage: 'ai-image',           // product has Higgsfield-generated images
  aiImagePending: 'ai-image-pending',  // in creative_briefs queue
  adReady: 'ad-ready'            // ad creatives generated and stored
};

const NAMESPACES = {
  supplier: 'supplier',
  seo: 'global',
  presentation: 'presentation'
};

const METAFIELDS = {
  sourceUrl: 'source_url',
  productId: 'product_id',
  supplierSku: 'sku',            // supplier's own SKU — stored for traceability, not used as Shopify SKU
  seoTitle: 'title_tag',
  seoDescription: 'description_tag',
  enrichedBy: 'enriched_by'
};

// Supabase project reference. Never paste the actual service key here.
const SUPABASE_URL = 'https://pbiiqlpgchrcgagemclt.supabase.co';
const SUPABASE_REST = SUPABASE_URL + '/rest/v1';

// Supplier codes — used as the middle segment of calapres_sku.
const SUPPLIER_CODES = {
  nawadirdior: 'ND'  // CAL-ND-P<id>
};

const CREDENTIALS = {
  shopifyOAuth2: {
    id: 'QLsvwO73GFsQfy0w',
    name: 'Shopify-Calapres'
  },
  higgsfieldHeaderAuth: {
    id: 'G31rYKMmDk8hyh2G',
    name: 'Higgsfield API ( awd-n8n )'
  },
  supabaseServiceRole: {
    id: null,
    name: 'Supabase Calapres Service Role'
  }
};

const COLLECTION_MAP = {
  defaultHandles: ['niche-international'],
  concentration: {
    oud: ['eastern-oud-incense'],
    bukhoor: ['eastern-oud-incense'],
    incense: ['eastern-oud-incense']
  },
  brands: {
    'Abdul Samad Al Qurashi': ['eastern-oud-incense'],
    'Ajmal': ['eastern-oud-incense'],
    'Arabian Oud': ['eastern-oud-incense'],
    'Caron': ['luxury-brands'],
    'Clinique': ['luxury-brands'],
    'Dior': ['luxury-brands'],
    'Givenchy': ['luxury-brands'],
    'Jean Paul Gaultier': ['luxury-brands'],
    'Maison Crivelli': ['niche-international', 'luxury-brands'],
    'Matiere Premiere': ['niche-international', 'luxury-brands'],
    'Nishane': ['niche-international'],
    'Tom Ford': ['luxury-brands'],
    'Van Cleef & Arpels': ['luxury-brands'],
    'Xerjoff': ['niche-international', 'luxury-brands']
  },
  gender: {
    men: ['men-perfumes'],
    women: ['women-perfumes'],
    unisex: ['unisex-perfumes']
  }
};

const IMPORTED_PRODUCTS_SEARCH_QUERY = 'tag:' + TAGS.imported + ' OR tag:' + TAGS.importedArabic;

const DEFAULTS = {
  shopDomain: SHOP_DOMAIN,
  apiVersion: API_VERSION_STANDARD,
  deployedApiVersion: API_VERSION_DEPLOYED,
  supplierSitemap: SUPPLIER_SITEMAP,
  supplierName: SUPPLIER_NAME,
  chunkSize: CHUNK_SIZE,
  requestDelaySeconds: REQUEST_DELAY_SECONDS,
  pricingStrategy: PRICING_STRATEGY
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHOP_DOMAIN,
    API_VERSION_STANDARD,
    API_VERSION_DEPLOYED,
    MARKUP_SAR,
    CHUNK_SIZE,
    REQUEST_DELAY_SECONDS,
    TAGS,
    NAMESPACES,
    METAFIELDS,
    SUPPLIER_SITEMAP,
    SUPPLIER_NAME,
    COLLECTION_MAP,
    PRICING_STRATEGY,
    HIGGSFIELD_IMAGE_MODEL,
    CREDENTIALS,
    IMPORTED_PRODUCTS_SEARCH_QUERY,
    DEFAULTS,
    SUPABASE_PROJECT_REF,
    SUPABASE_URL,
    SUPABASE_REST,
    SUPPLIER_CODES
  };
}
