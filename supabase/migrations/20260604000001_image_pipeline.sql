-- Image Generation Pipeline: Supabase Schema
-- Adds 5 tables: brand_style_config, creative_briefs,
-- image_generation_jobs, generated_assets, collection_briefs

-- ─────────────────────────────────────────────────────────────
-- 1. brand_style_config
-- Single row. Single source of truth for Calapres brand DNA.
-- All prompts are assembled from this row + product brief.
-- ─────────────────────────────────────────────────────────────
create table public.brand_style_config (
  id                      uuid primary key default gen_random_uuid(),
  style_name              text not null default 'calapres-v1',
  background_description  text not null default 'ivory marble surface with soft grain, warm champagne ambient light, photorealistic luxury boutique surface',
  lighting_description    text not null default 'soft warm champagne side-light, polished shadow on right, no harsh highlights',
  mood_keywords           text[] not null default array['luxury','premium','Saudi market','elegant','refined'],
  base_prompt_fragment    text not null default 'Luxury ecommerce fragrance photography. Refined Saudi premium perfume boutique aesthetic. Ivory marble, warm champagne light, precise bottle geometry, high-end product campaign, no people, no readable text, no watermarks, no extra labels.',
  negative_prompt         text not null default 'low quality, blurry, distorted bottle, wrong bottle shape, extra labels, fake text, watermark, hands, faces, clutter, duplicate bottle, broken label, different brand, hallucinated packaging, invented design, unrealistic bottle, CGI plastic look',
  hero_aspect_ratio       text not null default '1:1',
  banner_aspect_ratio     text not null default '16:9',
  story_aspect_ratio      text not null default '9:16',
  square_ad_aspect_ratio  text not null default '1:1',
  resolution_px           integer not null default 2048,
  reference_image_weight  numeric(3,2) not null default 0.85,
  is_active               boolean not null default true,
  updated_at              timestamptz not null default now()
);

-- seed one active config row
insert into public.brand_style_config (style_name) values ('calapres-v1');

-- ─────────────────────────────────────────────────────────────
-- 2. creative_briefs
-- One row per Shopify product. Drives generation of all image types.
-- n8n reads this table to know what to generate next.
-- ─────────────────────────────────────────────────────────────
create table public.creative_briefs (
  id                          uuid primary key default gen_random_uuid(),
  shopify_product_id          text not null unique,
  product_title               text,
  brand_name                  text,
  concentration               text,   -- EDP / EDP Intense / EDT / Parfum / Oud
  size_ml                     integer,
  bottle_shape_notes          text,   -- extracted from supplier listing (e.g. "tall rectangular dark blue bottle")
  primary_color               text,   -- dominant bottle color (e.g. "deep navy with gold cap")
  collection_theme            text,   -- oriental / floral / woody / fresh / oud / niche
  gender                      text,   -- men / women / unisex
  reference_image_url         text,   -- supplier image URL — sent as product_reference to Higgsfield
  extra_prompt_notes          text,   -- product-specific overrides (e.g. "emphasize oud wood base")
  needs_product_images        boolean not null default true,
  needs_collection_banner     boolean not null default false,
  needs_ad_images             boolean not null default false,
  product_image_status        text not null default 'pending',    -- pending / generating / done / failed / needs_review
  collection_banner_status    text not null default 'pending',
  ad_image_status             text not null default 'pending',
  product_image_retry_count   integer not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index creative_briefs_needs_product_images_idx
  on public.creative_briefs (needs_product_images, product_image_status)
  where needs_product_images = true and product_image_status = 'pending';

create index creative_briefs_needs_ad_images_idx
  on public.creative_briefs (needs_ad_images, ad_image_status)
  where needs_ad_images = true and ad_image_status = 'pending';

-- auto-update updated_at
create or replace function public.creative_briefs_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_creative_briefs_updated_at
  before update on public.creative_briefs
  for each row execute procedure public.creative_briefs_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. image_generation_jobs
-- Every Higgsfield call logged here. Enables retry, audit, debug.
-- job_type drives which prompt variant and aspect ratio to use.
-- ─────────────────────────────────────────────────────────────
create table public.image_generation_jobs (
  id                      uuid primary key default gen_random_uuid(),
  brief_id                uuid references public.creative_briefs(id) on delete cascade,
  shopify_entity_id       text not null,
  entity_type             text not null default 'product',      -- product / collection / ad
  job_type                text not null,
  -- product_hero | product_angle_rtq | product_angle_detail | product_angle_shelf
  -- collection_desktop | collection_mobile
  -- ad_square | ad_story | ad_landscape
  prompt_used             text,
  negative_prompt_used    text,
  reference_image_url     text,
  higgsfield_request_id   text,
  status                  text not null default 'pending',
  -- pending | generating | scoring | passed | failed | needs_review
  retry_count             integer not null default 0,
  output_images           jsonb not null default '[]',          -- [{url, status}]
  best_image_url          text,
  quality_checks          jsonb,
  -- {api_ok, has_images, retry_count, error}
  final_image_url         text,
  shopify_media_id        text,
  error_message           text,
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create index image_generation_jobs_brief_idx
  on public.image_generation_jobs (brief_id, job_type);

create index image_generation_jobs_status_idx
  on public.image_generation_jobs (status)
  where status in ('pending','generating','failed');

-- ─────────────────────────────────────────────────────────────
-- 4. generated_assets
-- Final images that have been published to Shopify.
-- Maps image URL → Shopify entity. Used by sync to prevent re-upload.
-- ─────────────────────────────────────────────────────────────
create table public.generated_assets (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid references public.image_generation_jobs(id) on delete set null,
  asset_type          text not null,
  -- product_hero | product_gallery | collection_banner | ad_1x1 | ad_9x16 | ad_16x9
  entity_type         text not null,           -- product / collection / page
  shopify_entity_id   text not null,
  cdn_url             text not null,           -- Higgsfield CDN URL
  shopify_cdn_url     text,                    -- Shopify-hosted CDN URL (after upload)
  supabase_storage_path text,                  -- optional backup path
  is_active           boolean not null default true,
  published_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index generated_assets_entity_idx
  on public.generated_assets (shopify_entity_id, asset_type, is_active);

-- ─────────────────────────────────────────────────────────────
-- 5. collection_briefs
-- Collection-level creative config for banner generation.
-- ─────────────────────────────────────────────────────────────
create table public.collection_briefs (
  id                          uuid primary key default gen_random_uuid(),
  shopify_collection_id       text not null unique,
  collection_name             text,
  collection_name_ar          text,
  collection_theme            text,       -- oud / oriental / floral / luxury / gift / niche
  hero_shopify_product_ids    text[],     -- up to 3 products to feature in composition
  mood_override               text,       -- optional: e.g. "golden hour desert dusk"
  style_notes                 text,
  banner_status               text not null default 'pending',
  -- pending / generating / done / failed / needs_review
  retry_count                 integer not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Enable RLS with service_role bypass (n8n uses service key)
alter table public.brand_style_config     enable row level security;
alter table public.creative_briefs        enable row level security;
alter table public.image_generation_jobs  enable row level security;
alter table public.generated_assets       enable row level security;
alter table public.collection_briefs      enable row level security;

-- Service role has full access (n8n uses SUPABASE_SERVICE_ROLE_KEY)
create policy "service_role_all" on public.brand_style_config
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.creative_briefs
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.image_generation_jobs
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.generated_assets
  for all using (auth.role() = 'service_role');
create policy "service_role_all" on public.collection_briefs
  for all using (auth.role() = 'service_role');

-- Admin users can read everything
create policy "admin_read_all" on public.brand_style_config
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.creative_briefs
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.image_generation_jobs
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.generated_assets
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
create policy "admin_read_all" on public.collection_briefs
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
