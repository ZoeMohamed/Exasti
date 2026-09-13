-- Takar — migrasi Supabase
-- Jalankan di SQL Editor Supabase, atau: supabase db push
--
-- Berbeda dari db/schema.sql: terhubung ke auth.users dan seluruh tabel
-- dilindungi Row Level Security. Ini yang memenuhi NFR-13.

create extension if not exists "pgcrypto";

-- ══════════════════════════════════════════════════════════════
-- REFERENSI PUBLIK  — dibaca semua orang, ditulis service role
-- ══════════════════════════════════════════════════════════════

create table if not exists commodities (
  id          text primary key,
  category_id text,
  name        text not null,
  unit        text not null,
  sort_order  int  default 0
);

-- CINCIN 2. Di Cincin 1, hasil OCR hanya mengisi fixed_costs.
create table if not exists catalog_items (
  id       text primary key,
  name     text not null,
  unit     text not null,          -- satuan DASAR untuk normalisasi (BR-11)
  approved boolean not null default true
);

create table if not exists regions (
  id             serial primary key,
  bi_province_id int  not null,
  bi_regency_id  int,
  name           text not null,
  level          text not null check (level in ('province','regency')),
  unique (bi_province_id, bi_regency_id)
);

-- ══════════════════════════════════════════════════════════════
-- WARUNG  — terhubung ke auth.users
-- ══════════════════════════════════════════════════════════════

create table if not exists businesses (
  id         uuid primary key default gen_random_uuid(),
  -- INI yang membuat NFR-13 bisa ditegakkan. Tanpa kolom ini,
  -- RLS tidak punya apa pun untuk dipakai.
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'Warungku',
  region_id  int  not null references regions(id),
  packaging_mode text not null default 'mixed'
    check (packaging_mode in ('dine_in','takeaway','mixed')),
  created_at timestamptz not null default now()
);

create index if not exists businesses_owner_idx on businesses (owner_id);

-- ══════════════════════════════════════════════════════════════
-- HARGA  — satu tabel untuk BI dan harga milik warung
-- ══════════════════════════════════════════════════════════════

create table if not exists prices (
  commodity_id text not null,
  region_id    int  not null references regions(id),
  business_id  uuid references businesses(id) on delete cascade,  -- NULL = publik BI
  date         date not null,
  price        numeric(12,2) not null check (price >= 0),
  source       text not null default 'bi_hargapangan'
               check (source in ('bi_hargapangan','manual','nota_ocr')),
  is_filled    boolean not null default false,
  filled_from_date date,
  fetched_at   timestamptz not null default now()
);

alter table prices add constraint prices_filled_source_ck check (
  (not is_filled and filled_from_date is null)
  or (is_filled and filled_from_date is not null and filled_from_date < date)
);

-- PK parsial: business_id NULL tidak bisa jadi bagian PK biasa,
-- jadi dipisah menjadi dua unique index.
create unique index if not exists prices_publik_uniq
  on prices (commodity_id, region_id, date) where business_id is null;
create unique index if not exists prices_warung_uniq
  on prices (commodity_id, region_id, date, business_id) where business_id is not null;

create index if not exists prices_lookup_idx
  on prices (region_id, commodity_id, date desc);
create index if not exists prices_business_idx
  on prices (business_id, commodity_id, date desc) where business_id is not null;

create table if not exists ingest_runs (
  id            bigserial primary key,
  ran_at        timestamptz not null default now(),
  target_date   date not null,
  region_count  int  not null default 0,
  rows_upserted int  not null default 0,
  status        text not null check (status in ('ok','partial','failed')),
  message       text
);

-- ══════════════════════════════════════════════════════════════
-- MENU & RESEP
-- ══════════════════════════════════════════════════════════════

create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  sell_price  numeric(12,2) not null check (sell_price > 0),
  batch_yield int  not null default 1 check (batch_yield > 0),
  weekly_volume int check (weekly_volume >= 0),   -- BR-14, NULL = belum ditanya
  active      boolean not null default true,      -- BR-15, tetap direcompute
  created_at  timestamptz not null default now()
);

create index if not exists menu_items_business_idx on menu_items (business_id);

create table if not exists recipe_items (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  commodity_id text not null,
  batch_qty    numeric(12,4) not null check (batch_qty > 0),   -- angka asli pemilik
  qty          numeric(12,6) not null check (qty > 0),         -- turunan per porsi (BR-08)
  note         text,
  unique (menu_item_id, commodity_id)
);

create index if not exists recipe_items_menu_idx on recipe_items (menu_item_id);

create table if not exists fixed_costs (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  label        text not null,
  amount       numeric(12,2) not null check (amount >= 0),
  pack_price   numeric(12,2),
  pack_qty     numeric(12,4),
  usage_qty    numeric(12,4) default 1,
  is_estimated boolean not null default false,
  updated_at   timestamptz not null default now()
);

create index if not exists fixed_costs_menu_idx on fixed_costs (menu_item_id);

-- ══════════════════════════════════════════════════════════════
-- HASIL PERHITUNGAN
-- ══════════════════════════════════════════════════════════════

create table if not exists margin_snapshots (
  id            bigserial primary key,
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  date          date not null,
  hpp           numeric(12,2) not null,
  sell_price    numeric(12,2) not null,
  margin_pct    numeric(6,2)  not null,
  from_data     int not null default 0,
  missing_count int not null default 0,
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
  headline            text not null,
  detail              text,
  driver_commodity_id text,
  suggestion          jsonb,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists alerts_inbox_idx
  on alerts (business_id, date desc) where read_at is null;

create table if not exists ai_cache (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  input_hash text not null,
  output     jsonb not null,
  created_at timestamptz not null default now(),
  unique (kind, input_hash)
);

-- ══════════════════════════════════════════════════════════════
-- PEMBANTU KEPEMILIKAN
-- security definer supaya kebijakan tidak memicu RLS berulang
-- ══════════════════════════════════════════════════════════════

create or replace function public.punya_warung(b uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from businesses where id = b and owner_id = auth.uid()
  );
$$;

create or replace function public.punya_menu(m uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = m and b.owner_id = auth.uid()
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY  — NFR-13
-- ══════════════════════════════════════════════════════════════

alter table commodities      enable row level security;
alter table catalog_items    enable row level security;
alter table regions          enable row level security;
alter table ingest_runs      enable row level security;
alter table businesses       enable row level security;
alter table prices           enable row level security;
alter table menu_items       enable row level security;
alter table recipe_items     enable row level security;
alter table fixed_costs      enable row level security;
alter table margin_snapshots enable row level security;
alter table alerts           enable row level security;
alter table ai_cache         enable row level security;

-- Referensi publik: siapa pun boleh baca, tidak ada yang boleh tulis.
-- (service role melewati RLS, jadi cron tetap bisa mengisi)
create policy ref_baca_commodities   on commodities   for select using (true);
create policy ref_baca_catalog       on catalog_items for select using (true);
create policy ref_baca_regions       on regions       for select using (true);

-- ingest_runs sengaja bisa dibaca publik: ini bukti sistem berjalan harian,
-- dan dipakai saat demo di depan juri.
create policy ref_baca_ingest        on ingest_runs   for select using (true);

-- Warung: hanya pemiliknya.
create policy warung_baca   on businesses for select using (owner_id = auth.uid());
create policy warung_buat   on businesses for insert with check (owner_id = auth.uid());
create policy warung_ubah   on businesses for update using (owner_id = auth.uid())
                                          with check (owner_id = auth.uid());
create policy warung_hapus  on businesses for delete using (owner_id = auth.uid());

-- Harga: baris publik BI dibaca siapa saja; baris milik warung hanya pemiliknya.
create policy harga_baca on prices for select
  using (business_id is null or punya_warung(business_id));
create policy harga_tulis on prices for insert
  with check (business_id is not null and punya_warung(business_id));
create policy harga_ubah on prices for update
  using (business_id is not null and punya_warung(business_id))
  with check (business_id is not null and punya_warung(business_id));
create policy harga_hapus on prices for delete
  using (business_id is not null and punya_warung(business_id));

-- Menu dan turunannya.
create policy menu_semua on menu_items for all
  using (punya_warung(business_id)) with check (punya_warung(business_id));

create policy resep_semua on recipe_items for all
  using (punya_menu(menu_item_id)) with check (punya_menu(menu_item_id));

create policy biaya_semua on fixed_costs for all
  using (punya_menu(menu_item_id)) with check (punya_menu(menu_item_id));

-- Snapshot: dibaca pemilik, ditulis service role (job recompute).
create policy snapshot_baca on margin_snapshots for select
  using (punya_menu(menu_item_id));

-- Alert: dibaca pemilik; pemilik boleh menandai sudah dibaca.
create policy alert_baca on alerts for select using (punya_warung(business_id));
create policy alert_tandai on alerts for update
  using (punya_warung(business_id)) with check (punya_warung(business_id));

-- ai_cache: hanya service role. Tanpa policy = tidak ada akses dari klien.

-- ══════════════════════════════════════════════════════════════
-- HAK AKSES PERAN
-- ══════════════════════════════════════════════════════════════
-- Di Supabase, RLS saja TIDAK CUKUP. Peran juga butuh hak tabel —
-- tanpa ini hasilnya "permission denied" meski policy sudah benar.
-- Default privileges Supabase biasanya menutupinya kalau migrasi
-- dijalankan sebagai postgres, tapi ditulis eksplisit supaya pasti.

grant usage on schema public to anon, authenticated;

-- Referensi publik: baca saja, termasuk untuk pengunjung belum login.
grant select on commodities, catalog_items, regions, ingest_runs
  to anon, authenticated;

-- Data warung: hanya pengguna terautentikasi. RLS yang menyaring barisnya.
grant select, insert, update, delete on
  businesses, menu_items, recipe_items, fixed_costs, prices
  to authenticated;

grant select on margin_snapshots to authenticated;
grant select, update on alerts to authenticated;   -- update = tandai sudah dibaca

grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.punya_warung(uuid), public.punya_menu(uuid)
  to authenticated;

-- ai_cache sengaja tidak diberi hak apa pun: hanya service role.

-- ══════════════════════════════════════════════════════════════
-- VIEW
-- ══════════════════════════════════════════════════════════════

-- Harga berlaku terakhir per (komoditas, wilayah, pemilik).
-- Baris publik dan baris warung dipisahkan oleh business_id.
create or replace view latest_prices
with (security_invoker = true) as
select distinct on (
         region_id, commodity_id,
         coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid))
       region_id, commodity_id, business_id, date, price, is_filled, source
from   prices
order  by region_id, commodity_id,
          coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
          date desc;

-- Perubahan 7 hari — bahan bakar BR-04.
create or replace view price_change_7d
with (security_invoker = true) as
select  lp.region_id,
        lp.business_id,
        lp.commodity_id,
        coalesce(c.name, ci.name) as commodity_name,
        lp.price      as price_now,
        lama.price    as price_7d_ago,
        round(((lp.price - lama.price) / nullif(lama.price, 0)) * 100, 1) as change_pct
from    latest_prices lp
left join commodities   c  on c.id  = lp.commodity_id
left join catalog_items ci on ci.id = lp.commodity_id
left join lateral (
          select price from prices p
          where  p.region_id    = lp.region_id
            and  p.commodity_id = lp.commodity_id
            and  p.date        <= lp.date - 7
            and  p.business_id is not distinct from lp.business_id
          order  by p.date desc limit 1
        ) lama on true;

-- Peta eksposur: persentase modal tiap menu per bahan (Cincin 1).
create or replace view menu_exposure
with (security_invoker = true) as
with biaya as (
  select r.menu_item_id, r.commodity_id, r.qty * lp.price as biaya_bahan
  from   recipe_items r
  join   menu_items  m on m.id = r.menu_item_id
  join   businesses  b on b.id = m.business_id
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
       ), 0)) * 100, 1) as share_pct
from   biaya b
join   total t on t.menu_item_id = b.menu_item_id
left join commodities   c  on c.id  = b.commodity_id
left join catalog_items ci on ci.id = b.commodity_id;

-- View memakai security_invoker, jadi RLS pemanggil tetap berlaku.
grant select on latest_prices, price_change_7d, menu_exposure to authenticated;
