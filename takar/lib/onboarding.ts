export const JUMLAH_LANGKAH_PANDUAN = 5;

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
export function langkahAwalPanduan({
  tersimpan,
  jumlahMenu,
  sudahSelesai,
  diminta,
}: {
  tersimpan: unknown;
  jumlahMenu: number;
  sudahSelesai: boolean;
  diminta?: unknown;
}): number {
  const langkahTersimpan = langkahPanduanValid(tersimpan) ?? 1;
  const langkahDiminta = langkahPanduanValid(diminta);

  if (langkahDiminta !== null) return langkahDiminta;
  if (sudahSelesai) return JUMLAH_LANGKAH_PANDUAN;
  if (jumlahMenu > 0) return Math.max(langkahTersimpan, 3);
  return langkahTersimpan;
}
