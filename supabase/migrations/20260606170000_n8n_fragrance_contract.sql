-- Calapres n8n fragrance handoff contract.
--
-- Additive only:
-- - Keeps the Claude fragrance parent/variant model intact.
-- - Adds narrow RPCs so n8n can resolve brands, parents, variants, and links
--   without guessing SQL details.
-- - Does not execute n8n or Shopify runtime.

create unique index if not exists brands_name_en_normalized_idx
  on public.brands (lower(btrim(name_en)));

create or replace function public.calapres_resolve_brand(
  p_name_en text,
  p_name_ar text default null,
  p_slug text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_brand_id uuid;
  v_name_en text := nullif(btrim(p_name_en), '');
  v_name_ar text := nullif(btrim(p_name_ar), '');
  v_slug text := nullif(btrim(p_slug), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_name_en is null then
    raise exception 'p_name_en is required';
  end if;

  if v_slug is not null then
    v_slug := lower(regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g'));
    v_slug := nullif(btrim(v_slug, '-'), '');
  end if;

  select id
    into v_brand_id
  from public.brands
  where lower(btrim(name_en)) = lower(v_name_en)
  order by created_at asc
  limit 1;

  if v_brand_id is null then
    if v_slug is not null and exists (
      select 1 from public.brands where slug = v_slug
    ) then
      v_slug := null;
    end if;

    begin
      insert into public.brands (
        name_en,
        name_ar,
        slug,
        canonical_name,
        metadata
      )
      values (
        v_name_en,
        v_name_ar,
        v_slug,
        v_name_en,
        v_metadata
      )
      returning id into v_brand_id;
    exception when unique_violation then
      select id
        into v_brand_id
      from public.brands
      where lower(btrim(name_en)) = lower(v_name_en)
      order by created_at asc
      limit 1;
    end;
  end if;

  update public.brands
  set name_ar = coalesce(public.brands.name_ar, v_name_ar),
      slug = coalesce(
        public.brands.slug,
        case
          when v_slug is not null and not exists (
            select 1
            from public.brands b
            where b.slug = v_slug
              and b.id <> public.brands.id
          )
          then v_slug
          else null
        end
      ),
      canonical_name = coalesce(public.brands.canonical_name, v_name_en),
      metadata = public.brands.metadata || v_metadata,
      updated_at = now()
  where id = v_brand_id;

  return v_brand_id;
end;
$$;

create or replace function public.calapres_upsert_fragrance_product(
  p_brand_id uuid,
  p_normalized_name text,
  p_concentration text default null,
  p_brand_name text default null,
  p_canonical_name_ar text default null,
  p_canonical_name_en text default null,
  p_gender_target text default null,
  p_confidence_score numeric default null,
  p_raw_enrichment_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_fragrance_product_id uuid;
  v_normalized_name text := nullif(btrim(p_normalized_name), '');
  v_concentration text := nullif(btrim(p_concentration), '');
  v_payload jsonb := coalesce(p_raw_enrichment_payload, '{}'::jsonb);
begin
  if p_brand_id is null then
    raise exception 'p_brand_id is required';
  end if;

  if v_normalized_name is null then
    raise exception 'p_normalized_name is required';
  end if;

  select id
    into v_fragrance_product_id
  from public.fragrance_products
  where brand_id = p_brand_id
    and normalized_name = v_normalized_name
    and coalesce(concentration, '') = coalesce(v_concentration, '')
  order by created_at asc
  limit 1;

  if v_fragrance_product_id is null then
    begin
      insert into public.fragrance_products (
        brand_id,
        brand_name,
        canonical_name_ar,
        canonical_name_en,
        normalized_name,
        concentration,
        gender_target,
        confidence_score,
        raw_enrichment_payload
      )
      values (
        p_brand_id,
        nullif(btrim(p_brand_name), ''),
        nullif(btrim(p_canonical_name_ar), ''),
        nullif(btrim(p_canonical_name_en), ''),
        v_normalized_name,
        v_concentration,
        nullif(btrim(p_gender_target), ''),
        coalesce(p_confidence_score, 0),
        v_payload
      )
      returning id into v_fragrance_product_id;
    exception when unique_violation then
      select id
        into v_fragrance_product_id
      from public.fragrance_products
      where brand_id = p_brand_id
        and normalized_name = v_normalized_name
        and coalesce(concentration, '') = coalesce(v_concentration, '')
      order by created_at asc
      limit 1;
    end;
  else
    update public.fragrance_products
    set brand_name = coalesce(public.fragrance_products.brand_name, nullif(btrim(p_brand_name), '')),
        canonical_name_ar = coalesce(public.fragrance_products.canonical_name_ar, nullif(btrim(p_canonical_name_ar), '')),
        canonical_name_en = coalesce(public.fragrance_products.canonical_name_en, nullif(btrim(p_canonical_name_en), '')),
        gender_target = coalesce(public.fragrance_products.gender_target, nullif(btrim(p_gender_target), '')),
        confidence_score = greatest(public.fragrance_products.confidence_score, coalesce(p_confidence_score, 0)),
        raw_enrichment_payload = public.fragrance_products.raw_enrichment_payload || v_payload,
        updated_at = now()
    where id = v_fragrance_product_id;
  end if;

  return v_fragrance_product_id;
end;
$$;

create or replace function public.calapres_upsert_product_variant(
  p_fragrance_product_id uuid,
  p_supplier_id uuid,
  p_supplier_product_uuid uuid,
  p_supplier_product_id text,
  p_supplier_sku text default null,
  p_size_ml integer default null,
  p_size_label text default null,
  p_variant_title text default null,
  p_is_tester boolean default false,
  p_is_gift_set boolean default false,
  p_supplier_price numeric default null,
  p_supplier_original_price numeric default null,
  p_availability_status text default 'unknown',
  p_raw_payload jsonb default '{}'::jsonb
)
returns table (
  product_variant_id uuid,
  calapres_sku text,
  selling_price numeric,
  compare_at_price numeric
)
language plpgsql
set search_path = ''
as $$
begin
  if p_fragrance_product_id is null then
    raise exception 'p_fragrance_product_id is required';
  end if;

  if p_supplier_id is null then
    raise exception 'p_supplier_id is required';
  end if;

  if nullif(btrim(p_supplier_product_id), '') is null then
    raise exception 'p_supplier_product_id is required';
  end if;

  return query
  insert into public.product_variants (
    fragrance_product_id,
    supplier_id,
    supplier_product_uuid,
    supplier_product_id,
    supplier_sku,
    size_ml,
    size_label,
    variant_title,
    is_tester,
    is_gift_set,
    supplier_price,
    supplier_original_price,
    availability_status,
    raw_payload,
    last_seen_at
  )
  values (
    p_fragrance_product_id,
    p_supplier_id,
    p_supplier_product_uuid,
    nullif(btrim(p_supplier_product_id), ''),
    nullif(btrim(p_supplier_sku), ''),
    p_size_ml,
    nullif(btrim(p_size_label), ''),
    nullif(btrim(p_variant_title), ''),
    coalesce(p_is_tester, false),
    coalesce(p_is_gift_set, false),
    p_supplier_price,
    p_supplier_original_price,
    coalesce(nullif(btrim(p_availability_status), ''), 'unknown'),
    coalesce(p_raw_payload, '{}'::jsonb),
    now()
  )
  on conflict (supplier_id, supplier_product_id)
  do update set
    fragrance_product_id = excluded.fragrance_product_id,
    supplier_product_uuid = coalesce(excluded.supplier_product_uuid, public.product_variants.supplier_product_uuid),
    supplier_sku = excluded.supplier_sku,
    size_ml = excluded.size_ml,
    size_label = excluded.size_label,
    variant_title = excluded.variant_title,
    is_tester = excluded.is_tester,
    is_gift_set = excluded.is_gift_set,
    supplier_price = excluded.supplier_price,
    supplier_original_price = excluded.supplier_original_price,
    availability_status = excluded.availability_status,
    raw_payload = public.product_variants.raw_payload || excluded.raw_payload,
    last_seen_at = now(),
    updated_at = now()
  returning
    public.product_variants.id,
    public.product_variants.calapres_sku,
    public.product_variants.selling_price,
    public.product_variants.compare_at_price;
end;
$$;

create or replace function public.calapres_link_supplier_product(
  p_supplier_product_uuid uuid,
  p_fragrance_product_id uuid,
  p_product_variant_id uuid,
  p_match_status text default 'matched_variant',
  p_match_confidence numeric default null
)
returns table (
  supplier_product_uuid uuid,
  fragrance_product_id uuid,
  product_variant_id uuid,
  calapres_sku text
)
language plpgsql
set search_path = ''
as $$
begin
  if p_supplier_product_uuid is null then
    raise exception 'p_supplier_product_uuid is required';
  end if;

  if p_fragrance_product_id is null then
    raise exception 'p_fragrance_product_id is required';
  end if;

  if p_product_variant_id is null then
    raise exception 'p_product_variant_id is required';
  end if;

  update public.product_variants
  set supplier_product_uuid = p_supplier_product_uuid,
      updated_at = now()
  where id = p_product_variant_id;

  return query
  update public.supplier_products
  set fragrance_product_id = p_fragrance_product_id,
      product_variant_id = p_product_variant_id,
      match_status = coalesce(nullif(btrim(p_match_status), ''), 'matched_variant'),
      match_confidence = p_match_confidence,
      updated_at = now()
  where id = p_supplier_product_uuid
  returning
    public.supplier_products.id,
    public.supplier_products.fragrance_product_id,
    public.supplier_products.product_variant_id,
    (
      select pv.calapres_sku
      from public.product_variants pv
      where pv.id = public.supplier_products.product_variant_id
    );
end;
$$;

grant execute on function public.calapres_resolve_brand(text, text, text, jsonb) to service_role;
grant execute on function public.calapres_upsert_fragrance_product(uuid, text, text, text, text, text, text, numeric, jsonb) to service_role;
grant execute on function public.calapres_upsert_product_variant(uuid, uuid, uuid, text, text, integer, text, text, boolean, boolean, numeric, numeric, text, jsonb) to service_role;
grant execute on function public.calapres_link_supplier_product(uuid, uuid, uuid, text, numeric) to service_role;

revoke all on function public.calapres_resolve_brand(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.calapres_upsert_fragrance_product(uuid, text, text, text, text, text, text, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.calapres_upsert_product_variant(uuid, uuid, uuid, text, text, integer, text, text, boolean, boolean, numeric, numeric, text, jsonb) from public, anon, authenticated;
revoke all on function public.calapres_link_supplier_product(uuid, uuid, uuid, text, numeric) from public, anon, authenticated;
