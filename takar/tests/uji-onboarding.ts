import assert from "node:assert/strict";
import { langkahAwalPanduan, langkahPanduanValid } from "../lib/onboarding";

assert.equal(langkahPanduanValid(1), 1);
assert.equal(langkahPanduanValid("5"), 5);
assert.equal(langkahPanduanValid(0), null);
assert.equal(langkahPanduanValid(6), null);
assert.equal(langkahPanduanValid(2.5), null);
assert.equal(langkahPanduanValid("abc"), null);

assert.equal(langkahAwalPanduan({ tersimpan: 1, jumlahMenu: 0, sudahSelesai: false }), 1);
assert.equal(langkahAwalPanduan({ tersimpan: 2, jumlahMenu: 1, sudahSelesai: false }), 3);
assert.equal(langkahAwalPanduan({ tersimpan: 4, jumlahMenu: 1, sudahSelesai: false }), 4);
assert.equal(langkahAwalPanduan({ tersimpan: 1, jumlahMenu: 0, sudahSelesai: true }), 5);
assert.equal(langkahAwalPanduan({ tersimpan: 4, jumlahMenu: 1, sudahSelesai: true, diminta: "2" }), 2);

console.log("onboarding: 11 pemeriksaan lulus");
