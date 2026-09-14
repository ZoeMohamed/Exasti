// lib/margin.ts
// Mesin margin Takar — FUNGSI MURNI, TANPA I/O.
// FR-19: berkas ini tidak boleh mengimpor klien database, fetch, atau apa pun
// yang menyentuh jaringan. Semua data masuk lewat argumen.
//
// Aturan bisnis yang diimplementasikan di sini (docs/06-SRS.md §2):
//   BR-01 HPP · BR-02 margin · BR-04 pendorong · BR-05 keparahan
//   BR-06 pembatasan alert · BR-07 saran harga · BR-15 kesehatan

// ─────────────────────────────────────────────────────────────
// Konfigurasi ambang — BR-05 mensyaratkan SATU objek, bukan if tersebar
// ─────────────────────────────────────────────────────────────

export const AMBANG = {
  // BR-15 pengelompokan kesehatan
  sehatMin: 20,
  rugiMax: 0,

  // BR-05 tingkat keparahan alert
  keparahan: [
    { tingkat: "critical" as const, marginDiBawah: 10, turunPoin: 15 },
    { tingkat: "warning" as const, marginDiBawah: 20, turunPoin: 8 },
    { tingkat: "info" as const, marginDiBawah: 30, turunPoin: 5 },
  ],

  // BR-06 pembatasan
  maksAlertPerHari: 3,
  stabilPoin: 2, // margin rendah tapi bergerak < 2 poin tidak menghasilkan alert

  // BR-07 saran harga
  marginTargetMin: 0.15,
  pembulatanRupiah: 500,

  // BR-10 cakupan data
  cakupanMin: 0.7,
} as const;

export type Kesehatan = "sehat" | "tipis" | "rugi";
export type Keparahan = "info" | "warning" | "critical";

export interface BahanResep {
  komoditasId: string;
  nama: string;
  qty: number; // per porsi, sudah dibagi batch_yield (BR-08)
  harga: number | null; // null = harga tidak tersedia
  hargaLalu?: number | null; // harga d−w untuk BR-04
  dariData: boolean; // true = harga otomatis, false = perkiraan pemilik
}

// ─────────────────────────────────────────────────────────────
// BR-01 — HPP
// ─────────────────────────────────────────────────────────────

export interface HasilHpp {
  hpp: number;
  dariData: number; // jumlah bahan berharga otomatis
  jumlahHilang: number; // bahan tanpa harga
  cakupan: number; // porsi rupiah yang berasal dari data otomatis (0..1)
}

export function hitungHpp(bahan: BahanResep[], biayaTetap = 0): HasilHpp {
  let hpp = 0;
  let rupiahDariData = 0;
  let dariData = 0;
  let jumlahHilang = 0;

  for (const b of bahan) {
    if (b.harga === null || b.harga === undefined) {
      jumlahHilang++;
      continue; // BR-01: bahan tanpa harga dilewati, bukan dianggap nol-rupiah palsu
    }
    const sub = b.qty * b.harga;
    hpp += sub;
    if (b.dariData) {
      rupiahDariData += sub;
      dariData++;
    }
  }

  hpp += biayaTetap;
  const cakupan = hpp > 0 ? rupiahDariData / hpp : 0;

  return { hpp: Math.round(hpp), dariData, jumlahHilang, cakupan };
}

// ─────────────────────────────────────────────────────────────
// BR-02 — margin
// ─────────────────────────────────────────────────────────────

export function hitungMargin(hargaJual: number, hpp: number): number {
  if (!hargaJual || hargaJual <= 0) return 0; // FR-16: harga_jual = 0 tidak boleh membagi nol
  return Math.round(((hargaJual - hpp) / hargaJual) * 1000) / 10;
}

// ─────────────────────────────────────────────────────────────
// BR-15 — pengelompokan kesehatan
// ─────────────────────────────────────────────────────────────

export function kesehatan(marginPct: number): Kesehatan {
  if (marginPct < AMBANG.rugiMax) return "rugi";
  if (marginPct < AMBANG.sehatMin) return "tipis";
  return "sehat";
}

// ─────────────────────────────────────────────────────────────
// BR-04 — penentuan pendorong ⭐
// Kontribusi RUPIAH (qty × Δharga), BUKAN persentase kenaikan terbesar.
// ─────────────────────────────────────────────────────────────

export interface Kontribusi {
  komoditasId: string;
  nama: string;
  kontribusiRp: number;
  kenaikanPct: number;
}

export function hitungKontribusi(bahan: BahanResep[]): Kontribusi[] {
  const hasil: Kontribusi[] = [];

  for (const b of bahan) {
    if (b.harga === null || b.hargaLalu === null || b.hargaLalu === undefined) continue;
    const delta = b.harga - b.hargaLalu;
    hasil.push({
      komoditasId: b.komoditasId,
      nama: b.nama,
      kontribusiRp: Math.round(b.qty * delta),
      kenaikanPct: b.hargaLalu > 0 ? Math.round((delta / b.hargaLalu) * 1000) / 10 : 0,
    });
  }

  // argmax kontribusi rupiah
  return hasil.sort((a, b) => b.kontribusiRp - a.kontribusiRp);
}

export function cariPendorong(bahan: BahanResep[]): Kontribusi | null {
  const urut = hitungKontribusi(bahan);
  if (urut.length === 0 || urut[0].kontribusiRp <= 0) return null;
  return urut[0];
}

/**
 * Bahan yang naik paling tinggi secara PERSEN tapi bukan pendorong —
 * inilah bahan pembanding untuk blok "gara-gara X, bukan Y" (FR-24).
 */
export function cariPembanding(bahan: BahanResep[], pendorongId: string): Kontribusi | null {
  const lain = hitungKontribusi(bahan).filter((k) => k.komoditasId !== pendorongId);
  if (lain.length === 0) return null;
  return lain.sort((a, b) => b.kenaikanPct - a.kenaikanPct)[0];
}


/**
 * Penyumbang modal terbesar — dipakai saat tidak ada bahan yang naik harga.
 * FR-31 menuntut setiap alert menyebut bahan penyebab; kalau masalahnya bukan
 * kenaikan harga melainkan resepnya sendiri, yang jujur disebut adalah bahan
 * yang memakan modal paling besar.
 */
export function penyumbangTerbesar(bahan: BahanResep[]): Kontribusi | null {
  const berharga = bahan.filter((b) => b.harga !== null && b.harga !== undefined);
  if (berharga.length === 0) return null;

  const urut = [...berharga].sort((a, b) => b.qty * (b.harga as number) - a.qty * (a.harga as number));
  const t = urut[0];
  return {
    komoditasId: t.komoditasId,
    nama: t.nama,
    kontribusiRp: Math.round(t.qty * (t.harga as number)),
    kenaikanPct: 0,
  };
}

// ─────────────────────────────────────────────────────────────
// BR-07 — saran harga jual
// ─────────────────────────────────────────────────────────────

export function saranHarga(hpp: number, marginTarget30HariLalu?: number | null): number {
  const target = Math.max(
    AMBANG.marginTargetMin,
    marginTarget30HariLalu != null ? marginTarget30HariLalu / 100 : 0,
  );
  const aman = Math.min(target, 0.9); // jaga-jaga agar tidak membagi mendekati nol
  const mentah = hpp / (1 - aman);
  return Math.ceil(mentah / AMBANG.pembulatanRupiah) * AMBANG.pembulatanRupiah;
}

// ─────────────────────────────────────────────────────────────
// BR-05 + BR-06 — keparahan dan pembatasan alert
// ─────────────────────────────────────────────────────────────

export interface CalonAlert {
  menuItemId: string;
  namaMenu: string;
  marginSekarang: number;
  marginLalu: number | null;
  penurunanPoin: number;
  keparahan: Keparahan;
  pendorong: Kontribusi | null;
  hpp: number;
  hargaJual: number;
  jenis?: "masalah" | "pulih";
}

/**
 * BR-05: tingkat keparahan. Mengembalikan null bila tidak memenuhi syarat apa pun,
 * atau bila margin rendah TAPI stabil (BR-06) — pemilik sudah mengetahuinya.
 */
export function nilaiKeparahan(
  marginSekarang: number,
  marginLalu: number | null,
): { keparahan: Keparahan; penurunanPoin: number } | null {
  const penurunan = marginLalu != null ? marginLalu - marginSekarang : 0;

  for (const t of AMBANG.keparahan) {
    const karenaRendah = marginSekarang < t.marginDiBawah;
    const karenaTurun = penurunan >= t.turunPoin;

    if (!karenaRendah && !karenaTurun) continue;

    // BR-06: rendah tapi stabil → diam. Hanya berlaku bila pemicunya
    // semata-mata "margin rendah", bukan penurunan tajam.
    //
    // Dua pengecualian yang tidak tertulis di BR-06 tapi wajib, karena
    // membungkam di kedua keadaan ini berarti menyembunyikan kerugian:
    //
    //   1. Menu yang RUGI (margin < 0) selalu bersuara. Rugi yang stabil
    //      tetap rugi setiap hari — itu justru yang paling perlu didengar.
    //   2. Bila tidak ada pembanding 7 hari lalu, kita TIDAK TAHU menu ini
    //      stabil atau tidak. Diam karena tidak tahu adalah menebak.
    const rugi = marginSekarang < AMBANG.rugiMax;
    const tahuStabil = marginLalu != null;

    if (
      karenaRendah && !karenaTurun && !rugi && tahuStabil &&
      Math.abs(penurunan) < AMBANG.stabilPoin
    ) {
      return null;
    }

    return { keparahan: t.tingkat, penurunanPoin: Math.round(penurunan * 10) / 10 };
  }

  return null;
}

const URUTAN: Record<Keparahan, number> = { critical: 0, warning: 1, info: 2 };

/**
 * BR-06: maksimal 3 per warung per hari, urut critical → warning → info,
 * lalu berdasarkan besarnya penurunan margin.
 */
export function batasiAlert(calon: CalonAlert[]): CalonAlert[] {
  return [...calon]
    .sort((a, b) => {
      const beda = URUTAN[a.keparahan] - URUTAN[b.keparahan];
      if (beda !== 0) return beda;
      return b.penurunanPoin - a.penurunanPoin;
    })
    .slice(0, AMBANG.maksAlertPerHari);
}

/**
 * Menyusun kalimat alert dalam bahasa Bu Sri — tanpa kata "margin"/"HPP" (FR-29).
 */
export function susunKalimat(a: CalonAlert): { headline: string; detail: string } {
  const untung = a.hargaJual - a.hpp;
  const rp = (n: number) => "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");

  if (a.jenis === "pulih") {
    return {
      headline: `${a.namaMenu} sudah sehat untuk dijual lagi`,
      detail: `Sisa setelah modalnya kini ${rp(untung)} per porsi. Cek resep lalu aktifkan kembali bila siap.`,
    };
  }

  if (untung < 0) {
    return {
      headline: `${a.namaMenu} sekarang rugi ${rp(untung)} per porsi`,
      detail: a.pendorong
        ? a.pendorong.kenaikanPct > 0
          ? `Gara-gara ${a.pendorong.nama} naik ${rp(a.pendorong.kontribusiRp)} per porsi.`
          : `Modal terbesarnya ${a.pendorong.nama}, ${rp(a.pendorong.kontribusiRp)} per porsi. Coba cek takarannya.`
        : `Modalnya sudah lebih besar dari harga jual.`,
    };
  }

  if (a.penurunanPoin >= AMBANG.stabilPoin) {
    return {
      headline: `Untung ${a.namaMenu} turun jadi ${rp(untung)} per porsi`,
      detail: a.pendorong
        ? `Gara-gara ${a.pendorong.nama} naik ${rp(a.pendorong.kontribusiRp)} per porsi.`
        : `Harga bahan bergerak naik minggu ini.`,
    };
  }

  return {
    headline: `Untung ${a.namaMenu} tinggal ${rp(untung)} per porsi`,
    detail: a.pendorong
      ? `Penyumbang terbesar: ${a.pendorong.nama}.`
      : `Modalnya sudah mepet ke harga jual.`,
  };
}

// ─────────────────────────────────────────────────────────────
// FR-57 — penjaga salah satuan
// ─────────────────────────────────────────────────────────────

export interface Keberatan {
  komoditasId: string;
  nama: string;
  biayaPerPorsi: number;
  pesan: string;
}

/**
 * Bila modal SATU bahan per porsi sudah melebihi harga jual, hampir pasti
 * satuannya salah — gram diketik sebagai kilogram, atau jumlah sekali masak
 * diketik sebagai jumlah per porsi. Sistem menolak menyimpan dan bertanya,
 * bukan menyimpan angka yang jelas mustahil.
 */
export function periksaSatuan(bahan: BahanResep[], hargaJual: number): Keberatan[] {
  if (!hargaJual || hargaJual <= 0) return [];

  const keberatan: Keberatan[] = [];
  for (const b of bahan) {
    if (b.harga === null || b.harga === undefined) continue;
    const biaya = b.qty * b.harga;
    if (biaya > hargaJual) {
      keberatan.push({
        komoditasId: b.komoditasId,
        nama: b.nama,
        biayaPerPorsi: Math.round(biaya),
        pesan:
          `${b.nama} saja sudah Rp ${Math.round(biaya).toLocaleString("id-ID")} per porsi, ` +
          `padahal menunya dijual Rp ${hargaJual.toLocaleString("id-ID")}. ` +
          `Coba cek lagi satuan dan jumlah porsinya.`,
      });
    }
  }
  return keberatan;
}
