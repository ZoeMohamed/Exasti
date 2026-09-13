import assert from "node:assert/strict";
import { validateReceiptOutput } from "../lib/ai/ocr";
import { matchReceiptItem } from "../lib/ai/match";

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

console.log("✓ hasil OCR membedakan nota, non-nota, nilai rusak, dan angka yang tidak terbaca");
