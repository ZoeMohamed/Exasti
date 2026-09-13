// lib/ai/match.ts
// FR-39: Pencocokan ke 21 komoditas BI dilakukan di KODE secara deterministik.
// Katalog barang warung non-BI dipetakan dengan normalisasi kata.

import { BI_COMMODITIES, WARUNG_NON_BI_CATALOG } from "@/lib/bahan/katalog-pasar";
export { BI_COMMODITIES, WARUNG_NON_BI_CATALOG } from "@/lib/bahan/katalog-pasar";

export interface MatchResult {
  matchedName: string;
  isBiCommodity: boolean;
  standardUnit: string;
  normalizedQty: number; // Dalam satuan standar (misal kg, liter, pcs)
  pricePerUnit: number;  // Rupiah per satuan standar
  note?: string;
}

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
