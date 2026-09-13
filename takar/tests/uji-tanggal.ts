import { labelWaktuRelatif, hariIniJakarta, keIsoTanggal, jamJakarta } from "../lib/tanggal.ts";

let lolos = 0, gagal = 0;
const cek = <T>(n: string, d: T, h: T) => {
  const ok = JSON.stringify(d) === JSON.stringify(h);
  console.log(`  ${ok ? "✓" : "✗"} ${n}${ok ? "" : `  dapat ${JSON.stringify(d)} harap ${JSON.stringify(h)}`}`);
  if (ok) lolos++;
  else gagal++;
};

const hariIni = hariIniJakarta();
cek("hariIniJakarta berformat YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(hariIni), true);

// Pukul 20:00 WIB hari ini = 13:00 UTC. Server UTC akan menyebutnya hari ini juga.
// Pukul 02:00 WIB hari ini = 19:00 UTC KEMARIN — di sinilah server UTC salah.
const duaPagiWib = new Date(hariIni + "T02:00:00+07:00");
cek("02:00 WIB dihitung sebagai hari ini", labelWaktuRelatif(duaPagiWib).selisihHari, 0);
cek("02:00 WIB tidak dianggap basi", labelWaktuRelatif(duaPagiWib).basi, false);

const kemarin = new Date(Date.parse(hariIni + "T10:00:00+07:00") - 86400000);
cek("kemarin dikenali", labelWaktuRelatif(kemarin).selisihHari, 1);
cek("kemarin belum basi", labelWaktuRelatif(kemarin).basi, false);

const tigaHari = new Date(Date.parse(hariIni + "T10:00:00+07:00") - 3 * 86400000);
cek("tiga hari lalu = basi", labelWaktuRelatif(tigaHari).basi, true);
cek("tiga hari lalu tidak mengaku hari ini", labelWaktuRelatif(tigaHari).teks.includes("Hari ini"), false);

cek("tidak pernah sinkron = basi", labelWaktuRelatif(null).basi, true);
cek("nilai rusak tidak melempar", labelWaktuRelatif("bukan tanggal").teks, "belum pernah");

// keIsoTanggal tidak boleh menggeser hari
cek("keIsoTanggal string dipotong apa adanya", keIsoTanggal("2026-09-13T00:00:00.000Z"), "2026-09-13");
cek("jamJakarta berformat HH.MM/HH:MM", /^\d{2}[.:]\d{2}$/.test(jamJakarta(new Date())), true);


// ═══ Logika persis yang dipakai layout untuk memutuskan "harga hari ini"
const hargaBasi = (tanggalHarga: string | null) =>
  keIsoTanggal(tanggalHarga) !== hariIniJakarta();

cek("harga bertanggal hari ini = tidak basi", hargaBasi(hariIniJakarta()), false);
cek("harga 4 hari lalu = basi", hargaBasi("2020-01-01"), true);
cek("tidak ada harga = basi", hargaBasi(null), true);

// Di server UTC antara 00:00-07:00 WIB, harga bertanggal hari ini (Jakarta)
// tidak boleh dianggap basi hanya karena servernya masih menganggap kemarin.
const hariJakarta = hariIniJakarta();
const hariUtc = new Intl.DateTimeFormat("sv-SE", { timeZone: "UTC" }).format(new Date());
cek(
  `harga tgl ${hariJakarta} tidak basi walau server UTC bilang ${hariUtc}`,
  hargaBasi(hariJakarta),
  false,
);

console.log(`\n  ${lolos} lolos, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
