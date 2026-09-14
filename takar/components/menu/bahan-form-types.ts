import type { BahanTersedia } from "@/lib/bahan/cari";
import type { HargaBelanja, Pemakaian } from "@/lib/bahan/takaran";
import type { RefBahan } from "@/lib/bahan/validasi";
import type { SatuanDasar } from "@/lib/units";

export interface IngredientRow {
  key: string;
  bahan: RefBahan;
  name: string;
  satuanDasar: SatuanDasar;
  pemakaian: Pemakaian;
  harga: number | null;
  sumberHarga: string;
  tanggalHarga: string | null;
  hargaBelanja?: HargaBelanja;
  catatan?: string;
}

export function rowDariBahan(bahan: BahanTersedia): IngredientRow {
  return {
    key: `${bahan.jenis}-${bahan.id}-${Date.now()}`,
    bahan: { jenis: bahan.jenis, id: bahan.id },
    name: bahan.namaTampil,
    satuanDasar: bahan.satuanDasar,
    pemakaian: { cara: "per_masak", jumlah: 1, satuan: bahan.satuanDasar },
    harga: bahan.harga,
    sumberHarga: bahan.sumberHarga,
    tanggalHarga: bahan.tanggalHarga,
  };
}
