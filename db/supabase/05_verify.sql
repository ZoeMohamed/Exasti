-- Takar — verifikasi schema, privilege, constraint, view, dan RLS.
-- Seluruh fixture berada dalam transaksi dan selalu di-rollback.
-- Jalankan:
--   psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/supabase/05_verify.sql

begin;

create function pg_temp.assert_true(ok boolean, label text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then
    raise exception 'ASSERT FAILED: %', label;
  end if;
end $$;

create function pg_temp.assert_eq(actual bigint, expected bigint, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERT FAILED [%]: expected %, got %', label, expected, actual;
  end if;
end $$;

create function pg_temp.assert_numeric(
  actual numeric,
  expected numeric,
  tolerance numeric,
  label text
)
returns void language plpgsql as $$
begin
  if actual is null or abs(actual - expected) > tolerance then
    raise exception 'ASSERT FAILED [%]: expected % ± %, got %',
      label, expected, tolerance, actual;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Struktur dan keamanan statis
-- ─────────────────────────────────────────────────────────────

select pg_temp.assert_true(
  current_setting('TimeZone') = 'Asia/Jakarta',
  'timezone database adalah Asia/Jakarta (WIB)'
);

select pg_temp.assert_eq((
  select count(*)
  from (values
    ('commodities'), ('catalog_items'), ('regions'), ('businesses'),
    ('prices'), ('ingest_runs'), ('menu_items'), ('recipe_items'),
    ('fixed_costs'), ('margin_snapshots'), ('alerts'), ('ai_cache')
  ) required(name)
  where to_regclass('public.' || required.name) is not null
), 12, 'semua tabel arsitektur tersedia');

select pg_temp.assert_eq((
  select count(*)
  from (values ('latest_prices'), ('price_change_7d'), ('menu_exposure')) required(name)
  where to_regclass('public.' || required.name) is not null
), 3, 'semua view arsitektur tersedia');

select pg_temp.assert_eq((
  select count(*)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity
), 0, 'RLS aktif pada seluruh tabel public');

select pg_temp.assert_eq((
  select count(*)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and not coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
), 0, 'semua view public memakai security_invoker');

select pg_temp.assert_eq((
  select count(*)
  from pg_policies
  where schemaname = 'public' and 'public' = any(roles)
), 0, 'tidak ada policy tenant yang berlaku ke role public');

select pg_temp.assert_eq((
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
), 0, 'tidak ada SECURITY DEFINER pada schema public');

select pg_temp.assert_eq((
  select count(*)
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
    )
), 0, 'seluruh foreign key memiliki index');

select pg_temp.assert_true(exists (
  select 1 from pg_constraint
  where conrelid = 'public.prices'::regclass and contype = 'p'
), 'prices memiliki primary key untuk Data API');

select pg_temp.assert_true(exists (
  select 1 from pg_constraint
  where conrelid = 'public.prices'::regclass
    and conname = 'prices_source_owner_check'
), 'source harga konsisten dengan kepemilikan');

select pg_temp.assert_true(exists (
  select 1 from pg_constraint
  where conrelid = 'public.regions'::regclass
    and conname = 'regions_level_regency_check'
), 'level wilayah konsisten dengan regency_id');

-- Privilege aktual harus sama persis dengan matriks minimum berikut.
with expected(grantee, table_name, privilege_type) as (values
  ('anon','commodities','SELECT'),
  ('anon','catalog_items','SELECT'),
  ('anon','regions','SELECT'),
  ('anon','ingest_runs','SELECT'),
  ('anon','prices','SELECT'),
  ('authenticated','commodities','SELECT'),
  ('authenticated','catalog_items','SELECT'),
  ('authenticated','regions','SELECT'),
  ('authenticated','ingest_runs','SELECT'),
  ('authenticated','prices','SELECT'),
  ('authenticated','prices','INSERT'),
  ('authenticated','prices','UPDATE'),
  ('authenticated','prices','DELETE'),
  ('authenticated','businesses','SELECT'),
  ('authenticated','businesses','INSERT'),
  ('authenticated','businesses','UPDATE'),
  ('authenticated','businesses','DELETE'),
  ('authenticated','menu_items','SELECT'),
  ('authenticated','menu_items','INSERT'),
  ('authenticated','menu_items','UPDATE'),
  ('authenticated','menu_items','DELETE'),
  ('authenticated','recipe_items','SELECT'),
  ('authenticated','recipe_items','INSERT'),
  ('authenticated','recipe_items','UPDATE'),
  ('authenticated','recipe_items','DELETE'),
  ('authenticated','fixed_costs','SELECT'),
  ('authenticated','fixed_costs','INSERT'),
  ('authenticated','fixed_costs','UPDATE'),
  ('authenticated','fixed_costs','DELETE'),
  ('authenticated','margin_snapshots','SELECT'),
  ('authenticated','alerts','SELECT'),
  ('authenticated','latest_prices','SELECT'),
  ('authenticated','price_change_7d','SELECT'),
  ('authenticated','menu_exposure','SELECT')
), actual as (
  select grantee, table_name, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
), delta as (
  (select * from actual except select * from expected)
  union all
  (select * from expected except select * from actual)
)
select pg_temp.assert_eq((select count(*) from delta), 0,
  'privilege anon/authenticated mengikuti least privilege');

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.ai_cache', 'select') and
  not has_table_privilege('authenticated', 'public.ai_cache', 'select'),
  'ai_cache hanya dapat diakses service role'
);

select pg_temp.assert_true(
  has_column_privilege('authenticated', 'public.alerts', 'read_at', 'update') and
  not has_column_privilege('authenticated', 'public.alerts', 'headline', 'update') and
  not has_column_privilege('authenticated', 'public.alerts', 'severity', 'update'),
  'pengguna hanya boleh mengubah read_at pada alert'
);

-- ─────────────────────────────────────────────────────────────
-- Fixture dua tenant
-- ─────────────────────────────────────────────────────────────

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-a@example.invalid', '', now(), now()),
  ('22222222-2222-4222-8222-222222222222',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-b@example.invalid', '', now(), now());

insert into regions (id, bi_province_id, bi_regency_id, name, level)
values (-2000000001, 99999, 1, 'RLS Test Region', 'regency');

insert into commodities (id, name, unit)
values ('__rls_test_commodity__', 'Test Commodity', 'kg');

insert into businesses (id, owner_id, name, region_id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111', 'A', -2000000001),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '22222222-2222-4222-8222-222222222222', 'B', -2000000001);

insert into menu_items (id, business_id, name, sell_price, batch_yield)
values
  ('aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Menu A', 10000, 10),
  ('bbbbbbbb-0000-4000-8000-000000000001',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Menu B', 10000, 10);

insert into recipe_items (id, menu_item_id, commodity_id, batch_qty, qty)
values
  ('aaaaaaaa-0000-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000001', '__rls_test_commodity__', 1, 0.1),
  ('bbbbbbbb-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000001', '__rls_test_commodity__', 1, 0.1);

insert into fixed_costs (id, menu_item_id, label, amount)
values
  ('aaaaaaaa-0000-4000-8000-000000000003',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Gas', 100),
  ('bbbbbbbb-0000-4000-8000-000000000003',
   'bbbbbbbb-0000-4000-8000-000000000001', 'Gas', 100);

insert into prices (commodity_id, region_id, business_id, date, price, source)
values
  ('__rls_test_commodity__', -2000000001, null,
   '2098-12-24', 10000, 'bi_hargapangan'),
  ('__rls_test_commodity__', -2000000001, null,
   '2099-01-01', 12000, 'bi_hargapangan'),
  ('__rls_test_commodity__', -2000000001,
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2098-12-24', 9000, 'manual'),
  ('__rls_test_commodity__', -2000000001,
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2098-12-24', 8000, 'manual');

insert into margin_snapshots
  (id, menu_item_id, date, hpp, sell_price, margin_pct)
values
  (-9001, 'aaaaaaaa-0000-4000-8000-000000000001',
   '2099-01-01', 2000, 10000, 80),
  (-9002, 'bbbbbbbb-0000-4000-8000-000000000001',
   '2099-01-01', 2000, 10000, 80);

insert into alerts (id, business_id, menu_item_id, date, severity, headline)
values
  ('aaaaaaaa-0000-4000-8000-000000000004',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-0000-4000-8000-000000000001',
   '2099-01-01', 'warning', 'A'),
  ('bbbbbbbb-0000-4000-8000-000000000004',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'bbbbbbbb-0000-4000-8000-000000000001',
   '2099-01-01', 'warning', 'B');

insert into ai_cache (id, kind, input_hash, output)
values ('aaaaaaaa-0000-4000-8000-000000000005', 'test', 'test', '{}');

-- ─────────────────────────────────────────────────────────────
-- Constraint negatif
-- ─────────────────────────────────────────────────────────────

do $$
begin
  begin
    insert into regions (id, bi_province_id, bi_regency_id, name, level)
    values (-2000000002, 99998, null, 'Invalid', 'regency');
    raise exception 'ASSERT FAILED: region regency tanpa regency_id diterima';
  exception when check_violation then null;
  end;

  begin
    insert into prices (commodity_id, region_id, business_id, date, price, source)
    values ('__rls_test_commodity__', -2000000001, null,
            '2099-01-02', 1, 'manual');
    raise exception 'ASSERT FAILED: harga manual publik diterima';
  exception when check_violation then null;
  end;

  begin
    insert into prices (commodity_id, region_id, business_id, date, price, source)
    values ('__rls_test_commodity__', -2000000001, null,
            '2099-01-01', 1, 'bi_hargapangan');
    raise exception 'ASSERT FAILED: duplikat harga BI diterima';
  exception when unique_violation then null;
  end;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Akses anon
-- ─────────────────────────────────────────────────────────────

set local role anon;
select pg_temp.assert_eq((
  select count(*) from commodities where id = '__rls_test_commodity__'
), 1, 'anon membaca referensi');
select pg_temp.assert_eq((
  select count(*) from prices where commodity_id = '__rls_test_commodity__'
), 2, 'anon hanya melihat harga publik');
reset role;

-- ─────────────────────────────────────────────────────────────
-- Akses tenant A
-- ─────────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select pg_temp.assert_eq((select count(*) from businesses), 1,
  'tenant A hanya melihat bisnis A');
select pg_temp.assert_eq((select count(*) from menu_items), 1,
  'tenant A hanya melihat menu A');
select pg_temp.assert_eq((select count(*) from recipe_items), 1,
  'tenant A hanya melihat resep A');
select pg_temp.assert_eq((select count(*) from fixed_costs), 1,
  'tenant A hanya melihat biaya A');
select pg_temp.assert_eq((
  select count(*) from prices where commodity_id = '__rls_test_commodity__'
), 3, 'tenant A melihat harga publik dan miliknya');
select pg_temp.assert_eq((select count(*) from margin_snapshots), 1,
  'tenant A hanya melihat snapshot A');
select pg_temp.assert_eq((select count(*) from alerts), 1,
  'tenant A hanya melihat alert A');
select pg_temp.assert_eq((
  select count(*) from latest_prices
  where commodity_id = '__rls_test_commodity__'
), 2, 'latest_prices menghormati RLS');
select pg_temp.assert_eq((select count(*) from menu_exposure), 1,
  'menu_exposure tidak menggandakan harga BI dan harga warung');
select pg_temp.assert_numeric((
  select share_pct from menu_exposure
  where menu_item_id = 'aaaaaaaa-0000-4000-8000-000000000001'
), 91.5, 0.05, 'menu_exposure memakai harga efektif BR-09');

do $$
begin
  begin
    insert into businesses (id, owner_id, name, region_id)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa99',
      '22222222-2222-4222-8222-222222222222',
      'Forbidden', -2000000001
    );
    raise exception 'ASSERT FAILED: tenant A dapat membuat bisnis untuk B';
  exception when insufficient_privilege then null;
  end;

  begin
    update businesses
    set owner_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'ASSERT FAILED: tenant A dapat memindahkan kepemilikan';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into menu_items (id, business_id, name, sell_price)
    values (
      'aaaaaaaa-0000-4000-8000-000000000099',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Forbidden', 10000
    );
    raise exception 'ASSERT FAILED: tenant A dapat menulis menu B';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Pastikan fixture tidak akan tertinggal setelah pengujian.
select pg_temp.assert_eq((
  select count(*) from auth.users where email like 'rls-%@example.invalid'
), 2, 'fixture pengujian berada di transaksi');

select 'TAKAR DATABASE TESTS: PASS' as result;
rollback;
