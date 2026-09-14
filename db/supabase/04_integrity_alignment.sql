-- Takar — integritas data dan koreksi harga efektif
-- Diterapkan setelah 03_security_alignment.sql.

-- Data API membutuhkan primary key stabil. Natural key prices tetap dijaga oleh
-- dua partial unique index karena business_id boleh NULL untuk data BI.
alter table prices
  add column if not exists id uuid default gen_random_uuid();
update prices set id = gen_random_uuid() where id is null;
alter table prices alter column id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.prices'::regclass and contype = 'p'
  ) then
    alter table prices add constraint prices_pkey primary key (id);
  end if;
end $$;

-- NULL pada regency_id berarti agregat provinsi. UNIQUE biasa menganggap dua
-- NULL berbeda, sehingga perlu NULLS NOT DISTINCT.
alter table regions
  drop constraint if exists regions_bi_province_id_bi_regency_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regions'::regclass
      and conname = 'regions_bi_province_id_bi_regency_id_key'
  ) then
    alter table regions add constraint regions_bi_province_id_bi_regency_id_key
      unique nulls not distinct (bi_province_id, bi_regency_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regions'::regclass
      and conname = 'regions_level_regency_check'
  ) then
    alter table regions add constraint regions_level_regency_check check (
      (level = 'province' and bi_regency_id is null) or
      (level = 'regency' and bi_regency_id is not null)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.prices'::regclass
      and conname = 'prices_source_owner_check'
  ) then
    alter table prices add constraint prices_source_owner_check check (
      (business_id is null and source = 'bi_hargapangan') or
      (business_id is not null and source in ('manual','nota_ocr'))
    );
  end if;
end $$;

-- Versi awal menggabungkan harga BI dan harga warung dengan OR sehingga satu
-- bahan dapat dihitung dua kali. View ini mengimplementasikan BR-09:
-- harga warung menjadi level dasar, sedangkan BI memasok gerakan pasar.
create or replace view menu_exposure
with (security_invoker = true) as
with harga_bahan as (
  select r.menu_item_id,
         r.commodity_id,
         r.qty,
         case
           when bi_kini.price is null then harga_sendiri.price
           when harga_sendiri.price is null then bi_kini.price
           when bi_saat_beli.price is null or bi_saat_beli.price = 0
             then harga_sendiri.price
           when bi_kini.price / bi_saat_beli.price not between 0.3 and 3.0
             then bi_kini.price
           else harga_sendiri.price * (bi_kini.price / bi_saat_beli.price)
         end as harga_efektif
  from recipe_items r
  join menu_items m on m.id = r.menu_item_id
  join businesses b on b.id = m.business_id
  left join lateral (
    select p.price, p.date
    from prices p
    where p.business_id = b.id
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc
    limit 1
  ) harga_sendiri on true
  left join lateral (
    select p.price, p.date
    from prices p
    where p.business_id is null
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc
    limit 1
  ) bi_kini on true
  left join lateral (
    select p.price
    from prices p
    where p.business_id is null
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
      and p.date <= harga_sendiri.date
    order by p.date desc
    limit 1
  ) bi_saat_beli on true
),
biaya as (
  select menu_item_id,
         commodity_id,
         qty * harga_efektif as biaya_bahan
  from harga_bahan
  where harga_efektif is not null
),
total as (
  select menu_item_id, sum(biaya_bahan) as bahan_total
  from biaya
  group by menu_item_id
)
select b.menu_item_id,
       b.commodity_id,
       coalesce(c.name, ci.name) as commodity_name,
       round((b.biaya_bahan / nullif(t.bahan_total + coalesce(
         (select sum(amount) from fixed_costs f where f.menu_item_id = b.menu_item_id), 0
       ), 0)) * 100, 1) as share_pct
from biaya b
join total t on t.menu_item_id = b.menu_item_id
left join commodities c on c.id = b.commodity_id
left join catalog_items ci on ci.id = b.commodity_id;

revoke all on menu_exposure from anon, authenticated;
grant select on menu_exposure to authenticated;
