-- Calapres luxury fragrance parent + variant model.
--
-- Architecture (unchanged):
-- Supplier -> n8n -> Supabase -> Shopify
-- Supabase is the source of truth. Shopify is only the sales channel.
--
-- This migration is ADDITIVE and SAFE:
-- - It never drops or deletes existing tables, columns, or rows.
-- - supplier_products remains the raw supplier landing table (raw data preserved).
-- - fragrance_products is the canonical PARENT (one row per fragrance).
-- - product_variants are the CHILDREN (sizes / testers / gift sets).
-- - Aramis Classic EDT = parent; 50ml / 100ml / 110ml / tester = variants.
-- - A new size of an already-known fragrance becomes a new VARIANT, never a
--   duplicate parent, when brand + normalized fragrance name match with high
--   confidence. Low-confidence matches are flagged for review, never merged.

create extension if not exists pgcrypto;

-- Shared updated_at helper (idempotent; same definition as the data lake migration).
create or replace function public.calapres_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- fragrance_products: canonical PARENT product (one per fragrance)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.fragrance_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  brand_name text,
  canonical_name_ar text,
  canonical_name_en text,
  normalized_name text not null,
  gender_target text,
  concentration text,
  fragrance_family_primary text,
  fragrance_family_secondary text,
  accords text[],
  notes_top text[],
  notes_middle text[],
  notes_base text[],
  longevity_rating numeric(3,1),
  sillage_rating numeric(3,1),
  season_best_for text[],
  occasion_best_for text[],
  style_keywords text[],
  luxury_description_ar text,
  luxury_description_en text,
  seo_title_ar text,
  seo_title_en text,
  seo_description_ar text,
  seo_description_en text,
  seo_keywords text[],
  enrichment_status text not null default 'pending',
  enrichment_source text,
  enrichment_source_url text,
  confidence_score numeric(4,3) not null default 0,
  verified boolean not null default false,
  raw_enrichment_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fragrance_products_enrichment_status_chk
    check (enrichment_status in ('pending', 'in_progress', 'enriched', 'partial', 'needs_review', 'verified', 'skipped')),
  constraint fragrance_products_confidence_chk
    check (confidence_score >= 0 and confidence_score <= 1)
);

drop trigger if exists trg_fragrance_products_updated_at on public.fragrance_products;
create trigger trg_fragrance_products_updated_at
  before update on public.fragrance_products
  for each row execute function public.calapres_set_updated_at();

-- Parent dedup backstop: one fragrance per (brand, normalized name, concentration).
-- COALESCE keeps the index deterministic when concentration is unknown. brand_id
-- NULL rows remain distinct here; code-side matching (sync/match-fragrance.js)
-- flags those low-confidence cases for review instead of merging blindly.
create unique index if not exists fragrance_products_identity_idx
  on public.fragrance_products (brand_id, normalized_name, coalesce(concentration, ''));
create index if not exists fragrance_products_normalized_name_idx
  on public.fragrance_products (normalized_name);
create index if not exists fragrance_products_enrichment_status_idx
  on public.fragrance_products (enrichment_status, updated_at);
create index if not exists fragrance_products_brand_idx
  on public.fragrance_products (brand_id);

-- ───────────────────────────────────────────────────────────────────────────
-- product_variants: CHILD variant (size / tester / gift set) of a fragrance
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  fragrance_product_id uuid not null references public.fragrance_products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  -- Link back to the raw supplier landing row (raw data is preserved there).
  supplier_product_uuid uuid references public.supplier_products(id) on delete set null,
  -- Supplier's own numeric product id (the reliable /p<id> key), stored as text.
  supplier_product_id text,
  -- Supplier's own SKU, kept separately for traceability only.
  supplier_sku text,
  -- Calapres permanent SKU and the ONLY value used as the Shopify variant sku.
  calapres_sku text unique,
  size_ml integer,
  size_label text,
  variant_title text,
  is_tester boolean not null default false,
  is_gift_set boolean not null default false,
  supplier_price numeric(10,2),
  supplier_original_price numeric(10,2),
  supplier_discounted_price numeric(10,2),
  profit_margin_sar numeric(10,2) not null default 100,
  selling_price numeric(10,2),
  compare_at_price numeric(10,2),
  currency text not null default 'SAR',
  availability_status text not null default 'unknown',
  shopify_product_id text,
  shopify_variant_id text,
  shopify_sync_status text not null default 'pending',
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, supplier_product_id),
  constraint product_variants_availability_status_chk
    check (availability_status in ('in_stock', 'out_of_stock', 'unknown')),
  constraint product_variants_shopify_sync_status_chk
    check (shopify_sync_status in ('pending', 'synced', 'failed', 'skipped', 'enriched_frozen'))
);

-- Variant pricing + SKU trigger. Mirrors the supplier_products business rules:
-- profit_margin_sar defaults to 100; selling_price = supplier price + margin;
-- discounted -> compare_at_price = original + margin; compare_at never equals
-- selling_price (null it instead); calapres_sku = CAL-<CODE>-P<numeric id>, set
-- once and never recomputed if already present.
create or replace function public.calapres_prepare_product_variant()
returns trigger
language plpgsql
as $$
declare
  supplier_code text;
begin
  if new.profit_margin_sar is null then
    new.profit_margin_sar := 100;
  end if;

  if new.calapres_sku is null and new.supplier_product_id is not null then
    select code into supplier_code
    from public.suppliers
    where id = new.supplier_id;
    new.calapres_sku := 'CAL-' || upper(coalesce(supplier_code, 'XX')) || '-P' || regexp_replace(new.supplier_product_id, '\D', '', 'g');
  end if;

  if new.supplier_original_price is not null
     and new.supplier_price is not null
     and new.supplier_original_price > new.supplier_price then
    new.supplier_discounted_price := new.supplier_price;
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

drop trigger if exists trg_product_variants_prepare on public.product_variants;
create trigger trg_product_variants_prepare
  before insert or update on public.product_variants
  for each row execute function public.calapres_prepare_product_variant();

create index if not exists product_variants_fragrance_idx
  on public.product_variants (fragrance_product_id);
create index if not exists product_variants_supplier_lookup_idx
  on public.product_variants (supplier_id, supplier_product_id);
create index if not exists product_variants_calapres_sku_idx
  on public.product_variants (calapres_sku);
create index if not exists product_variants_supplier_product_uuid_idx
  on public.product_variants (supplier_product_uuid);
create index if not exists product_variants_shopify_sync_status_idx
  on public.product_variants (shopify_sync_status, last_seen_at);

-- ───────────────────────────────────────────────────────────────────────────
-- supplier_products: ADD links to the resolved parent/variant (raw data stays).
-- ───────────────────────────────────────────────────────────────────────────
alter table public.supplier_products
  add column if not exists fragrance_product_id uuid references public.fragrance_products(id) on delete set null;
alter table public.supplier_products
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
alter table public.supplier_products
  add column if not exists match_status text not null default 'pending';
alter table public.supplier_products
  add column if not exists match_confidence numeric(4,3);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplier_products_match_status_chk'
  ) then
    alter table public.supplier_products
      add constraint supplier_products_match_status_chk
      check (match_status in ('pending', 'matched_variant', 'created_fragrance', 'needs_review', 'unmatched'));
  end if;
end;
$$;

create index if not exists supplier_products_fragrance_idx
  on public.supplier_products (fragrance_product_id);
create index if not exists supplier_products_product_variant_idx
  on public.supplier_products (product_variant_id);
create index if not exists supplier_products_match_status_idx
  on public.supplier_products (match_status, updated_at);

-- ───────────────────────────────────────────────────────────────────────────
-- RLS + service-role grants (same posture as the data lake migration).
-- ───────────────────────────────────────────────────────────────────────────
alter table public.fragrance_products enable row level security;
alter table public.product_variants enable row level security;

grant select, insert, update, delete on public.fragrance_products to service_role;
grant select, insert, update, delete on public.product_variants to service_role;

drop policy if exists service_role_all on public.fragrance_products;
create policy service_role_all on public.fragrance_products
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.product_variants;
create policy service_role_all on public.product_variants
  for all to service_role using (true) with check (true);

-- Security hardening: pin search_path on the trigger functions (they fully
-- qualify public.suppliers and use only pg_catalog builtins). Clears the
-- function_search_path_mutable advisor for all Calapres trigger functions.
alter function public.calapres_set_updated_at() set search_path = '';
alter function public.calapres_prepare_product_variant() set search_path = '';
do $$
begin
  if exists (select 1 from pg_proc where proname = 'calapres_prepare_supplier_product') then
    execute 'alter function public.calapres_prepare_supplier_product() set search_path = ''''';
  end if;
end;
$$;
