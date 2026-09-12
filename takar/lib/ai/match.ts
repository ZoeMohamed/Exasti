// lib/ai/match.ts
// FR-39: Pencocokan ke 21 komoditas BI dilakukan di KODE secara deterministik.
// Katalog barang warung non-BI dipetakan dengan normalisasi kata.

export interface MatchResult {
  matchedName: string;
  isBiCommodity: boolean;
  standardUnit: string;
  normalizedQty: number; // Dalam satuan standar (misal kg, liter, pcs)
  pricePerUnit: number;  // Rupiah per satuan standar
  note?: string;
}

// 21 varian komoditas pangan Bank Indonesia resmi
export const BI_COMMODITIES: Record<
  string,
  { aliases: string[]; standardUnit: string; defaultPackSize?: number }
> = {
  "Daging Ayam Ras Segar": {
    aliases: [
      "ayam",
      "ayam potong",
      "ayam broiler",
      "ayam karkas",
      "daging ayam",
      "dada ayam",
      "paha ayam",
      "fillet ayam",
      "sayap ayam",
      "ceker ayam",
    ],
    standardUnit: "kg",
  },
  "Beras Kualitas Medium I": {
    aliases: [
      "beras",
      "beras c4",
      "beras menthik",
      "beras rojolele",
      "beras medium",
      "beras ramos",
      "beras pandan wangi",
      "beras putih",
    ],
    standardUnit: "kg",
  },
  "Cabai Rawit Merah": {
    aliases: [
      "cabai rawit merah",
      "cabe rawit merah",
      "cabe setan",
      "cabai setan",
      "lombok setan",
      "rawit merah",
      "cabe sret",
    ],
    standardUnit: "kg",
  },
  "Cabai Rawit Hijau": {
    aliases: [
      "cabai rawit hijau",
      "cabe rawit hijau",
      "cabe rawit ijo",
      "cabe lalap",
      "cabai lalap",
      "rawit hijau",
      "rawit ijo",
    ],
    standardUnit: "kg",
  },
  "Cabai Merah Keriting": {
    aliases: [
      "cabai merah keriting",
      "cabe merah keriting",
      "cabe keriting",
      "cabai keriting",
      "lombok keriting",
    ],
    standardUnit: "kg",
  },
  "Cabai Merah Besar": {
    aliases: [
      "cabai merah besar",
      "cabe merah besar",
      "cabe teropong",
      "cabai teropong",
      "cabe merah plonco",
    ],
    standardUnit: "kg",
  },
  "Bawang Merah Ukuran Sedang": {
    aliases: [
      "bawang merah",
      "bwg merah",
      "brambang",
      "bawang merah brebes",
      "brambang jawa",
    ],
    standardUnit: "kg",
  },
  "Bawang Putih Ukuran Sedang": {
    aliases: [
      "bawang putih",
      "bwg putih",
      "bawang kating",
      "bawang sincan",
      "bawang putih kating",
    ],
    standardUnit: "kg",
  },
  "Minyak Goreng Curah": {
    aliases: ["minyak curah", "minyak goreng curah", "minyak kiloan"],
    standardUnit: "kg",
  },
  "Minyak Goreng Kemasan Bermerk 1": {
    aliases: [
      "minyak bimoli",
      "bimoli",
      "minyak filma",
      "filma",
      "minyak tropical",
      "tropical",
      "minyak sunco",
      "sunco",
      "minyak sania",
      "sania",
      "minyak rose brand",
    ],
    standardUnit: "liter",
  },
  "Minyak Goreng Kemasan Bermerk 2": {
    aliases: [
      "minyak kita",
      "minyakita",
      "minyak goreng kita",
      "minyak fortune",
      "fortune",
      "minyak sovia",
      "sovia",
      "minyak sedap",
      "minyak camar",
      "minyak hemart",
      "hemart",
    ],
    standardUnit: "liter",
  },
  "Telur Ayam Ras Segar": {
    aliases: ["telur", "telur ayam", "telor", "telor ayam", "telur negri", "telor leghorn"],
    standardUnit: "kg",
  },
  "Daging Sapi Kualitas 1": {
    aliases: ["daging sapi", "sapi has dalam", "sirloin", "tenderloin", "gandik"],
    standardUnit: "kg",
  },
  "Daging Sapi Kualitas 2": {
    aliases: ["daging sapi tetelan", "sandung lamur", "rawonan", "tetelan sapi"],
    standardUnit: "kg",
  },
  "Gula Pasir Lokal": {
    aliases: ["gula pasir", "gula putih", "gulaku", "gula tebu"],
    standardUnit: "kg",
  },
};

// Barang warung non-BI yang umum dicatat pemilik di nota
export const WARUNG_NON_BI_CATALOG: Record<
  string,
  { aliases: string[]; standardUnit: string }
> = {
  "Tepung Terigu Segitiga": {
    aliases: ["tepung", "tepung terigu", "segitiga biru", "cakra kembar", "terigu"],
    standardUnit: "kg",
  },
  "Tepung Tapioka / Kanji": {
    aliases: ["tapioka", "tepung kanji", "tepung sagu", "rose brand tapioka"],
    standardUnit: "kg",
  },
  "Saus Sambal Extra Pedas": {
    aliases: ["saus sambal", "saos abc", "sambal abc", "saos delmonte", "saos pedas"],
    standardUnit: "botol",
  },
  "Kecap Manis": {
    aliases: ["kecap", "kecap bango", "kecap abc", "kecap sedap"],
    standardUnit: "botol",
  },
  "Garam Dapur Beriodium": {
    aliases: ["garam", "garam halus", "garam dapur", "garam bata"],
    standardUnit: "bungkus",
  },
  "Bumbu Penyedap Rasa": {
    aliases: ["royco", "masako", "penyedap", "kaldu bubuk", "ajinomoto", "micin"],
    standardUnit: "bungkus",
  },
  "Kertas Nasi Pembungkus": {
    aliases: ["kertas nasi", "kertas minyak", "kertas coklat", "bungkus nasi"],
    standardUnit: "pack",
  },
  "Kantong Plastik Kresek": {
    aliases: ["kresek", "kantong plastik", "plastik bening", "plastik kemasan"],
    standardUnit: "pack",
  },
  "Gas LPG 3 Kg": {
    aliases: ["gas lpg", "gas 3kg", "gas melon", "isi ulang gas"],
    standardUnit: "tabung",
  },
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalisasi satuan dan hitung harga per unit standar.
 * Misal: 500 gram seharga Rp 15.000 -> 0.5 kg seharga Rp 30.000 / kg
 */
export function normalizeUnitAndPrice(
  qty: number | null,
  unitRaw: string | null,
  totalPrice: number | null,
  standardUnit: string,
): { normalizedQty: number; pricePerUnit: number } {
  const safeQty = qty && qty > 0 ? qty : 1;
  const safePrice = totalPrice && totalPrice > 0 ? totalPrice : 0;
  const unitClean = (unitRaw || "").toLowerCase().trim();

  let multiplier = 1; // pengali untuk mengubah ke satuan standar

  if (standardUnit === "kg") {
    if (unitClean.includes("gram") || unitClean === "g" || unitClean === "gr") {
      multiplier = 0.001;
    } else if (unitClean.includes("ons") || unitClean === "hg") {
      multiplier = 0.1;
    } else if (unitClean.includes("ekor")) {
      multiplier = 1.2; // Rata-rata 1 ekor ayam potong = 1.2 kg (BR-08)
    }
  } else if (standardUnit === "liter") {
    if (unitClean.includes("ml") || unitClean === "cc") {
      multiplier = 0.001;
    }
  }

  const finalQty = safeQty * multiplier;
  const pricePerUnit = finalQty > 0 ? Math.round(safePrice / finalQty) : safePrice;

  return {
    normalizedQty: finalQty,
    pricePerUnit,
  };
}

/**
 * FR-39: Pencocokan string deterministik tanpa AI.
 * Mencari kecocokan terbaik terhadap 21 komoditas BI atau katalog non-BI
 * dengan strategi Longest Match First (alias paling spesifik menang duluan).
 */
export function matchReceiptItem(
  nameRaw: string,
  qty: number | null,
  unitRaw: string | null,
  totalPrice: number | null,
): MatchResult {
  const cleaned = normalizeText(nameRaw);

  // Kumpulkan semua alias dari 21 komoditas BI dan katalog warung
  interface Candidate {
    name: string;
    alias: string;
    isBi: boolean;
    standardUnit: string;
  }

  const allCandidates: Candidate[] = [];

  for (const [name, def] of Object.entries(BI_COMMODITIES)) {
    for (const alias of def.aliases) {
      allCandidates.push({
        name,
        alias: normalizeText(alias),
        isBi: true,
        standardUnit: def.standardUnit,
      });
    }
  }

  for (const [name, def] of Object.entries(WARUNG_NON_BI_CATALOG)) {
    for (const alias of def.aliases) {
      allCandidates.push({
        name,
        alias: normalizeText(alias),
        isBi: false,
        standardUnit: def.standardUnit,
      });
    }
  }

  // Urutkan kandidat dari alias terpanjang ke terpendek
  // Contoh: "telur ayam ras" (14 char) dicoba sebelum "ayam" (4 char)
  allCandidates.sort((a, b) => b.alias.length - a.alias.length);

  for (const cand of allCandidates) {
    const regex = new RegExp(`\\b${cand.alias}\\b`, "i");
    if (regex.test(cleaned) || cleaned.includes(cand.alias)) {
      const { normalizedQty, pricePerUnit } = normalizeUnitAndPrice(
        qty,
        unitRaw,
        totalPrice,
        cand.standardUnit,
      );

      return {
        matchedName: cand.name,
        isBiCommodity: cand.isBi,
        standardUnit: cand.standardUnit,
        normalizedQty,
        pricePerUnit,
        note: cand.isBi
          ? `Cocok dengan komoditas Bank Indonesia: ${cand.name}`
          : `Bahan luar BI (Katalog Warung): ${cand.name}`,
      };
    }
  }

  // Fallback: Bahan custom warung
  const safeQty = qty && qty > 0 ? qty : 1;
  const safePrice = totalPrice && totalPrice > 0 ? totalPrice : 0;

  return {
    matchedName: nameRaw.trim(),
    isBiCommodity: false,
    standardUnit: unitRaw || "item",
    normalizedQty: safeQty,
    pricePerUnit: safePrice / safeQty,
    note: "Bahan khusus warung (belum terdaftar di katalog)",
  };
}
