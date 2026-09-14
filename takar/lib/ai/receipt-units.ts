import { keSatuanDasar, type Satuan, type SatuanDasar } from "@/lib/units";

const ALIAS_SATUAN: Array<{ cocok: RegExp; satuan: Satuan; label: string }> = [
  { cocok: /^(kg|kilo|kilogram)$/i, satuan: "kg", label: "kg" },
  { cocok: /^(g|gr|gram)$/i, satuan: "gram", label: "kg" },
  { cocok: /^(ons|hg)$/i, satuan: "ons", label: "kg" },
  { cocok: /^(l|ltr|liter)$/i, satuan: "liter", label: "liter" },
  { cocok: /^(ml|cc)$/i, satuan: "ml", label: "liter" },
  { cocok: /^(butir|btr)$/i, satuan: "butir", label: "kg" },
  { cocok: /^(ekor|ekr)$/i, satuan: "ekor", label: "kg" },
  { cocok: /^(pcs?|buah|bh|lembar|lbr)$/i, satuan: "pcs", label: "pcs" },
  { cocok: /^(botol|btl)$/i, satuan: "pcs", label: "botol" },
  { cocok: /^(tabung|tbng)$/i, satuan: "pcs", label: "tabung" },
  { cocok: /^(potong|ptg)$/i, satuan: "pcs", label: "potong" },
  { cocok: /^(pack|pak|paket)$/i, satuan: "pcs", label: "pak" },
  { cocok: /^(bungkus|bks)$/i, satuan: "pcs", label: "bungkus" },
  { cocok: /^(sachet|saset|sct)$/i, satuan: "pcs", label: "sachet" },
  { cocok: /^(sak|karung|dus|box|kotak)$/i, satuan: "pcs", label: "kemasan" },
];

function definisiSatuan(unitRaw: string | null | undefined) {
  const bersih = (unitRaw ?? "").trim();
  if (!bersih) return null;
  return ALIAS_SATUAN.find((item) => item.cocok.test(bersih)) ?? null;
}

/** Menebak keluarga satuan tanpa pernah menganggap satuan kosong sebagai kg. */
export function tebakSatuanDasarNota(unitRaw: string | null | undefined): SatuanDasar | null {
  const definisi = definisiSatuan(unitRaw);
  if (!definisi) return null;
  if (definisi.satuan === "liter" || definisi.satuan === "ml") return "liter";
  if (definisi.satuan === "pcs") return "pcs";
  return "kg";
}

/**
 * Mengubah teks satuan nota menjadi satuan API. Hanya mengembalikan nilai bila
 * keluarga satuannya cocok dengan bahan yang dipilih; tidak ada fallback diam-diam.
 */
export function satuanNota(
  unitRaw: string | null | undefined,
  dasar: SatuanDasar,
): Satuan | null {
  const definisi = definisiSatuan(unitRaw);
  if (!definisi) return null;
  const hasil = keSatuanDasar(1, definisi.satuan, dasar);
  return "galat" in hasil ? null : definisi.satuan;
}

export type RingkasanHargaNota =
  | { valid: true; hargaPerDasar: number; label: string; satuan: Satuan }
  | { valid: false; pesan: string };

/** Satu-satunya hitungan yang dipakai layar konfirmasi sebelum payload dikirim. */
export function ringkasHargaNota(
  qty: number | null,
  unitRaw: string | null | undefined,
  totalPrice: number | null,
  dasar: SatuanDasar,
): RingkasanHargaNota {
  if (!Number.isFinite(qty) || Number(qty) <= 0) {
    return { valid: false, pesan: "Isi jumlah beli." };
  }
  if (!Number.isFinite(totalPrice) || Number(totalPrice) <= 0) {
    return { valid: false, pesan: "Isi total bayar." };
  }
  const definisi = definisiSatuan(unitRaw);
  const satuan = satuanNota(unitRaw, dasar);
  if (!definisi || !satuan) {
    return { valid: false, pesan: `Satuan “${(unitRaw ?? "").trim() || "kosong"}” tidak cocok dengan bahan ini.` };
  }
  const isi = keSatuanDasar(Number(qty), satuan, dasar);
  if ("galat" in isi) return { valid: false, pesan: isi.galat };
  return {
    valid: true,
    hargaPerDasar: Math.round(Number(totalPrice) / isi.nilai),
    label: dasar === "pcs" ? definisi.label : dasar,
    satuan,
  };
}
