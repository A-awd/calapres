-- Calapres architecture reset — step 5
-- Sync gate, reconciliation, legacy review list, reconnect guard.

create or replace function public.calapres_block_supplier_media()
returns trigger language plpgsql set search_path to '' as $function$
begin
  if coalesce(new.original_url, '') ilike '%nawadirdior%'
     or coalesce(new.original_url, '') ilike '%cdn.salla%' then
    raise exception 'Nawadir Dior / Salla media is retired and cannot be ingested into the active catalog.';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_product_media_block_supplier on public.product_media;
create trigger trg_product_media_block_supplier
before insert on public.product_media
for each row execute function public.calapres_block_supplier_media();

create or replace view public.shopify_sync_queue as
select fp.id as fragrance_product_id, fp.canonical_name_ar as title_ar,
  fp.canonical_name_en as title_en, fp.brand_name, fp.product_type, fp.concentration,
  fp.gender_target, fp.luxury_description_ar, fp.seo_title_ar, fp.seo_description_ar,
  fp.publication_status, v.id as product_variant_id, v.calapres_sku, v.size_label,
  v.selling_price, v.compare_at_price, v.availability_status,
  v.shopify_product_id, v.shopify_variant_id,
  m.shopify_cdn_url, m.generated_url, m.alt_text
from public.fragrance_products fp
join public.product_variants v
  on v.fragrance_product_id = fp.id and v.pricing_status = 'approved' and v.selling_price is not null
left join lateral (
  select pm.* from public.product_media pm
  where pm.fragrance_product_id = fp.id and pm.is_active and pm.image_status = 'approved'
  order by pm.is_primary desc, pm.position nulls last limit 1
) m on true
where fp.ready_for_shopify is true and fp.lifecycle_status = 'approved' and fp.origin = 'owner_curated';

comment on view public.shopify_sync_queue is
  'The only authorized Supabase -> Shopify push source. Owner-curated, approved, priced, imaged. Legacy supplier products are structurally excluded.';

create or replace view public.shopify_reconciliation as
select fp.id as fragrance_product_id, fp.origin, fp.lifecycle_status, fp.ready_for_shopify,
  v.id as product_variant_id, v.calapres_sku, v.selling_price, v.availability_status,
  v.shopify_product_id, v.shopify_variant_id, v.shopify_sync_status,
  case
    when v.shopify_product_id is null and fp.ready_for_shopify then 'missing_in_shopify'
    when v.shopify_product_id is not null and not fp.ready_for_shopify then 'in_shopify_not_approved'
    when v.shopify_product_id is null then 'supabase_only'
    else 'linked'
  end as reconciliation_state
from public.fragrance_products fp
join public.product_variants v on v.fragrance_product_id = fp.id;

create or replace view public.legacy_product_review as
select fp.id as fragrance_product_id, fp.brand_name, fp.canonical_name_ar as title_ar,
  fp.canonical_name_en as title_en, fp.concentration, fp.gender_target,
  v.calapres_sku, v.size_label, v.selling_price, v.legacy_supplier_price,
  v.availability_status, v.shopify_product_id, sp.shopify_status, sp.is_enriched,
  (select count(*) from public.product_media pm
    where pm.fragrance_product_id = fp.id and pm.is_active) as media_count,
  null::text as owner_decision
from public.fragrance_products fp
join public.product_variants v on v.fragrance_product_id = fp.id
left join public.shopify_products sp on sp.product_variant_id = v.id
where fp.origin = 'legacy_supplier';

comment on view public.legacy_product_review is
  'Every product inherited from the retired Nawadir Dior pipeline. Static catalog. Awaiting an explicit owner keep/replace/retire decision. Nothing here is ever pushed or republished automatically.';

grant select on public.shopify_sync_queue, public.shopify_reconciliation, public.legacy_product_review to service_role;
