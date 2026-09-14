-- Perbaiki mapping PIHPS BI: 14 = Jawa Tengah, 35 = Kota Semarang.
-- Harga is_filled adalah turunan yang aman dibuat ulang oleh pekerjaan harian.
-- Harga BI asli tidak dihapus; sinkron 90 hari akan menimpanya secara idempoten.

begin;

do $$
begin
  if exists (
    select 1 from public.regions where id = 1
      and not (
        name = 'Kota Semarang'
        and (bi_province_id, bi_regency_id) in ((13, 1), (14, 35))
      )
  ) then
    raise exception 'Region id=1 bukan mapping Kota Semarang yang dikenali; migrasi dibatalkan.';
  end if;
  if exists (
    select 1 from public.regions
    where id <> 1 and bi_province_id = 14 and bi_regency_id = 35
  ) then
    raise exception 'Mapping BI 14/35 sudah dipakai region lain; migrasi dibatalkan.';
  end if;
end $$;

with dipindahkan as (
  update public.regions
  set bi_province_id = 14,
      bi_regency_id = 35
  where id = 1
    and name = 'Kota Semarang'
    and bi_province_id = 13
    and bi_regency_id = 1
  returning id
)
delete from public.prices
where business_id is null
  and region_id in (select id from dipindahkan)
  and is_filled = true;

commit;
