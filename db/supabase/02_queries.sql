-- Takar — query yang dipakai aplikasi
--
-- Tiap blok menyebut rute API pemakainya dan konteks aksesnya:
--   [sesi]    dijalankan dengan sesi pengguna — RLS menyaring otomatis
--   [service] dijalankan cron dengan service role — melewati RLS
--
-- Perhitungan modal, margin, pendorong, dan prioritas TIDAK ada di SQL.
-- Semuanya di lib/margin.ts, lib/price.ts, lib/trend.ts, lib/priority.ts
-- sebagai fungsi murni (FR-19). SQL hanya menyiapkan bahan dan menyimpan hasil.

-- ══════════════════════════════════════════════════════════════
-- Q1 · Ingest harga BI            [service]  /api/cron/ingest
-- ══════════════════════════════════════════════════════════════
-- Idempoten (NFR-06): jalan dua kali untuk tanggal sama tidak menggandakan.
insert into prices (commodity_id, region_id, business_id, date, price, source, is_filled)
values ($1, $2, null, $3, $4, 'bi_hargapangan', $5)
on conflict (commodity_id, region_id, date) where business_id is null
do update set price      = excluded.price,
              is_filled  = excluded.is_filled,
              fetched_at = now();

-- Catat tiap eksekusi. Ini juga bukti ke juri bahwa sistem berjalan harian.
insert into ingest_runs (target_date, region_count, rows_upserted, status, message)
values ($1, $2, $3, $4, $5);


-- ══════════════════════════════════════════════════════════════
-- Q2 · Bahan untuk harga efektif  [service]  /api/cron/recompute
-- ══════════════════════════════════════════════════════════════
-- BR-09: harga_efektif = harga_nota × ( BI_hari_ini ÷ BI_tanggal_nota )
-- SQL menyiapkan KETIGA angkanya; lib/price.ts yang menghitung.
--
-- $1 = business_id
with bahan_dipakai as (
  select distinct r.commodity_id, b.region_id, b.id as business_id
  from   recipe_items r
  join   menu_items m on m.id = r.menu_item_id
  join   businesses b on b.id = m.business_id
  where  b.id = $1
),
harga_bi as (                                    -- harga publik terbaru
  select distinct on (commodity_id)
         commodity_id, price as bi_price, date as bi_date, is_filled
  from   prices
  where  business_id is null
    and  region_id = (select region_id from businesses where id = $1)
  order  by commodity_id, date desc
),
harga_sendiri as (                               -- harga milik warung terbaru
  select distinct on (commodity_id)
         commodity_id, price as own_price, date as own_date
  from   prices
  where  business_id = $1
  order  by commodity_id, date desc
)
select bd.commodity_id,
       coalesce(c.name, ci.name) as commodity_name,
       coalesce(c.unit, ci.unit) as unit,
       hb.bi_price,
       hb.bi_date,
       hb.is_filled,
       hs.own_price,
       hs.own_date,
       -- harga BI pada tanggal pemilik membeli, untuk menghitung rasio gerakan
       (select p.price from prices p
        where  p.business_id is null
          and  p.commodity_id = bd.commodity_id
          and  p.region_id    = bd.region_id
          and  p.date        <= hs.own_date
        order  by p.date desc limit 1) as bi_price_saat_beli
from   bahan_dipakai bd
left join commodities   c  on c.id  = bd.commodity_id
left join catalog_items ci on ci.id = bd.commodity_id
left join harga_bi      hb on hb.commodity_id = bd.commodity_id
left join harga_sendiri hs on hs.commodity_id = bd.commodity_id;


-- ══════════════════════════════════════════════════════════════
-- Q3 · Resep untuk perhitungan    [service]  /api/cron/recompute
-- ══════════════════════════════════════════════════════════════
-- Menu yang diistirahatkan (active=false) IKUT dihitung — BR-15,
-- supaya sistem bisa memanggil balik saat sudah sehat lagi.
select m.id            as menu_item_id,
       m.name,
       m.sell_price,
       m.batch_yield,
       m.weekly_volume,
       m.active,
       coalesce(
         jsonb_agg(distinct jsonb_build_object(
           'commodityId', r.commodity_id,
           'batchQty',    r.batch_qty,
           'qty',         r.qty
         )) filter (where r.id is not null), '[]'::jsonb) as bahan,
       coalesce(
         (select jsonb_agg(jsonb_build_object(
            'label',       f.label,
            'amount',      f.amount,
            'isEstimated', f.is_estimated))
          from fixed_costs f where f.menu_item_id = m.id), '[]'::jsonb) as biaya_tetap
from   menu_items m
left join recipe_items r on r.menu_item_id = m.id
where  m.business_id = $1
group by m.id;


-- ══════════════════════════════════════════════════════════════
-- Q4 · Simpan hasil hitung        [service]  /api/cron/recompute
-- ══════════════════════════════════════════════════════════════
insert into margin_snapshots
  (menu_item_id, date, hpp, sell_price, margin_pct, from_data, missing_count)
values ($1, $2, $3, $4, $5, $6, $7)
on conflict (menu_item_id, date)
do update set hpp           = excluded.hpp,
              sell_price    = excluded.sell_price,
              margin_pct    = excluded.margin_pct,
              from_data     = excluded.from_data,
              missing_count = excluded.missing_count;


-- ══════════════════════════════════════════════════════════════
-- Q5 · Dashboard                  [sesi]     /api/menu
-- ══════════════════════════════════════════════════════════════
-- Mengembalikan untung hari ini DAN 7 hari lalu supaya UI bisa
-- menampilkan "turun dari Rp 3.085" tanpa panggilan kedua.
--
-- Urutan: BR-14 — kalau weekly_volume ada, urut DAMPAK RUPIAH menaik;
-- kalau kosong, urut margin persen menaik (perilaku Cincin 0).
select m.id,
       m.name,
       m.sell_price,
       m.weekly_volume,
       m.active,
       s.hpp,
       s.margin_pct,
       (s.sell_price - s.hpp)                          as untung_per_porsi,
       s.from_data,
       s.missing_count,
       lalu.margin_pct                                 as margin_7d_lalu,
       (lalu.sell_price - lalu.hpp)                    as untung_7d_lalu,
       case when m.weekly_volume is not null
            then round((s.sell_price - s.hpp) * m.weekly_volume)
       end                                             as dampak_mingguan
from   menu_items m
join   margin_snapshots s
       on s.menu_item_id = m.id and s.date = $2
left join lateral (
       select hpp, sell_price, margin_pct
       from   margin_snapshots s2
       where  s2.menu_item_id = m.id and s2.date <= $2 - 7
       order  by s2.date desc limit 1) lalu on true
where  m.business_id = $1
order  by case when m.weekly_volume is not null
               then (s.sell_price - s.hpp) * m.weekly_volume
          end asc nulls last,
          s.margin_pct asc;


-- ══════════════════════════════════════════════════════════════
-- Q6 · Detail menu                [sesi]     /api/menu/[id]/margin
-- ══════════════════════════════════════════════════════════════
-- 6a · rincian modal, dalam satuan ASLI pemilik (FR-10)
select r.commodity_id,
       coalesce(c.name, ci.name)  as nama,
       r.batch_qty,
       coalesce(c.unit, ci.unit)  as unit,
       m.batch_yield,
       r.qty,
       lp.price                   as harga_satuan,
       round(r.qty * lp.price)    as subtotal,
       lp.is_filled,
       lp.source
from   recipe_items r
join   menu_items m on m.id = r.menu_item_id
join   businesses b on b.id = m.business_id
left join commodities   c  on c.id  = r.commodity_id
left join catalog_items ci on ci.id = r.commodity_id
left join latest_prices lp
       on lp.commodity_id = r.commodity_id
      and lp.region_id    = b.region_id
      and (lp.business_id is null or lp.business_id = b.id)
where  r.menu_item_id = $1
order  by r.qty * lp.price desc nulls last;

-- 6b · riwayat 30 hari untuk grafik
select date, margin_pct, round(sell_price - hpp) as untung_per_porsi
from   margin_snapshots
where  menu_item_id = $1 and date >= $2 - 30
order  by date;

-- 6c · bahan untuk BR-04 — kontribusi RUPIAH, bukan persentase
-- lib/trend.ts yang memilih argmax(kontribusi_rp); SQL hanya menyiapkan.
select r.commodity_id,
       coalesce(c.name, ci.name)                       as nama,
       r.qty,
       pc.price_now,
       pc.price_7d_ago,
       pc.change_pct,
       round(r.qty * (pc.price_now - pc.price_7d_ago)) as kontribusi_rp
from   recipe_items r
join   menu_items m on m.id = r.menu_item_id
join   businesses b on b.id = m.business_id
left join commodities   c  on c.id  = r.commodity_id
left join catalog_items ci on ci.id = r.commodity_id
join   price_change_7d pc
       on pc.commodity_id = r.commodity_id
      and pc.region_id    = b.region_id
      and (pc.business_id is null or pc.business_id = b.id)
where  r.menu_item_id = $1
order  by kontribusi_rp desc nulls last;


-- ══════════════════════════════════════════════════════════════
-- Q7 · Menu planner               [sesi]     /api/planner
-- ══════════════════════════════════════════════════════════════
-- BR-15 pengelompokan + BR-14 urutan dalam kelompok.
select m.id,
       m.name,
       m.active,
       m.weekly_volume,
       round(s.sell_price - s.hpp)                     as untung_per_porsi,
       s.margin_pct,
       case when s.margin_pct >= 20 then 'sehat'
            when s.margin_pct >= 0  then 'tipis'
            else 'rugi' end                            as kelompok,
       case when m.weekly_volume is not null
            then round((s.sell_price - s.hpp) * m.weekly_volume)
       end                                             as dampak_mingguan
from   menu_items m
join   margin_snapshots s
       on s.menu_item_id = m.id and s.date = $2
where  m.business_id = $1
order  by case when s.margin_pct >= 20 then 3
               when s.margin_pct >= 0  then 2
               else 1 end,                             -- rugi dulu
         case when m.weekly_volume is not null
              then (s.sell_price - s.hpp) * m.weekly_volume
         end asc nulls last,
         s.margin_pct asc;


-- ══════════════════════════════════════════════════════════════
-- Q8 · Inbox peringatan           [sesi]     /api/alerts
-- ══════════════════════════════════════════════════════════════
select a.id, a.date, a.severity, a.headline, a.detail, a.suggestion,
       m.name                     as menu_name,
       coalesce(c.name, ci.name)  as driver_name
from   alerts a
left join menu_items    m  on m.id  = a.menu_item_id
left join commodities   c  on c.id  = a.driver_commodity_id
left join catalog_items ci on ci.id = a.driver_commodity_id
where  a.business_id = $1 and a.read_at is null
order  by case a.severity when 'critical' then 1 when 'warning' then 2 else 3 end,
          a.date desc
limit 3;                                         -- BR-06: maksimal 3 per hari

-- Tandai sudah dibaca                            /api/alerts/[id]/read
update alerts set read_at = now() where id = $1;


-- ══════════════════════════════════════════════════════════════
-- Q9 · Aksi pemilik               [sesi]
-- ══════════════════════════════════════════════════════════════
-- Istirahatkan / jual lagi                       /api/menu/[id]/active
update menu_items set active = $2 where id = $1;

-- Perkiraan volume mingguan (BR-14)              /api/menu/volume
update menu_items set weekly_volume = $2 where id = $1;

-- Mode kemasan, sekali per warung (FR-47)        /api/business/packaging
update businesses set packaging_mode = $2 where id = $1;

-- Ubah harga jual — riwayat TIDAK dihitung ulang, sell_price
-- sudah tersalin di tiap snapshot lama.
update menu_items set sell_price = $2 where id = $1;

-- Catat harga dari nota sendiri (Cincin 1)
insert into prices (commodity_id, region_id, business_id, date, price, source)
values ($1, $2, $3, $4, $5, 'nota_ocr')
on conflict (commodity_id, region_id, date, business_id) where business_id is not null
do update set price = excluded.price, fetched_at = now();


-- ══════════════════════════════════════════════════════════════
-- Q10 · Peta eksposur             [sesi]     /api/exposure
-- ══════════════════════════════════════════════════════════════
select e.menu_item_id, m.name as menu_name, e.commodity_name, e.share_pct
from   menu_exposure e
join   menu_items m on m.id = e.menu_item_id
where  m.business_id = $1
order  by m.name, e.share_pct desc;


-- ══════════════════════════════════════════════════════════════
-- Q11 · Bukti sistem berjalan     [publik]   untuk demo
-- ══════════════════════════════════════════════════════════════
select target_date, ran_at, rows_upserted, status
from   ingest_runs
order  by ran_at desc
limit 14;
