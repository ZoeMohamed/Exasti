-- Takar — hardening privilege dan RLS
--
-- Diterapkan setelah 01_migration.sql pada database yang sempat menerima
-- versi awal migrasi. Fresh database sudah mendapatkan state akhir yang sama
-- langsung dari 01_migration.sql.

create index if not exists businesses_region_idx on businesses (region_id);
create index if not exists alerts_business_idx on alerts (business_id);
create index if not exists alerts_menu_idx
  on alerts (menu_item_id) where menu_item_id is not null;

-- Hapus policy versi awal yang memakai helper SECURITY DEFINER di public.
drop policy if exists ref_baca_commodities on commodities;
drop policy if exists ref_baca_catalog on catalog_items;
drop policy if exists ref_baca_regions on regions;
drop policy if exists ref_baca_ingest on ingest_runs;
drop policy if exists warung_baca on businesses;
drop policy if exists warung_buat on businesses;
drop policy if exists warung_ubah on businesses;
drop policy if exists warung_hapus on businesses;
drop policy if exists harga_baca on prices;
drop policy if exists harga_baca_publik on prices;
drop policy if exists harga_baca_pengguna on prices;
drop policy if exists harga_tulis on prices;
drop policy if exists harga_ubah on prices;
drop policy if exists harga_hapus on prices;
drop policy if exists menu_semua on menu_items;
drop policy if exists menu_baca on menu_items;
drop policy if exists menu_buat on menu_items;
drop policy if exists menu_ubah on menu_items;
drop policy if exists menu_hapus on menu_items;
drop policy if exists resep_semua on recipe_items;
drop policy if exists resep_baca on recipe_items;
drop policy if exists resep_buat on recipe_items;
drop policy if exists resep_ubah on recipe_items;
drop policy if exists resep_hapus on recipe_items;
drop policy if exists biaya_semua on fixed_costs;
drop policy if exists biaya_baca on fixed_costs;
drop policy if exists biaya_buat on fixed_costs;
drop policy if exists biaya_ubah on fixed_costs;
drop policy if exists biaya_hapus on fixed_costs;
drop policy if exists snapshot_baca on margin_snapshots;
drop policy if exists alert_baca on alerts;
drop policy if exists alert_tandai on alerts;

drop function if exists public.punya_menu(uuid);
drop function if exists public.punya_warung(uuid);

-- Referensi publik.
create policy ref_baca_commodities on commodities for select
  to anon, authenticated using (true);
create policy ref_baca_catalog on catalog_items for select
  to anon, authenticated using (true);
create policy ref_baca_regions on regions for select
  to anon, authenticated using (true);
create policy ref_baca_ingest on ingest_runs for select
  to anon, authenticated using (true);

-- Warung hanya dapat diakses pemilik.
create policy warung_baca on businesses for select to authenticated
  using (owner_id = (select auth.uid()));
create policy warung_buat on businesses for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy warung_ubah on businesses for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy warung_hapus on businesses for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Harga publik dapat dibaca anon. Harga milik warung hanya dapat dikelola
-- pemilik warung tersebut.
create policy harga_baca_publik on prices for select to anon
  using (business_id is null);
create policy harga_baca_pengguna on prices for select to authenticated
  using (
    business_id is null or exists (
      select 1 from businesses b
      where b.id = prices.business_id
        and b.owner_id = (select auth.uid())
    )
  );
create policy harga_tulis on prices for insert to authenticated
  with check (
    business_id is not null and exists (
      select 1 from businesses b
      where b.id = prices.business_id
        and b.owner_id = (select auth.uid())
    )
  );
create policy harga_ubah on prices for update to authenticated
  using (
    business_id is not null and exists (
      select 1 from businesses b
      where b.id = prices.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    business_id is not null and exists (
      select 1 from businesses b
      where b.id = prices.business_id
        and b.owner_id = (select auth.uid())
    )
  );
create policy harga_hapus on prices for delete to authenticated
  using (
    business_id is not null and exists (
      select 1 from businesses b
      where b.id = prices.business_id
        and b.owner_id = (select auth.uid())
    )
  );

-- Menu.
create policy menu_baca on menu_items for select to authenticated
  using (exists (
    select 1 from businesses b
    where b.id = menu_items.business_id
      and b.owner_id = (select auth.uid())
  ));
create policy menu_buat on menu_items for insert to authenticated
  with check (exists (
    select 1 from businesses b
    where b.id = menu_items.business_id
      and b.owner_id = (select auth.uid())
  ));
create policy menu_ubah on menu_items for update to authenticated
  using (exists (
    select 1 from businesses b
    where b.id = menu_items.business_id
      and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from businesses b
    where b.id = menu_items.business_id
      and b.owner_id = (select auth.uid())
  ));
create policy menu_hapus on menu_items for delete to authenticated
  using (exists (
    select 1 from businesses b
    where b.id = menu_items.business_id
      and b.owner_id = (select auth.uid())
  ));

-- Resep.
create policy resep_baca on recipe_items for select to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = recipe_items.menu_item_id
      and b.owner_id = (select auth.uid())
  ));
create policy resep_buat on recipe_items for insert to authenticated
  with check (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = recipe_items.menu_item_id
      and b.owner_id = (select auth.uid())
  ));
create policy resep_ubah on recipe_items for update to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = recipe_items.menu_item_id
      and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = recipe_items.menu_item_id
      and b.owner_id = (select auth.uid())
  ));
create policy resep_hapus on recipe_items for delete to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = recipe_items.menu_item_id
      and b.owner_id = (select auth.uid())
  ));

-- Biaya tetap.
create policy biaya_baca on fixed_costs for select to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = fixed_costs.menu_item_id
      and b.owner_id = (select auth.uid())
  ));
create policy biaya_buat on fixed_costs for insert to authenticated
  with check (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = fixed_costs.menu_item_id
      and b.owner_id = (select auth.uid())
  ));
create policy biaya_ubah on fixed_costs for update to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = fixed_costs.menu_item_id
      and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = fixed_costs.menu_item_id
      and b.owner_id = (select auth.uid())
  ));
create policy biaya_hapus on fixed_costs for delete to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = fixed_costs.menu_item_id
      and b.owner_id = (select auth.uid())
  ));

create policy snapshot_baca on margin_snapshots for select to authenticated
  using (exists (
    select 1 from menu_items mi
    join businesses b on b.id = mi.business_id
    where mi.id = margin_snapshots.menu_item_id
      and b.owner_id = (select auth.uid())
  ));

create policy alert_baca on alerts for select to authenticated
  using (exists (
    select 1 from businesses b
    where b.id = alerts.business_id
      and b.owner_id = (select auth.uid())
  ));
create policy alert_tandai on alerts for update to authenticated
  using (exists (
    select 1 from businesses b
    where b.id = alerts.business_id
      and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from businesses b
    where b.id = alerts.business_id
      and b.owner_id = (select auth.uid())
  ));

-- Least privilege: default grant Supabase dapat lebih lebar daripada yang
-- dibutuhkan aplikasi, jadi cabut semuanya sebelum grant minimum.
revoke all on table
  commodities, catalog_items, regions, ingest_runs, businesses, prices,
  menu_items, recipe_items, fixed_costs, margin_snapshots, alerts, ai_cache
  from anon, authenticated;
revoke all on sequence
  regions_id_seq, ingest_runs_id_seq, margin_snapshots_id_seq
  from anon, authenticated;
revoke all on latest_prices, price_change_7d, menu_exposure
  from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on commodities, catalog_items, regions, ingest_runs
  to anon, authenticated;
grant select on prices to anon, authenticated;
grant select, insert, update, delete on
  businesses, menu_items, recipe_items, fixed_costs
  to authenticated;
grant insert, update, delete on prices to authenticated;
grant select on margin_snapshots to authenticated;
grant select on alerts to authenticated;
grant update (read_at) on alerts to authenticated;
grant select on latest_prices, price_change_7d, menu_exposure to authenticated;
