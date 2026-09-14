// Perhitungan biaya kecil dan kemasan. Murni: aman dipakai ulang oleh form,
// endpoint, dan pengujian tanpa mengimpor database atau jaringan.

export type CaraHitungBiaya = "grosir" | "per_porsi";

export interface BiayaTetapInput {
  label: string;
  mode?: CaraHitungBiaya;
  amount?: number;
  packPrice?: number;
  packQty?: number;
  usageQty?: number;
}

export interface BiayaTetapTersimpan {
  label: string;
  amount: number;
  packPrice: number | null;
  packQty: number | null;
  usageQty: number;
  isEstimated: boolean;
}

export interface GalatBiaya {
  indeks: number;
  nama: string;
  pesan: string;
}

const MAKS_BIAYA = 12;
const MAKS_HARGA_BELANJA = 1_000_000_000;
const MAKS_ISI = 1_000_000;
const MAKS_PAKAI = 1_000;
const MAKS_BIAYA_PER_PORSI = 100_000_000;

function angka(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function duaDesimal(value: number): number {
  return Math.round(value * 100) / 100;
}

export function hitungBiayaGrosir(
  hargaBelanja: number,
  isiPembelian: number,
  dipakaiPerPorsi = 1,
): number | null {
  if (
    !Number.isFinite(hargaBelanja) || hargaBelanja <= 0 ||
    !Number.isFinite(isiPembelian) || isiPembelian <= 0 ||
    !Number.isFinite(dipakaiPerPorsi) || dipakaiPerPorsi <= 0
  ) {
    return null;
  }
  return duaDesimal((hargaBelanja / isiPembelian) * dipakaiPerPorsi);
}

export function siapkanBiayaTetap(value: unknown): {
  biaya: BiayaTetapTersimpan[];
  galat: GalatBiaya[];
} {
  if (value === undefined || value === null) return { biaya: [], galat: [] };
  if (!Array.isArray(value)) {
    return {
      biaya: [],
      galat: [{ indeks: 0, nama: "Biaya tambahan", pesan: "Daftar biaya belum dikenali." }],
    };
  }
  if (value.length > MAKS_BIAYA) {
    return {
      biaya: [],
      galat: [{ indeks: MAKS_BIAYA, nama: "Biaya tambahan", pesan: `Maksimal ${MAKS_BIAYA} biaya per menu.` }],
    };
  }

  const biaya: BiayaTetapTersimpan[] = [];
  const galat: GalatBiaya[] = [];
  const namaTerpakai = new Set<string>();

  for (let indeks = 0; indeks < value.length; indeks++) {
    const mentah = value[indeks];
    if (!mentah || typeof mentah !== "object") {
      galat.push({ indeks, nama: `Biaya ${indeks + 1}`, pesan: "Isi biaya ini belum dikenali." });
      continue;
    }

    const row = mentah as Record<string, unknown>;
    if (
      row.mode !== undefined &&
      row.mode !== "grosir" &&
      row.mode !== "per_porsi"
    ) {
      galat.push({
        indeks,
        nama: `Biaya ${indeks + 1}`,
        pesan: "Cara menghitung biaya tidak dikenali.",
      });
      continue;
    }
    const label = typeof row.label === "string" ? row.label.trim().replace(/\s+/g, " ") : "";
    const nama = label || `Biaya ${indeks + 1}`;
    if (!label) {
      galat.push({ indeks, nama, pesan: "Tulis nama kemasan atau biaya." });
      continue;
    }
    if (label.length > 80) {
      galat.push({ indeks, nama, pesan: "Nama biaya maksimal 80 karakter." });
      continue;
    }
    const namaNormal = label.toLocaleLowerCase("id-ID");
    if (namaTerpakai.has(namaNormal)) {
      galat.push({ indeks, nama, pesan: `${label} sudah ada. Gabungkan dalam satu baris.` });
      continue;
    }
    namaTerpakai.add(namaNormal);

    const mode: CaraHitungBiaya = row.mode === "grosir"
      ? "grosir"
      : row.mode === "per_porsi"
        ? "per_porsi"
        : row.packPrice !== undefined || row.packQty !== undefined
          ? "grosir"
          : "per_porsi";

    if (mode === "grosir") {
      const packPrice = angka(row.packPrice);
      const packQty = angka(row.packQty);
      const usageQty = row.usageQty === undefined ? 1 : angka(row.usageQty);
      if (packPrice === null || packPrice <= 0 || packPrice > MAKS_HARGA_BELANJA) {
        galat.push({ indeks, nama, pesan: "Isi total harga belanja grosir dengan benar." });
        continue;
      }
      if (packQty === null || packQty <= 0 || packQty > MAKS_ISI) {
        galat.push({ indeks, nama, pesan: "Isi jumlah barang dalam satu pembelian dengan benar." });
        continue;
      }
      if (usageQty === null || usageQty <= 0 || usageQty > MAKS_PAKAI) {
        galat.push({ indeks, nama, pesan: "Jumlah yang dipakai per porsi belum benar." });
        continue;
      }
      const amount = hitungBiayaGrosir(packPrice, packQty, usageQty);
      if (amount === null || amount > MAKS_BIAYA_PER_PORSI) {
        galat.push({ indeks, nama, pesan: "Hasil biaya per porsi terlalu besar. Periksa harga dan isi pembelian." });
        continue;
      }
      biaya.push({ label, amount, packPrice, packQty, usageQty, isEstimated: false });
      continue;
    }

    const amount = angka(row.amount);
    if (amount === null || amount <= 0 || amount > MAKS_BIAYA_PER_PORSI) {
      galat.push({ indeks, nama, pesan: "Isi biaya untuk satu porsi dengan benar." });
      continue;
    }
    biaya.push({
      label,
      amount: duaDesimal(amount),
      packPrice: null,
      packQty: null,
      usageQty: 1,
      isEstimated: false,
    });
  }

  return { biaya, galat };
}
