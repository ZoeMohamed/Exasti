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

| ID | Fitur | Cincin |
|---|---|---|
| F-01 | Registrasi warung + pilih kabupaten | **0** |
| F-02 | CRUD menu dan harga jual | **0** |
| F-03 | Editor resep **berbasis batch** + biaya tetap | **0** |
| F-04 | Ingestion harga BI harian otomatis | **0** |
| F-05 | Perhitungan modal dan untung harian | **0** |
| F-06 | Dashboard: menu terurut untung terkecil | **0** |
| F-07 | Identifikasi bahan pendorong (kontribusi rupiah) | **0** |
| F-08 | Riwayat untung 30 hari | **0** |
| F-09 | Alert harian dengan penyebab (aturan, bukan AI) | **0** |
| F-10 | Saran harga jual baru | **0** |
| F-11 | Transparansi sumber data per modal | **0** |
| F-12 | Simulator "kalau harga jadi segini" | **1** |
| F-13 | Peta eksposur menu × bahan | **1** |
| F-14 | Onboarding template + tunda biaya | **1** |
| F-15 | OCR nota belanja | **1** |
| F-16 | Menu planner: sehat/tipis/rugi + istirahatkan | **1** |
| F-17 | Volume kasar + pembobotan prioritas | **1** |
| F-18 | Kemasan dirinci dengan kalkulator pack | **1** |
| F-19 | Alert agent AI | 2 |
| F-20 | Saran substitusi bahan | 2 |
| F-21 | Katalog barang non-BI + custom items | 2 |
| F-22 | Foto resep tulis tangan · input suara | 2 |
| F-23 | Biaya tetap bulanan → untung bersih | 2 |

**Cincin 0 tidak mengandung AI sama sekali** — dan sudah produk utuh.
Isi tiap cincin dan aturan urutannya: [04-EXECUTION.md](04-EXECUTION.md#cincin).

### 5.2 Tidak termasuk

POS/kasir · manajemen stok · multi-cabang · pembayaran · aplikasi native ·
prediksi harga jangka panjang · agregat lintas warung · multi-bahasa

---

## 6. Alur pengguna utama

### 6.1 Onboarding *(target ≤2 menit — lihat [07-UX.md](07-UX.md))*

```
"Warungmu di mana?"        → pilih kabupaten           1 ketuk
  + nama (boleh dilewati)
"Menu apa yang paling laku?" → [Ayam Geprek] [Soto] …  1 ketuk
"Jual berapa seporsi?"     → 18000                     1 ketikan
"Sekali masak kamu BELI    → takaran template sudah
 apa saja?"                  terisi, tinggal dikoreksi ~3 koreksi
"Jadi berapa porsi?"       → sudah terisi 8
        ↓
🎯 "Untungmu Rp 3.085 per porsi"
```

**Tiga keputusan yang membuat ini mungkin:**

1. **Tanya sekali masak, bukan per porsi.** Pemilik tahu "2 kg jadi 8 porsi";
   dia tidak tahu "0,25 kg per porsi". Memaksanya membagi sendiri adalah
   penyebab utama onboarding gagal.
2. **Satu menu dulu, bukan delapan.** Menu lain ditawarkan setelah alert
   pertama terasa berguna.
3. **Tunda biaya gas, bumbu, listrik.** Satu baris teks read-only berisi
   perkiraan — bukan field yang dinonaktifkan. Kemasan dirinci terpisah
   dengan kalkulator pack, karena pemilik tahu angkanya persis.

> ⭐ Kata **"BELI"**, bukan "pakai". Beli 2 kg ayam, terpakai 1,6 kg setelah
> dipotong tulang — kalau resep ditulis yang terpakai, modalnya meleset 20%.
> Satu kata menyelesaikan masalah susut tanpa konsep tambahan.

> ⭐ Kata **"paling laku"** membatasi jadi satu menu **dan** memastikan menu
> pertama adalah yang paling besar dampaknya.

Kalau template tidak cocok → "Lainnya" → isi manual atau foto nota.

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
| **Waktu sampai angka untung pertama muncul** | **≤ 2 menit** |
| Menu demo dengan resep lengkap | ≥ 5 |
| Eksposur komoditas berbeda antar menu demo | ≥ 3 pola |
| Hari riwayat harga nyata tersedia saat demo | ≥ 90 |
| Waktu dari buka dashboard ke memahami masalah | ≤ 15 detik |
| Warung baru bisa didaftarkan tanpa bantuan developer | ya |
| Aplikasi tetap berfungsi dengan mode pesawat menyala | ya |

Metrik pertama yang paling menentukan apakah produk dipakai atau ditinggalkan.

### 7.2 Untuk produk (pasca-lomba)

| Metrik | Definisi | Target |
|---|---|---|
| Aktivasi | Menu pertama selesai tanpa bantuan | 80% |
| Perluasan | Menu kedua ditambahkan dalam 7 hari | 50% |
| Keterlibatan | Alert dibuka dalam 24 jam | 50% |
| Dampak | Menu yang harganya disesuaikan setelah alert | 20% |

**Risiko terbesar ada di baris kedua.** Banyak pengguna akan berhenti di satu
menu. Itu masih berguna bagi mereka, tapi nilai penuh produk baru muncul kalau
semua menu masuk. Arah solusi: tawarkan menu berikutnya **setelah** alert
pertama mendarat dan terasa berguna — bukan saat onboarding.

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
