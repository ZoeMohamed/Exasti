# Brief Desain — Takar

> Salin seluruh isi file ini ke Claude Design. Sengaja ditulis mandiri —
> tidak merujuk file lain, jadi bisa dipakai tanpa akses ke repo.

---

## 1. Produk

**Takar** — aplikasi web untuk pemilik warung makan di Indonesia.

Harga bahan pangan naik-turun tiap hari. Harga di banner menu warung tidak
berubah berbulan-bulan. Selisihnya memakan untung diam-diam, dan pemiliknya
biasanya baru sadar setelah rugi berbulan-bulan.

Takar menarik harga pangan harian resmi Bank Indonesia (gratis, per kabupaten),
mencocokkannya dengan resep tiap warung, lalu memberi tahu **bahan mana yang
benar-benar menggerus untung** — dan berapa harga jual yang mengembalikannya.

**Bukan aplikasi kasir. Bukan aplikasi promosi. Bukan kalkulator.**
Takar itu detektor asap: dia memberitahu ada masalah **sebelum** pemiliknya tahu
harus bertanya.

### Wawasan yang jadi pembeda produk — ini harus terlihat di desain

Data nyata, Kota Semarang, 2 Desember 2025, satu porsi ayam geprek:

```
Cabai rawit naik  +58%   →  untung turun cuma  3,4 poin   (cabai 9% dari modal)
Daging ayam naik  +20%   →  untung turun      10,1 poin   (ayam 61% dari modal)
```

Berita ramai soal cabai. **Yang sebenarnya membunuh warung itu ayam.**

Jadi layar detail menu harus menampilkan **dua baris**, bukan satu:
"gara-gara ayam" **dan** "bukan cabai". Tanpa baris kedua, ini cuma aplikasi
harga pangan biasa.

---

## 2. Untuk siapa

**Bu Sri, 45 tahun.** Warung ayam geprek di Tembalang, Semarang. 8 menu.

```
Perangkat     HP Android, layar retak, mengetik satu jari
Konteks       sore hari, warung sepi sebentar, sering diinterupsi pembeli
Kebiasaan     mencatat belanja di buku tulis
Kosakata      bilang "untung" dan "balik modal" — TIDAK PERNAH bilang "margin"
Matematika    tahu "2 kilo jadi 8 porsi". TIDAK tahu "0,25 kg per porsi".
Cahaya        sering memakai HP di bawah sinar matahari
```

**Dia tidak akan membaca tutorial, tidak akan menonton video onboarding, dan
tidak akan mencoba dua kali kalau percobaan pertama membingungkan.**

---

## 3. Aturan bahasa — WAJIB, jangan dilanggar

| Jangan tulis | Tulis |
|---|---|
| Margin 17,1% | **Untung Rp 3.085 per porsi** (17%) |
| HPP · Harga Pokok Produksi | **Modal** |
| Komoditas | **Bahan** |
| Sinkronisasi data | **Harga hari ini sudah masuk** |
| Takaran 0,25 kg per porsi | **2 kg untuk 8 porsi** |
| "Sekali masak **pakai** berapa?" | **"Sekali masak kamu BELI berapa?"** |
| Anda | **Kamu** |
| Critical / Warning | **Perlu segera dicek** |

**Rupiah selalu lebih dulu, persen jadi pelengkap dalam kurung.** Bu Sri
merasakan rupiah; persen itu abstrak baginya.

```
✅  Untung Rp 3.085 per porsi (17%)
❌  Margin 17,1%
```

**Satu kalimat, satu gagasan.** Tidak ada anak kalimat.

```
✅  "Untung ayam gepekmu turun separuh."
❌  "Terdeteksi penurunan margin sebesar 10,1 poin persentase pada item menu
     Ayam Geprek yang disebabkan kenaikan harga komoditas daging ayam."
```

### Kenapa "BELI", bukan "pakai"

Beli 2 kg ayam → setelah dipotong tulang dan lemak, terpakai 1,6 kg. Kalau resep
ditulis yang terpakai, modalnya meleset 20% ke bawah. Satu kata menyelesaikan
masalah susut tanpa konsep tambahan.

---

## 4. Delapan layar

Lebar 375 px (HP). Tinggi bebas sesuai isi.

### S1 · Daftar warung

```
Takar

Warungmu di mana?
Harga bahan beda-beda tiap kota.

[🔍 Kota Semarang]

Namanya? — boleh dilewati
[Warungku]

                              [ Lanjut ]
```

### S2 · Pilih menu

```
Langkah 2 dari 4

Menu apa yang paling laku?
Satu dulu saja. Yang lain bisa ditambah nanti.

[Ayam Geprek]  [Nasi Goreng]
[Soto]         [Bakso]
[Nasi Rames]   [Lainnya]

                              [ Lanjut ]
```

Kata **"paling laku"** disengaja: membatasi jadi satu menu, sekaligus memastikan
menu pertama adalah yang paling besar dampaknya.

### S3 · Harga jual

```
Langkah 3 dari 4

Ayam Geprek dijual berapa seporsi?

   Rp  18.000

ℹ Harga yang tertulis di bannermu sekarang.

                              [ Lanjut ]
```

### S4 · Isi resep — layar paling menentukan

```
Langkah 4 dari 4

Sekali masak Ayam Geprek, kamu BELI apa saja?
Tulis yang kamu beli — kalau ada tulang yang dibuang, tetap hitung.

  Ayam             [ 2    ]  [ kg   ▾ ]
  Beras            [ 1,2  ]  [ kg   ▾ ]
  Cabai rawit      [ 1    ]  [ ons  ▾ ]
  Bawang merah     [ 80   ]  [ gram ▾ ]
  Minyak goreng    [ 240  ]  [ ml   ▾ ]

  ＋ tambah bahan
  ─────────────────────────────────────
  Jadi berapa porsi?     [ 8 ]  porsi

  ·  Gas, bumbu & listrik              Rp 500
     perkiraan kami · bisa diubah nanti

  modal bahan sementara            Rp 109.700
                            [ Lihat untungku ]
```

**Tiga aturan keras di layar ini:**

1. **Jangan pernah meminta takaran per porsi.** Dia tidak tahu, dan harus
   membagi 2 ÷ 8 di kepala. Itu penyebab utama orang berhenti.
2. Baris "Gas, bumbu & listrik" adalah **teks biasa, BUKAN input yang
   dinonaktifkan.** Field abu-abu terbaca sebagai rusak. Tidak ada kotak, tidak
   ada fokus keyboard, tombol "Lanjut" melompatinya.
3. Tampilkan modal bahan berjalan, **tapi jangan tampilkan untungnya di sini.**
   Angka untung adalah momen "oh" dan harus muncul utuh di layar berikutnya.

### S5 · Hasil pertama — layar terpenting di seluruh produk

Muncul **≤2 menit** setelah dia mulai. Ini yang menentukan dia kembali atau tidak.

```
Ayam Geprek

Untungmu
Rp 3.085
per porsi

Modal Rp 14.915        Jual Rp 18.000
─────────────────────────────────────
✓  92% harga dari data Bank Indonesia
ℹ  Belum dikurangi sewa dan listrik bulanan

              [ Tambah menu lain ]
              [ Nanti saja       ]
```

- **Rp 3.085 adalah elemen terbesar di seluruh desain.** Semua yang lain pendukung.
- Baris "belum dikurangi sewa dan listrik" **wajib** — tanpa itu dia mengira ini
  untung bersih dan salah ambil keputusan.
- "Nanti saja" **bukan pilihan kelas dua.** Banyak pengguna berhenti di satu
  menu, dan itu tidak apa-apa.

### S6 · Dashboard

```
Warung Bu Sri                            12 Sep
✓ Harga hari ini sudah masuk

⚠ Ayam Geprek
  ██░░░░░░░░░░  Rp 1.260  (7%)
  turun dari Rp 3.085

✓ Nasi Goreng
  ████░░░░░░░░  Rp 3.600  (24%)
  tetap

✓ Rendang
  ███░░░░░░░░░  Rp 6.160  (22%)
  tetap

✓ Es Teh Manis
  ███████████░  Rp 2.740  (68%)
  tetap

ℹ Angka untung belum dikurangi sewa dan listrik bulanan.
```

Terurut dari untung **terkecil** — yang bermasalah selalu di atas.

### S7 · Detail menu — tempat pembeda produk terlihat

```
Ayam Geprek

Rp 3.085  →  Rp 1.260  (7%)
▁▂▂▃▃▄▅▇  30 hari terakhir

┌───────────────────────────────────────┐
│ ⚠ GARA-GARA                           │
│                                       │
│ Daging ayam naik 20%                  │
│ 61% dari modal menu ini               │
│ ───────────────────────────────────── │
│ Bukan cabai                           │
│ Cabai memang naik 58%, tapi di menumu │
│ cabai cuma 9% modal.                  │
└───────────────────────────────────────┘

Kalau mau untungmu balik seperti dulu:
jual Rp 20.000
                        [ Ubah harga jual ]

Rincian modal  ▾
  Ayam            2 kg → 8 porsi    Rp 10.125
  Beras           1,2 kg             Rp  2.362
  Cabai rawit     1 ons              Rp    956
  Bawang merah    80 gram            Rp    325
  Minyak goreng   240 ml             Rp    645
  Kemasan                            Rp    386  ✎
  Gas, bumbu & listrik   perkiraan   Rp    500  ✎
  ─────────────────────────────────────────────
  Modal per porsi                    Rp 15.299
```

**Blok "Gara-gara" adalah alasan produk ini ada.** Beri ruang, beri bingkai,
jangan diperkecil jadi label di pojok. Baris "Bukan cabai" itulah pembedanya.

Rincian modal menampilkan **"2 kg → 8 porsi"** — angka yang dia masukkan sendiri,
bukan 0,25.

### S12 · Menu planner

```
Menu Warungmu                            12 Sep
Diurutkan dari yang paling menggerus untungmu —
bukan dari persennya.

▼ RUGI · 1 menu
  Telur Balado         −Rp 340   (−3%)
  sekitar −Rp 1.700 seminggu
  [ jual Rp 12.000 ]  [ istirahatkan ]

⚠ TIPIS · 2 menu
  Ayam Geprek          Rp 1.260   (7%)
  sekitar Rp 189.000 seminggu — paling besar
  [ jual Rp 20.000 ]  [ istirahatkan ]

  Soto                 Rp 1.100   (9%)
  sekitar Rp 33.000 seminggu

✓ SEHAT · 3 menu
  Rendang              Rp 6.160  (22%)
  Nasi Goreng          Rp 3.600  (24%)
  Es Teh Manis         Rp 2.740  (68%)

ℹ Angka mingguan perkiraan dari jumlah porsi yang kamu
  sebutkan. Belum dikurangi sewa dan listrik bulanan.
```

**Perhatikan urutan di dalam kelompok TIPIS:** Ayam Geprek (7%) di atas Soto
(9%) — walaupun persennya lebih kecil. Karena dampak rupiahnya Rp 189.000 vs
Rp 33.000. **Ini pembobotan yang sama dengan wawasan ayam-vs-cabai, satu lapis
di atasnya.**

Pengelompokan: sehat ≥20% · tipis 0–20% · rugi <0%.

---

## 5. Arah visual

**Utilitarian tenang.** Dirancang supaya terbaca di layar retak, di bawah
matahari, oleh mata 45 tahun.

**Hijau adalah warna merek. Hijau BUKAN warna status.**

Alasannya dua. Pertama, merah+hijau adalah kombinasi buta warna paling umum
(±8% pria) — dilarang dipakai sebagai penanda status. Kedua, kalau hijau
dipakai untuk merek sekaligus untuk "sehat", tidak ada yang bisa membedakan
tombol dari penilaian.

Penyelesaiannya juga sesuai filosofi produk — **Takar hanya bersuara kalau ada
masalah, jadi menu sehat seharusnya diam, bukan diberi lencana hijau.**

```
Hijau daun    #22683B   oklch(0.46 0.100 152)   MEREK — tombol, logo
Oker          #956300   oklch(0.54 0.115  75)   perlu dicek
Bata          #9A3322   oklch(0.47 0.140  32)   rugi
Sehat         tanpa warna — teks netral, tenang

Latar         #F8FBF9   oklch(0.985 0.004 150)  putih bernada hijau tipis
Teks          #191F1A   oklch(0.230 0.012 150)  kontras 16,1
Teks lembut   #646B65   oklch(0.520 0.012 150)  kontras  5,3
Garis         #DAE0DA   oklch(0.900 0.010 150)
```

Hijaunya **hijau daun pisang**, bukan hijau SaaS (`#10B981` emerald). Warna
yang sudah akrab di warung: pembungkus nasi, daun pandan. Chroma ditahan di
0,10 supaya tidak jadi hijau plastik.

Seluruh kontras sudah dihitung dan lolos WCAG 2.1 AA. **Lima warna inti,
tidak lebih.**

- **Angka uang selalu jauh lebih besar dari labelnya.** Itu yang dia cari.
- Angka pakai `font-variant-numeric: tabular-nums` supaya kolom rapi.
- Font berkarakter tapi sangat terbaca. **Hindari Inter, Roboto, Arial.**
- Tidak ada gradien, tidak ada bayangan berlebihan, tidak ada emoji.
- Ikon: SVG stroke-based, satu gaya, grid 20/24 px.

---

## 6. Batasan teknis

```
Lebar        375 px, tanpa gulir horizontal
Kontras      ≥ 4,5:1 (WCAG 2.1 AA)
Target sentuh  minimal 44 × 44 px
```

**Status TIDAK BOLEH dibedakan hanya lewat warna.** Tiap baris status harus
punya **tiga penanda sekaligus**: ikon, panjang bar, dan angka rupiah. Kalau
warnanya dihilangkan seluruhnya, desain harus tetap terbaca.

Setiap keadaan kosong menjelaskan langkah berikutnya — tidak pernah layar
kosong tanpa teks.

---

## 7. Yang jangan dilakukan

```
❌  Tur produk multi-langkah sebelum pengguna melihat nilai apa pun
❌  Dasbor penuh grafik di layar pertama
❌  Kata "margin", "HPP", "komoditas" di mana pun di antarmuka
❌  Meminta takaran per porsi
❌  Bertanya "pakai berapa" — tanya "BELI berapa"
❌  Disabled field untuk angka perkiraan — pakai baris teks biasa
❌  Meminta semua menu sebelum menampilkan hasil apa pun
❌  Status yang hanya dibedakan warna
❌  Merah dan hijau berpasangan sebagai status
❌  Hijau sebagai penanda "sehat" — hijau itu warna merek
❌  Lencana pada menu yang sehat — yang sehat diam saja
❌  Gradien, border-left 4px sebagai kartu default, lebih dari lima warna
❌  Menyembunyikan bahwa sebagian angka adalah perkiraan
❌  Menampilkan untung tanpa catatan "belum dikurangi sewa"
❌  Menyebut datanya "real-time" — data BI terbit sekali per hari kerja
❌  Status bar HP palsu atau keyboard palsu di dalam mockup
```

---

## 8. Kalau sempat — dua simulasi yang menjelaskan kenapa desainnya begini

**Desain lama gagal di menit 6,5:**
diminta takaran per porsi → dia coba membagi 2 ÷ 8 di kepala → cabai "segenggam"
tapi tidak punya timbangan → asal isi, meleset 7 kali lipat → pembeli datang →
balik, lupa sampai mana → diminta biaya gas per porsi → menyerah.

**Desain baru berhasil di 1 menit 50 detik:**
pilih menu (1 ketuk) → takaran sudah terisi, koreksi 3 angka → "8 porsi" sudah
benar → "Untungmu Rp 3.085 per porsi" → *"Tiga ribu... saya kira lima ribuan."*

**Selisihnya bukan jumlah layar. Selisihnya adalah satuan yang ditanyakan.**
