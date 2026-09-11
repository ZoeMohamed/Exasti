# 01 — Produk

## Why / How / What

### WHY

> Pemilik warung kehilangan untung tanpa sadar. Cabai rawit bisa naik dua kali lipat dalam
> dua minggu, tapi harga di banner menu tidak ikut berubah. Mereka baru tahu rugi setelah
> sebulan — itu pun kalau sempat menghitung. Yang hilang bukan cuma margin, tapi kemampuan
> usaha kecil bertahan.

### HOW

> Datanya sudah ada. Bank Indonesia menerbitkan harga 21 komoditas pangan setiap hari kerja,
> per kabupaten, terbuka dan gratis. Yang belum ada adalah jembatan dari harga komoditas ke
> margin per menu. Takar membangun jembatan itu.

### WHAT

> Aplikasi web. Pemilik memasukkan resep sekali — bisa lewat foto tulisan tangan. Setiap pagi
> sistem menghitung ulang HPP tiap menu terhadap harga hari itu di kotanya, lalu hanya memberi
> tahu yang benar-benar perlu ditindaklanjuti.

**Kalimat penutup pitch:**

> Bukan aplikasi kasir. Bukan aplikasi promosi.
> **Takar menjaga agar warung tidak kehilangan untung tanpa sadar.**

---

## Wawasan inti produk — sudah diuji dengan angka nyata

Kami menjalankan skema dan perhitungan ini dengan harga sungguhan untuk satu porsi
ayam geprek (harga jual Rp 18.000):

| Skenario | Kenaikan | Dampak ke margin |
|---|---|---|
| Cabai rawit melonjak — **ramai di berita** | +58% | 22,9% → 19,5% (turun **3,4 poin**) |
| Daging ayam naik — **tidak jadi berita** | +20% | 22,9% → 12,8% (turun **10,1 poin**) |

Kenaikan yang sunyi memukul **tiga kali lebih keras**, karena ayam menyumbang 65% dari HPP
sementara cabai hanya 6%.

> **Berita nasional tidak bisa memberitahu pemilik warung kenaikan mana yang penting baginya,
> karena jawabannya tergantung resepnya sendiri. Itulah yang Takar hitung.**

Ini pembeda utama produk. Bukan "kami menampilkan harga pangan" — itu sudah ada di mana-mana.
Tapi **"kami memberi bobot harga itu terhadap resepmu, lalu memberitahu mana yang benar-benar
mengancam."**

Konsekuensi untuk demo: pilih menu yang bahan dominannya bergerak. Kalau memamerkan lonjakan
cabai pada menu yang cabainya 6%, demo akan terasa hambar — dan itu justru kebalikan dari
pesan produk.

---

## Kenapa ini menang

### 1. Celah yang nyata di antara pemenang sebelumnya

Pemenang hackathon UMKM yang kami pelajari — UMKM SIAP (compliance), Hermyz (invoice),
DataBridge (business intelligence), SEMANTIR (copywriting), Snap Cart (checkout),
ViEC Beauty (e-commerce) — **seluruhnya berada di sisi penjualan dan administrasi.**

Tidak satu pun menyentuh sisi biaya. Padahal itu yang membunuh warung.

### 2. Datanya terverifikasi, bukan diasumsikan

Endpoint BI sudah dipanggil langsung dan mengembalikan data harian per kabupaten sampai
11 September 2026. Tidak ada dependency yang bisa mati saat final:
satu sumber, tanpa auth, tanpa API key, tanpa kuota.

### 3. Nol pengambilan data

Tidak ada survei lapangan, tidak ada izin, tidak ada CCTV, tidak ada scraping abu-abu.

### 4. Demo terbaca dalam 15 detik

Juri tidak perlu dijelaskan cara membacanya.

### 5. Ramah live coding

Margin engine adalah fungsi murni. Juri minta *"tambahkan bahan"* atau *"ubah threshold"* →
satu objek konfigurasi, UI langsung berubah.

---

## Peran AI — jujur dan sempit

Rubrik EXASTI menilai **efektivitas pemanfaatan AI tools dalam proses pembuatan**, bukan
mewajibkan model canggih di dalam produk. Jangan mengarang peran AI.

| Komponen | AI? | Alasan |
|---|---|---|
| Hitung HPP & margin | ❌ Tidak | `Σ(takaran × harga)`. Aritmetika. Harus bisa diaudit pemilik warung. |
| Deteksi tren harga | ❌ Tidak | Moving average dan delta. Deterministik. |
| **Pilih alert yang layak** | ✅ Ya | Dari 40 menu × 21 komoditas, memilih 2 yang penting hari ini adalah masalah pertimbangan. |
| **Saran substitusi bahan** | ✅ Ya | Perlu paham kendala masakan, bukan cuma harga termurah. |
| **Baca foto resep/nota** | ✅ Ya (VLM) | Satu panggilan, bukan agent. Jangan sebut agent. |

**Kalimat Q&A:**

> Aritmetikanya sengaja deterministik supaya bisa diaudit — pemilik warung berhak tahu
> angkanya dari mana. AI hanya kami pakai di bagian yang benar-benar butuh pertimbangan.

---

## Ruang lingkup MVP

### Masuk

- Registrasi warung + pilih kabupaten
- CRUD menu dan resep (manual + foto)
- Ingestion harga harian otomatis
- Perhitungan HPP dan margin harian
- Riwayat margin 30 hari
- Alert harian dengan penyebab dan saran
- Dashboard ringkasan

### Tidak masuk (jangan tergoda)

- POS / kasir
- Manajemen stok
- Multi-cabang
- Pembayaran
- Aplikasi mobile native
- Prediksi harga jangka panjang

---

## Klaim yang TIDAK boleh dibuat

| Jangan bilang | Kenapa |
|---|---|
| "Kami memprediksi harga pangan" | Kita ekstrapolasi tren, bukan meramal pasar |
| "Data real-time" | BI terbit sekali per hari kerja. Sebut **harian**. |
| "Harga di pasar dekat warung Anda" | Granularitas BI adalah kabupaten, bukan pasar individual |
| "AI menghitung margin Anda" | Margin dihitung rumus. Mengaku AI = bunuh diri di Q&A |
| "Akurat 100%" | Bahan di luar 21 komoditas BI diinput manual oleh pemilik |

### Yang harus diungkap terbuka di UI

Setiap angka HPP menampilkan **berapa bahan yang harganya berasal dari BI** dan
**berapa yang diinput manual**. Contoh:

```
HPP Ayam Geprek   Rp 13.350
  ├ 4 bahan dari data BI (11 Sep 2026)
  └ 2 biaya manual (gas + kemasan)
```

Transparansi ini bukan kelemahan — ini yang membuat produk bisa dipercaya,
dan ini jawaban siap pakai ketika juri bertanya soal akurasi.
