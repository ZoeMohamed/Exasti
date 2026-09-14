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
export function hariIniJakarta(nilai?: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA_WARUNG }).format(nilai ?? new Date());
}

function tanggalSebelumnya(iso: string): string {
  const tanggal = new Date(`${iso}T12:00:00+07:00`);
  tanggal.setUTCDate(tanggal.getUTCDate() - 1);
  return tanggal.toISOString().slice(0, 10);
}

/** Hari harga BI yang sudah sewajarnya tersedia pada waktu tertentu. */
export function tanggalPublikasiBiDiharapkan(sekarang = new Date()): string {
  let tanggal = hariIniJakarta(sekarang);
  const [jam, menit] = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_WARUNG,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(sekarang).split(":").map(Number);
  const hari = new Date(`${tanggal}T12:00:00+07:00`).getUTCDay();

  // Pada hari kerja sebelum job 13:30 WIB, harga hari ini memang belum
  // sewajarnya masuk. Acuannya masih hari kerja sebelumnya.
  if (hari >= 1 && hari <= 5 && jam * 60 + menit < 13 * 60 + 30) {
    tanggal = tanggalSebelumnya(tanggal);
  }
  while ([0, 6].includes(new Date(`${tanggal}T12:00:00+07:00`).getUTCDay())) {
    tanggal = tanggalSebelumnya(tanggal);
  }
  return tanggal;
}

/**
 * Alarm harga mempertimbangkan jadwal publikasi, akhir pekan, dan fakta bahwa
 * BI kadang tidak menerbitkan baris baru pada hari libur meski sinkron sukses.
 */
export function hargaPasarPerluDiperbarui(
  tanggalHarga: Date | string | null | undefined,
  terakhirSinkron?: Date | string | null,
  sekarang = new Date(),
): boolean {
  const harga = keIsoTanggal(tanggalHarga);
  if (!harga) return true;
  if (harga >= tanggalPublikasiBiDiharapkan(sekarang)) return false;

  if (terakhirSinkron) {
    const sinkron = typeof terakhirSinkron === "string" ? new Date(terakhirSinkron) : terakhirSinkron;
    if (!Number.isNaN(sinkron.getTime()) && hariIniJakarta(sinkron) === hariIniJakarta(sekarang)) {
      const [jam, menit] = new Intl.DateTimeFormat("en-GB", {
        timeZone: ZONA_WARUNG,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(sinkron).split(":").map(Number);
      // Sinkron manual pagi hari belum membuktikan job sesudah waktu terbit.
      if (jam * 60 + menit >= 13 * 60 + 30) return false;
    }
  }
  return true;
}

/** Jam:menit sekarang di Jakarta, untuk label "Hari ini, 13:30 WIB". */
export function jamJakarta(nilai?: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA_WARUNG, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(nilai ?? new Date());
}

/**
 * Label waktu relatif menurut Jakarta: "Hari ini, 13:30 WIB", "Kemarin,
 * 13:30 WIB", "3 hari lalu".
 *
 * Sebelumnya sidebar menulis "Hari ini" tanpa pernah memeriksa tanggalnya.
 * Kalau cron mati tiga hari, layarnya tetap meyakinkan pemilik bahwa
 * harganya baru — persis kebohongan yang paling mahal di aplikasi ini.
 */
export function labelWaktuRelatif(nilai: Date | string | null | undefined): {
  teks: string;
  selisihHari: number;
  basi: boolean;
} {
  if (!nilai) return { teks: "belum pernah", selisihHari: Infinity, basi: true };

  const d = typeof nilai === "string" ? new Date(nilai) : nilai;
  if (isNaN(d.getTime())) return { teks: "belum pernah", selisihHari: Infinity, basi: true };

  const hariNilai = new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA_WARUNG }).format(d);
  const hariIni = hariIniJakarta();

  const selisih = Math.round(
    (Date.parse(hariIni + "T00:00:00Z") - Date.parse(hariNilai + "T00:00:00Z")) / 86400000,
  );

  const jam = jamJakarta(d);
  if (selisih <= 0) return { teks: `Hari ini, ${jam} WIB`, selisihHari: 0, basi: false };
  if (selisih === 1) return { teks: `Kemarin, ${jam} WIB`, selisihHari: 1, basi: false };
  return { teks: `${selisih} hari lalu`, selisihHari: selisih, basi: true };
}
