-- Calapres architecture reset — step 2
-- Cut every active dependency on the supplier tables, then move them to a read-only archive schema.

create schema if not exists archive;

do $$
declare r record;
begin
  for r in
    select tc.table_schema, tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.constraint_schema = tc.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name in ('suppliers','supplier_products')
    group by 1,2,3
  loop
    execute format('alter table %I.%I drop constraint %I', r.table_schema, r.table_name, r.constraint_name);
  end loop;
end $$;

alter table public.product_media
  add constraint product_media_fragrance_product_fk
  foreign key (fragrance_product_id) references public.fragrance_products(id) on delete set null;

alter table public.shopify_products
  add constraint shopify_products_fragrance_product_fk
  foreign key (fragrance_product_id) references public.fragrance_products(id) on delete set null;

alter table public.supplier_products set schema archive;
alter table public.suppliers        set schema archive;
alter table public.sync_runs        set schema archive;
alter table public.sync_errors      set schema archive;

revoke all on all tables in schema archive from anon, authenticated, service_role, public;
grant usage on schema archive to service_role;
grant select on all tables in schema archive to service_role;

comment on schema archive is
  'Frozen Nawadir Dior history. Read-only. Archived 2026-07-27 when the supplier architecture was retired. Never write here and never feed it into any active sync.';
