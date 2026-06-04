-- Calapres product data lake foundation.
--
-- Architecture:
-- Supplier -> n8n -> Supabase -> Shopify
-- Supabase is the source of truth. Shopify is only the sales channel.

create extension if not exists pgcrypto;

create or replace function public.calapres_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  name_ar text,
  base_url text,
  sitemap_url text,
  platform text not null default 'salla',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.calapres_set_updated_at();

insert into public.suppliers (code, name, name_ar, base_url, sitemap_url, platform)
values ('ND', 'nawadirdior', 'نوادر ديور', 'https://nawadirdior.sa', 'https://nawadirdior.sa/sitemap.xml', 'salla')
on conflict (code) do update
set name = excluded.name,
    name_ar = excluded.name_ar,
    base_url = excluded.base_url,
    sitemap_url = excluded.sitemap_url,
    platform = excluded.platform,
    updated_at = now();

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  slug text unique,
  canonical_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_brands_updated_at on public.brands;
create trigger trg_brands_updated_at
  before update on public.brands
  for each row execute function public.calapres_set_updated_at();

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete restrict,
  supplier_name text not null,
  supplier_product_id text not null,
  supplier_sku text,
  supplier_source_url text not null,
  supplier_slug text,
  calapres_sku text unique,
  shopify_product_id text,
  shopify_variant_id text,
  shopify_handle text,
  product_title_ar text,
  product_title_en text,
  product_description_ar text,
  product_description_en text,
  brand_id uuid references public.brands(id) on delete set null,
  brand_name text,
  category text,
  product_type text,
  gender_target text,
  size_ml integer,
  concentration text,
  notes_top text[],
  notes_middle text[],
  notes_base text[],
  supplier_price numeric(10,2),
  supplier_original_price numeric(10,2),
  supplier_discounted_price numeric(10,2),
  profit_margin_sar numeric(10,2) not null default 100,
  selling_price numeric(10,2),
  compare_at_price numeric(10,2),
  currency text not null default 'SAR',
  availability_status text not null default 'unknown',
  shopify_sync_status text not null default 'pending',
  image_pipeline_status text not null default 'pending',
  seo_title_ar text,
  seo_title_en text,
  seo_description_ar text,
  seo_description_en text,
  seo_keywords text[],
  tags text[],
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, supplier_product_id),
  constraint supplier_products_availability_status_chk
    check (availability_status in ('in_stock', 'out_of_stock', 'unknown')),
  constraint supplier_products_shopify_sync_status_chk
    check (shopify_sync_status in ('pending', 'synced', 'failed', 'skipped', 'enriched_frozen')),
  constraint supplier_products_image_pipeline_status_chk
    check (image_pipeline_status in (
      'pending',
      'source_saved',
      'generation_requested',
      'generated',
      'quality_failed',
      'ready_to_upload',
      'uploaded_to_shopify',
      'failed',
      'skipped'
    ))
);

create or replace function public.calapres_prepare_supplier_product()
returns trigger
language plpgsql
as $$
declare
  supplier_code text;
begin
  if new.supplier_id is null then
    select id into new.supplier_id
    from public.suppliers
    where name = new.supplier_name or code = upper(new.supplier_name)
    order by created_at asc
    limit 1;
  end if;

  select code into supplier_code
  from public.suppliers
  where id = new.supplier_id;

  if new.calapres_sku is null and new.supplier_product_id is not null then
    new.calapres_sku := 'CAL-' || upper(coalesce(supplier_code, 'XX')) || '-P' || regexp_replace(new.supplier_product_id, '\D', '', 'g');
  end if;

  if new.profit_margin_sar is null then
    new.profit_margin_sar := 100;
  end if;

  if new.supplier_original_price is not null
     and new.supplier_price is not null
     and new.supplier_original_price > new.supplier_price then
    new.supplier_discounted_price := new.supplier_price;
  elsif new.supplier_discounted_price is null then
    new.supplier_discounted_price := null;
  end if;

  if new.supplier_price is not null then
    new.selling_price := round((new.supplier_price + new.profit_margin_sar)::numeric, 2);
  end if;

  if new.supplier_original_price is not null
     and new.supplier_price is not null
     and new.supplier_original_price > new.supplier_price then
    new.compare_at_price := round((new.supplier_original_price + new.profit_margin_sar)::numeric, 2);
  else
    new.compare_at_price := null;
  end if;

  if new.compare_at_price is not null and new.selling_price is not null and new.compare_at_price = new.selling_price then
    new.compare_at_price := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_supplier_products_prepare on public.supplier_products;
create trigger trg_supplier_products_prepare
  before insert or update on public.supplier_products
  for each row execute function public.calapres_prepare_supplier_product();

create index if not exists supplier_products_supplier_lookup_idx
  on public.supplier_products (supplier_id, supplier_product_id);
create index if not exists supplier_products_source_url_idx
  on public.supplier_products (supplier_source_url);
create index if not exists supplier_products_calapres_sku_idx
  on public.supplier_products (calapres_sku);
create index if not exists supplier_products_shopify_product_idx
  on public.supplier_products (shopify_product_id)
  where shopify_product_id is not null;
create index if not exists supplier_products_shopify_sync_status_idx
  on public.supplier_products (shopify_sync_status, last_seen_at);
create index if not exists supplier_products_image_pipeline_status_idx
  on public.supplier_products (image_pipeline_status, updated_at);

create table if not exists public.shopify_products (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products(id) on delete cascade,
  shopify_product_id text unique,
  shopify_variant_id text,
  shopify_handle text,
  shopify_status text,
  is_enriched boolean not null default false,
  last_synced_at timestamptz,
  sync_status text not null default 'pending',
  sync_error text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_product_id)
);

drop trigger if exists trg_shopify_products_updated_at on public.shopify_products;
create trigger trg_shopify_products_updated_at
  before update on public.shopify_products
  for each row execute function public.calapres_set_updated_at();

create index if not exists shopify_products_supplier_product_idx
  on public.shopify_products (supplier_product_id);
create index if not exists shopify_products_sync_status_idx
  on public.shopify_products (sync_status, updated_at);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products(id) on delete cascade,
  media_type text not null default 'image',
  source text not null default 'supplier',
  original_url text,
  generated_url text,
  shopify_cdn_url text,
  supabase_storage_path text,
  alt_text text,
  position integer not null default 1,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  uploaded_to_shopify boolean not null default false,
  upload_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_media_source_chk check (source in ('supplier', 'higgsfield', 'shopify', 'manual')),
  constraint product_media_upload_status_chk check (upload_status in ('pending', 'ready_to_upload', 'uploaded_to_shopify', 'failed', 'skipped'))
);

drop trigger if exists trg_product_media_updated_at on public.product_media;
create trigger trg_product_media_updated_at
  before update on public.product_media
  for each row execute function public.calapres_set_updated_at();

create index if not exists product_media_supplier_product_idx
  on public.product_media (supplier_product_id, source, is_active);
create index if not exists product_media_upload_status_idx
  on public.product_media (upload_status, updated_at);

create table if not exists public.image_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products(id) on delete cascade,
  product_media_id uuid references public.product_media(id) on delete set null,
  job_type text not null,
  asset_purpose text not null,
  provider text not null default 'higgsfield',
  status text not null default 'pending',
  prompt_used text,
  negative_prompt_used text,
  reference_image_url text,
  higgsfield_request_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  output_images jsonb not null default '[]'::jsonb,
  best_image_url text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  quality_status text not null default 'pending',
  quality_score numeric(5,2),
  quality_checks jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  requested_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint image_generation_jobs_status_chk check (status in ('pending', 'generation_requested', 'generated', 'quality_failed', 'ready_to_upload', 'failed', 'skipped')),
  constraint image_generation_jobs_quality_status_chk check (quality_status in ('pending', 'passed', 'failed', 'needs_review', 'skipped'))
);

drop trigger if exists trg_image_generation_jobs_updated_at on public.image_generation_jobs;
create trigger trg_image_generation_jobs_updated_at
  before update on public.image_generation_jobs
  for each row execute function public.calapres_set_updated_at();

create index if not exists image_generation_jobs_status_idx
  on public.image_generation_jobs (status, retry_count, updated_at);
create index if not exists image_generation_jobs_supplier_product_idx
  on public.image_generation_jobs (supplier_product_id, asset_purpose);

create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products(id) on delete cascade,
  product_media_id uuid references public.product_media(id) on delete set null,
  image_generation_job_id uuid references public.image_generation_jobs(id) on delete set null,
  asset_type text not null,
  provider text not null default 'higgsfield',
  source_url text,
  supabase_storage_path text,
  shopify_media_id text,
  shopify_cdn_url text,
  quality_status text not null default 'pending',
  upload_status text not null default 'pending',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint generated_assets_quality_status_chk check (quality_status in ('pending', 'passed', 'failed', 'needs_review', 'skipped')),
  constraint generated_assets_upload_status_chk check (upload_status in ('pending', 'ready_to_upload', 'uploaded_to_shopify', 'failed', 'skipped'))
);

drop trigger if exists trg_generated_assets_updated_at on public.generated_assets;
create trigger trg_generated_assets_updated_at
  before update on public.generated_assets
  for each row execute function public.calapres_set_updated_at();

create index if not exists generated_assets_supplier_product_idx
  on public.generated_assets (supplier_product_id, asset_type, is_active);
create index if not exists generated_assets_upload_status_idx
  on public.generated_assets (upload_status, updated_at);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  workflow_name text not null default 'nawadir_dior_to_supabase_to_shopify',
  run_type text not null default 'scheduled',
  status text not null default 'running',
  chunk_offset integer not null default 0,
  next_offset integer,
  wrapped boolean not null default false,
  products_crawled integer not null default 0,
  products_upserted integer not null default 0,
  products_created_shopify integer not null default 0,
  products_updated_shopify integer not null default 0,
  products_marked_out_of_stock integer not null default 0,
  products_skipped integer not null default 0,
  products_errors integer not null default 0,
  raw_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_runs_status_chk check (status in ('running', 'completed', 'failed', 'partial'))
);

drop trigger if exists trg_sync_runs_updated_at on public.sync_runs;
create trigger trg_sync_runs_updated_at
  before update on public.sync_runs
  for each row execute function public.calapres_set_updated_at();

create index if not exists sync_runs_supplier_started_idx
  on public.sync_runs (supplier_id, started_at desc);

create table if not exists public.sync_errors (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.sync_runs(id) on delete set null,
  supplier_product_id uuid references public.supplier_products(id) on delete set null,
  source_url text,
  error_type text not null default 'unknown',
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sync_errors_run_idx
  on public.sync_errors (sync_run_id, created_at desc);
create index if not exists sync_errors_source_url_idx
  on public.sync_errors (source_url);

alter table public.suppliers enable row level security;
alter table public.brands enable row level security;
alter table public.supplier_products enable row level security;
alter table public.shopify_products enable row level security;
alter table public.product_media enable row level security;
alter table public.image_generation_jobs enable row level security;
alter table public.generated_assets enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_errors enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.suppliers to service_role;
grant select, insert, update, delete on public.brands to service_role;
grant select, insert, update, delete on public.supplier_products to service_role;
grant select, insert, update, delete on public.shopify_products to service_role;
grant select, insert, update, delete on public.product_media to service_role;
grant select, insert, update, delete on public.image_generation_jobs to service_role;
grant select, insert, update, delete on public.generated_assets to service_role;
grant select, insert, update, delete on public.sync_runs to service_role;
grant select, insert, update, delete on public.sync_errors to service_role;

drop policy if exists service_role_all on public.suppliers;
create policy service_role_all on public.suppliers
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.brands;
create policy service_role_all on public.brands
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.supplier_products;
create policy service_role_all on public.supplier_products
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.shopify_products;
create policy service_role_all on public.shopify_products
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.product_media;
create policy service_role_all on public.product_media
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.image_generation_jobs;
create policy service_role_all on public.image_generation_jobs
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.generated_assets;
create policy service_role_all on public.generated_assets
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.sync_runs;
create policy service_role_all on public.sync_runs
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.sync_errors;
create policy service_role_all on public.sync_errors
  for all to service_role using (true) with check (true);
