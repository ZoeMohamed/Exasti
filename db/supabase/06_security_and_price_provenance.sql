-- Menutup kebocoran view dan menyimpan asal tanggal forward-fill.
-- Aman dijalankan pada database live yang sudah memiliki data.

alter table public.prices
  add column if not exists filled_from_date date;

update public.prices p
set filled_from_date = (
  select asli.date
  from public.prices asli
  where asli.business_id is null
    and asli.commodity_id = p.commodity_id
    and asli.region_id = p.region_id
    and asli.date < p.date
    and not asli.is_filled
  order by asli.date desc
  limit 1
)
where p.is_filled
  and p.filled_from_date is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prices_filled_source_ck'
      and conrelid = 'public.prices'::regclass
  ) then
    alter table public.prices
      add constraint prices_filled_source_ck check (
        (not is_filled and filled_from_date is null)
        or (is_filled and filled_from_date is not null and filled_from_date < date)
      ) not valid;
  end if;
end $$;

alter table public.prices validate constraint prices_filled_source_ck;

create or replace view public.resep_efektif
with (security_invoker = true) as
with sumber as (
  select
    r.menu_item_id,
    r.commodity_id,
    r.qty,
    r.batch_qty,
    m.batch_yield,
    m.business_id,
    coalesce(c.name, ci.name, r.commodity_id) as nama,
    coalesce(c.unit, ci.unit, 'kg') as satuan,
    (c.id is not null) as komoditas_bi,
    nota.price as harga_nota,
    nota.date as tanggal_beli,
    bi_kini.price as bi_kini,
    coalesce(bi_kini.filled_from_date, bi_kini.date) as bi_tanggal,
    bi_kini.is_filled as bi_diisi_mundur,
    bi_beli.price as bi_saat_beli,
    bi_lalu.price as bi_lalu
  from public.recipe_items r
  join public.menu_items m on m.id = r.menu_item_id
  join public.businesses b on b.id = m.business_id
  left join public.commodities c on c.id = r.commodity_id
  left join public.catalog_items ci on ci.id = r.commodity_id
  left join lateral (
    select p.price, p.date from public.prices p
    where p.business_id = b.id and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc limit 1
  ) nota on true
  left join lateral (
    select p.price, p.date, p.is_filled, p.filled_from_date from public.prices p
    where p.business_id is null and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc limit 1
  ) bi_kini on true
  left join lateral (
    select p.price from public.prices p
    where p.business_id is null and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id and p.date <= nota.date
    order by p.date desc limit 1
  ) bi_beli on true
  left join lateral (
    select p.price from public.prices p
    where p.business_id is null and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id and p.date <= bi_kini.date - 7
    order by p.date desc limit 1
  ) bi_lalu on true
), berfaktor as (
  select s.*,
    case
      when s.harga_nota is null then 1.0
      when s.bi_saat_beli is null or s.bi_saat_beli = 0 or s.bi_kini is null then null
      when (s.bi_kini / s.bi_saat_beli) < 0.3 or (s.bi_kini / s.bi_saat_beli) > 3.0 then 1.0
      else s.harga_nota / s.bi_saat_beli
    end as faktor
  from sumber s
)
select
  menu_item_id, commodity_id, nama, satuan, qty, batch_qty, batch_yield,
  business_id, komoditas_bi, harga_nota, tanggal_beli, bi_tanggal,
  coalesce(bi_diisi_mundur, false) as harga_diisi_mundur,
  case
    when faktor is null then harga_nota
    when bi_kini is null then harga_nota
    else round(faktor * bi_kini, 2)
  end as harga,
  case
    when faktor is null then harga_nota
    when bi_lalu is null then null
    else round(faktor * bi_lalu, 2)
  end as harga_lalu,
  (bi_kini is not null) as dari_data,
  case
    when harga_nota is not null and faktor is not null and faktor <> 1.0
      then 'harga notamu, digerakkan ikut pasar'
    when harga_nota is not null then 'harga notamu'
    else 'harga pasar'
  end as alasan
from berfaktor;

comment on view public.resep_efektif is
  'BR-09 harga efektif + BR-04 harga pembanding 7 hari. RLS pemanggil tetap berlaku.';

revoke all on public.resep_efektif from anon, authenticated;
grant select on public.resep_efektif to authenticated;
