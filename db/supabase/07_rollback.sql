-- Rollback kompatibilitas akses katalog. Kolom aditif sengaja dipertahankan.
drop policy if exists katalog_baca_publik on public.catalog_items;
drop policy if exists katalog_baca_pengguna on public.catalog_items;
drop policy if exists katalog_tulis on public.catalog_items;
drop policy if exists katalog_ubah on public.catalog_items;
drop policy if exists katalog_hapus on public.catalog_items;
drop policy if exists ref_baca_catalog on public.catalog_items;

create policy ref_baca_catalog on public.catalog_items
  for select to anon, authenticated using (true);

revoke all on public.catalog_items from anon, authenticated;
grant select on public.catalog_items to anon, authenticated;
