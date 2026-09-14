begin;

create table if not exists public.ai_request_limits (
  business_id uuid not null references public.businesses(id) on delete cascade,
  window_kind text not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (business_id, window_kind, window_start)
);

alter table public.ai_request_limits enable row level security;
revoke all on table public.ai_request_limits from anon, authenticated;

-- Cache lama tidak perlu disimpan selamanya. Kueri aplikasi juga membatasi
-- pembacaan cache ke 30 hari; pembersihan ini menjaga ukuran tabel tetap kecil.
delete from public.ai_cache where created_at < now() - interval '30 days';
delete from public.ai_request_limits where window_start < now() - interval '2 days';

commit;
