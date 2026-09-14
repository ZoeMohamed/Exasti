import assert from "node:assert/strict";
import { bacaAngkaRupiah, formatAngkaRupiah } from "../lib/formatRupiah";

let lolos = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lolos++;
  console.log(`✓ ${nama}`);
}

uji("28000 otomatis menjadi 28.000", () => {
  assert.equal(formatAngkaRupiah(28000), "28.000");
});

uji("teks berformat rupiah kembali menjadi angka murni", () => {
  assert.equal(bacaAngkaRupiah("Rp 1.250.000"), 1_250_000);
});

uji("titik pemisah lama tidak mengubah nilai", () => {
  assert.equal(bacaAngkaRupiah("28.000"), 28_000);
});

uji("kolom kosong tetap kosong", () => {
  assert.equal(bacaAngkaRupiah(""), "");
  assert.equal(formatAngkaRupiah(""), "");
});

uji("huruf dan simbol selain angka dibuang", () => {
  assert.equal(bacaAngkaRupiah("Rp12rb500"), 12_500);
});

console.log(`\n${lolos} uji format rupiah lolos.`);
