-- Takar — skema database
-- Postgres 15+ (Supabase)
-- Jalankan: psql "$DATABASE_URL" -f db/schema.sql
--
-- Cincin 0 (MVP inti)  : commodities, regions, prices, businesses,
--                        menu_items, recipe_items, fixed_costs,
--                        margin_snapshots, alerts, ingest_runs
-- Cincin 2 (backlog)   : catalog_items  — lihat catatan di bawah

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================
-- REFERENSI  (diisi sekali, jarang berubah)
-- ============================================================

-- 21 varian komoditas dari GetRefCommodityAndCategory (BI)
create table if not exists commodities (
  id          text primary key,             -- 'com_18'
  category_id text,                         -- 'cat_8'
  name        text        not null,         -- 'Cabai Rawit Merah'
  unit        text        not null,         -- 'kg'
  sort_order  int         default 0
);

-- Barang di luar 21 komoditas BI, dipilih pemilik dari katalog.
-- CINCIN 2 — jangan dibangun sebelum Cincin 0 dan 1 selesai.
-- Di Cincin 1, hasil OCR nota hanya mengisi fixed_costs tanpa identitas
-- katalog. Pelacakan tren barang non-BI (BR-11 normalisasi satuan,
-- BR-12 identitas) menunggu tabel ini.
-- PENTING: satuan_dasar menentukan normalisasi. Kemasan 1 kg dan 500 g
-- hanya sebanding setelah dijadikan harga per gram.
-- Katalognya dikurasi tim (±20 item awal), tumbuh dari pemakaian.
create table if not exists catalog_items (
  id          text primary key,             -- 'cat_tepung_terigu'
  name        text not null,                -- 'Tepung Terigu'
  unit        text not null,                -- 'kg'
  approved    boolean not null default true -- false = masih antrian tinjau
);

-- Wilayah: mapping id BI -> nama yang dikenali manusia.
-- bi_regency_id NULL = agregat tingkat provinsi.
create table if not exists regions (
  id             serial primary key,
  bi_province_id int  not null,
  bi_regency_id  int,
  name           text not null,             -- 'Kota Semarang'
  level          text not null check (level in ('province','regency')),
  unique (bi_province_id, bi_regency_id)
);

-- ============================================================
-- TIME-SERIES HARGA  (inti sistem)
-- ============================================================

-- Satu tabel untuk SEMUA harga, apa pun sumbernya.
--   business_id NULL  -> data publik BI, dipakai bersama
--   business_id terisi-> harga yang dicatat warung itu sendiri
-- Akibatnya BR-04 berlaku seragam: barang custom pun bisa jadi
-- pendorong, dan riwayatnya ikut tersimpan tanpa tabel tambahan.
create table if not exists prices (
  commodity_id text not null,               -- id commodities ATAU catalog_items
  region_id    int  not null references regions(id),
  business_id  uuid,                        -- NULL = publik
  date         date not null,
  price        numeric(12,2) not null check (price >= 0),
  source       text not null default 'bi_hargapangan',
                                            -- 'bi_hargapangan' | 'manual' | 'nota_ocr'
  is_filled    boolean not null default false,  -- true = hasil forward-fill
  fetched_at   timestamptz not null default now(),
  primary key (commodity_id, region_id, date, business_id)
);

-- "harga terbaru untuk satu wilayah"
create index if not exists prices_region_date_idx
  on prices (region_id, date desc);

-- "riwayat satu komoditas di satu wilayah"
create index if not exists prices_lookup_idx
  on prices (region_id, commodity_id, date desc);

-- harga milik satu warung
create index if not exists prices_business_idx
  on prices (business_id, commodity_id, date desc) where business_id is not null;

-- Audit trail ingestion. Bukan sekadar debugging — ini bukti ke juri
-- bahwa sistem berjalan harian, bukan dihitung saat demo.
create table if not exists ingest_runs (
  id            bigserial primary key,
  ran_at        timestamptz not null default now(),
  target_date   date not null,
  region_count  int  not null default 0,
  rows_upserted int  not null default 0,
  status        text not null check (status in ('ok','partial','failed')),
  message       text
);

-- ============================================================
-- TENANT: WARUNG & MENU
-- ============================================================

create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                -- 'Warung Bu Sri'
  region_id   int  not null references regions(id),
  owner_email text,
  created_at  timestamptz not null default now()
);

-- batch_yield = berapa porsi sekali masak.
-- Pemilik berpikir dalam satuan ini; jangan pernah memintanya
-- menghitung takaran per porsi sendiri.
create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,                -- 'Ayam Geprek'
  sell_price  numeric(12,2) not null check (sell_price > 0),
  batch_yield int  not null default 1 check (batch_yield > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists menu_items_business_idx
  on menu_items (business_id) where active;

-- batch_qty = jumlah sekali masak, dalam satuan asli (2 kg ayam).
-- qty per porsi = batch_qty / menu_items.batch_yield, dihitung saat simpan.
-- Keduanya disimpan supaya saat pemilik mengedit, yang ditampilkan
-- kembali adalah angkanya sendiri ("2 kg, 8 porsi"), bukan 0,25.
create table if not exists recipe_items (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  commodity_id text not null,               -- commodities ATAU catalog_items
  batch_qty    numeric(12,4) not null check (batch_qty > 0),
  qty          numeric(12,6) not null check (qty > 0),   -- turunan per porsi
  note         text,
  unique (menu_item_id, commodity_id)
);

-- Biaya tanpa harga pasar: gas, kemasan, tenaga.
-- pack_price/pack_qty opsional — kalau diisi, amount dihitung dari keduanya
-- supaya pemilik cukup bilang "satu botol Rp 22.000, isi 340 g, pakai 15 g".
create table if not exists fixed_costs (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  label        text not null,               -- 'gas + kemasan'
  amount       numeric(12,2) not null check (amount >= 0),  -- rupiah per porsi
  pack_price   numeric(12,2),               -- Rp 22.000
  pack_qty     numeric(12,4),               -- 340
  usage_qty    numeric(12,4),               -- 15
  is_estimated boolean not null default false,  -- true = perkiraan sistem
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- HASIL PERHITUNGAN
-- ============================================================

create table if not exists margin_snapshots (
  id            bigserial primary key,
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  date          date not null,
  hpp           numeric(12,2) not null,
  sell_price    numeric(12,2) not null,     -- disalin: harga jual bisa berubah
  margin_pct    numeric(6,2)  not null,
  from_data     int not null default 0,     -- bahan berharga otomatis
  missing_count int not null default 0,     -- bahan tanpa harga hari itu
  created_at    timestamptz not null default now(),
  unique (menu_item_id, date)
);

create index if not exists margin_snapshots_history_idx
  on margin_snapshots (menu_item_id, date desc);

create table if not exists alerts (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  menu_item_id        uuid references menu_items(id) on delete cascade,
  date                date not null,
  severity            text not null check (severity in ('info','warning','critical')),
  headline            text not null,        -- satu kalimat, bahasa sehari-hari
  detail              text,
  driver_commodity_id text,                 -- penyebab utama (BR-04)
  suggestion          jsonb,                -- {"type":"reprice","value":20000}
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists alerts_inbox_idx
  on alerts (business_id, date desc) where read_at is null;

-- Cache hasil panggilan AI. WAJIB: demo tidak boleh bergantung
-- pada panggilan live. Lihat NFR-19 di docs/06-SRS.md.
create table if not exists ai_cache (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,                 -- 'nota_ocr' | 'alert_select' | 'suggest'
  input_hash text not null,
  output     jsonb not null,
  created_at timestamptz not null default now(),
  unique (kind, input_hash)
);

-- ============================================================
-- VIEW BANTU
-- ============================================================

-- Harga berlaku per komoditas per wilayah, dengan prioritas:
--   1. harga milik warung sendiri   2. harga publik BI
create or replace view latest_prices as
select distinct on (region_id, commodity_id, coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid))
       region_id, commodity_id, business_id, date, price, is_filled, source
from   prices
order  by region_id, commodity_id,
          coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
          date desc;

-- Perubahan harga 7 hari — bahan bakar BR-04 dan alert.
create or replace view price_change_7d as
select  now_p.region_id,
        now_p.business_id,
        now_p.commodity_id,
        coalesce(c.name, ci.name) as commodity_name,
        now_p.price     as price_now,
        old_p.price     as price_7d_ago,
        round(((now_p.price - old_p.price) / nullif(old_p.price,0)) * 100, 1)
                        as change_pct
from    latest_prices now_p
left join commodities   c  on c.id  = now_p.commodity_id
left join catalog_items ci on ci.id = now_p.commodity_id
left join lateral (
          select price from prices p
          where  p.region_id    = now_p.region_id
            and  p.commodity_id = now_p.commodity_id
            and  p.date        <= now_p.date - 7
            and  (p.business_id is not distinct from now_p.business_id)
          order  by p.date desc limit 1
        ) old_p on true;

-- Peta eksposur: berapa persen HPP tiap menu berasal dari tiap komoditas.
-- Dipakai halaman "Peta Eksposur" (Cincin 1).
create or replace view menu_exposure as
with biaya as (
  select r.menu_item_id, r.commodity_id, r.qty * lp.price as biaya_bahan
  from   recipe_items r
  join   menu_items m  on m.id = r.menu_item_id
  join   businesses b  on b.id = m.business_id
  join   latest_prices lp
         on lp.commodity_id = r.commodity_id
        and lp.region_id    = b.region_id
        and (lp.business_id is null or lp.business_id = b.id)
),
total as (
  select menu_item_id, sum(biaya_bahan) as bahan_total
  from   biaya group by menu_item_id
)
select b.menu_item_id,
       b.commodity_id,
       coalesce(c.name, ci.name) as commodity_name,
       round((b.biaya_bahan / nullif(t.bahan_total + coalesce(
         (select sum(amount) from fixed_costs f where f.menu_item_id = b.menu_item_id), 0
       ),0)) * 100, 1) as share_pct
from   biaya b
join   total t on t.menu_item_id = b.menu_item_id
left join commodities   c  on c.id  = b.commodity_id
left join catalog_items ci on ci.id = b.commodity_id;
