-- Bahan milik warung dan penyimpanan takaran asli.
-- Aditif dan kompatibel dengan aplikasi sebelum perubahan UI.

alter table public.catalog_items
  add column if not exists business_id uuid
    references public.businesses(id) on delete cascade,
  add column if not exists nama_normal text,
  add column if not exists created_at timestamptz not null default now();

update public.catalog_items
set nama_normal = lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
where nama_normal is null;

alter table public.catalog_items alter column nama_normal set not null;

create unique index if not exists catalog_items_warung_nama_uk
  on public.catalog_items (business_id, nama_normal)
  where business_id is not null;

create unique index if not exists catalog_items_umum_nama_uk
  on public.catalog_items (nama_normal)
  where business_id is null;

create index if not exists catalog_items_business_idx
  on public.catalog_items (business_id)
  where business_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'catalog_items_unit_ck'
      and conrelid = 'public.catalog_items'::regclass
  ) then
    alter table public.catalog_items
      add constraint catalog_items_unit_ck
      check (unit in ('kg', 'liter', 'pcs')) not valid;
  end if;
end $$;

alter table public.catalog_items validate constraint catalog_items_unit_ck;

drop policy if exists ref_baca_catalog on public.catalog_items;
drop policy if exists katalog_baca_publik on public.catalog_items;
drop policy if exists katalog_baca_pengguna on public.catalog_items;
drop policy if exists katalog_tulis on public.catalog_items;
drop policy if exists katalog_ubah on public.catalog_items;
drop policy if exists katalog_hapus on public.catalog_items;

create policy katalog_baca_publik on public.catalog_items
  for select to anon
  using (business_id is null);

create policy katalog_baca_pengguna on public.catalog_items
  for select to authenticated
  using (
    business_id is null or exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy katalog_tulis on public.catalog_items
  for insert to authenticated
  with check (
    business_id is not null and exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy katalog_ubah on public.catalog_items
  for update to authenticated
  using (
    business_id is not null and exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    business_id is not null and exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy katalog_hapus on public.catalog_items
  for delete to authenticated
  using (
    business_id is not null and exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

revoke all on public.catalog_items from anon, authenticated;
grant select on public.catalog_items to anon, authenticated;
grant insert, update, delete on public.catalog_items to authenticated;

alter table public.recipe_items
  add column if not exists cara_pakai text not null default 'per_masak',
  add column if not exists jumlah_input numeric(12,4),
  add column if not exists satuan_input text,
  add column if not exists isi_kemasan numeric(12,4),
  add column if not exists satuan_kemasan text,
  add column if not exists porsi_per_kemasan numeric(10,2);

-- Simpan representasi yang ramah edit untuk resep lama tanpa mengubah hitungannya.
update public.recipe_items r
set jumlah_input = r.batch_qty,
    satuan_input = coalesce(
      (select c.unit from public.commodities c where c.id = r.commodity_id),
      (select ci.unit from public.catalog_items ci where ci.id = r.commodity_id),
      'kg'
    )
where r.jumlah_input is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipe_items_cara_pakai_ck'
      and conrelid = 'public.recipe_items'::regclass
  ) then
    alter table public.recipe_items
      add constraint recipe_items_cara_pakai_ck check (
        cara_pakai = 'per_masak'
        or (
          cara_pakai = 'per_kemasan'
          and isi_kemasan > 0
          and porsi_per_kemasan > 0
        )
      ) not valid;
  end if;
end $$;

alter table public.recipe_items validate constraint recipe_items_cara_pakai_ck;

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
    nota_lalu.price as harga_nota_lalu,
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
    where p.business_id = b.id
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc, p.fetched_at desc limit 1
  ) nota on true
  left join lateral (
    select p.price from public.prices p
    where p.business_id = b.id
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
      and p.date <= nota.date - 7
    order by p.date desc, p.fetched_at desc limit 1
  ) nota_lalu on true
  left join lateral (
    select p.price, p.date, p.is_filled, p.filled_from_date from public.prices p
    where p.business_id is null
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc limit 1
  ) bi_kini on true
  left join lateral (
    select p.price from public.prices p
    where p.business_id is null
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
      and p.date <= nota.date
    order by p.date desc limit 1
  ) bi_beli on true
  left join lateral (
    select p.price from public.prices p
    where p.business_id is null
      and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
      and p.date <= bi_kini.date - 7
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
    when not komoditas_bi then harga_nota
    when faktor is null then harga_nota
    when bi_kini is null then harga_nota
    else round(faktor * bi_kini, 2)
  end as harga,
  case
    when not komoditas_bi then harga_nota_lalu
    when faktor is null then harga_nota
    when bi_lalu is null then null
    else round(faktor * bi_lalu, 2)
  end as harga_lalu,
  (bi_kini is not null) as dari_data,
  case
    when not komoditas_bi and harga_nota is not null
      then 'harga belanjamu'
    when harga_nota is not null and faktor is not null and faktor <> 1.0
      then 'harga notamu, digerakkan ikut pasar'
    when harga_nota is not null then 'harga notamu'
    else 'harga pasar'
  end as alasan
from berfaktor;

comment on view public.resep_efektif is
  'BR-09 harga efektif + BR-04 pembanding 7 hari untuk bahan pasar dan bahan warung. RLS pemanggil tetap berlaku.';

revoke all on public.resep_efektif from anon, authenticated;
grant select on public.resep_efektif to authenticated;
