-- Calapres architecture reset — step 3
-- Retire the supplier-derived pricing/SKU rules and install the owner-curated product model.

create sequence if not exists public.calapres_sku_seq start with 100001 increment by 1;

create or replace function public.calapres_prepare_product_variant()
returns trigger language plpgsql set search_path to '' as $function$
begin
  if tg_op = 'UPDATE' and old.calapres_sku is not null then
    new.calapres_sku := old.calapres_sku;
  elsif new.calapres_sku is null then
    new.calapres_sku := 'CAL-P' || nextval('public.calapres_sku_seq')::text;
  end if;

  if tg_op = 'INSERT' and new.calapres_sku like 'CAL-ND-%' then
    raise exception 'CAL-ND SKUs are retired. Nawadir Dior is no longer part of the Calapres architecture.';
  end if;

  if new.compare_at_price is not null and new.selling_price is not null
     and new.compare_at_price <= new.selling_price then
    new.compare_at_price := null;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

alter table public.product_variants rename column supplier_id               to legacy_supplier_id;
alter table public.product_variants rename column supplier_product_uuid     to legacy_supplier_product_uuid;
alter table public.product_variants rename column supplier_product_id       to legacy_supplier_product_id;
alter table public.product_variants rename column supplier_sku              to legacy_supplier_sku;
alter table public.product_variants rename column supplier_price            to legacy_supplier_price;
alter table public.product_variants rename column supplier_original_price   to legacy_supplier_original_price;
alter table public.product_variants rename column supplier_discounted_price to legacy_supplier_discounted_price;
alter table public.product_variants rename column profit_margin_sar         to legacy_profit_margin_sar;
alter table public.product_media         rename column supplier_product_id to legacy_supplier_product_id;
alter table public.shopify_products      rename column supplier_product_id to legacy_supplier_product_id;
alter table public.image_generation_jobs rename column supplier_product_id to legacy_supplier_product_id;
alter table public.generated_assets      rename column supplier_product_id to legacy_supplier_product_id;

alter table public.fragrance_products
  add column if not exists product_type       text,
  add column if not exists authenticity       text default 'original',
  add column if not exists origin             text not null default 'owner_curated',
  add column if not exists lifecycle_status   text not null default 'draft',
  add column if not exists publication_status text not null default 'unpublished',
  add column if not exists ready_for_shopify  boolean not null default false,
  add column if not exists created_by         text,
  add column if not exists approved_by        text,
  add column if not exists approved_at        timestamptz,
  add column if not exists owner_notes        text;

update public.fragrance_products set origin = 'legacy_supplier';

alter table public.fragrance_products
  add constraint fragrance_products_origin_chk     check (origin in ('owner_curated','legacy_supplier')),
  add constraint fragrance_products_lifecycle_chk  check (lifecycle_status in ('draft','review','approved','active','retired')),
  add constraint fragrance_products_publication_chk check (publication_status in ('unpublished','published','held'));

alter table public.product_variants
  add column if not exists cost_price     numeric(12,2),
  add column if not exists pricing_status text not null default 'draft',
  add column if not exists gross_margin   numeric(12,2) generated always as (selling_price - cost_price) stored;

alter table public.product_variants
  add constraint product_variants_pricing_status_chk check (pricing_status in ('draft','approved'));

alter table public.product_variants drop constraint if exists product_variants_availability_status_chk;

update public.product_variants
set availability_status = case availability_status
    when 'in_stock' then 'available'
    when 'out_of_stock' then 'unavailable'
    else 'draft' end;

alter table public.product_variants
  add constraint product_variants_availability_chk
    check (availability_status in ('available','unavailable','preorder','discontinued','draft'));

alter table public.product_media
  add column if not exists image_version       integer not null default 1,
  add column if not exists image_status        text not null default 'pending',
  add column if not exists processing_provider text,
  add column if not exists checksum            text,
  add column if not exists width               integer,
  add column if not exists height              integer,
  add column if not exists approved_by         text,
  add column if not exists approved_at         timestamptz;

alter table public.product_media
  add constraint product_media_status_chk
    check (image_status in ('pending','processing','ready','approved','rejected','archived'));
