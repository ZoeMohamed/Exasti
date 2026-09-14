export const JUMLAH_LANGKAH_PANDUAN = 4;
export const TAHAP_PANDUAN_SELESAI = 5;

const RUTE_PANDUAN: Record<number, string> = {
  1: "/dashboard",
  2: "/dashboard/menu/tambah?tur=2",
  3: "/dashboard/belanja?tur=3",
  4: "/dashboard?tur=4",
};

export function langkahPanduanValid(value: unknown): number | null {
  const step = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(step) || step < 1 || step > JUMLAH_LANGKAH_PANDUAN) {
    return null;
  }
  return step;
}

/**
 * Menu yang sudah dibuat adalah bukti bahwa langkah menu sudah dilewati.
 * Ini membuat pengguna dapat melanjutkan dengan benar walau tab ditutup tepat
 * setelah menu tersimpan tetapi sebelum progres panduan sempat diperbarui.
 */
export function langkahAktifPanduan({
  tersimpan,
  jumlahMenu,
  sudahSelesai,
}: {
  tersimpan: unknown;
  jumlahMenu: number;
  sudahSelesai: boolean;
}): number {
  const langkahTersimpan = langkahPanduanValid(tersimpan) ?? 1;

  if (sudahSelesai) return TAHAP_PANDUAN_SELESAI;
  if (jumlahMenu > 0) return Math.max(langkahTersimpan, 3);
  return langkahTersimpan;
}

/**
 * Panduan tidak punya halaman sendiri. Setiap tahap menunjuk langsung ke
 * halaman kerja yang menyimpan data warung sungguhan.
 */
export function tujuanPanduan(input: {
  tersimpan: unknown;
  jumlahMenu: number;
  sudahSelesai: boolean;
}): string {
  const langkah = langkahAktifPanduan(input);
  return langkah === TAHAP_PANDUAN_SELESAI
    ? "/dashboard"
    : RUTE_PANDUAN[langkah] ?? RUTE_PANDUAN[1];
}
