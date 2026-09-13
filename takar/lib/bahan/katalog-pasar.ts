import type { SatuanDasar } from "@/lib/units";

export interface DefinisiPasar {
  namaTampil: string;
  alias: string[];
  satuanDasar: SatuanDasar;
  sembunyikan?: boolean;
}

export const KATALOG_PASAR: Record<string, DefinisiPasar> = {
  "Daging Ayam Ras Segar": { namaTampil: "Ayam", alias: ["ayam", "ayam potong", "ayam broiler", "daging ayam", "dada ayam", "paha ayam", "fillet ayam", "sayap ayam", "ceker ayam"], satuanDasar: "kg" },
  "Daging Sapi Kualitas 1": { namaTampil: "Daging sapi", alias: ["daging sapi", "sapi", "sirloin", "tenderloin", "gandik"], satuanDasar: "kg" },
  "Daging Sapi Kualitas 2": { namaTampil: "Daging sapi tetelan", alias: ["daging sapi tetelan", "tetelan sapi", "sandung lamur", "rawonan"], satuanDasar: "kg" },
  "Beras Kualitas Medium I": { namaTampil: "Beras", alias: ["beras", "beras biasa", "beras medium", "beras c4", "beras rojolele", "beras ramos", "beras putih"], satuanDasar: "kg" },
  "Beras Kualitas Super I": { namaTampil: "Beras premium", alias: ["beras premium", "beras super"], satuanDasar: "kg" },
  "Beras Kualitas Bawah I": { namaTampil: "Beras murah", alias: ["beras murah", "beras bawah"], satuanDasar: "kg" },
  "Beras Kualitas Medium II": { namaTampil: "Beras medium II", alias: [], satuanDasar: "kg", sembunyikan: true },
  "Beras Kualitas Super II": { namaTampil: "Beras premium II", alias: [], satuanDasar: "kg", sembunyikan: true },
  "Beras Kualitas Bawah II": { namaTampil: "Beras murah II", alias: [], satuanDasar: "kg", sembunyikan: true },
  "Telur Ayam Ras Segar": { namaTampil: "Telur", alias: ["telur", "telor", "telur ayam", "telor ayam", "telur negeri"], satuanDasar: "kg" },
  "Cabai Rawit Hijau": { namaTampil: "Cabai rawit", alias: ["cabai rawit", "cabe rawit", "rawit", "cabai rawit hijau", "cabe rawit ijo", "cabai", "cabe"], satuanDasar: "kg" },
  "Cabai Rawit Merah": { namaTampil: "Cabai rawit merah", alias: ["cabai rawit merah", "cabe rawit merah", "cabe setan", "cabai setan", "rawit merah"], satuanDasar: "kg" },
  "Cabai Merah Keriting": { namaTampil: "Cabai merah", alias: ["cabai merah", "cabe merah", "cabai keriting", "cabe keriting", "lombok keriting"], satuanDasar: "kg" },
  "Cabai Merah Besar": { namaTampil: "Cabai merah besar", alias: ["cabai merah besar", "cabe merah besar", "cabe teropong"], satuanDasar: "kg" },
  "Bawang Merah Ukuran Sedang": { namaTampil: "Bawang merah", alias: ["bawang merah", "bawang mrh", "bwg merah", "bwg mrh", "brambang", "brambang jawa"], satuanDasar: "kg" },
  "Bawang Putih Ukuran Sedang": { namaTampil: "Bawang putih", alias: ["bawang putih", "bwg putih", "bawang kating"], satuanDasar: "kg" },
  "Minyak Goreng Curah": { namaTampil: "Minyak goreng", alias: ["minyak", "minyak goreng", "minyak curah", "minyak kiloan"], satuanDasar: "kg" },
  "Minyak Goreng Kemasan Bermerk 1": { namaTampil: "Minyak goreng kemasan", alias: ["minyak kemasan", "bimoli", "filma", "tropical", "sunco", "sania"], satuanDasar: "kg" },
  "Minyak Goreng Kemasan Bermerk 2": { namaTampil: "Minyakita", alias: ["minyakita", "minyak kita", "fortune", "sovia"], satuanDasar: "kg" },
  "Gula Pasir Lokal": { namaTampil: "Gula pasir", alias: ["gula", "gula pasir", "gula putih", "gulaku"], satuanDasar: "kg" },
  "Gula Pasir Kualitas Premium": { namaTampil: "Gula pasir premium", alias: ["gula premium", "gula pasir premium"], satuanDasar: "kg" },
};

for (const nama of ["Beras", "Bawang Merah", "Bawang Putih", "Cabai Merah", "Cabai Rawit", "Daging Ayam", "Daging Sapi", "Gula Pasir", "Minyak Goreng", "Telur Ayam"]) {
  KATALOG_PASAR[nama] = { namaTampil: nama, alias: [], satuanDasar: "kg", sembunyikan: true };
}

export interface SaranUmum {
  nama: string;
  alias: string[];
  satuanDasar: SatuanDasar;
  caraPakai: "per_masak" | "per_kemasan";
}

export const SARAN_UMUM: SaranUmum[] = [
  { nama: "Saus sambal", alias: ["saos", "saos sambal", "sambal botol"], satuanDasar: "kg", caraPakai: "per_kemasan" },
  { nama: "Kecap manis", alias: ["kecap", "kecap bango", "kecap abc"], satuanDasar: "liter", caraPakai: "per_kemasan" },
  { nama: "Tepung terigu", alias: ["tepung", "terigu", "segitiga biru"], satuanDasar: "kg", caraPakai: "per_masak" },
  { nama: "Tepung tapioka", alias: ["tapioka", "tepung kanji", "kanji"], satuanDasar: "kg", caraPakai: "per_masak" },
  { nama: "Garam", alias: ["garam dapur", "garam halus"], satuanDasar: "kg", caraPakai: "per_kemasan" },
  { nama: "Bumbu penyedap", alias: ["royco", "masako", "penyedap", "kaldu bubuk", "micin"], satuanDasar: "kg", caraPakai: "per_kemasan" },
  { nama: "Kertas nasi", alias: ["kertas minyak", "bungkus nasi"], satuanDasar: "pcs", caraPakai: "per_kemasan" },
  { nama: "Plastik", alias: ["kresek", "kantong plastik"], satuanDasar: "pcs", caraPakai: "per_kemasan" },
];

// Nama ekspor lama dipertahankan untuk mesin pembaca nota.
export const BI_COMMODITIES = Object.fromEntries(
  Object.entries(KATALOG_PASAR)
    .filter(([, item]) => item.alias.length > 0)
    .map(([id, item]) => [id, { aliases: item.alias, standardUnit: item.satuanDasar }]),
) as Record<string, { aliases: string[]; standardUnit: string }>;

export const WARUNG_NON_BI_CATALOG = Object.fromEntries(
  SARAN_UMUM.map((item) => [item.nama, { aliases: [item.nama, ...item.alias], standardUnit: item.satuanDasar }]),
) as Record<string, { aliases: string[]; standardUnit: string }>;

export function definisiPasar(id: string): DefinisiPasar | undefined {
  return KATALOG_PASAR[id];
}
