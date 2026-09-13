# 06 — Software Requirements Specification

**Produk:** Takar · **Versi:** 1.0 · **Mengacu pada:** [05-PRD.md](05-PRD.md), [02-ARCHITECTURE.md](02-ARCHITECTURE.md)

Setiap kebutuhan di dokumen ini **harus dapat diuji**. Kalau sebuah baris tidak bisa
dibuktikan benar atau salah, baris itu bukan kebutuhan — pindahkan ke PRD.

---

## 1. Pendahuluan

### 1.1 Tujuan

Menetapkan kebutuhan fungsional dan non-fungsional Takar versi MVP, sebagai dasar
implementasi dan pengujian penerimaan.

### 1.2 Definisi

| Istilah | Arti |
|---|---|
| **HPP** | Harga Pokok Produksi per porsi — total biaya bahan + biaya tetap |
| **Margin** | `(harga jual − HPP) ÷ harga jual × 100`, dalam persen |
| **Komoditas** | Salah satu dari 21 varian pangan yang harganya diterbitkan BI |
| **Biaya tetap** | Biaya per porsi di luar 21 komoditas BI (gas, kemasan, bumbu) |
| **Pendorong** | Komoditas penyumbang kenaikan HPP **dalam rupiah** terbesar |
| **Forward-fill** | Memakai harga hari kerja terakhir ketika hari ini tidak ada data |
| **Snapshot** | Rekaman HPP dan margin satu menu pada satu tanggal |
| **Batch / sekali masak** | Jumlah bahan yang dipakai dalam satu kali memasak, beserta hasilnya dalam porsi — satuan yang dipakai pemilik warung |
| **Cakupan** | Persentase HPP yang harganya berasal dari sumber otomatis, bukan input manual |

> **Catatan penting:** istilah **HPP**, **margin**, dan **komoditas** dipakai di
> dokumen teknis ini, tetapi **dilarang muncul di antarmuka** (FR-29). Di layar,
> gunakan "modal", "untung", dan "bahan". Lihat [07-UX.md §2](07-UX.md#2-prinsip-penulisan-teks).

### 1.3 Pengguna

| Kelas | Hak akses | Frekuensi |
|---|---|---|
| Pemilik warung (P1) | Baca dashboard, baca alert, ubah harga jual | Harian |
| Pengelola (P2) | Penuh atas data warungnya | Sesekali |
| Sistem (cron) | Tulis `prices`, `margin_snapshots`, `alerts` | 1×/hari |

### 1.4 Batasan

- **C-1** Data harga hanya tersedia pada hari kerja; BI terbit pukul 13:00 WIB.
- **C-2** Granularitas harga adalah kabupaten/kota, bukan pasar individual.
- **C-3** Hanya 21 komoditas yang harganya otomatis; sisanya input manual.
- **C-4** Sistem tidak memiliki data penjualan, sehingga tidak dapat menghitung
  untung total — hanya untung **per porsi**.

---

## 2. Aturan bisnis

Aturan-aturan ini adalah inti produk dan **wajib diimplementasikan persis**.

### BR-01 — Perhitungan HPP

```
HPP(m, d) = Σ [ takaran(m,k) × harga(k, r, d) ]  +  Σ biaya_tetap(m)
            k ∈ bahan(m)
```
dengan `m` = menu, `d` = tanggal, `r` = wilayah warung, `k` = komoditas.

Bahan yang harganya tidak tersedia pada `d` **dikecualikan dari penjumlahan** dan
dihitung dalam `missing_count`. HPP tetap dilaporkan, disertai penanda ketidaklengkapan.

### BR-02 — Perhitungan margin

```
margin(m, d) = ( harga_jual(m) − HPP(m, d) ) ÷ harga_jual(m) × 100
```
Bila `harga_jual ≤ 0`, margin bernilai `0` dan menu ditandai tidak valid.

### BR-03 — Forward-fill

Bila tidak ada harga untuk `(k, r, d)`, sistem memakai harga terakhir yang tersedia pada
`d' < d` dengan `d − d' ≤ 7 hari`, dan menandai baris `is_filled = true`.
Bila selisihnya lebih dari 7 hari, harga dianggap **tidak tersedia** (BR-01 berlaku).

### BR-04 — Penentuan pendorong ⭐

**Ini pembeda utama produk. Jangan diimplementasikan sebagai "persentase kenaikan terbesar".**

Kontribusi tiap komoditas terhadap perubahan HPP dalam jendela `w` hari:

```
kontribusi(k) = takaran(m,k) × [ harga(k, r, d) − harga(k, r, d−w) ]

pendorong(m) = argmax  kontribusi(k)
               k ∈ bahan(m)
```

Yang dipilih adalah komoditas dengan **kontribusi rupiah terbesar**, bukan persentase
kenaikan terbesar.

**Contoh yang wajib lolos uji** (ayam geprek, jual Rp 18.000, w = 7):

| Komoditas | Takaran | Harga d−7 | Harga d | Kenaikan % | Kontribusi Rp |
|---|---|---|---|---|---|
| Cabai rawit | 0,015 kg | 55.000 | 87.000 | **+58,2%** | **+480** |
| Daging ayam | 0,25 kg | 36.000 | 43.200 | +20,0% | **+1.800** |

→ Pendorong yang benar adalah **daging ayam**, meski persentase kenaikannya lebih kecil.
Implementasi yang memilih cabai rawit **salah** dan harus ditolak saat review.

### BR-05 — Tingkat keparahan alert

| Tingkat | Syarat (salah satu terpenuhi) |
|---|---|
| `critical` | margin < 10% **atau** turun ≥ 15 poin dalam 7 hari |
| `warning` | margin < 20% **atau** turun ≥ 8 poin dalam 7 hari |
| `info` | margin < 30% **atau** turun ≥ 5 poin dalam 7 hari |

Ambang disimpan sebagai objek konfigurasi tunggal, bukan tersebar sebagai `if`.

### BR-06 — Pembatasan alert

Maksimal **3 alert per warung per hari**, diurutkan `critical → warning → info`,
lalu berdasarkan besarnya penurunan margin. Menu yang marginnya rendah **tetapi stabil**
(perubahan < 2 poin dalam 7 hari) tidak menghasilkan alert — pemilik sudah mengetahuinya.

### BR-07 — Saran harga jual

```
harga_saran = HPP(m, d) ÷ ( 1 − margin_target )
```
dengan `margin_target` = margin menu tersebut 30 hari lalu, dibatasi minimum 15%.
Hasil dibulatkan ke atas ke kelipatan Rp 500.

### BR-08 — Konversi batch ke per porsi

Pemilik memasukkan jumlah **sekali masak**, bukan per porsi:

```
qty(m, k) = batch_qty(m, k) ÷ batch_yield(m)
```

Konversi terjadi **sekali saat menyimpan**, bukan di dalam margin engine.
`batch_qty` dan `batch_yield` wajib disimpan apa adanya — saat pemilik mengedit,
yang ditampilkan kembali adalah angka aslinya ("2 kg, 8 porsi"), bukan 0,25.

### BR-09 — Harga efektif ⭐

**Harga BI bukan harga yang dibayar warung.** BI merata-rata pasar tradisional
sekabupaten; pemilik membeli di satu langganan, bisa lebih murah atau lebih mahal.

Tapi **arah dan besar gerakannya berkorelasi kuat** — keduanya membeli dari rantai
pasok yang sama. Maka: pakai **level** dari pemilik, **gerakan** dari pasar.

```
harga_efektif(k, d, warung b) =

  bahan ADA di BI, pemilik punya harga sendiri bertanggal t:
      harga_sendiri × [ BI(k, d) ÷ BI(k, t) ]

  bahan ADA di BI, pemilik tidak punya harga sendiri:
      BI(k, d)

  bahan TIDAK ADA di BI:
      harga_sendiri apa adanya (beku sampai diperbarui)

  tidak ada dua-duanya:
      → bahan masuk `missing` (BR-01 berlaku)
```

**Pagar pengaman:** bila rasio `BI(k,d) ÷ BI(k,t)` berada di luar rentang
`0,3 – 3,0`, ada yang salah pada data. Jangan dipercaya — pakai `BI(k, d)` dan
tandai di UI.

#### Kenapa bukan "harga pemilik selalu menang"

Versi awal aturan ini menyatakan harga pemilik mengalahkan harga BI. Itu **salah
dan membutakan sistem**:

```
1 Sept    Bu Sri isi ayam dari nota      Rp 38.000
hari ini  BI: ayam naik jadi Rp 43.800   (+20%)

Aturan lama  → tetap memakai Rp 38.000
             → modal tidak berubah
             → untung tidak berubah
             → TIDAK ADA PERINGATAN            ← produk mati diam-diam
```

Aturan yang benar menghasilkan `38.000 × 1,20 = Rp 45.600` — akurat **dan** segar.

Terbukti berjalan di `scripts/skeleton.py` fungsi `harga_efektif()`.

#### Efek samping yang berguna

Sistem memegang dua angka sekaligus, jadi antarmuka bisa menampilkan:

```
Daging ayam
  harga pasar (BI)   Rp 43.800
  kamu bayar         Rp 45.600      4% di atas pasar
```

Informasi yang selama ini tidak pernah dimiliki pemilik warung.

#### Batas yang harus diakui

Rumus ini mengandaikan harga langganan bergerak **sebanding** dengan pasar.
Biasanya benar, tapi bila langganan menaikkan harga di luar tren pasar, sistem
tidak tahu sampai pemilik memotret nota lagi.

Tetap jauh lebih baik daripada dua pilihan ekstrem: harga BI mentah (level salah)
atau harga nota beku (gerakan hilang).

### BR-10 — Ambang peringatan cakupan

Cakupan data satu menu:

```
cakupan(m) = Σ biaya bahan berharga otomatis ÷ HPP(m) × 100
```

Bila `cakupan(m) < 70%`, antarmuka **wajib** memperingatkan bahwa angka untungnya
kurang akurat. Ambang 70% dipilih dari sebaran terukur: menu berbasis protein dan
nasi berada di 86–92%, sedangkan menu yang didominasi barang non-BI jatuh ke 43%.

### BR-11 — Normalisasi satuan ⭐

Harga barang non-BI **wajib** disimpan sebagai harga per **satuan dasar katalog**,
bukan harga per kemasan.

```
harga_per_satuan = total_harga ÷ isi_kemasan_dalam_satuan_dasar
```

**Contoh yang wajib lolos uji:**

| Nota | Kemasan | Harga | Per gram |
|---|---|---|---|
| Superindo, 12 Agu | 1 kg | Rp 42.000 | **Rp 42,0** |
| Indomaret, 3 Sep | 500 g | Rp 22.500 | **Rp 45,0** |

Kemasan kedua **lebih mahal per gram**, meski angka nominalnya jauh lebih kecil.

Implementasi yang membandingkan harga kemasan secara langsung akan melaporkan
*"harga turun 46%"* padahal sebenarnya **naik 7%** — salah arah sepenuhnya, tanpa
error apa pun. Terbukti di `scripts/demo_lacak_nonbi.py`.

### BR-12 — Identitas barang non-BI

Nota menulis nama berbeda tiap toko untuk barang yang sama:

```
"MAYONAISE MAESTRO 1000G"   ·   "Mayonnaise Maestro 500gr"   ·   "MAYONAISE MAESTRO 1KG"
```

Ketiganya harus menunjuk **satu item katalog**. AI menyarankan pencocokan,
**pemilik mengonfirmasi**, dan sejak itu identitasnya terkunci.

Tanpa ini, tiga nota menjadi tiga barang berbeda dan tren mustahil dihitung.

### BR-13 — Batas modal per porsi ⭐

Tidak semua biaya warung masuk modal per porsi. Pembatasnya: **apakah biaya itu
ikut jumlah porsi.**

```
MASUK  (ikut jumlah porsi)          TIDAK MASUK  (tetap tiap bulan)
──────────────────────────          ────────────────────────────────
bahan pangan                        sewa tempat
kemasan, sendok, plastik            listrik langganan
gas, air masak                      gaji karyawan
bumbu & bahan kecil                 internet
```

Alasan yang tidak masuk: nilainya **berubah tergantung berapa porsi terjual**,
dan sistem tidak tahu itu (batasan C-4).

```
Sewa Rp 2 juta/bulan ÷ 1.000 porsi = Rp 2.000/porsi
Sewa Rp 2 juta/bulan ÷ 3.000 porsi = Rp   667/porsi
```

Memasukkannya berarti mengarang.

**Konsekuensi wajib:** angka untung yang ditampilkan adalah **sisa per porsi
untuk menutup biaya tetap**, bukan untung bersih. Antarmuka **wajib** menyertakan:

> Belum dikurangi sewa dan listrik bulanan.

Tanpa kalimat itu, pemilik mengira Rp 3.085 adalah untung bersihnya — salah paham
yang membuatnya salah mengambil keputusan harga.

**Untuk keputusan yang Takar bantu — naikkan harga atau tidak — angka ini justru
yang benar.** Sewa tidak berubah waktu harga ayam naik.

### BR-14 — Pembobotan volume

Bila `menu_items.weekly_volume` terisi, urutan prioritas dashboard dan menu
planner memakai **dampak rupiah**, bukan persentase margin:

```
dampak(m) = untung_per_porsi(m) × weekly_volume(m)
```

**Contoh yang wajib lolos uji:**

| Menu | Untung/porsi | Laku/minggu | Dampak |
|---|---|---|---|
| Ayam Geprek | Rp 1.260 | 150 | **Rp 189.000** |
| Telur Balado | −Rp 340 | 5 | −Rp 1.700 |

Telur Balado bermargin **negatif**, tapi Ayam Geprek **100× lebih besar
dampaknya**. Implementasi yang mengurutkan berdasarkan persentase margin akan
menaruh Telur Balado di atas dan membuat pemilik memperbaiki kebocoran Rp 1.700
sambil mengabaikan yang Rp 189.000.

Ini **pembobotan yang sama dengan BR-04**, satu lapis di atasnya: jangan lihat
persen, lihat rupiah berbobot.

`weekly_volume` adalah perkiraan dari ingatan. **Jangan pernah ditampilkan
seolah presisi** — selalu sertai "perkiraan dari N porsi yang kamu sebutkan".

### BR-15 — Pengelompokan kesehatan menu

```
sehat   margin ≥ 20%
tipis   0% ≤ margin < 20%
rugi    margin < 0%
```

Menu yang **diistirahatkan** (`active = false`) tetap dihitung margin hariannya,
supaya sistem dapat memanggil balik ketika sudah sehat lagi:

> *"Telur Balado sudah untung lagi — Rp 2.100 per porsi. Jual lagi?"*

Sistem **tidak boleh** menyarankan menu mana yang dipromosikan — itu butuh data
penjualan yang tidak dimiliki (C-4). Yang boleh: peringkat kesehatan.

---

## 3. Kebutuhan fungsional

### 3.1 Ingestion data

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-01** | Sistem menarik harga dari BI Hargapangan setiap hari kerja pukul 13:30 WIB | Baris baru muncul di `ingest_runs` dengan `status='ok'` |
| **FR-02** | Sistem mengirim header `X-Requested-With: XMLHttpRequest` dan tanggal berformat `MM/DD/YYYY` | Respons berisi nilai numerik, bukan seluruhnya `"-"` |
| **FR-03** | Sistem mengurai nilai `"16,350"` menjadi `16350` dan `"-"` menjadi tidak tersedia | Unit test dengan kedua bentuk |
| **FR-04** | Sistem melakukan forward-fill sesuai BR-03 dan menandai `is_filled` | Harga hari Sabtu = harga Jumat, `is_filled = true` |
| **FR-05** | Sistem dapat menarik data mundur ≥90 hari melalui perintah seed | `count(*) from prices` ≥ 90 × jumlah komoditas |
| **FR-06** | Kegagalan ingestion tercatat dengan pesan, tanpa menghentikan aplikasi | Matikan jaringan → `status='failed'`, dashboard tetap tampil |

### 3.2 Data warung

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-07** | Pengguna dapat mendaftarkan warung dengan nama dan kabupaten | Baris `businesses` tercipta dengan `region_id` valid |
| **FR-08** | Pengguna dapat menambah, mengubah, menghapus menu beserta harga jual | CRUD lengkap melalui UI |
| **FR-09** | **Resep dimasukkan sebagai jumlah sekali masak + hasil porsi, TIDAK PERNAH sebagai takaran per porsi** | Tidak ada satu pun label input bertuliskan "per porsi"; konversi BR-08 benar |
| **FR-10** | Saat mengedit resep, sistem menampilkan kembali angka batch asli | Buka resep tersimpan → tampil "2 kg, 8 porsi", bukan 0,25 |
| **FR-11** | Pengguna dapat menambahkan biaya tetap berlabel bebas, dengan kalkulator kemasan opsional | Isi harga kemasan + isi + pakai → `amount` terhitung benar |
| **FR-12** | Satu komoditas hanya boleh muncul sekali per menu | Percobaan duplikat ditolak |
| **FR-13** | Biaya gas/kemasan tidak ditanyakan pada menu pertama; sistem memberi perkiraan bertanda | `is_estimated = true`, dan tandanya tampil di UI |
| **FR-14** | Onboarding menyediakan template jenis warung dengan takaran terisi | Pilih "Ayam Geprek" → 5 bahan dan hasil porsi sudah terisi |

### 3.3 Perhitungan

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-15** | Sistem menghitung HPP sesuai BR-01 | Unit test ≥6 kasus termasuk bahan hilang |
| **FR-16** | Sistem menghitung margin sesuai BR-02 | Unit test termasuk `harga_jual = 0` |
| **FR-17** | Sistem menyimpan snapshot harian per menu aktif | Satu baris `margin_snapshots` per menu per hari |
| **FR-18** | Sistem menentukan pendorong sesuai BR-04 | **Uji contoh ayam vs cabai pada BR-04 wajib lolos** |
| **FR-19** | Perhitungan margin bersifat fungsi murni tanpa I/O | `lib/margin.ts` tidak mengimpor klien database |
| **FR-20** | Lookup harga mengikuti BR-09 | Harga warung menjadi level dasar dan bergerak mengikuti rasio BI; fallback berlaku untuk data hilang/rasio tidak wajar |

### 3.4 Penyajian

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-21** | Dashboard menampilkan semua menu aktif terurut dari untung terkecil | Urutan benar pada data uji |
| **FR-22** | Status terbaca tanpa mengandalkan warna | Uji dengan simulasi buta warna |
| **FR-23** | Detail menu menampilkan rincian modal per bahan, dalam satuan batch asli | Tampil "2 kg → 8 porsi", bukan 0,25 |
| **FR-24** | **Detail menu menampilkan kontras pendorong: bahan penyebab DAN bahan yang naik tinggi tapi tidak berdampak** | Blok "gara-gara X, bukan Y" tampil pada data uji ayam vs cabai |
| **FR-25** | Setiap modal menampilkan persentase dari data otomatis dan penanda biaya perkiraan | Teks sumber tampil di setiap kartu modal |
| **FR-26** | Riwayat untung 30 hari tampil sebagai grafik | Grafik terisi pada data seed |
| **FR-27** | Harga hasil forward-fill ditandai di UI | Tanda "memakai harga [tanggal]" muncul |
| **FR-28** | Menu dengan cakupan < 70% diberi peringatan sesuai BR-10 | Menu didominasi bahan non-BI menampilkan peringatan |
| **FR-29** | Antarmuka tidak memuat istilah "margin", "HPP", atau "komoditas" | Pencarian teks pada seluruh komponen tidak menemukannya |

### 3.5 Alert

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-30** | Sistem membuat alert harian sesuai BR-05 dan BR-06 | Maksimal 3 alert per warung per hari |
| **FR-31** | Setiap alert menyebut bahan pendorong | Kolom `driver_commodity_id` selalu terisi |
| **FR-32** | Setiap alert `warning`/`critical` menyertakan saran harga sesuai BR-07 | `suggestion` berisi objek bertipe `reprice` |
| **FR-33** | Pengguna dapat menandai alert sudah dibaca | `read_at` terisi, alert hilang dari inbox |

### 3.6 Cincin 1 — simulator dan peta eksposur

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-34** | Sistem menghitung ulang untung semua menu dengan harga yang disubstitusi | `/api/simulate` mengembalikan hasil berbeda untuk harga berbeda |
| **FR-35** | Simulator memperbarui angka saat slider digeser, bukan setelah dilepas | Uji interaksi manual |
| **FR-36** | Sistem menampilkan persentase modal tiap menu per bahan | View `menu_exposure` terisi untuk semua menu aktif |

### 3.7 Fitur AI dan ketahanan

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-37** | Sistem dapat mengurai foto nota belanja menjadi daftar barang + harga | ≥80% benar pada 10 sampel uji |
| **FR-38** | Hasil pembacaan AI selalu ditampilkan untuk dikonfirmasi sebelum disimpan | Tidak ada jalur yang menulis hasil AI langsung ke database |
| **FR-39** | Pencocokan ke 21 komoditas BI dilakukan kode; pencocokan ke katalog boleh AI dengan konfirmasi pemilik | Fungsi pencocokan BI dapat diuji terpisah tanpa jaringan |
| **FR-40** | Setiap hasil panggilan AI disimpan ke `ai_cache` dan dibaca dari sana bila tersedia | Panggilan kedua dengan input sama tidak menyentuh jaringan |
| **FR-41** | **Aplikasi tetap berfungsi penuh dengan mode pesawat menyala**, memakai data tersimpan | Uji Hari 6: matikan jaringan, seluruh demo tetap jalan |
| **FR-42** | Kegagalan layanan AI tidak menghentikan perhitungan margin | Cabut API key → untung tetap tampil, fitur AI menampilkan pesan |

### 3.8 Biaya per porsi, menu planner, dan volume

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-43** | Biaya kemasan dirinci dengan kalkulator pack: harga kemasan + isi → harga per porsi | Isi Rp 28.000 / 500 lembar → Rp 56 per porsi |
| **FR-44** | Kolom "pakai per porsi" untuk kemasan disembunyikan, default 1 | Form kemasan hanya menampilkan dua kolom |
| **FR-45** | Gas, bumbu, dan listrik ditampilkan sebagai **baris teks read-only**, bukan input yang dinonaktifkan | Tidak ada elemen `<input disabled>` pada alur onboarding |
| **FR-46** | Baris perkiraan dapat diubah dari halaman detail menu | Ketuk nilai di rincian modal → bisa diedit |
| **FR-47** | Warung menjawab sekali: makan di tempat / bungkus / campur, dan perkiraan kemasan menyesuaikan | Pilih "bungkus" → default kemasan ≈ Rp 700 |
| **FR-48** | Setiap tampilan untung menyertakan catatan "belum dikurangi sewa dan listrik" (BR-13) | Teks muncul di S5 dan S7 |
| **FR-49** | Pengguna dapat mengisi perkiraan volume mingguan per menu | `weekly_volume` tersimpan, boleh dikosongkan |
| **FR-50** | Bila volume terisi, urutan prioritas memakai dampak rupiah (BR-14) | **Uji Ayam Geprek vs Telur Balado wajib lolos** |
| **FR-51** | Angka berbasis volume selalu ditandai perkiraan | Teks "perkiraan dari N porsi" menyertai tiap nilai |
| **FR-52** | Menu dapat diistirahatkan dan margin tetap dihitung (BR-15) | `active=false`, `margin_snapshots` tetap bertambah |
| **FR-53** | Sistem memberi tahu ketika menu yang diistirahatkan kembali sehat | Notifikasi muncul saat margin ≥ 20% |
| **FR-54** | Label input resep berbunyi "kamu **beli** berapa", bukan "pakai berapa" | Uji teks pada form S4 |
| **FR-55** | Bahan ditampilkan dengan nama sehari-hari, bukan nama BI | "Ayam", bukan "Daging Ayam Ras Segar" |
| **FR-56** | Satuan alami didukung dengan konversi; satuan berisiko menampilkan asumsinya | Pilih "ekor" → tampil "1 ekor ≈ 1,2 kg, betulkan?" |
| **FR-57** | Bila modal satu bahan per porsi melebihi harga jual, sistem menolak menyimpan dan bertanya | Isi ayam 2.000 kg → muncul peringatan salah satuan |

---

## 4. Kebutuhan non-fungsional

### 4.1 Kinerja

| ID | Kebutuhan |
|---|---|
| **NFR-01** | Dashboard tampil penuh ≤2 detik pada koneksi 4G untuk warung dengan ≤20 menu |
| **NFR-02** | Ingestion harian selesai ≤60 detik untuk satu wilayah |
| **NFR-03** | Recompute seluruh menu selesai ≤30 detik untuk ≤50 warung |

### 4.2 Keandalan

| ID | Kebutuhan |
|---|---|
| **NFR-04** | Aplikasi tetap berfungsi penuh dari data tersimpan bila API BI tidak dapat dihubungi |
| **NFR-05** | Kegagalan ingestion tidak merusak data harga yang sudah ada (upsert idempoten) |
| **NFR-06** | Menjalankan ingestion dua kali untuk tanggal sama tidak menggandakan baris |
| **NFR-19** | **Seluruh alur demo dapat dijalankan tanpa jaringan sama sekali**, memakai `prices` tersimpan dan `ai_cache` — diuji Hari 6 dengan mode pesawat |

### 4.3 Kegunaan dan aksesibilitas

| ID | Kebutuhan |
|---|---|
| **NFR-07** | Seluruh layar berfungsi pada lebar 375 px tanpa gulir horizontal |
| **NFR-08** | Kontras teks memenuhi WCAG 2.1 AA (≥4,5:1) |
| **NFR-09** | Informasi status tidak pernah disampaikan lewat warna saja |
| **NFR-10** | Target sentuh minimal 44×44 px |
| **NFR-11** | Bahasa antarmuka memakai istilah sehari-hari: "modal", "untung", "bahan" — bukan "HPP", "margin", "komoditas" |
| **NFR-12** | Setiap keadaan kosong menyertakan penjelasan dan langkah berikutnya |
| **NFR-20** | Nilai rupiah selalu ditampilkan lebih dulu, persentase sebagai pelengkap dalam kurung |
| **NFR-21** | **Waktu dari mulai mendaftar sampai angka untung pertama muncul ≤ 2 menit** |
| **NFR-22** | Panggilan OCR memakan **6 detik tunggal, sampai 20 detik di bawah beban** (terukur pada 35 nota asli) — setiap unggahan foto wajib menampilkan indikator tunggu yang anggun sampai 20 detik, dan diproses satu per satu |
| **NFR-23** | Layar konfirmasi hasil OCR wajib menonjolkan **angka harga**, bukan nama barang — akurasi terukur nama 98% vs harga 90%, jadi kesalahan berkumpul di angka |

### 4.4 Keamanan

| ID | Kebutuhan |
|---|---|
| **NFR-13** | Data satu warung tidak dapat diakses warung lain |
| **NFR-14** | Kunci API tidak pernah dikirim ke klien |
| **NFR-15** | Endpoint cron dilindungi token rahasia |

### 4.5 Keterpeliharaan

| ID | Kebutuhan |
|---|---|
| **NFR-16** | Ambang keparahan terpusat pada satu objek konfigurasi |
| **NFR-17** | Menambah satu komoditas ke resep tidak memerlukan perubahan skema |
| **NFR-18** | Seluruh anggota tim mampu memodifikasi `lib/margin.ts` — disyaratkan untuk sesi live coding |

---

## 5. Antarmuka eksternal

### 5.1 BI Hargapangan

| Aspek | Nilai |
|---|---|
| Base URL | `https://www.bi.go.id/hargapangan/WebSite/TabelHarga` |
| Autentikasi | Tidak ada |
| Header wajib | `X-Requested-With: XMLHttpRequest` |
| Format tanggal | `MM/DD/YYYY` |
| Ketersediaan | Hari kerja, terbit 13:00 WIB |
| Nilai kosong | String `"-"` |
| Format angka | Pemisah ribuan koma |

### 5.2 Penyedia AI — Google AI Studio (Gemini Flash)

| Aspek | Nilai |
|---|---|
| Model | Gemini Flash (free tier) |
| Autentikasi | API key dari aistudio.google.com — **tanpa kartu kredit** |
| Batas | 5–15 request/menit · ~1.000/hari |
| Dipakai untuk | OCR nota belanja, pencocokan katalog, (Cincin 2) pemilihan alert & substitusi |
| Keluaran | Structured outputs — skema JSON dijamin |
| Kegagalan | Harus ditangani tanpa menghentikan perhitungan (FR-42) |
| Cache | Setiap hasil disimpan ke `ai_cache` (FR-40) |
| Pembungkus | Seluruh panggilan lewat `lib/ai/client.ts` — ganti provider = ubah satu file |

> ⚠️ **Privasi:** pada free tier, data boleh dipakai Google untuk melatih produknya.
> Aman untuk demo dengan data buatan sendiri. **Jangan unggah nota warung sungguhan
> tanpa memberi tahu pemiliknya, dan jangan klaim "data pengguna aman" di pitch.**

Alternatif berbayar bila nanti butuh kualitas vision lebih tinggi: Claude Haiku 4.5
(~$1/$5 per MTok — seluruh lomba di bawah $5), tetapi memerlukan kartu kredit.

### 5.3 Basis data

Skema deployment pada
[`db/supabase/01_migration.sql`](../db/supabase/01_migration.sql), dengan
hardening dan suite verifikasi di folder yang sama, telah divalidasi pada
PostgreSQL 17 di Supabase. `db/schema.sql` dipertahankan hanya sebagai rancangan
PostgreSQL awal tanpa Auth/RLS.

---

## 6. Matriks keterlacakan

| Job story | Kebutuhan terkait |
|---|---|
| JS-1 — tahu untung per porsi | FR-09, FR-15, FR-16, FR-23, FR-25 |
| JS-2 — tahu bahan mana yang merusak | **FR-18 (BR-04)**, FR-24, FR-31 |
| JS-3 — tahu harga baru yang pas | FR-32, BR-07 |
| JS-4 — input cepat lewat foto | FR-37, FR-38, FR-39 |
| JS-5 — langsung lihat yang bermasalah | FR-21, FR-30, BR-06 |
| Onboarding ≤2 menit | FR-09, FR-13, FR-14, NFR-21 |
| Demo tidak boleh gagal | FR-40, FR-41, FR-42, NFR-19 |

### Dua kebutuhan paling kritis

**FR-18 (BR-04) — penentuan pendorong.** Bila implementasinya memilih berdasarkan
persentase kenaikan, produk kehilangan pembeda utamanya dan menjadi aplikasi harga
pangan biasa. Uji ayam-vs-cabai wajib lolos sebelum merge.

**FR-09 — input batch.** Bila satu saja label input meminta takaran per porsi,
onboarding gagal dan produk tidak dipakai. Lihat simulasi di
[07-UX.md §8](07-UX.md#8-kenapa-desainnya-begini--dua-simulasi).
