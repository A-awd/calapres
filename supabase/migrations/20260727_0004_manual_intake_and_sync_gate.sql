-- Calapres architecture reset — step 4
-- Remove the supplier RPC surface, add manual intake, gate Shopify sync on explicit approval.

drop function if exists public.calapres_link_supplier_product(uuid, uuid, uuid, text, numeric);
drop function if exists public.calapres_upsert_product_variant(uuid, uuid, uuid, text, text, integer, text, text, boolean, boolean, numeric, numeric, text, jsonb);

create or replace function public.calapres_guard_ready_for_shopify()
returns trigger language plpgsql set search_path to '' as $function$
declare variant_ok boolean; media_ok boolean;
begin
  if new.ready_for_shopify is not true then return new; end if;

  if coalesce(nullif(trim(new.canonical_name_ar), ''), nullif(trim(new.canonical_name_en), '')) is null then
    raise exception 'ready_for_shopify requires a product title.'; end if;
  if new.brand_id is null then
    raise exception 'ready_for_shopify requires a brand.'; end if;
  if new.lifecycle_status <> 'approved' then
    raise exception 'ready_for_shopify requires lifecycle_status = approved.'; end if;
  if new.approved_by is null then
    raise exception 'ready_for_shopify requires approved_by.'; end if;

  select exists (select 1 from public.product_variants v
    where v.fragrance_product_id = new.id and v.selling_price is not null
      and v.selling_price > 0 and v.pricing_status = 'approved') into variant_ok;
  if not variant_ok then
    raise exception 'ready_for_shopify requires at least one variant with an approved selling price.'; end if;

  select exists (select 1 from public.product_media m
    where m.fragrance_product_id = new.id and m.is_active
      and m.image_status = 'approved') into media_ok;
  if not media_ok then
    raise exception 'ready_for_shopify requires at least one approved image.'; end if;

  if new.approved_at is null then new.approved_at := now(); end if;
  return new;
end;
$function$;

drop trigger if exists trg_fragrance_products_ready_guard on public.fragrance_products;
create trigger trg_fragrance_products_ready_guard
before insert or update on public.fragrance_products
for each row execute function public.calapres_guard_ready_for_shopify();

create or replace function public.calapres_create_product(
  p_title_ar text, p_brand_name text, p_created_by text,
  p_title_en text default null, p_product_type text default 'perfume',
  p_concentration text default null, p_gender_target text default null,
  p_fragrance_family text default null, p_description_ar text default null,
  p_description_en text default null, p_authenticity text default 'original',
  p_owner_notes text default null
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare v_brand_id uuid; v_product_id uuid;
begin
  if coalesce(trim(p_title_ar), '') = '' then raise exception 'A product title in Arabic is required.'; end if;
  if coalesce(trim(p_brand_name), '') = '' then raise exception 'A brand is required.'; end if;
  if coalesce(trim(p_created_by), '') = '' then
    raise exception 'created_by is required — every product must have a named owner.'; end if;

  v_brand_id := public.calapres_resolve_brand(p_brand_name, p_brand_name, null, '{}'::jsonb);

  insert into public.fragrance_products (
    brand_id, brand_name, canonical_name_ar, canonical_name_en, normalized_name,
    concentration, gender_target, fragrance_family_primary,
    luxury_description_ar, luxury_description_en,
    product_type, authenticity, origin, lifecycle_status,
    publication_status, ready_for_shopify, created_by, owner_notes
  ) values (
    v_brand_id, p_brand_name, p_title_ar, p_title_en,
    public.calapres_norm_ar(coalesce(p_title_en, p_title_ar)),
    p_concentration, p_gender_target, p_fragrance_family,
    p_description_ar, p_description_en,
    p_product_type, p_authenticity, 'owner_curated', 'draft',
    'unpublished', false, p_created_by, p_owner_notes
  ) returning id into v_product_id;

  return v_product_id;
end;
$function$;

create or replace function public.calapres_add_variant(
  p_product_id uuid, p_size_label text, p_selling_price numeric,
  p_size_ml integer default null, p_cost_price numeric default null,
  p_compare_at_price numeric default null, p_availability text default 'draft'
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare v_variant_id uuid;
begin
  if p_selling_price is null or p_selling_price <= 0 then
    raise exception 'A selling price is required. Calapres no longer derives prices from any external source.';
  end if;

  insert into public.product_variants (
    fragrance_product_id, size_ml, size_label, variant_title,
    selling_price, cost_price, compare_at_price, currency,
    availability_status, pricing_status, shopify_sync_status
  ) values (
    p_product_id, p_size_ml, p_size_label, p_size_label,
    p_selling_price, p_cost_price, p_compare_at_price, 'SAR',
    p_availability, 'draft', 'pending'
  ) returning id into v_variant_id;

  return v_variant_id;
end;
$function$;
