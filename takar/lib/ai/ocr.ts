// lib/ai/ocr.ts
// OCR nota belanja warung menggunakan Gemini Flash Vision dengan structured output,
// caching, fallback chain, dan pencocokan ke 21 komoditas BI (FR-37 s/d FR-42).

import {
  callGeminiVisionWithFallback,
  hashInput,
  getCachedAiResult,
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
  source: "live_gemini" | "cache" | "offline_sample";
  modelUsed?: string;
  latencyMs: number;
  items: ParsedItem[];
  totalNota: number;
  hash: string;
  message: string;
  isOfflineMode?: boolean;
}

// Prompt standar tervalidasi dari docs/10-AI-VALIDATION.md & docs/08-AI-USECASE.md
export const OCR_RECEIPT_PROMPT = `Baca nota belanja Indonesia ini. Kembalikan JSON persis sesuai skema:

{
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
- Abaikan baris subtotal, diskon, pajak/PPN, total akhir, tunai, dan kembalian.
- Jangan menambahkan teks penjelasan selain JSON.`;

export const OCR_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nameRaw: { type: "STRING", description: "Nama barang persis seperti tertulis di nota, tanpa tambahan apa pun." },
          qty: { type: "NUMBER", description: "Jumlah dalam angka saja, misal 2 atau 0.25." },
          unit: { type: "STRING", description: "Satuan saja, misal kg, liter, pcs. Tanpa angka, tanpa penjelasan." },
          totalPrice: { type: "NUMBER", description: "Total rupiah baris ini, angka saja tanpa titik atau Rp." },
        },
        propertyOrdering: ["nameRaw", "qty", "unit", "totalPrice"],
        required: ["nameRaw", "qty", "unit", "totalPrice"],
      },
    },
  },
  required: ["items"],
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
      { nameRaw: "Minyak Goreng Bimoli 2L", qty: 1, unit: "liter", totalPrice: 38000 },
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

    // Cek cache terlebih dahulu
    const cached = await getCachedAiResult("nota_ocr", inputHash);
    if (cached && cached.items) {
      const items: ParsedItem[] = cached.items.map((it: any, idx: number) => ({
        id: `item-${idx + 1}`,
        nameRaw: it.nameRaw || "Barang",
        qty: it.qty ?? null,
        unit: it.unit ?? null,
        totalPrice: it.totalPrice ?? null,
        match: matchReceiptItem(it.nameRaw, it.qty, it.unit, it.totalPrice),
        isConfirmed: false,
      }));

      return {
        success: true,
        source: "cache",
        latencyMs: Date.now() - startTime,
        items,
        totalNota: items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
        hash: inputHash,
        message: "Data nota dibaca seketika dari riwayat cache (tanpa jeda jaringan).",
      };
    }

    // Panggil Gemini Vision dengan Fallback
    const result = await callGeminiVisionWithFallback({
      prompt: OCR_RECEIPT_PROMPT,
      imageBase64: options.imageBase64,
      mimeType: options.mimeType || "image/jpeg",
      responseSchema: OCR_RESPONSE_SCHEMA,
    });

    if (result.success && result.data && Array.isArray(result.data.items)) {
      const items: ParsedItem[] = result.data.items.map((it: any, idx: number) => ({
        id: `item-${idx + 1}`,
        nameRaw: it.nameRaw || "Barang",
        qty: typeof it.qty === "number" ? it.qty : null,
        unit: typeof it.unit === "string" ? it.unit : null,
        totalPrice: typeof it.totalPrice === "number" ? it.totalPrice : null,
        match: matchReceiptItem(it.nameRaw, it.qty, it.unit, it.totalPrice),
        isConfirmed: false,
      }));

      return {
        success: true,
        source: result.cached ? "cache" : "live_gemini",
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        items,
        totalNota: items.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
        hash: inputHash,
        message: `Berhasil membaca ${items.length} baris barang menggunakan Google Gemini Flash (${result.modelUsed}).`,
      };
    }

    // Jika panggilan gagal (misal GEMINI_API_KEY belum diset atau offline),
    // berikan fallback anggun (FR-42 & NFR-19) agar presentasi tidak terhenti.
    console.warn("Panggilan live Gemini gagal atau tidak ada API Key. Memakai fallback demo cerdas.");
    const fallbackSample = DEMO_SAMPLE_RECEIPTS["pasar-johar"];
    const items: ParsedItem[] = fallbackSample.items.map((it, idx) => ({
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
      hash: inputHash,
      message:
        result.error?.includes("GEMINI_API_KEY tidak ditemukan")
          ? "💡 Menampilkan simulasi pembacaan nota pasar (Tambahkan GEMINI_API_KEY di .env.local untuk live OCR)."
          : `💡 Panggilan API (${result.error}) dialihkan ke mode ketahanan demo tanpa memutus alur pengguna.`,
      isOfflineMode: true,
    };
  }

  throw new Error("Harap unggah gambar nota atau pilih contoh nota demo.");
}
