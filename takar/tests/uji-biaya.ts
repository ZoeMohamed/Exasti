import assert from "node:assert/strict";
import { hitungBiayaGrosir, siapkanBiayaTetap } from "../lib/biaya";

let lolos = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lolos++;
  console.log(`✓ ${nama}`);
}

uji("pack Rp28.000 isi 500 = Rp56 per porsi", () => {
  assert.equal(hitungBiayaGrosir(28000, 500), 56);
});

uji("dua kresek per porsi ikut dikalikan", () => {
  assert.equal(hitungBiayaGrosir(15000, 100, 2), 300);
});

uji("kertas, kresek, dan sendok berjumlah Rp386", () => {
  const hasil = siapkanBiayaTetap([
    { label: "Kertas nasi", mode: "grosir", packPrice: 28000, packQty: 500 },
    { label: "Kresek", mode: "grosir", packPrice: 15000, packQty: 100 },
    { label: "Sendok plastik", mode: "grosir", packPrice: 18000, packQty: 100 },
  ]);
  assert.deepEqual(hasil.galat, []);
  assert.equal(hasil.biaya.reduce((sum, item) => sum + item.amount, 0), 386);
  assert.equal(hasil.biaya.every((item) => !item.isEstimated), true);
});

uji("biaya yang sudah diketahui per porsi tetap didukung", () => {
  const hasil = siapkanBiayaTetap([{ label: "Gas memasak", amount: 450 }]);
  assert.deepEqual(hasil.galat, []);
  assert.equal(hasil.biaya[0]?.amount, 450);
  assert.equal(hasil.biaya[0]?.packPrice, null);
});

uji("harga dan isi grosir wajib angka positif", () => {
  const hasil = siapkanBiayaTetap([
    { label: "Kotak nasi", mode: "grosir", packPrice: 28000, packQty: 0 },
  ]);
  assert.equal(hasil.biaya.length, 0);
  assert.match(hasil.galat[0]?.pesan ?? "", /jumlah barang/i);
});

uji("nama biaya yang sama tidak boleh dua kali", () => {
  const hasil = siapkanBiayaTetap([
    { label: "Kresek", amount: 100 },
    { label: "kresek", amount: 200 },
  ]);
  assert.equal(hasil.biaya.length, 1);
  assert.match(hasil.galat[0]?.pesan ?? "", /sudah ada/i);
});

uji("cara hitung yang tidak dikenali ditolak", () => {
  const hasil = siapkanBiayaTetap([
    { label: "Kotak nasi", mode: "asal", amount: 100 },
  ]);
  assert.equal(hasil.biaya.length, 0);
  assert.match(hasil.galat[0]?.pesan ?? "", /tidak dikenali/i);
});

console.log(`\n${lolos} uji biaya lolos.`);
