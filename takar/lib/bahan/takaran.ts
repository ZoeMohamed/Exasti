import { keSatuanDasar, type Satuan, type SatuanDasar } from "@/lib/units";

export type Pemakaian =
  | { cara: "per_masak"; jumlah: number; satuan: Satuan }
  | { cara: "per_kemasan"; isi: number; satuan: Satuan; porsi: number };

export interface HargaBelanja {
  hargaKemasan: number;
  isi: number;
  satuan: Satuan;
}

export function hitungTakaran(
  pemakaian: Pemakaian,
  satuanDasar: SatuanDasar,
  hasilSekaliMasak: number,
): { batchQty: number; qty: number; asumsi?: string } | { galat: string } {
  if (!Number.isFinite(hasilSekaliMasak) || hasilSekaliMasak <= 0) {
    return { galat: "Hasil sekali masak harus lebih dari 0." };
  }
  if (pemakaian.cara === "per_masak") {
    const hasil = keSatuanDasar(pemakaian.jumlah, pemakaian.satuan, satuanDasar);
    if ("galat" in hasil) return hasil;
    return { batchQty: hasil.nilai, qty: hasil.nilai / hasilSekaliMasak, asumsi: hasil.asumsi };
  }
  if (!Number.isFinite(pemakaian.porsi) || pemakaian.porsi <= 0) {
    return { galat: "Jumlah porsi per kemasan harus lebih dari 0." };
  }
  const hasil = keSatuanDasar(pemakaian.isi, pemakaian.satuan, satuanDasar);
  if ("galat" in hasil) return hasil;
  const qty = hasil.nilai / pemakaian.porsi;
  return { batchQty: qty * hasilSekaliMasak, qty, asumsi: hasil.asumsi };
}

export function hitungHargaPerDasar(
  harga: HargaBelanja,
  satuanDasar: SatuanDasar,
): { hargaPerDasar: number; asumsi?: string } | { galat: string } {
  if (!Number.isFinite(harga.hargaKemasan) || harga.hargaKemasan <= 0) {
    return { galat: "Harga belanja harus lebih dari 0." };
  }
  const isi = keSatuanDasar(harga.isi, harga.satuan, satuanDasar);
  if ("galat" in isi) return isi;
  return { hargaPerDasar: harga.hargaKemasan / isi.nilai, asumsi: isi.asumsi };
}
