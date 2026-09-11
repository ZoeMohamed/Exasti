# 03 — Pembagian Tim

Empat peran coding. Pembagiannya mengikuti **batas file**, bukan batas "fitur",
supaya empat orang bisa jalan paralel tanpa saling menimpa saat merge.

| | Peran | Sisi aplikasi | Bobot rubrik |
|---|---|---|---|
| **O1** | Data & Engine | Backend inti | Technical + AI 25% |
| **O2** | Dashboard & Visualisasi | Sisi **baca** | UI/UX 25% |
| **O3** | Layer AI | AI + dokumentasi proses | Technical + AI 25% |
| **O4** | Onboarding, CRUD & Rilis | Sisi **tulis** + deploy | Inovasi 30% · Video 20% |

---

## ⚠️ Aturan yang mengikat semua

**Keempat orang wajib bisa mengubah `lib/margin.ts` sendiri.**

Final EXASTI menilai **live coding 40%**. Kalau juri menunjuk O4 dan hanya O1 yang paham
margin engine, kalian selesai. Sisihkan 30 menit di Hari 4: tiap orang mengerjakan satu
perubahan kecil di file itu secara bergantian, sambil ditonton yang lain.

---

## O1 — Data & Engine

Jantung sistem. Mulai paling awal karena O2–O4 menunggu datanya.

### Tugas

1. **Mapping wilayah** — petakan `bi_province_id` / `bi_regency_id` ke nama kota.
   Tidak terdokumentasi, harus dicoba satu per satu. **Kerjakan paling pertama** —
   tanpa ini tidak ada yang bisa jalan. Minimal: Jawa Tengah + Kota Semarang.
2. **Ingestion** (`app/api/cron/ingest`) — tarik `GetGridDataDaerah`, parse, upsert ke `prices`.
   Wajib tangani: format `MM/DD/YYYY`, header `X-Requested-With`, nilai `"-"`,
   pemisah ribuan koma, forward-fill (BR-03) dengan flag `is_filled`.
3. **Seed 90 hari** — tarik mundur 90 hari harga. Ini yang mengisi grafik tren saat demo.
   Jangan ditunda ke akhir.
4. **Margin engine** (`lib/margin.ts`) — fungsi murni, tanpa I/O. Implementasi BR-01, BR-02.
5. **Trend detector** (`lib/trend.ts`) — implementasi **BR-04**, penentuan pendorong.
6. **Recompute job** (`app/api/cron/recompute`) — isi `margin_snapshots` harian.

### Selesai jika

- [ ] `npm run ingest` mengisi `prices` untuk Kota Semarang, ≥90 hari ke belakang
- [ ] `npm test` hijau — minimal 6 kasus, termasuk bahan hilang dan `harga_jual = 0`
- [ ] **Uji BR-04 lolos**: pada contoh ayam vs cabai, yang terpilih adalah daging ayam
- [ ] `margin_snapshots` terisi untuk semua menu aktif
- [ ] `ingest_runs` mencatat tiap eksekusi

### Jebakan

Format tanggal salah **tidak menghasilkan error** — hanya baris berisi `"-"`.
Kalau semua kosong, periksa format tanggal sebelum apa pun.

**File milikmu:** `lib/margin.ts` · `lib/trend.ts` · `app/api/cron/**` · `db/schema.sql`

---

## O2 — Dashboard & Visualisasi *(sisi baca)*

Pemilik 25% UI/UX. Bisa mulai Hari 1 dengan data palsu, ganti ke API asli Hari 3.

### Tugas

1. **Dashboard utama** — killer demo:
   - satu baris per menu, terurut dari margin terkecil
   - margin sebagai bar horizontal
   - **warna + ikon + angka** (NFR-09: status tidak boleh bergantung warna saja)
2. **Halaman detail menu** — rincian HPP per bahan, harga dan subtotal masing-masing.
3. **Grafik margin 30 hari** — Recharts, dari `margin_snapshots`.
4. **Panel pendorong** — inilah pembeda produk. Tampilkan **dua baris**:

   ```
   Cabai rawit  +58%   →  dampak  −3,4 poin     (6% dari HPP)
   Daging ayam  +20%   →  dampak −10,1 poin  ⚠  (65% dari HPP)
   ```

   Kontras inilah pesan produknya. Jangan cuma tampilkan yang persentasenya terbesar.
5. **Inbox alert** — kartu alert, tandai sudah dibaca.
6. **Transparansi sumber** (FR-20) — tiap HPP menampilkan berapa bahan dari BI vs manual,
   dan penanda kalau harga hasil forward-fill.

### Selesai jika

- [ ] Jalan di lebar 375 px tanpa gulir horizontal
- [ ] Status margin terbaca tanpa mengandalkan warna
- [ ] Kontras memenuhi WCAG AA (≥4,5:1)
- [ ] Setiap keadaan kosong ada teks penjelasnya

**File milikmu:** `app/(dashboard)/**` · `components/charts/**` · `components/alerts/**`

---

## O3 — Layer AI

Pemilik komponen AI **dan** dokumentasi proses AI yang diminta rubrik.

### Tugas

1. **VLM parse resep** (`app/api/ai/parse-recipe`) — foto tulisan tangan atau nota →
   `{ items: [{ nameRaw, qty, unit, matchedCommodityId }] }`.
2. **Pencocokan nama → komoditas** (`lib/ai/match.ts`) — **dilakukan di kode, bukan model**
   (FR-28). Model hanya membaca teks dan angka.
3. **Alert agent** (`lib/ai/alerts.ts`) — dari semua menu, pilih ≤3 yang layak diganggu
   sesuai BR-05 dan BR-06. Pakai structured outputs agar JSON dijamin valid.
4. **Saran substitusi** (`app/api/ai/suggest`) — bahan pengganti yang masuk akal secara
   masakan, bukan sekadar termurah.
5. **Penanganan kegagalan** (FR-31) — API AI mati tidak boleh menghentikan perhitungan margin.
6. **📋 `docs/AI-PROCESS.md`** — rubrik meminta eksplisit:
   - prompt utama yang dipakai
   - halusinasi / kesalahan yang ditemukan
   - bagaimana re-prompting memperbaikinya
   - bagian mana yang akhirnya diperbaiki manual

   **Catat sambil jalan, bertanggal.** Jangan direkonstruksi malam sebelum deadline —
   akan terlihat karangan, dan ini bagian dari 25%.

### Selesai jika

- [ ] Foto resep tulis tangan terbaca benar ≥80% dari 10 sampel uji
- [ ] Alert agent tidak pernah mengembalikan JSON invalid (100 percobaan)
- [ ] Cabut API key → margin tetap tampil, fitur AI menampilkan pesan, aplikasi tidak crash
- [ ] `docs/AI-PROCESS.md` terisi dan bertanggal

### Batas

Jangan sebut VLM parse sebagai "agent" — itu satu panggilan. Yang agent hanya alert selector.

**File milikmu:** `lib/ai/**` · `app/api/ai/**` · `docs/AI-PROCESS.md`

---

## O4 — Onboarding, CRUD & Rilis *(sisi tulis)*

Semua jalur di mana pengguna **memasukkan** data, plus yang membuat aplikasi bisa diakses.

### Tugas

1. **Registrasi warung** — nama + pilih kabupaten dari `regions`.
2. **CRUD menu** — tambah, ubah, hapus, harga jual.
3. **Editor resep** — pilih dari 21 komoditas, isi takaran desimal.
   Validasi FR-11: satu komoditas hanya sekali per menu.
4. **Editor biaya tetap** — label bebas + rupiah per porsi.
   Ini yang mencegah HPP terlalu rendah; jangan dianggap fitur sampingan.
5. **Skrip seed** (`scripts/seed.ts`) — menu demo dengan resep realistis (daftar di bawah).
6. **Deploy** — Vercel, env vars, cron menyala, pantau `ingest_runs`.
7. **Video demo** — skrip di [04-EXECUTION.md](04-EXECUTION.md#skrip-video-demo).

### Resep seed yang disarankan

Pilih menu yang **eksposur komoditasnya berbeda-beda** — ini yang membuat demo BR-04 hidup.
Takaran di bawah adalah per porsi, satuan kg mengikuti `commodities.unit`.

| Menu | Jual | Bahan (takaran) | Biaya tetap |
|---|---|---|---|
| **Ayam Geprek** | 18.000 | daging ayam 0,25 · beras 0,15 · cabai rawit 0,015 · bawang merah 0,01 · minyak 0,03 | gas+kemasan 1.200 |
| **Nasi Goreng** | 15.000 | beras 0,2 · telur ayam 0,06 · bawang merah 0,015 · bawang putih 0,005 · cabai merah 0,01 · minyak 0,02 | gas+kemasan 1.000 |
| **Telur Balado** | 10.000 | telur ayam 0,12 · cabai merah 0,04 · bawang merah 0,02 · minyak 0,02 | gas+kemasan 800 |
| **Rendang** | 28.000 | daging sapi 0,15 · cabai merah 0,05 · bawang merah 0,03 · minyak 0,02 | gas+bumbu 3.000 |
| **Es Teh Manis** | 4.000 | gula pasir 0,025 | teh+es 600 |

**Kenapa campuran ini penting:** Ayam Geprek didominasi daging ayam (65% HPP), Telur Balado
didominasi cabai merah. Kalau harga cabai melonjak, dua menu ini bereaksi sangat berbeda —
dan itulah yang membuktikan produk bekerja.

### Selesai jika

- [ ] Warung baru bisa didaftarkan sampai punya menu bermargin, tanpa bantuan developer
- [ ] Seed menghasilkan ≥5 menu dengan resep lengkap
- [ ] Aplikasi live di URL publik, cron berjalan otomatis
- [ ] Video ≤3 menit selesai **H-1**, bukan hari-H

**File milikmu:** `app/(onboarding)/**` · `app/(manage)/**` · `app/api/menu/**` ·
`app/api/businesses/**` · `scripts/seed.ts`

---

## Batas kepemilikan file

| Path | Pemilik |
|---|---|
| `lib/margin.ts`, `lib/trend.ts`, `app/api/cron/**`, `db/**` | O1 |
| `app/(dashboard)/**`, `components/charts/**`, `components/alerts/**` | O2 |
| `lib/ai/**`, `app/api/ai/**`, `docs/AI-PROCESS.md` | O3 |
| `app/(onboarding)/**`, `app/(manage)/**`, `app/api/menu/**`, `scripts/**` | O4 |
| `components/ui/**` (komponen dasar) | O2 menulis, semua memakai |

`lib/margin.ts` ditulis O1, tapi **wajib dipahami semua** — lihat aturan di atas.

---

## Catatan: seed tanpa wawancara

Resep di atas adalah takaran warung yang wajar, bukan hasil wawancara. Konsekuensinya,
jawaban Q&A berubah — **jangan mengaku mewawancarai siapa pun.** Kalau ditanya:

> Resep dan takaran ini kami susun dari porsi warung pada umumnya. Harganya nyata dari
> Bank Indonesia; takarannya bisa diubah pemilik sesuai resepnya sendiri dalam satu menit.

Kalau nanti ada waktu tersisa, satu percakapan 15 menit dengan pemilik warung mana pun
akan memperkuat klaim ini secara signifikan — tapi itu bonus, bukan jalur kritis.
