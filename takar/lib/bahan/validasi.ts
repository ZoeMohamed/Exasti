import { keluargaSatuan, type Satuan, type SatuanDasar } from "@/lib/units";
import type { HargaBelanja, Pemakaian } from "./takaran";

export type RefBahan =
  | { jenis: "pasar"; id: string }
  | { jenis: "warung"; id: string }
  | { jenis: "baru"; nama: string; satuanDasar?: SatuanDasar };

export interface BahanResepInput {
  bahan: RefBahan;
  pemakaian: Pemakaian;
  harga?: HargaBelanja;
  catatan?: string;
}

export interface BahanResepLama {
  commodityId: string;
  batchQty: number;
  note?: string;
}

const SATUAN = new Set<Satuan>(["kg", "gram", "ons", "liter", "ml", "pcs", "butir", "ekor"]);

function angkaPositif(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function bentukLama(value: unknown): value is BahanResepLama {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<BahanResepLama>;
  return typeof row.commodityId === "string" && row.commodityId.trim().length > 0 && angkaPositif(row.batchQty);
}

export function validasiBahanResep(value: unknown, indeks: number): string[] {
  if (bentukLama(value)) return [];
  if (!value || typeof value !== "object") return [`Bahan ${indeks + 1} tidak valid.`];
  const row = value as Partial<BahanResepInput>;
  const galat: string[] = [];
  if (!row.bahan || !["pasar", "warung", "baru"].includes(row.bahan.jenis)) galat.push(`Pilih bahan pada baris ${indeks + 1}.`);
  if (row.bahan?.jenis === "baru" && !row.bahan.nama?.trim()) galat.push(`Nama bahan ${indeks + 1} wajib diisi.`);
  if (row.bahan?.jenis === "baru" && row.bahan.satuanDasar && !["kg", "liter", "pcs"].includes(row.bahan.satuanDasar)) {
    galat.push(`Jenis ukuran bahan ${indeks + 1} tidak valid.`);
  }
  if (row.bahan?.jenis !== "baru" && !(row.bahan as { id?: string })?.id?.trim()) galat.push(`Bahan ${indeks + 1} tidak punya id.`);
  if (!row.pemakaian || !["per_masak", "per_kemasan"].includes(row.pemakaian.cara)) {
    galat.push(`Cara pakai bahan ${indeks + 1} belum dipilih.`);
  } else if (row.pemakaian.cara === "per_masak") {
    if (!angkaPositif(row.pemakaian.jumlah)) galat.push(`Jumlah bahan ${indeks + 1} harus lebih dari 0.`);
    if (!SATUAN.has(row.pemakaian.satuan)) galat.push(`Satuan bahan ${indeks + 1} tidak valid.`);
  } else {
    if (!angkaPositif(row.pemakaian.isi)) galat.push(`Isi kemasan bahan ${indeks + 1} harus lebih dari 0.`);
    if (!angkaPositif(row.pemakaian.porsi)) galat.push(`Porsi per kemasan bahan ${indeks + 1} harus lebih dari 0.`);
    if (!SATUAN.has(row.pemakaian.satuan)) galat.push(`Satuan kemasan bahan ${indeks + 1} tidak valid.`);
  }
  if (row.harga) {
    if (!angkaPositif(row.harga.hargaKemasan) || !angkaPositif(row.harga.isi) || !SATUAN.has(row.harga.satuan)) {
      galat.push(`Harga belanja bahan ${indeks + 1} belum lengkap.`);
    }
  }
  if (row.bahan?.jenis === "baru" && !row.harga) galat.push(`Harga belanja bahan baru ${indeks + 1} wajib diisi.`);
  return galat;
}

export function keluargaDariInput(input: BahanResepInput): SatuanDasar {
  if (input.bahan.jenis === "baru" && input.bahan.satuanDasar) return input.bahan.satuanDasar;
  return keluargaSatuan(input.pemakaian.satuan);
}
