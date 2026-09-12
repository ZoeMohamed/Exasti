import { hitungHpp, hitungMargin, kesehatan, cariPendorong, cariPembanding,
         nilaiKeparahan, batasiAlert, saranHarga, type BahanResep } from "../lib/margin.ts";

let lolos = 0, gagal = 0;
const cek = (nama: string, dapat: any, harap: any) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  console.log(`  ${ok ? "✓" : "✗"} ${nama}${ok ? "" : `\n      dapat ${JSON.stringify(dapat)}  harap ${JSON.stringify(harap)}`}`);
  ok ? lolos++ : gagal++;
};

// ═══ FR-18 / BR-04 — UJI WAJIB: ayam geprek, cabai naik 58% tapi ayam yang pendorong
const geprek: BahanResep[] = [
  { komoditasId: "cabai", nama: "Cabai rawit", qty: 0.015, harga: 87000, hargaLalu: 55000, dariData: true },
  { komoditasId: "ayam",  nama: "Daging ayam", qty: 0.25,  harga: 43200, hargaLalu: 36000, dariData: true },
];
const p = cariPendorong(geprek)!;
cek("BR-04 pendorong = ayam (bukan cabai yang naik 58%)", p.komoditasId, "ayam");
cek("BR-04 kontribusi ayam = Rp 1.800", p.kontribusiRp, 1800);
cek("BR-04 cabai naik 58,2% tapi cuma Rp 480", cariPembanding(geprek, "ayam")!.kontribusiRp, 480);
cek("FR-24 pembanding = cabai (persen tertinggi)", cariPembanding(geprek, "ayam")!.komoditasId, "cabai");

// ═══ BR-01 / FR-15 — HPP termasuk bahan hilang
cek("BR-01 HPP ayam+cabai", hitungHpp(geprek).hpp, 12105);
cek("BR-01 bahan tanpa harga dilewati, dihitung",
    hitungHpp([...geprek, { komoditasId:"x", nama:"Kecap", qty:0.01, harga:null, dariData:false }]).jumlahHilang, 1);
cek("BR-01 biaya tetap ikut masuk", hitungHpp(geprek, 1495).hpp, 13600);

// ═══ BR-02 / FR-16
cek("BR-02 margin normal", hitungMargin(18000, 15534), 13.7);
cek("FR-16 harga jual 0 tidak membagi nol", hitungMargin(0, 5000), 0);

// ═══ BR-15 — ambang 20/0, BUKAN 15/5
cek("BR-15 margin 25% = sehat", kesehatan(25), "sehat");
cek("BR-15 margin 19,9% = tipis (bukan sehat)", kesehatan(19.9), "tipis");
cek("BR-15 margin 3% = tipis (bukan rugi!)", kesehatan(3), "tipis");
cek("BR-15 margin -1% = rugi", kesehatan(-1), "rugi");

// ═══ BR-05 + BR-06
cek("BR-05 margin 8% = critical", nilaiKeparahan(8, 25)!.keparahan, "critical");
cek("BR-05 turun 16 poin = critical", nilaiKeparahan(28, 44)!.keparahan, "critical");
cek("BR-06 margin rendah TAPI stabil = diam", nilaiKeparahan(12, 12.5), null);
cek("BR-06 margin rendah + turun 13 poin = warning", nilaiKeparahan(12, 25)!.keparahan, "warning");
cek("BR-05 margin 12% turun 30 poin = critical", nilaiKeparahan(12, 42)!.keparahan, "critical");
cek("BR-05 margin 35% sehat = tidak ada alert", nilaiKeparahan(35, 36), null);

const banyak = [
  { keparahan:"info" as const, penurunanPoin:3 }, { keparahan:"critical" as const, penurunanPoin:5 },
  { keparahan:"warning" as const, penurunanPoin:9 }, { keparahan:"critical" as const, penurunanPoin:20 },
  { keparahan:"warning" as const, penurunanPoin:2 },
].map((x,i)=>({ ...x, menuItemId:String(i), namaMenu:"M"+i, marginSekarang:0, marginLalu:0, pendorong:null, hpp:0, hargaJual:0 }));
const b = batasiAlert(banyak);
cek("BR-06 maksimal 3 alert", b.length, 3);
cek("BR-06 urut critical dulu, turun terbesar dulu", b.map(x=>x.penurunanPoin), [20,5,9]);

// ═══ BR-07
cek("BR-07 saran harga, target min 15%, bulat 500", saranHarga(15534, 10), 18500);
cek("BR-07 pakai margin 30 hari lalu bila > 15%", saranHarga(15534, 30), 22500);


// ═══ Celah BR-06 yang ditemukan dari data nyata
const cek2 = (n: string, d: any, h: any) => cek(n, d, h);
cek2("BR-06 menu RUGI stabil tetap bersuara", nilaiKeparahan(-66.9, -66.9)?.keparahan, "critical");
cek2("BR-06 rugi tanpa riwayat tetap bersuara", nilaiKeparahan(-66.9, null)?.keparahan, "critical");
cek2("BR-06 margin tipis tanpa riwayat = bersuara (tidak menebak stabil)", nilaiKeparahan(13.8, null)?.keparahan, "warning");
cek2("BR-06 margin tipis stabil DENGAN riwayat = tetap diam", nilaiKeparahan(13.8, 14.4), null);



// ═══ FR-57 penjaga salah satuan
import { periksaSatuan } from "../lib/margin.ts";
const salah: BahanResep[] = [
  { komoditasId:"ayam", nama:"Daging ayam", qty:2000, harga:40500, hargaLalu:40000, dariData:true },
];
cek("FR-57 ayam 2.000 kg ditolak", periksaSatuan(salah, 18000).length, 1);
cek("FR-57 resep wajar tidak diganggu", periksaSatuan(geprek, 18000).length, 0);
cek("FR-57 harga jual 0 tidak dipaksa", periksaSatuan(salah, 0).length, 0);

console.log(`\n  ${lolos} lolos, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
