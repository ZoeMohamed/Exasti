import assert from "node:assert/strict";
import { langkahAktifPanduan, langkahPanduanValid, tujuanPanduan } from "../lib/onboarding";

assert.equal(langkahPanduanValid(1), 1);
assert.equal(langkahPanduanValid("4"), 4);
assert.equal(langkahPanduanValid(0), null);
assert.equal(langkahPanduanValid(5), null);
assert.equal(langkahPanduanValid(2.5), null);
assert.equal(langkahPanduanValid("abc"), null);

assert.equal(langkahAktifPanduan({ tersimpan: 1, jumlahMenu: 0, sudahSelesai: false }), 1);
assert.equal(langkahAktifPanduan({ tersimpan: 2, jumlahMenu: 1, sudahSelesai: false }), 3);
assert.equal(langkahAktifPanduan({ tersimpan: 4, jumlahMenu: 1, sudahSelesai: false }), 4);
assert.equal(langkahAktifPanduan({ tersimpan: 1, jumlahMenu: 0, sudahSelesai: true }), 5);
assert.equal(tujuanPanduan({ tersimpan: 1, jumlahMenu: 0, sudahSelesai: false }), "/dashboard/pengaturan?panduan=1");
assert.equal(tujuanPanduan({ tersimpan: 2, jumlahMenu: 0, sudahSelesai: false }), "/dashboard/menu/tambah?panduan=2");
assert.equal(tujuanPanduan({ tersimpan: 2, jumlahMenu: 1, sudahSelesai: false }), "/dashboard/belanja?panduan=3");
assert.equal(tujuanPanduan({ tersimpan: 4, jumlahMenu: 1, sudahSelesai: false }), "/dashboard?panduan=4");
assert.equal(tujuanPanduan({ tersimpan: 2, jumlahMenu: 1, sudahSelesai: true }), "/dashboard");

console.log("onboarding: 15 pemeriksaan lulus");
