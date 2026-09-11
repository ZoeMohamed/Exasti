# 05 — Product Requirements Document

**Produk:** Takar
**Versi:** 1.0 (MVP untuk EXASTI 2026)
**Subtema:** SDG 9 — Sustainable Innovation & Digitalisasi UMKM
**Status:** Disetujui untuk dibangun

---

## 1. Ringkasan eksekutif

Takar menghubungkan harga pangan harian Bank Indonesia ke resep masing-masing warung,
lalu memberi tahu pemiliknya kenaikan harga mana yang benar-benar mengancam untungnya.

Produk ini menjawab satu kegagalan spesifik: **pemilik warung tahu harga naik, tapi tidak
tahu kenaikan mana yang penting bagi mereka.** Itu pertanyaan yang jawabannya berbeda untuk
tiap warung, karena bergantung pada resepnya — dan karena itu tidak bisa dijawab oleh berita,
grup WhatsApp, atau aplikasi harga pangan yang sudah ada.

---

## 2. Masalah dan buktinya

### 2.1 Pernyataan masalah

Pemilik warung menetapkan harga menu sekali, lalu jarang meninjaunya. Harga bahan bergerak
tiap hari. Selisihnya diserap diam-diam oleh margin sampai usahanya merugi — dan mereka
biasanya baru sadar setelah berbulan-bulan.

### 2.2 Kenapa solusi yang ada tidak cukup

| Yang sudah ada | Kenapa tidak menyelesaikan |
|---|---|
| PIHPS / aplikasi harga pangan | Menampilkan harga komoditas, bukan dampaknya ke menu tertentu |
| Aplikasi kasir / POS | Mencatat penjualan, bukan memantau biaya bahan |
| Pembukuan manual | Butuh disiplin harian yang pada praktiknya tidak terjadi |
| Berita ekonomi | Menyoroti komoditas yang paling dramatis, belum tentu yang paling berdampak |

### 2.3 Bukti kuantitatif

Diuji pada satu porsi ayam geprek, harga jual Rp 18.000:

| Kenaikan | Porsi dari HPP | Dampak ke margin |
|---|---|---|
| Cabai rawit **+58%** | 6% | 22,9% → 19,5% (−3,4 poin) |
| Daging ayam **+20%** | 65% | 22,9% → 12,8% (−10,1 poin) |

Kenaikan yang lebih kecil dan tidak diberitakan justru merusak **tiga kali lebih besar**.
Inilah celah informasi yang Takar tutup.

---

## 3. Persona

### P1 — Bu Sri, pemilik warung *(pengguna utama)*

- 45 tahun, warung ayam geprek di Tembalang, 8 menu.
- Mencatat belanja di buku tulis. Tidak punya laptop; HP Android.
- **Tidak memakai kata "margin"** — memakai kata "untung" dan "balik modal".
- Tahu harga cabai naik karena belanja sendiri, tapi tidak pernah menghitung
  dampaknya per porsi.
- Waktu luangnya 10 menit, sore, sambil menunggu pembeli.

**Implikasi desain:** bahasa sehari-hari, bukan istilah akuntansi. Satu layar utama.
Angka besar. Bisa dioperasikan satu tangan.

### P2 — Rian, anak pemilik *(pengguna pendamping)*

- 22 tahun, mahasiswa. Yang akan memasang dan mengisi data awal untuk ibunya.
- Melek digital, sabar dengan form.

**Implikasi desain:** proses input resep boleh sedikit lebih panjang, karena dilakukan
sekali oleh P2 — tapi pemakaian harian harus cukup untuk P1.

### P3 — Pendamping UMKM / dinas koperasi *(pasca-MVP)*

Butuh gambaran agregat lintas warung binaan. **Di luar ruang lingkup MVP.**

---

## 4. Job stories

> **JS-1** Ketika saya menetapkan harga menu baru, saya ingin tahu berapa untung sebenarnya
> per porsi, supaya saya tidak menebak.

> **JS-2** Ketika harga bahan naik, saya ingin diberi tahu **bahan mana** yang paling merusak
> untung saya, supaya saya tidak panik pada berita yang salah.

> **JS-3** Ketika untung satu menu turun, saya ingin diberi tahu harga jual berapa yang
> mengembalikannya, supaya saya tidak menaikkan harga asal-asalan dan kehilangan pembeli.

> **JS-4** Ketika saya mendaftar pertama kali, saya ingin memasukkan resep dengan memotret
> catatan saya, supaya saya tidak mengetik satu per satu.

> **JS-5** Ketika saya membuka aplikasi, saya ingin langsung melihat menu mana yang bermasalah,
> supaya saya tidak perlu memeriksa semuanya.

---

## 5. Ruang lingkup

### 5.1 Termasuk (MVP)

| ID | Fitur | Prioritas |
|---|---|---|
| F-01 | Registrasi warung + pilih kabupaten | **Must** |
| F-02 | CRUD menu dan harga jual | **Must** |
| F-03 | CRUD resep (bahan + takaran) dan biaya tetap | **Must** |
| F-04 | Ingestion harga BI harian otomatis | **Must** |
| F-05 | Perhitungan HPP dan margin harian | **Must** |
| F-06 | Dashboard: semua menu, terurut margin terburuk | **Must** |
| F-07 | Identifikasi komoditas pendorong (weighted) | **Must** |
| F-08 | Riwayat margin 30 hari | **Should** |
| F-09 | Alert harian dengan penyebab | **Should** |
| F-10 | Saran harga jual baru | **Should** |
| F-11 | Input resep lewat foto (VLM) | **Should** |
| F-12 | Saran substitusi bahan | **Could** |
| F-13 | Transparansi sumber data per HPP | **Must** |

### 5.2 Tidak termasuk

POS/kasir · manajemen stok · multi-cabang · pembayaran · aplikasi native ·
prediksi harga jangka panjang · agregat lintas warung · multi-bahasa

---

## 6. Alur pengguna utama

### 6.1 Onboarding *(dilakukan P2, sekali, ±15 menit)*

```
Daftar warung → pilih kabupaten → tambah menu (nama + harga jual)
     → isi resep: ketik manual ATAU foto catatan
     → bahan yang tidak ada di data BI masuk ke "biaya lain"
     → selesai: langsung lihat margin hari ini
```

### 6.2 Pemakaian harian *(dilakukan P1, ±2 menit)*

```
Buka aplikasi → dashboard: menu terurut dari untung terkecil
     → ada yang merah? klik
     → lihat: turun berapa, gara-gara bahan apa, saran harga baru
     → tandai sudah dibaca
```

### 6.3 Jalur sistem *(otomatis, tanpa pengguna)*

```
13:30 WIB → tarik harga BI → simpan → hitung ulang semua menu
          → bandingkan dengan 7 hari lalu → pilih ≤3 yang layak diganggu
          → buat alert
```

---

## 7. Metrik keberhasilan

### 7.1 Untuk penilaian lomba

| Metrik | Target |
|---|---|
| Menu demo dengan resep lengkap | ≥ 5 |
| Eksposur komoditas berbeda antar menu demo | ≥ 3 pola |
| Hari riwayat harga nyata tersedia saat demo | ≥ 90 |
| Waktu dari buka aplikasi ke memahami masalah | ≤ 15 detik |
| Warung baru bisa didaftarkan tanpa bantuan developer | ya |

### 7.2 Untuk produk (pasca-lomba)

| Metrik | Definisi | Target |
|---|---|---|
| Aktivasi | Warung yang menyelesaikan ≥3 resep | 70% |
| Keterlibatan | Alert dibuka dalam 24 jam | 50% |
| Dampak | Menu yang harganya disesuaikan setelah alert | 20% |

---

## 8. Asumsi dan risiko produk

| # | Asumsi | Kalau salah |
|---|---|---|
| A-1 | Pemilik bersedia memasukkan resep sekali | Nilai produk nol. Mitigasi: input lewat foto (F-11). |
| A-2 | Harga kabupaten cukup mewakili pasar warung | Angka absolut meleset. Mitigasi: fokus pada **perubahan**, bukan level. |
| A-3 | Takaran resep cukup stabil | HPP meleset. Mitigasi: resep bisa diedit kapan saja. |
| A-4 | 21 komoditas BI menutup mayoritas HPP | Untuk warung non-kuliner tidak berlaku. Mitigasi: batasi target ke warung makan. |

---

## 9. Pasca-MVP *(jangan dikerjakan sekarang)*

1. Notifikasi WhatsApp — kanal yang benar-benar dibuka P1
2. Dashboard agregat untuk pendamping UMKM (P3)
3. Riwayat harga beli sendiri, untuk mengoreksi asumsi harga kabupaten
4. Rekomendasi porsi, bukan hanya harga
5. Perluasan ke komoditas non-BI lewat harga hasil crowdsourcing
