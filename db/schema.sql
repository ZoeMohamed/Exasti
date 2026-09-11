-- Takar — skema database
-- Postgres 15+ (Supabase)
-- Jalankan: psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================
-- REFERENSI  (diisi sekali dari BI, jarang berubah)
-- ============================================================

-- Kategori & varian komoditas dari GetRefCommodityAndCategory
create table if not exists commodities (
  id          text primary key,             -- 'com_18'
  category_id text,                         -- 'cat_8'
  name        text        not null,         -- 'Cabai Rawit Merah'
  unit        text        not null,         -- 'kg'
  sort_order  int         default 0
);

-- Wilayah: mapping id BI -> nama yang dikenali manusia.
-- bi_regency_id NULL berarti agregat tingkat provinsi.
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

create table if not exists prices (
  commodity_id text not null references commodities(id),
  region_id    int  not null references regions(id),
  date         date not null,
  price        numeric(12,2) not null check (price >= 0),
  source       text not null default 'bi_hargapangan',
  -- true jika nilai ini hasil forward-fill (akhir pekan / libur / '-')
  is_filled    boolean not null default false,
  fetched_at   timestamptz not null default now(),
  primary key (commodity_id, region_id, date)
);

-- Query terbanyak: "harga terbaru untuk satu wilayah"
create index if not exists prices_region_date_idx
  on prices (region_id, date desc);

-- Query tren: "riwayat satu komoditas di satu wilayah"
create index if not exists prices_lookup_idx
  on prices (region_id, commodity_id, date desc);

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

create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,                -- 'Ayam Geprek'
  sell_price  numeric(12,2) not null check (sell_price > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists menu_items_business_idx
  on menu_items (business_id) where active;

-- Bahan yang HARGANYA DILACAK BI
create table if not exists recipe_items (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  commodity_id text not null references commodities(id),
  qty          numeric(10,4) not null check (qty > 0),  -- dalam commodities.unit
  note         text,
  unique (menu_item_id, commodity_id)
);

-- Biaya yang TIDAK dilacak BI: tepung, bumbu, gas, kemasan, tenaga.
-- Tanpa ini HPP terlalu rendah dan seluruh angka margin jadi bohong.
create table if not exists fixed_costs (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  label        text not null,               -- 'gas + kemasan'
  amount       numeric(12,2) not null check (amount >= 0)  -- rupiah per porsi
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
  from_data     int not null default 0,     -- bahan yang harganya dari BI
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
  driver_commodity_id text references commodities(id),   -- penyebab utama
  suggestion          jsonb,                -- {"type":"reprice","value":18500}
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists alerts_inbox_idx
  on alerts (business_id, date desc) where read_at is null;

-- ============================================================
-- VIEW BANTU
-- ============================================================

-- Harga terbaru per komoditas per wilayah — dipakai margin engine.
create or replace view latest_prices as
select distinct on (region_id, commodity_id)
       region_id, commodity_id, date, price, is_filled
from   prices
order  by region_id, commodity_id, date desc;

-- Perubahan harga 7 hari, bahan bakar trend detector & alert agent.
create or replace view price_change_7d as
select  now_p.region_id,
        now_p.commodity_id,
        c.name          as commodity_name,
        now_p.price     as price_now,
        old_p.price     as price_7d_ago,
        round(((now_p.price - old_p.price) / nullif(old_p.price,0)) * 100, 1)
                        as change_pct
from    latest_prices now_p
join    commodities c on c.id = now_p.commodity_id
left join lateral (
          select price from prices p
          where  p.region_id    = now_p.region_id
            and  p.commodity_id = now_p.commodity_id
            and  p.date        <= now_p.date - 7
          order  by p.date desc limit 1
        ) old_p on true;
