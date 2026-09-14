// lib/ai/ocr.ts
// OCR nota belanja warung menggunakan Gemini Flash Vision dengan structured output,
// caching, fallback chain, dan pencocokan ke 21 komoditas BI (FR-37 s/d FR-42).

import {
  callGeminiVisionWithFallback,
  hashInput,
} from "./client";
import { matchReceiptItem, type MatchResult } from "./match";

export interface ParsedItem {
  id: string;
  nameRaw: string;
  qty: number | null;
  unit: string | null;
  totalPrice: number | null;
  match: MatchResult;
  isConfirmed: boolean;
}

export interface OcrResponsePayload {
  success: boolean;
  source: "live_gemini" | "cache" | "offline_sample" | "error";
  modelUsed?: string;
  latencyMs: number;
  items: ParsedItem[];
  totalNota: number;
  hash: string;
  message: string;
  isOfflineMode?: boolean;
  error?: string;
}

interface RawReceiptItem {
  nameRaw?: unknown;
  qty?: unknown;
  unit?: unknown;
  totalPrice?: unknown;
}

interface RawReceiptOutput {
  isReceipt?: unknown;
  rejectionReason?: unknown;
  items?: unknown;
}

export const OCR_SCHEMA_VERSION = "nota-v2";

export function validateReceiptOutput(value: unknown):
  | { valid: true; isReceipt: boolean; rejectionReason: string | null; items: RawReceiptItem[] }
  | { valid: false; error: string } {
  if (!value || typeof value !== "object") return { valid: false, error: "Hasil bacaan bukan objek." };
  const raw = value as RawReceiptOutput;
  if (typeof raw.isReceipt !== "boolean") return { valid: false, error: "Status jenis gambar tidak tersedia." };
  if (!Array.isArray(raw.items) || raw.items.length > 100) return { valid: false, error: "Daftar barang tidak valid." };
  const items: RawReceiptItem[] = [];
  for (const item of raw.items) {
    if (!item || typeof item !== "object") return { valid: false, error: "Salah satu baris barang tidak valid." };
    const row = item as RawReceiptItem;
    if (typeof row.nameRaw !== "string" || row.nameRaw.trim().length === 0 || row.nameRaw.length > 120) {
      return { valid: false, error: "Nama barang tidak valid." };
    }
    for (const [label, number] of [["jumlah", row.qty], ["harga", row.totalPrice]] as const) {
      if (number !== null && number !== undefined && (typeof number !== "number" || !Number.isFinite(number) || number <= 0)) {
        return { valid: false, error: `${label} barang tidak valid.` };
      }
    }
    if (typeof row.totalPrice === "number" && row.totalPrice > 1_000_000_000) {
      return { valid: false, error: "Harga barang berada di luar batas wajar." };
    }
    if (row.unit !== null && row.unit !== undefined && typeof row.unit !== "string") {
      return { valid: false, error: "Satuan barang tidak valid." };
    }
    items.push(row);
  }
  const rejectionReason = typeof raw.rejectionReason === "string" ? raw.rejectionReason.slice(0, 200) : null;
  if (!raw.isReceipt && items.length > 0) return { valid: false, error: "Gambar bukan nota tetapi berisi barang." };
  return { valid: true, isReceipt: raw.isReceipt, rejectionReason, items };
}

function normalizeRawItem(it: RawReceiptItem, idx: number): ParsedItem {
  const nameRaw = typeof it.nameRaw === "string" ? it.nameRaw : "Barang";
  const qty = typeof it.qty === "number" ? it.qty : null;
  const unit = typeof it.unit === "string" ? it.unit : null;
  const totalPrice = typeof it.totalPrice === "number" ? it.totalPrice : null;
  return {
    id: `item-${idx + 1}`,
    nameRaw,
    qty,
    unit,
    totalPrice,
    match: matchReceiptItem(nameRaw, qty, unit, totalPrice),
    isConfirmed: false,
  };
}

// Prompt standar tervalidasi dari docs/10-AI-VALIDATION.md & docs/08-AI-USECASE.md
export const OCR_RECEIPT_PROMPT = `${OCR_SCHEMA_VERSION}. Periksa dulu apakah gambar ini benar-benar nota/struk belanja Indonesia.
Jika bukan nota—misalnya tangkapan layar aplikasi, formulir login, foto orang, poster, atau gambar rusak—isi isReceipt=false, jelaskan singkat di rejectionReason, dan kembalikan items kosong.
Hanya jika gambar benar-benar nota, baca baris belanja dan kembalikan JSON persis sesuai skema:

{
  "isReceipt": true,
  "rejectionReason": null,
  "items": [
    {
      "nameRaw": "<nama barang persis seperti tertulis di nota>",
      "qty": <angka jumlah barang atau null jika tidak ada>,
      "unit": "<satuan seperti tertulis, misal kg/liter/botol/pack/sak atau null>",
      "totalPrice": <total harga rupiah untuk baris ini, angka murni tanpa titik atau koma atau null>
    }
  ]
}

Aturan Ketat:
- Salin nama barang APA ADANYA dari nota, jangan menerjemahkan atau merapikan nama merek.
- Jika satuan tidak tertulis, isi unit dengan null.
- Jika angka tidak terbaca jelas atau buram, isi null — JANGAN PERNAH MENEBAK HARGA ATAU JUMLAH.
- qty adalah jumlah fisik total dalam unit. Contoh: "Bimoli 2L x 1" menjadi qty=2 dan unit="liter"; "Ayam 5 pcs" tetap qty=5 dan unit="pcs", jangan menganggapnya kg.
- Abaikan baris subtotal, diskon, pajak/PPN, total akhir, tunai, dan kembalian.
- Jangan mengambil angka dari antarmuka aplikasi, artikel, menu restoran, atau dokumen selain nota belanja.
- Jangan menambahkan teks penjelasan selain JSON.`;

export const OCR_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    isReceipt: { type: "BOOLEAN", description: "True hanya bila gambar benar-benar nota atau struk belanja." },
    rejectionReason: { type: "STRING", nullable: true, description: "Alasan singkat bila gambar bukan nota; null bila nota." },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nameRaw: { type: "STRING", description: "Nama barang persis seperti tertulis di nota, tanpa tambahan apa pun." },
          qty: { type: "NUMBER", nullable: true, description: "Jumlah dalam angka saja atau null bila tidak terbaca." },
          unit: { type: "STRING", nullable: true, description: "Satuan saja atau null bila tidak tertulis." },
          totalPrice: { type: "NUMBER", nullable: true, description: "Total rupiah baris ini atau null bila tidak terbaca." },
        },
        propertyOrdering: ["nameRaw", "qty", "unit", "totalPrice"],
        required: ["nameRaw", "qty", "unit", "totalPrice"],
      },
    },
  },
  required: ["isReceipt", "rejectionReason", "items"],
};

// Data nota sampel untuk demonstrasi offline / mode pesawat (NFR-19 & FR-41)
export const DEMO_SAMPLE_RECEIPTS: Record<
  string,
  {
    title: string;
    store: string;
    date: string;
    items: Array<{ nameRaw: string; qty: number; unit: string; totalPrice: number }>;
  }
> = {
  "pasar-johar": {
    title: "Nota Pasar Johar (Belanja Ayam & Cabai)",
    store: "UD Berkah Johar - Semarang",
    date: "12 September 2026",
    items: [
      { nameRaw: "Ayam Karkas Segar", qty: 4, unit: "kg", totalPrice: 172800 },
      { nameRaw: "Cabe Rawit Merah (Setan)", qty: 0.5, unit: "kg", totalPrice: 43500 },
      { nameRaw: "Beras C4 Super", qty: 5, unit: "kg", totalPrice: 72500 },
      { nameRaw: "Bawang Merah Brebes", qty: 1, unit: "kg", totalPrice: 32000 },
      { nameRaw: "Minyakita 2L", qty: 2, unit: "liter", totalPrice: 34000 },
    ],
  },
  "toko-sembako": {
    title: "Nota Toko Sembako (Bumbu & Bahan Kering)",
    store: "Toko Sembako Makmur Jaya",
    date: "11 September 2026",
    items: [
      { nameRaw: "Tepung Segitiga Biru 1kg", qty: 3, unit: "kg", totalPrice: 39000 },
      { nameRaw: "Minyak Goreng Bimoli 2L", qty: 2, unit: "liter", totalPrice: 38000 },
      { nameRaw: "Gula Pasir Gulaku", qty: 2, unit: "kg", totalPrice: 36000 },
      { nameRaw: "Saus Sambal Extra Pedas 935ml", qty: 2, unit: "botol", totalPrice: 52000 },
      { nameRaw: "Kertas Nasi Coklat (500 lbr)", qty: 1, unit: "pack", totalPrice: 28000 },
    ],
  },
  "agen-unggas": {
    title: "Nota Agen Daging & Telur Tembalang",
    store: "Agen Unggas Barokah Tembalang",
    date: "12 September 2026",
    items: [
      { nameRaw: "Daging Ayam Broiler Fillet", qty: 5, unit: "kg", totalPrice: 215000 },
      { nameRaw: "Telur Ayam Ras", qty: 2, unit: "kg", totalPrice: 58000 },
      { nameRaw: "Bawang Putih Kating", qty: 0.5, unit: "kg", totalPrice: 21000 },
      { nameRaw: "Gas Melon 3 Kg", qty: 1, unit: "tabung", totalPrice: 22000 },
    ],
  },
};

/**
 * Eksekusi pembacaan nota dengan Gemini Flash, ai_cache, dan fallback mode demo.
 */
export async function parseReceipt(options: {
  imageBase64?: string;
  mimeType?: string;
  sampleId?: string;
}): Promise<OcrResponsePayload> {
  const startTime = Date.now();

  // 1. Jika user memilih sample demo langsung
  if (options.sampleId && DEMO_SAMPLE_RECEIPTS[options.sampleId]) {
    const sample = DEMO_SAMPLE_RECEIPTS[options.sampleId];
    const hash = hashInput(`sample:${options.sampleId}`);

    const items: ParsedItem[] = sample.items.map((it, idx) => ({
      id: `item-${idx + 1}`,
      nameRaw: it.nameRaw,
      qty: it.qty,
      unit: it.unit,
      totalPrice: it.totalPrice,
      match: matchReceiptItem(it.nameRaw, it.qty, it.unit, it.totalPrice),
      isConfirmed: false,
    }));

    return {
      success: true,
      source: "offline_sample",
      latencyMs: Date.now() - startTime,
      items,
      totalNota: items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
      hash,
      message: `Berhasil memuat ${sample.title} (${sample.store}).`,
      isOfflineMode: true,
    };
  }

  // 2. Jika ada gambar yang diunggah
  if (options.imageBase64) {
    const inputHash = hashInput(`${OCR_RECEIPT_PROMPT}:${options.imageBase64}`);

    // Panggil Gemini Vision dengan Fallback
    const result = await callGeminiVisionWithFallback({
      prompt: OCR_RECEIPT_PROMPT,
      imageBase64: options.imageBase64,
      mimeType: options.mimeType || "image/jpeg",
      responseSchema: OCR_RESPONSE_SCHEMA,
      validateResponse: (data) => validateReceiptOutput(data).valid,
    });

    const checked = validateReceiptOutput(result.data);
    if (result.success && checked.valid) {
      if (!checked.isReceipt) {
        return {
          success: false,
          source: result.cached ? "cache" : "live_gemini",
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          items: [],
          totalNota: 0,
          hash: inputHash,
          message: "Gambar tidak terlihat seperti nota belanja.",
          error: checked.rejectionReason || "Gambar tidak terlihat seperti nota belanja. Unggah foto nota yang memuat nama barang dan harga.",
        };
      }
      if (checked.items.length === 0) {
        return {
          success: false,
          source: result.cached ? "cache" : "live_gemini",
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          items: [],
          totalNota: 0,
          hash: inputHash,
          message: "Tidak ada baris belanja yang terbaca.",
          error: "Nota terdeteksi, tetapi nama barang dan harganya belum terbaca. Coba foto lebih dekat dan terang.",
        };
      }
      const items = checked.items.map(normalizeRawItem);

      return {
        success: true,
        source: result.cached ? "cache" : "live_gemini",
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        items,
        totalNota: items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
        hash: inputHash,
        message: `${items.length} baris barang berhasil dibaca dan siap diperiksa.`,
      };
    }

    return {
      success: false,
      source: "error",
      latencyMs: Date.now() - startTime,
      items: [],
      totalNota: 0,
      hash: inputHash,
      message: "Nota belum berhasil dibaca.",
      error: result.success
        ? checked.valid ? "Hasil bacaan belum dapat dipakai." : checked.error
        : result.error || "Layanan pembaca nota sedang tidak tersedia. Coba lagi sebentar.",
    };
  }

  throw new Error("Harap unggah gambar nota atau pilih contoh nota demo.");
}
