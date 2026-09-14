-- Panduan awal Takar untuk pemilik warung baru.
--
-- Aman dijalankan ulang. Warung yang sudah ada sebelum fitur ini dirilis
-- ditandai selesai agar panduan tidak tiba-tiba mengganggu pengguna lama.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'onboarding_step'
  ) then
    alter table public.businesses
      add column onboarding_step smallint not null default 1
      check (onboarding_step between 1 and 5),
      add column onboarding_completed_at timestamptz;

    update public.businesses
    set onboarding_step = 5,
        onboarding_completed_at = now();
  end if;
end
$$;

comment on column public.businesses.onboarding_step is
  'Tahap panduan awal terakhir yang sudah dicapai pemilik warung (1–5).';
comment on column public.businesses.onboarding_completed_at is
  'Waktu panduan awal dituntaskan; NULL berarti masih dapat dilanjutkan.';
