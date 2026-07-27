-- Calapres architecture reset — step 1
-- Give the canonical tables their own links so they no longer need supplier_products.

alter table public.product_media
  add column if not exists fragrance_product_id uuid,
  add column if not exists product_variant_id uuid;
alter table public.shopify_products
  add column if not exists fragrance_product_id uuid,
  add column if not exists product_variant_id uuid;
alter table public.image_generation_jobs
  add column if not exists fragrance_product_id uuid,
  add column if not exists product_variant_id uuid;
alter table public.generated_assets
  add column if not exists fragrance_product_id uuid,
  add column if not exists product_variant_id uuid;

update public.product_media m
set fragrance_product_id = sp.fragrance_product_id, product_variant_id = sp.product_variant_id
from public.supplier_products sp
where sp.id = m.supplier_product_id and m.fragrance_product_id is null;

update public.shopify_products s
set fragrance_product_id = sp.fragrance_product_id, product_variant_id = sp.product_variant_id
from public.supplier_products sp
where sp.id = s.supplier_product_id and s.fragrance_product_id is null;

update public.image_generation_jobs j
set fragrance_product_id = sp.fragrance_product_id, product_variant_id = sp.product_variant_id
from public.supplier_products sp
where sp.id = j.supplier_product_id and j.fragrance_product_id is null;

update public.generated_assets g
set fragrance_product_id = sp.fragrance_product_id, product_variant_id = sp.product_variant_id
from public.supplier_products sp
where sp.id = g.supplier_product_id and g.fragrance_product_id is null;

create index if not exists idx_product_media_fragrance on public.product_media(fragrance_product_id);
create index if not exists idx_product_media_variant   on public.product_media(product_variant_id);
create index if not exists idx_shopify_products_frag   on public.shopify_products(fragrance_product_id);
create index if not exists idx_shopify_products_var    on public.shopify_products(product_variant_id);
