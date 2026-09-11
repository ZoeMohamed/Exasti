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
| **Pendorong** | Komoditas penyumbang kenaikan HPP terbesar dalam jendela waktu |
| **Forward-fill** | Memakai harga hari kerja terakhir ketika hari ini tidak ada data |
| **Snapshot** | Rekaman HPP dan margin satu menu pada satu tanggal |

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
| **FR-09** | Pengguna dapat menyusun resep dari 21 komoditas dengan takaran desimal | Takaran 0,015 tersimpan tanpa pembulatan |
| **FR-10** | Pengguna dapat menambahkan biaya tetap berlabel bebas | Biaya masuk perhitungan HPP |
| **FR-11** | Satu komoditas hanya boleh muncul sekali per menu | Percobaan duplikat ditolak |

### 3.3 Perhitungan

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-12** | Sistem menghitung HPP sesuai BR-01 | Unit test ≥6 kasus termasuk bahan hilang |
| **FR-13** | Sistem menghitung margin sesuai BR-02 | Unit test termasuk `harga_jual = 0` |
| **FR-14** | Sistem menyimpan snapshot harian per menu aktif | Satu baris `margin_snapshots` per menu per hari |
| **FR-15** | Sistem menentukan pendorong sesuai BR-04 | **Uji contoh ayam vs cabai pada BR-04 wajib lolos** |
| **FR-16** | Perhitungan margin bersifat fungsi murni tanpa I/O | `lib/margin.ts` tidak mengimpor klien database |

### 3.4 Penyajian

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-17** | Dashboard menampilkan semua menu aktif terurut dari margin terkecil | Urutan benar pada data uji |
| **FR-18** | Status margin terbaca tanpa mengandalkan warna | Uji dengan simulasi buta warna |
| **FR-19** | Detail menu menampilkan rincian HPP per bahan | Setiap bahan tampil dengan harga dan subtotal |
| **FR-20** | Setiap HPP menampilkan jumlah bahan dari data BI dan jumlah biaya manual | Teks sumber tampil di setiap kartu HPP |
| **FR-21** | Riwayat margin 30 hari tampil sebagai grafik | Grafik terisi pada data seed |
| **FR-22** | Harga hasil forward-fill ditandai di UI | Tanda "memakai harga [tanggal]" muncul |

### 3.5 Alert

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-23** | Sistem membuat alert harian sesuai BR-05 dan BR-06 | Maksimal 3 alert per warung per hari |
| **FR-24** | Setiap alert menyebut komoditas pendorong | Kolom `driver_commodity_id` selalu terisi |
| **FR-25** | Setiap alert `warning`/`critical` menyertakan saran harga sesuai BR-07 | `suggestion` berisi objek bertipe `reprice` |
| **FR-26** | Pengguna dapat menandai alert sudah dibaca | `read_at` terisi, alert hilang dari inbox |

### 3.6 Fitur AI

| ID | Kebutuhan | Uji penerimaan |
|---|---|---|
| **FR-27** | Sistem dapat mengurai foto resep tulis tangan menjadi daftar bahan + takaran | ≥80% benar pada 10 sampel uji |
| **FR-28** | Pencocokan nama bahan ke komoditas BI dilakukan oleh kode, bukan model | Fungsi pencocokan dapat diuji terpisah |
| **FR-29** | Bahan yang tidak cocok diarahkan ke biaya tetap untuk diisi manual | Alur UI tersedia |
| **FR-30** | Alert agent mengembalikan JSON valid sesuai skema | 100 percobaan tanpa kegagalan parsing |
| **FR-31** | Kegagalan layanan AI tidak menghentikan perhitungan margin | Cabut API key → margin tetap tampil, fitur AI menampilkan pesan |

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

### 4.3 Kegunaan dan aksesibilitas

| ID | Kebutuhan |
|---|---|
| **NFR-07** | Seluruh layar berfungsi pada lebar 375 px tanpa gulir horizontal |
| **NFR-08** | Kontras teks memenuhi WCAG 2.1 AA (≥4,5:1) |
| **NFR-09** | Informasi status tidak pernah disampaikan lewat warna saja |
| **NFR-10** | Target sentuh minimal 44×44 px |
| **NFR-11** | Bahasa antarmuka memakai istilah sehari-hari; kata "margin" selalu didampingi "untung" |
| **NFR-12** | Setiap keadaan kosong menyertakan penjelasan dan langkah berikutnya |

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

### 5.2 Claude API

| Aspek | Nilai |
|---|---|
| Model | `claude-haiku-4-5` |
| Dipakai untuk | Parse foto resep, pemilihan alert, saran substitusi |
| Keluaran | Structured outputs — skema JSON dijamin |
| Kegagalan | Harus ditangani tanpa menghentikan perhitungan (FR-31) |

### 5.3 Basis data

Skema lengkap pada [`db/schema.sql`](../db/schema.sql), telah divalidasi pada PostgreSQL 15.

---

## 6. Matriks keterlacakan

| Job story | Kebutuhan terkait |
|---|---|
| JS-1 — tahu untung per porsi | FR-09, FR-12, FR-13, FR-19, FR-20 |
| JS-2 — tahu bahan mana yang merusak | **FR-15**, BR-04, FR-24 |
| JS-3 — tahu harga baru yang pas | FR-25, BR-07 |
| JS-4 — input resep lewat foto | FR-27, FR-28, FR-29 |
| JS-5 — langsung lihat yang bermasalah | FR-17, FR-23, BR-06 |

**Kebutuhan paling kritis: FR-15 (BR-04).** Bila implementasinya memilih komoditas
berdasarkan persentase kenaikan, produk kehilangan pembeda utamanya dan menjadi
aplikasi harga pangan biasa.
