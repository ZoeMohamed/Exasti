import assert from "node:assert/strict";
import {
  JATENG_PROVINCE_ID,
  SEMARANG_REGENCY_ID,
  formatBiRequestDate,
  parseRupiah,
} from "../lib/services/bi-ingest";

// Kunci regresi untuk bug Banda Aceh yang sempat dilabeli Kota Semarang.
assert.equal(JATENG_PROVINCE_ID, 14);
assert.equal(SEMARANG_REGENCY_ID, 35);
assert.equal(formatBiRequestDate(new Date(2026, 8, 11)), "09/11/2026");
assert.equal(parseRupiah("26,150"), 26_150);
assert.equal(parseRupiah("-"), null);

console.log("✓ mapping BI Jawa Tengah/Kota Semarang dan format harganya terkunci");
