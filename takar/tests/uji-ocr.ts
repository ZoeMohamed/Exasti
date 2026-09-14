import assert from "node:assert/strict";
import { validateReceiptOutput } from "../lib/ai/ocr";
import { matchReceiptItem } from "../lib/ai/match";
import { ringkasHargaNota, satuanNota, tebakSatuanDasarNota } from "../lib/ai/receipt-units";

const bukanNota = validateReceiptOutput({ isReceipt: false, rejectionReason: "Tampilan aplikasi", items: [] });
assert.equal(bukanNota.valid, true);
if (bukanNota.valid) assert.equal(bukanNota.isReceipt, false);

assert.equal(validateReceiptOutput({ isReceipt: false, items: [{ nameRaw: "Ayam", totalPrice: 1000 }] }).valid, false);
assert.equal(validateReceiptOutput({ isReceipt: true, rejectionReason: null, items: [{ nameRaw: "Ayam", qty: 1, unit: "kg", totalPrice: -1 }] }).valid, false);
assert.equal(validateReceiptOutput({ isReceipt: true, rejectionReason: null, items: [{ nameRaw: "Ayam", qty: null, unit: null, totalPrice: null }] }).valid, true);

const bimoli = matchReceiptItem("Minyak Goreng Bimoli 2L", 2, "liter", 38_000);
assert.equal(bimoli.matchedName, "Minyak Goreng Kemasan Bermerk 1");
assert.equal(bimoli.pricePerUnit, 19_000);

const minyakCurah = matchReceiptItem("Minyak Goreng Curah", 2, "kg", 32_000);
assert.equal(minyakCurah.matchedName, "Minyak Goreng Curah");

const bawangSingkat = matchReceiptItem("Bawang mrh", 0.25, "kg", 12_500);
assert.equal(bawangSingkat.matchedName, "Bawang Merah Ukuran Sedang");
const cabeSingkat = matchReceiptItem("cabe", 0.5, "kg", 20_000);
assert.equal(cabeSingkat.matchedName, "Cabai Rawit Hijau");

const ons = ringkasHargaNota(10, "ons", 200_000, "kg");
assert.equal(ons.valid, true);
if (ons.valid) assert.equal(ons.hargaPerDasar, 200_000);
assert.equal(satuanNota("ons", "kg"), "ons");
assert.equal(satuanNota("ons", "pcs"), null);

assert.equal(tebakSatuanDasarNota("tabung"), "pcs");
assert.equal(tebakSatuanDasarNota("btl"), "pcs");
assert.equal(tebakSatuanDasarNota("ptg"), "pcs");
assert.equal(tebakSatuanDasarNota(null), null);
const gas = ringkasHargaNota(1, "tabung", 22_000, "pcs");
assert.deepEqual(gas, { valid: true, hargaPerDasar: 22_000, label: "tabung", satuan: "pcs" });
assert.equal(ringkasHargaNota(1, null, 22_000, "kg").valid, false);

console.log("✓ OCR menolak non-nota, mencocokkan singkatan, dan menyamakan satuan layar dengan payload");
