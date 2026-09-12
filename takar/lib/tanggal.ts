// lib/tanggal.ts
// Postgres mengembalikan kolom `date` sebagai Date tengah malam WAKTU LOKAL.
// Memanggil toISOString() menggesernya ke UTC dan bisa memundurkan satu hari —
// tanggal 11 Sep tersimpan tampil jadi 10 Sep. Selalu pakai komponen lokal.

export function keIsoTanggal(nilai: Date | string | null | undefined): string | null {
  if (!nilai) return null;
  if (typeof nilai === "string") return nilai.slice(0, 10);
  const t = nilai.getFullYear();
  const b = String(nilai.getMonth() + 1).padStart(2, "0");
  const h = String(nilai.getDate()).padStart(2, "0");
  return `${t}-${b}-${h}`;
}

const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export function tanggalIndonesia(nilai: Date | string | null | undefined): string {
  const iso = keIsoTanggal(nilai);
  if (!iso) return "—";
  const [t, b, h] = iso.split("-");
  return `${Number(h)} ${BULAN[Number(b) - 1]} ${t}`;
}

/** Zona waktu warung. Database Supabase juga disetel ke sini. */
export const ZONA_WARUNG = "Asia/Jakarta";

/**
 * Tanggal hari ini menurut Jakarta, bukan menurut jam server.
 *
 * new Date() memberi tanggal di zona tempat proses kebetulan berjalan.
 * Di Vercel itu UTC, yang tujuh jam di belakang WIB — antara pukul 00:00
 * dan 07:00 WIB, server masih menganggap kemarin. Snapshot harian dan
 * alert akan tertulis ke tanggal yang salah, dan tidak akan cocok dengan
 * current_date di SQL yang kini memakai Asia/Jakarta.
 *
 * 'sv-SE' dipakai karena format bakunya sudah YYYY-MM-DD.
 */
export function hariIniJakarta(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA_WARUNG }).format(new Date());
}

/** Jam:menit sekarang di Jakarta, untuk label "Hari ini, 13:30 WIB". */
export function jamJakarta(nilai?: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA_WARUNG, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(nilai ?? new Date());
}
