-- Product Data Lake: Central Supabase schema
-- Architecture: Supplier → n8n → Supabase → Shopify
--
-- New tables: suppliers, brands, supplier_products, shopify_products,
--             product_media, sync_runs, sync_errors
-- Updated:    creative_briefs, image_generation_jobs, generated_assets
--             (add supabase_product_id FK to link image pipeline → data lake)
--
-- calapres_sku format: CAL-{SUPPLIER_CODE}-P{SUPPLIER_PRODUCT_ID}
--   Example: CAL-ND-P852601829 (Nawadir Dior product 852601829)
--   Rule: auto-assigned by trigger on first INSERT, never changed after that.
--   Shopify variant.sku = calapres_sku.
--   supplier_sku stored separately in supplier.sku metafield for traceability only.

-- ─────────────────────────────────────────────────────────────
-- 1. suppliers
-- One row per supplier. Code is used in calapres_sku prefix.
-- ─────────────────────────────────────────────────────────────
create table public.suppliers (
  id           uuid        primary key default gen_random_uuid(),
  code         text        not null unique,     -- short prefix: ND, AF, …
  name         text        not null,
  base_url     text,
  sitemap_url  text,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now()
);

insert into public.suppliers (code, name, base_url, sitemap_url)
values ('ND', 'Nawadir Dior', 'https://nawadirdior.sa', 'https://nawadirdior.sa/sitemap.xml');

-- ─────────────────────────────────────────────────────────────
-- 2. brands
-- Canonical brand registry. Linked from supplier_products.
-- ─────────────────────────────────────────────────────────────
create table public.brands (
  id          uuid        primary key default gen_random_uuid(),
  name_en     text        not null,
  name_ar     text,
  slug        text        unique,
  created_at  timestamptz not null default now()
);

insert into public.brands (name_en, name_ar, slug) values
  ('Dior',                 'ديور',                     'dior'),
  ('Tom Ford',             'توم فورد',                 'tom-ford'),
  ('Creed',                'كريد',                     'creed'),
  ('Maison Margiela',      'ميسون مارجيلا',            'maison-margiela'),
  ('Nishane',              'نيشان',                    'nishane'),
  ('Xerjoff',              'زيرجوف',                   'xerjoff'),
  ('Van Cleef & Arpels',   'فان كليف أند أربيلس',     'van-cleef-arpels'),
  ('Givenchy',             'جيفنشي',                   'givenchy'),
  ('Jean Paul Gaultier',   'جان بول غولتييه',          'jean-paul-gaultier'),
  ('Maison Crivelli',      'ميسون كريفيلي',            'maison-crivelli'),
  ('Matiere Premiere',     'ماتيير بريمير',            'matiere-premiere'),
  ('Caron',                'كارون',                    'caron'),
  ('Clinique',             'كلينيك',                   'clinique'),
  ('Abdul Samad Al Qurashi','عبد الصمد القرشي',        'abdul-samad-al-qurashi'),
  ('Ajmal',                'أجمل',                     'ajmal'),
  ('Arabian Oud',          'العود العربي',              'arabian-oud');

-- ─────────────────────────────────────────────────────────────
-- 3. supplier_products  ← central product data lake
-- One row per supplier product. This is the source of truth.
-- Shopify, Higgsfield, and all other channels read from here.
-- ─────────────────────────────────────────────────────────────
create table public.supplier_products (

  -- ── Identity ────────────────────────────────────────────────
  id                        uuid        primary key default gen_random_uuid(),
  supplier_id               uuid        not null references public.suppliers(id),
  supplier_product_id       text        not null,    -- numeric ID from /p<id> URL; reliable key
  supplier_sku              text,                    -- supplier's own SKU — preserved, never used as Shopify SKU
  supplier_source_url       text        not null,
  supplier_slug             text,                    -- URL slug; can be stale, not reliable

  -- ── Calapres Identity ───────────────────────────────────────
  calapres_sku              text        unique,      -- CAL-ND-P852601829; set once on INSERT, never changed

  -- ── Shopify Mapping (denormalised for fast lookups) ─────────
  shopify_product_id        text,
  shopify_variant_id        text,
  shopify_handle            text,

  -- ── Content ─────────────────────────────────────────────────
  product_title_ar          text,
  product_title_en          text,
  product_description_ar    text,
  product_description_en    text,

  -- ── Brand ───────────────────────────────────────────────────
  brand_id                  uuid        references public.brands(id),
  brand_name                text,

  -- ── Classification ──────────────────────────────────────────
  category                  text,
  product_type              text,
  gender_target             text,                    -- men / women / unisex
  size_ml                   integer,
  concentration             text,                    -- EDP / EDT / Parfum / Oud / Extrait

  -- ── Fragrance Notes ─────────────────────────────────────────
  notes_top                 text[],
  notes_middle              text[],
  notes_base                text[],

  -- ── Pricing (all SAR) ───────────────────────────────────────
  supplier_price            numeric(10,2),
  supplier_original_price   numeric(10,2),
  supplier_discounted_price numeric(10,2),
  profit_margin_sar         numeric(10,2) not null default 100,   -- change here to change all pricing
  selling_price             numeric(10,2),           -- computed: supplier_price + profit_margin_sar
  compare_at_price          numeric(10,2),           -- supplier_original_price + profit_margin_sar (or null)
  currency                  text        not null default 'SAR',

  -- ── Availability ────────────────────────────────────────────
  availability_status       text        not null default 'unknown',
  -- in_stock / out_of_stock / unknown

  -- ── Sync State ──────────────────────────────────────────────
  shopify_sync_status       text        not null default 'pending',
  -- pending / synced / failed / skipped / enriched_frozen
  is_enriched               boolean     not null default false,   -- true → only price + availability updates

  -- ── Image Pipeline ──────────────────────────────────────────
  image_pipeline_status     text        not null default 'pending',
  -- pending / source_saved / generation_requested / generated /
  -- quality_failed / ready_to_upload / uploaded_to_shopify / failed / skipped

  -- ── SEO ─────────────────────────────────────────────────────
  seo_title_ar              text,
  seo_title_en              text,
  seo_description_ar        text,
  seo_description_en        text,
  seo_keywords              text[],

  -- ── Meta ────────────────────────────────────────────────────
  tags                      text[],
  raw_payload               jsonb,                   -- full supplier response; avoids schema migrations for new fields

  -- ── Timestamps ──────────────────────────────────────────────
  first_seen_at             timestamptz not null default now(),
  last_seen_at              timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (supplier_id, supplier_product_id)
);

-- Auto-generate calapres_sku on INSERT when not supplied.
-- Format: CAL-{SUPPLIER_CODE}-P{SUPPLIER_PRODUCT_ID}
create or replace function public.auto_assign_calapres_sku()
returns trigger language plpgsql as $$
declare
  sup_code text;
begin
  if new.calapres_sku is null then
    select code into sup_code from public.suppliers where id = new.supplier_id;
    new.calapres_sku := 'CAL-' || upper(coalesce(sup_code, 'XX')) || '-P' || new.supplier_product_id;
  end if;
  return new;
end;
$$;

create trigger trg_supplier_products_calapres_sku
  before insert on public.supplier_products
  for each row execute procedure public.auto_assign_calapres_sku();

-- Auto-update updated_at on every UPDATE.
create or replace function public.supplier_products_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_supplier_products_updated_at
  before update on public.supplier_products
  for each row execute procedure public.supplier_products_set_updated_at();

create index supplier_products_source_url_idx
  on public.supplier_products (supplier_source_url);

create index supplier_products_shopify_id_idx
  on public.supplier_products (shopify_product_id)
  where shopify_product_id is not null;

create index supplier_products_sync_status_idx
  on public.supplier_products (shopify_sync_status)
  where shopify_sync_status in ('pending', 'failed');

create index supplier_products_image_status_idx
  on public.supplier_products (image_pipeline_status)
  where image_pipeline_status = 'pending';

-- ─────────────────────────────────────────────────────────────
-- 4. shopify_products
-- Explicit Shopify channel mapping. Separated from product data
-- so adding a second sales channel only needs a new table.
-- ─────────────────────────────────────────────────────────────
create table public.shopify_products (
  id                    uuid        primary key default gen_random_uuid(),
  supplier_product_id   uuid        not null references public.supplier_products(id) on delete cascade,
  shopify_product_id    text        unique,
  shopify_variant_id    text,
  shopify_handle        text,
  last_synced_at        timestamptz,
  sync_status           text        not null default 'pending',
  -- pending / synced / failed / skipped / enriched_frozen
  sync_error            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create or replace function public.shopify_products_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_shopify_products_updated_at
  before update on public.shopify_products
  for each row execute procedure public.shopify_products_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. product_media
-- Original supplier images and Higgsfield-generated images.
-- supplier images are saved here first; never deleted before
-- new images are confirmed uploaded to Shopify.
-- ─────────────────────────────────────────────────────────────
create table public.product_media (
  id                    uuid        primary key default gen_random_uuid(),
  supplier_product_id   uuid        not null references public.supplier_products(id) on delete cascade,
  media_type            text        not null default 'image',     -- image / video
  source                text        not null default 'supplier',  -- supplier / generated / uploaded
  original_url          text,                                     -- supplier CDN URL (saved on first parse)
  shopify_cdn_url       text,                                     -- Shopify CDN after upload
  supabase_storage_path text,                                     -- optional Supabase Storage backup
  alt_text              text,
  position              integer     not null default 1,
  is_primary            boolean     not null default false,
  is_active             boolean     not null default true,
  uploaded_to_shopify   boolean     not null default false,
  created_at            timestamptz not null default now()
);

create index product_media_supplier_product_idx
  on public.product_media (supplier_product_id, source, is_active);

-- ─────────────────────────────────────────────────────────────
-- 6. sync_runs
-- One row per n8n sync execution. Audit trail for pacing,
-- debugging, and offset tracking.
-- ─────────────────────────────────────────────────────────────
create table public.sync_runs (
  id                  uuid        primary key default gen_random_uuid(),
  supplier_id         uuid        references public.suppliers(id),
  triggered_by        text        not null default 'schedule',   -- schedule / manual / webhook
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  status              text        not null default 'running',
  -- running / completed / failed / partial
  products_crawled    integer     not null default 0,
  products_new        integer     not null default 0,
  products_updated    integer     not null default 0,
  products_skipped    integer     not null default 0,
  products_errors     integer     not null default 0,
  chunk_offset        integer     not null default 0,
  notes               text
);

create index sync_runs_supplier_idx
  on public.sync_runs (supplier_id, started_at desc);

-- ─────────────────────────────────────────────────────────────
-- 7. sync_errors
-- Every n8n error logged here for retry and debug.
-- ─────────────────────────────────────────────────────────────
create table public.sync_errors (
  id                    uuid        primary key default gen_random_uuid(),
  sync_run_id           uuid        references public.sync_runs(id) on delete set null,
  supplier_product_id   uuid        references public.supplier_products(id) on delete set null,
  source_url            text,
  error_type            text,
  -- parse_error / price_error / supabase_error / shopify_error / image_error / unknown
  error_message         text,
  raw_payload           jsonb,
  created_at            timestamptz not null default now()
);

create index sync_errors_run_idx
  on public.sync_errors (sync_run_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Link image pipeline tables → supplier_products data lake.
-- Soft FK so image pipeline still works if data lake row is missing.
-- ─────────────────────────────────────────────────────────────
alter table public.creative_briefs
  add column if not exists supabase_product_id uuid
    references public.supplier_products(id) on delete set null;

alter table public.image_generation_jobs
  add column if not exists supabase_product_id uuid
    references public.supplier_products(id) on delete set null;

alter table public.generated_assets
  add column if not exists supabase_product_id uuid
    references public.supplier_products(id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- RLS — service_role (n8n) has full access; admin users read all
-- ─────────────────────────────────────────────────────────────
alter table public.suppliers         enable row level security;
alter table public.brands            enable row level security;
alter table public.supplier_products enable row level security;
alter table public.shopify_products  enable row level security;
alter table public.product_media     enable row level security;
alter table public.sync_runs         enable row level security;
alter table public.sync_errors       enable row level security;

create policy "service_role_all" on public.suppliers
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.brands
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.supplier_products
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.shopify_products
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.product_media
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.sync_runs
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.sync_errors
  for all using (auth.role() = 'service_role');

create policy "admin_read_all" on public.suppliers
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.brands
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.supplier_products
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.shopify_products
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.product_media
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.sync_runs
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.sync_errors
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
