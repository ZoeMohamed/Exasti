-- 05_resep_efektif.sql
-- Satu sumber kebenaran untuk harga yang dipakai menghitung modal.
-- Menyatukan BR-09 (harga efektif) dan BR-04 (harga pembanding 7 hari lalu).
--
-- Gagasannya: harga nota pemilik adalah LEVEL dasar, harga BI adalah GERAKAN.
--
--   faktor        = harga_nota ÷ BI(tanggal_beli)      -- selisih level warung vs BI
--   harga_efektif = faktor × BI(hari_ini)
--   harga_lalu    = faktor × BI(hari_ini − 7)
--
-- Karena faktor yang sama dipakai untuk keduanya, selisihnya murni gerakan BI —
-- persis yang diminta BR-04. Bila rasio BI tidak wajar (<0,3 atau >3,0) kita
-- tidak mempercayainya dan jatuh ke harga BI apa adanya.

create or replace view resep_efektif
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
    coalesce(c.unit, ci.unit, 'kg')           as satuan,
    (c.id is not null)                        as komoditas_bi,
    nota.price      as harga_nota,
    nota.date       as tanggal_beli,
    bi_kini.price   as bi_kini,
    coalesce(bi_kini.filled_from_date, bi_kini.date) as bi_tanggal,
    bi_kini.is_filled as bi_diisi_mundur,
    bi_beli.price   as bi_saat_beli,
    bi_lalu.price   as bi_lalu
  from recipe_items r
  join menu_items m  on m.id = r.menu_item_id
  join businesses b  on b.id = m.business_id
  left join commodities   c  on c.id  = r.commodity_id
  left join catalog_items ci on ci.id = r.commodity_id

  -- harga nota pemilik terbaru
  left join lateral (
    select p.price, p.date from prices p
    where p.business_id = b.id and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc limit 1
  ) nota on true

  -- harga BI hari ini
  left join lateral (
    select p.price, p.date, p.is_filled, p.filled_from_date from prices p
    where p.business_id is null and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id
    order by p.date desc limit 1
  ) bi_kini on true

  -- harga BI pada tanggal nota dibeli
  left join lateral (
    select p.price from prices p
    where p.business_id is null and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id and p.date <= nota.date
    order by p.date desc limit 1
  ) bi_beli on true

  -- harga BI 7 hari sebelum harga BI terkini
  left join lateral (
    select p.price from prices p
    where p.business_id is null and p.commodity_id = r.commodity_id
      and p.region_id = b.region_id and p.date <= bi_kini.date - 7
    order by p.date desc limit 1
  ) bi_lalu on true
),
berfaktor as (
  select s.*,
    case
      -- tidak ada harga nota → murni ikut BI
      when s.harga_nota is null then 1.0
      -- ada nota tapi BI tidak bisa jadi jangkar → level nota dipakai apa adanya
      when s.bi_saat_beli is null or s.bi_saat_beli = 0 or s.bi_kini is null then null
      -- rasio tidak wajar → jangan dipercaya (BR-09)
      when (s.bi_kini / s.bi_saat_beli) < 0.3 or (s.bi_kini / s.bi_saat_beli) > 3.0 then 1.0
      else s.harga_nota / s.bi_saat_beli
    end as faktor
  from sumber s
)
select
  menu_item_id, commodity_id, nama, satuan, qty, batch_qty, batch_yield,
  business_id, komoditas_bi, harga_nota, tanggal_beli, bi_tanggal,
  coalesce(bi_diisi_mundur, false) as harga_diisi_mundur,

  -- harga efektif hari ini
  case
    when faktor is null then harga_nota
    when bi_kini is null then harga_nota
    else round(faktor * bi_kini, 2)
  end as harga,

  -- harga pembanding 7 hari lalu, faktor yang sama
  case
    when faktor is null then harga_nota
    when bi_lalu is null then null
    else round(faktor * bi_lalu, 2)
  end as harga_lalu,

  -- dari data otomatis, atau dari nota pemilik
  (bi_kini is not null) as dari_data,

  case
    when harga_nota is not null and faktor is not null and faktor <> 1.0
      then 'harga notamu, digerakkan ikut pasar'
    when harga_nota is not null then 'harga notamu'
    else 'harga pasar'
  end as alasan
from berfaktor;

comment on view resep_efektif is
  'BR-09 harga efektif + BR-04 harga pembanding 7 hari. Dipakai margin engine dan snapshot harian.';

revoke all on resep_efektif from anon, authenticated;
grant select on resep_efektif to authenticated;
