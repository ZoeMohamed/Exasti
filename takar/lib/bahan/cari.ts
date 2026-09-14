import type { SatuanDasar } from "@/lib/units";
import type { SaranUmum } from "./katalog-pasar";

export interface BahanTersedia {
  id: string;
  jenis: "pasar" | "warung";
  namaTampil: string;
  alias: string[];
  satuanDasar: SatuanDasar;
  harga: number | null;
  sumberHarga: string;
  tanggalHarga: string | null;
}

export type HasilCari =
  | { tipe: "tersedia"; bahan: BahanTersedia }
  | { tipe: "saran"; saran: SaranUmum }
  | { tipe: "baru"; nama: string };

export function normalisasiNama(value: string): string {
  return value.toLocaleLowerCase("id-ID").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function semuaNama(nama: string, alias: string[]): string[] {
  return [nama, ...alias].map(normalisasiNama).filter(Boolean);
}

function nilai(nama: string, alias: string[], kueri: string): number {
  const daftar = semuaNama(nama, alias);
  if (daftar.some((item) => item === kueri)) return 0;
  if (daftar.some((item) => item.startsWith(kueri))) return 1;
  if (daftar.some((item) => item.split(" ").some((kata) => kata.startsWith(kueri)))) return 2;
  if (daftar.some((item) => item.includes(kueri))) return 3;
  return 99;
}

export function cariBahan(
  daftar: BahanTersedia[],
  saranUmum: SaranUmum[],
  kueriMentah: string,
  sudahDipakai: Set<string>,
): HasilCari[] {
  const kueri = normalisasiNama(kueriMentah);
  if (!kueri) return [];

  const tersedia = daftar
    .filter((item) => !sudahDipakai.has(item.id))
    .map((item) => ({ item, nilai: nilai(item.namaTampil, item.alias, kueri) }))
    .filter((item) => item.nilai < 99)
    .sort((a, b) => a.nilai - b.nilai || (a.item.jenis === b.item.jenis ? 0 : a.item.jenis === "warung" ? -1 : 1))
    .map(({ item }) => ({ tipe: "tersedia" as const, bahan: item }));

  const namaAda = new Set(daftar.map((item) => normalisasiNama(item.namaTampil)));
  const saran = saranUmum
    .filter((item) => !namaAda.has(normalisasiNama(item.nama)))
    .map((item) => ({ item, nilai: nilai(item.nama, item.alias, kueri) }))
    .filter((item) => item.nilai < 99)
    .sort((a, b) => a.nilai - b.nilai)
    .map(({ item }) => ({ tipe: "saran" as const, saran: item }));

  const hasil: HasilCari[] = [...tersedia, ...saran].slice(0, 8);
  const persis = [...daftar.map((item) => item.namaTampil), ...saranUmum.map((item) => item.nama)]
    .some((nama) => normalisasiNama(nama) === kueri);
  if (!persis) hasil.push({ tipe: "baru", nama: kueriMentah.trim() });
  return hasil;
}
