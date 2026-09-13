import assert from "node:assert/strict";
import { cariBahan, type BahanTersedia } from "../lib/bahan/cari";
import { SARAN_UMUM } from "../lib/bahan/katalog-pasar";
import { hitungHargaPerDasar, hitungTakaran } from "../lib/bahan/takaran";

let lolos = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lolos++;
  console.log(`✓ ${nama}`);
}

uji("2 kg ayam untuk 8 porsi", () => {
  const hasil = hitungTakaran({ cara: "per_masak", jumlah: 2, satuan: "kg" }, "kg", 8);
  assert.ok(!("galat" in hasil));
  assert.equal(hasil.batchQty, 2);
  assert.equal(hasil.qty, 0.25);
});

uji("80 gram bawang untuk 8 porsi", () => {
  const hasil = hitungTakaran({ cara: "per_masak", jumlah: 80, satuan: "gram" }, "kg", 8);
  assert.ok(!("galat" in hasil));
  assert.equal(hasil.batchQty, 0.08);
  assert.equal(hasil.qty, 0.01);
});

uji("saus 340 gram cukup 25 porsi", () => {
  const hasil = hitungTakaran({ cara: "per_kemasan", isi: 340, satuan: "gram", porsi: 25 }, "kg", 8);
  assert.ok(!("galat" in hasil));
  assert.ok(Math.abs(hasil.qty - 0.0136) < 1e-10);
  assert.ok(Math.abs(hasil.batchQty - 0.1088) < 1e-10);
});

uji("saus Rp12.500 menghasilkan modal Rp500 per porsi", () => {
  const harga = hitungHargaPerDasar({ hargaKemasan: 12500, isi: 340, satuan: "gram" }, "kg");
  assert.ok(!("galat" in harga));
  assert.equal(Math.round(harga.hargaPerDasar * 0.0136), 500);
});

uji("kemasan 500 gram Rp22.500 lebih mahal per gram", () => {
  const satu = hitungHargaPerDasar({ hargaKemasan: 42000, isi: 1, satuan: "kg" }, "kg");
  const dua = hitungHargaPerDasar({ hargaKemasan: 22500, isi: 500, satuan: "gram" }, "kg");
  assert.ok(!("galat" in satu) && !("galat" in dua));
  assert.equal(satu.hargaPerDasar / 1000, 42);
  assert.equal(dua.hargaPerDasar / 1000, 45);
});

const pasar: BahanTersedia[] = [
  { id: "Cabai Rawit Hijau", jenis: "pasar", namaTampil: "Cabai rawit", alias: ["cabe rawit"], satuanDasar: "kg", harga: 1, sumberHarga: "harga pasar", tanggalHarga: null },
  { id: "Telur Ayam Ras Segar", jenis: "pasar", namaTampil: "Telur", alias: ["telor"], satuanDasar: "kg", harga: 1, sumberHarga: "harga pasar", tanggalHarga: null },
  { id: "Bawang Merah Ukuran Sedang", jenis: "pasar", namaTampil: "Bawang merah", alias: ["brambang"], satuanDasar: "kg", harga: 1, sumberHarga: "harga pasar", tanggalHarga: null },
];

uji("alias cabe, telor, dan brambang ditemukan", () => {
  for (const [kueri, harapan] of [["cabe", "Cabai rawit"], ["telor", "Telur"], ["brambang", "Bawang merah"]]) {
    const hasil = cariBahan(pasar, SARAN_UMUM, kueri, new Set());
    assert.equal(hasil[0]?.tipe, "tersedia");
    if (hasil[0]?.tipe === "tersedia") assert.equal(hasil[0].bahan.namaTampil, harapan);
  }
});

console.log(`\n${lolos} uji bahan lolos.`);
