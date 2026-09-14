# 03 — Pembagian Tim

Empat peran coding, dibagi mengikuti **batas file** supaya empat orang bisa
jalan paralel tanpa konflik merge.

| | Peran | Sisi aplikasi | Bobot rubrik |
|---|---|---|---|
| **O1** | Data & Engine | Backend inti | Technical + AI 25% |
| **O2** | Dashboard & Visualisasi | Sisi **baca** | UI/UX 25% |
| **O3** | Layer AI | AI + dokumentasi proses | Technical + AI 25% |
| **O4** | Onboarding, CRUD & Rilis | Sisi **tulis** + deploy | Inovasi 30% · Video 20% |

Urutan pengerjaan mengikuti [cincin](04-EXECUTION.md#cincin).
**Cincin 0 dulu, seluruhnya, sebelum ada yang menyentuh Cincin 1.**

---

## ⚠️ Aturan yang mengikat semua

**Keempat orang wajib bisa mengubah `lib/margin.ts` sendiri.**

Final EXASTI menilai **live coding 40%** — bobot terbesar, dan tidak ada
hubungannya dengan seberapa bagus idemu. Kalau juri menunjuk O4 dan hanya O1
yang paham margin engine, semua persiapan ini tidak menolong.

Sesi 30 menit di Hari 4 bukan formalitas. Itu jalur kritis.

---

## O1 — Data & Engine

Jantung sistem. Mulai paling awal karena O2–O4 menunggu datanya.

### Cincin 0

1. **Mapping wilayah** — petakan `bi_province_id`/`bi_regency_id` ke nama kota.
   Tidak terdokumentasi, harus dicoba satu per satu. **Kerjakan paling pertama.**
   Minimal: Jawa Tengah + Kota Semarang.
2. **Ingestion** (`app/api/cron/ingest`) — parse `GetGridDataDaerah`, upsert ke
   `prices`. Wajib tangani: `MM/DD/YYYY`, header `X-Requested-With`, nilai `"-"`,
   pemisah ribuan koma, forward-fill (BR-03) dengan flag `is_filled`.
3. **Seed 90 hari** — mundur 90 hari. Ini yang mengisi grafik tren saat demo.
   Jangan ditunda.
4. **Margin engine** (`lib/margin.ts`) — fungsi murni, BR-01 & BR-02, tanpa I/O.
5. **BR-04 pendorong** (`lib/trend.ts`) — **kontribusi rupiah, bukan persentase.**
6. **Harga efektif** (`lib/price.ts`) — level harga warung × gerakan BI, dengan
   fallback BR-09 untuk data yang tidak lengkap atau rasio tidak wajar.
7. **Recompute job** — isi `margin_snapshots` + pilih alert (aturan, bukan AI).

### Cincin 1

8. Endpoint `/api/simulate` — panggil engine dengan `priceOf` yang disubstitusi.

### Selesai jika

- [ ] `npm run ingest` mengisi `prices` Kota Semarang ≥90 hari
- [ ] `npm test` hijau — ≥6 kasus, termasuk bahan hilang dan `sell_price = 0`
- [ ] **Uji BR-04 lolos**: ayam (+20%, Rp 1.825) menang atas cabai (+58%, Rp 480)
- [ ] `margin_snapshots` terisi untuk semua menu aktif
- [ ] `ingest_runs` mencatat tiap eksekusi

### Jebakan

Format tanggal salah **tidak menghasilkan error** — hanya baris `"-"`. Kalau
semua kosong, periksa format tanggal sebelum apa pun.

**File milikmu:** `lib/margin.ts` · `lib/trend.ts` · `lib/price.ts` ·
`app/api/cron/**` · `app/api/simulate` · `db/supabase/*.sql`

---

## O2 — Dashboard & Visualisasi *(sisi baca)*

Pemilik 25% UI/UX. Mulai Hari 1 dengan data palsu, sambungkan Hari 3.

**Baca [07-UX.md](07-UX.md) sebelum menulis komponen apa pun.** Di sana ada
persona, prinsip teks, dan rancangan layar beserta alasannya.

### Cincin 0

1. **Dashboard (S6)** — satu baris per menu, terurut untung **terkecil**.
   Tiga penanda sekaligus: ikon, panjang bar, angka rupiah.
2. **Detail menu (S7)** — rincian modal, grafik 30 hari, dan **blok "Gara-gara"**.
3. **Blok Gara-gara** — inilah pembeda produk. Wajib menampilkan **dua baris**:

   ```
   Gara-gara   : daging ayam +20%   (61% dari modal menu ini)
   Bukan cabai : cabai naik 58%, tapi di menumu cuma 9%
   ```

   Tanpa baris kedua, ini cuma aplikasi harga pangan biasa. Beri ruang —
   jangan diperkecil jadi label di pojok.
4. **Inbox alert (S8)**.
5. **Transparansi sumber** — tiap modal menampilkan persentase dari data BI dan
   penanda biaya perkiraan.

### Cincin 1 — urut prioritas

6. **Menu planner (S12)** — kelompok sehat/tipis/rugi + tombol istirahatkan.
   Urutan di dalam kelompok memakai **dampak rupiah** (BR-14), bukan persen —
   `lib/priority.ts`. Ini tempat pemilik mengambil keputusan, dan menurut
   [04-EXECUTION](04-EXECUTION.md#cincin) lebih diutamakan daripada peta eksposur.
7. **Simulator (S10)** — slider harga, angka berubah **saat digeser**.
8. **Peta eksposur (S9)** — heatmap menu × bahan. Potong duluan kalau waktu habis.

### Selesai jika

- [ ] Jalan di 375 px tanpa gulir horizontal
- [ ] Status terbaca tanpa mengandalkan warna (NFR-09)
- [ ] Kontras ≥4,5:1 (WCAG AA)
- [ ] Setiap keadaan kosong ada teks penjelasnya
- [ ] Tidak ada kata "margin", "HPP", atau "komoditas" di antarmuka
- [ ] Setiap tampilan untung menyertakan "belum dikurangi sewa dan listrik" (BR-13)
- [ ] **Uji BR-14 lolos**: dengan volume terisi, Ayam Geprek (Rp 189.000) berada
      di atas Telur Balado (−Rp 1.700), meski marginnya lebih tinggi

**File milikmu:** `app/(dashboard)/**` · `components/charts/**` ·
`components/alerts/**` · `components/ui/**`

**Berkas bahan bersama:** `lib/units.ts` · `lib/bahan/**` ·
`components/menu/BahanCombobox.tsx` · `components/menu/KartuBahan.tsx`.
Perubahan rumus wajib disertai kasus baru di `tests/uji-bahan.ts`.

---

## O3 — Layer AI

Pemilik komponen AI **dan** dokumentasi proses AI yang diminta rubrik.

### Hari 1 — dua hal, sebelum yang lain

1. **Ambil API key Gemini** di [aistudio.google.com](https://aistudio.google.com) —
   gratis, tanpa kartu kredit, 2 menit. Ini blocker seluruh pekerjaanmu.
2. **`lib/ai/client.ts`** — satu pembungkus untuk semua panggilan provider.

### Cincin 0 — lapisan ketahanan

3. **`ai_cache`** — setiap hasil AI disimpan dan dibaca dari cache.
   **Bangun ini sejak awal, bukan ditambahkan belakangan.** Demo tidak boleh
   bergantung pada panggilan live.
4. **Degradasi anggun** (FR-31) — cabut API key, margin tetap tampil,
   aplikasi tidak crash.

### Cincin 1

5. **OCR nota belanja** (`app/api/ai/parse-nota`) — foto → `{ items: [...] }`.
   Hasil **selalu** ditampilkan untuk dikonfirmasi pemilik sebelum disimpan.
6. **Pencocokan nama** (`lib/ai/match.ts`) — ke 21 komoditas BI pakai string di
   kode; ke katalog pakai AI + konfirmasi.

### Cincin 2

7. Alert agent AI · saran substitusi · foto resep tulis tangan.

### 📋 Sepanjang waktu

**`docs/AI-PROCESS.md`** — prompt utama, halusinasi yang ditemukan, re-prompting,
bagian yang diperbaiki manual. **Catat sambil jalan, bertanggal.** Rekonstruksi
di malam terakhir akan terlihat karangan, dan ini bagian dari 25%.

### Selesai jika

- [ ] OCR nota benar ≥80% dari 10 sampel uji
- [ ] **Mode pesawat menyala → aplikasi tetap berfungsi penuh dari cache**
- [ ] Cabut API key → margin tetap tampil, fitur AI menampilkan pesan
- [ ] `docs/AI-PROCESS.md` terisi dan bertanggal

### Batas

Jangan sebut OCR sebagai "agent" — itu satu panggilan. Yang agent hanya alert
selector, dan itu pun baru ada di Cincin 2.

**File milikmu:** `lib/ai/**` · `app/api/ai/**` · `docs/AI-PROCESS.md`

---

## O4 — Onboarding, CRUD & Rilis *(sisi tulis)*

Semua jalur di mana pengguna **memasukkan** data, plus yang membuat aplikasi
bisa diakses.

**Baca [07-UX.md](07-UX.md) — target onboarding ≤2 menit bukan aspirasi,
itu syarat produk dipakai.**

### Cincin 0

1. **Registrasi warung (S1)** — nama + pilih kabupaten.
2. **CRUD menu** — nama, harga jual, `batch_yield`.
3. **Editor resep — INPUT BATCH.** Ini keputusan desain terpenting di sisimu:

   ```
   ❌  "Takaran ayam (kg)"        → pemilik harus membagi 2 ÷ 8 di kepala
   ✅  "Sekali masak habis 2 kg"  +  "Jadi 8 porsi"
   ```

   Simpan `batch_qty` **dan** `qty` turunan. Saat pemilik mengedit, tampilkan
   kembali angka aslinya.
4. **Kemasan dirinci** — kalkulator pack: harga kemasan + isi → sistem membagi.
   **Kolom "pakai per porsi" disembunyikan** (default 1) — FR-44.
5. **Baris perkiraan gas/bumbu/listrik** — **teks read-only, BUKAN disabled
   field** (FR-45). Field abu-abu terbaca sebagai rusak.
6. **Nama tampilan & satuan** — pakai `lib/commodities.ts` dan `lib/units.ts`.
   Satuan berisiko (ekor, butir, liter beras) wajib menampilkan asumsinya
   untuk dibetulkan — FR-56.
7. **Pagar pengaman salah satuan** — bila modal satu bahan melebihi harga jual,
   tolak simpan dan tanya dulu — FR-57.
5. **Layar hasil pertama (S5)** — momen terpenting di seluruh produk.
6. **`scripts/seed.ts`** — 5 menu demo (tabel di bawah).

### Cincin 1

8. **Template onboarding (S2)** — "Menu apa yang paling laku?", takaran terisi.
9. **Pertanyaan kemasan sekali per warung** — makan di tempat / bungkus / campur.
   Satu ketukan, selisihnya Rp 600 per porsi — FR-47.
10. **Input volume kasar (S13)** — "seminggu kira-kira laku berapa?".
    Selalu ditandai perkiraan saat ditampilkan — FR-49, FR-51.
11. **Tombol istirahatkan / jual lagi** — `POST /api/menu/[id]/active`.

### Sepanjang waktu

9. **Deploy** — Vercel, env vars, cron menyala, pantau `ingest_runs`.
10. **Video demo** — skrip di [04-EXECUTION.md](04-EXECUTION.md#skrip-video-demo).

### Resep seed

Dipilih supaya **eksposur komoditasnya sengaja berbeda** — ini yang membuat
demo BR-04 dan peta eksposur hidup.

| Menu | Jual | Sekali masak → porsi | Eksposur dominan |
|---|---|---|---|
| **Ayam Geprek** | 18.000 | ayam 2 kg · beras 1,2 kg · cabai rawit 120 g · bawang merah 80 g · minyak 240 ml → **8 porsi** | ayam 61% |
| **Nasi Goreng** | 15.000 | beras 2 kg · telur 600 g · bawang merah 150 g · cabai merah 100 g · minyak 200 ml → **10 porsi** | beras 41% |
| **Telur Balado** | 10.000 | telur 1,2 kg · cabai merah 400 g · bawang merah 200 g · minyak 200 ml → **10 porsi** | telur 45%, cabai merah 28% |
| **Rendang** | 28.000 | sapi 1,5 kg · cabai merah 500 g · bawang merah 300 g · minyak 200 ml → **10 porsi** | sapi 73% |
| **Es Teh Manis** | 4.000 | gula 250 g → **10 porsi** | gula 44% |

Biaya tetap: gas + kemasan, Rp 800–3.000 per porsi tergantung menu.

**Kenapa campuran ini penting:** kalau harga cabai melonjak, Telur Balado (28%)
memerah sementara Ayam Geprek (9%) nyaris tidak bergerak. Kontras itu yang
membuktikan produkmu bekerja.

### Selesai jika

- [ ] Warung baru bisa didaftarkan sampai punya menu bermargin tanpa bantuan developer
- [ ] **Waktu sampai angka untung pertama muncul ≤2 menit**
- [ ] Editor resep tidak pernah meminta takaran per porsi
- [ ] Label berbunyi "kamu **BELI** berapa", bukan "pakai berapa" (FR-54)
- [ ] Tidak ada satu pun `<input disabled>` di alur onboarding (FR-45)
- [ ] Isi ayam 2.000 kg → muncul peringatan salah satuan, tidak tersimpan
- [ ] Seed menghasilkan ≥5 menu dengan eksposur berbeda
- [ ] Aplikasi live di URL publik, cron berjalan otomatis
- [ ] Video ≤3 menit selesai **H-1**, bukan hari-H

**File milikmu:** `app/(onboarding)/**` · `app/(manage)/**` · `app/api/menu/**` ·
`app/api/businesses/**` · `scripts/**`

---

## Batas kepemilikan file

| Path | Pemilik |
|---|---|
| `lib/margin.ts`, `lib/trend.ts`, `lib/price.ts`, `app/api/cron/**`, `db/**` | O1 |
| `app/(dashboard)/**`, `components/**` | O2 |
| `lib/ai/**`, `app/api/ai/**`, `docs/AI-PROCESS.md` | O3 |
| `app/(onboarding)/**`, `app/(manage)/**`, `app/api/menu/**`, `scripts/**` | O4 |
| `docs/**` selain AI-PROCESS | usul lewat PR dari siapa pun |

`lib/margin.ts` ditulis O1, tapi **wajib dipahami semua** — lihat aturan di atas.

---

## Catatan: seed tanpa wawancara

Resep di atas adalah takaran warung yang wajar, bukan hasil wawancara.
Konsekuensinya, **jangan mengaku mewawancarai siapa pun.** Jawaban Q&A yang
benar ada di [04-EXECUTION.md](04-EXECUTION.md#persiapan-qa).

Kalau nanti ada waktu tersisa, satu percakapan 15 menit dengan pemilik warung
mana pun akan memperkuat klaim ini — tapi itu bonus, bukan jalur kritis.
