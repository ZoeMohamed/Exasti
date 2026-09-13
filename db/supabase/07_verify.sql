-- Pemeriksaan pascamigrasi. Semua baris harus bernilai true / jumlah 0.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'catalog_items'
      and column_name = 'business_id'
  ) as katalog_punya_pemilik,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipe_items'
      and column_name = 'porsi_per_kemasan'
  ) as resep_punya_input_asli,
  coalesce((
    select 'security_invoker=true' = any(reloptions)
    from pg_class where oid = 'public.resep_efektif'::regclass
  ), false) as view_memakai_rls_pemanggil;

select count(*) as katalog_tanpa_nama_normal
from public.catalog_items
where nama_normal is null;

select count(*) as resep_cara_pakai_tidak_valid
from public.recipe_items
where cara_pakai not in ('per_masak', 'per_kemasan')
   or (cara_pakai = 'per_kemasan' and (isi_kemasan <= 0 or porsi_per_kemasan <= 0));

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'catalog_items'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'catalog_items'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
