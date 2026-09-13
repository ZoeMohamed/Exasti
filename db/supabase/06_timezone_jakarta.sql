-- Takar memakai waktu operasional Indonesia Barat (WIB / UTC+7).
-- Pengaturan database berlaku otomatis untuk koneksi baru. Kolom timestamptz
-- tetap menyimpan waktu absolut dan hanya ditampilkan dalam Asia/Jakarta.

do $$
begin
  execute format(
    'alter database %I set timezone to %L',
    current_database(),
    'Asia/Jakarta'
  );
end
$$;
