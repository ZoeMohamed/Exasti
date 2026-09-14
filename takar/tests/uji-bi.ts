import assert from "node:assert/strict";
import {
  JATENG_PROVINCE_ID,
  SEMARANG_REGENCY_ID,
  formatBiRequestDate,
  parseRupiah,
  syncBiPricesForRegion,
} from "../lib/services/bi-ingest";
import { BI_REGIONS } from "../lib/data/bi-regions";

// Kunci regresi untuk bug Banda Aceh yang sempat dilabeli Kota Semarang.
assert.equal(JATENG_PROVINCE_ID, 14);
assert.equal(SEMARANG_REGENCY_ID, 35);
assert.equal(formatBiRequestDate(new Date(2026, 8, 11)), "09/11/2026");
assert.equal(parseRupiah("26,150"), 26_150);
assert.equal(parseRupiah("-"), null);

// Verifikasi katalog master 110 wilayah BI dan 34 provinsi
assert.equal(BI_REGIONS.length, 110);
const provSet = new Set(BI_REGIONS.map((r) => r.provinceName));
assert.equal(provSet.size, 34);

const semarang = BI_REGIONS.find((r) => r.regencyName === "Kota Semarang");
assert.ok(semarang);
assert.equal(semarang.provinceId, 14);
assert.equal(semarang.regencyId, 35);
assert.equal(typeof syncBiPricesForRegion, "function");

console.log("✓ mapping BI Jawa Tengah/Kota Semarang dan format harganya terkunci");
console.log("✓ master 110 wilayah Bank Indonesia di 34 provinsi terverifikasi");

