export type Satuan = "kg" | "gram" | "ons" | "liter" | "ml" | "pcs" | "butir" | "ekor";
export type SatuanDasar = "kg" | "liter" | "pcs";

export const SATUAN_PER_DASAR: Record<SatuanDasar, Satuan[]> = {
  kg: ["kg", "gram", "ons", "butir", "ekor"],
  liter: ["liter", "ml"],
  pcs: ["pcs"],
};

export function keluargaSatuan(satuan: Satuan): SatuanDasar {
  if (satuan === "liter" || satuan === "ml") return "liter";
  if (satuan === "pcs") return "pcs";
  return "kg";
}

export function keSatuanDasar(
  jumlah: number,
  satuan: Satuan,
  dasar: SatuanDasar,
): { nilai: number; berisiko: boolean; asumsi?: string } | { galat: string } {
  if (!Number.isFinite(jumlah) || jumlah <= 0) return { galat: "Jumlah harus lebih dari 0." };
  if (keluargaSatuan(satuan) !== dasar) {
    return { galat: `Satuan ${satuan} tidak cocok dengan bahan bersatuan ${dasar}.` };
  }

  if (satuan === "gram") return { nilai: jumlah * 0.001, berisiko: false };
  if (satuan === "ons") return { nilai: jumlah * 0.1, berisiko: false };
  if (satuan === "ml") return { nilai: jumlah * 0.001, berisiko: false };
  if (satuan === "butir") {
    return {
      nilai: jumlah * 0.06,
      berisiko: true,
      asumsi: "1 butir dianggap 60 gram. Periksa bila ukuran telur berbeda.",
    };
  }
  if (satuan === "ekor") {
    return {
      nilai: jumlah * 1.2,
      berisiko: true,
      asumsi: "1 ekor dianggap 1,2 kg. Periksa berat ayam yang kamu beli.",
    };
  }
  return { nilai: jumlah, berisiko: false };
}
