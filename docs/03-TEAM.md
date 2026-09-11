# 03 — Pembagian Tim

Empat orang, empat lapisan yang bisa dikerjakan paralel setelah Hari 1.

| | Peran | Bobot rubrik yang dikejar |
|---|---|---|
| **O1** | Data & Engine | Technical + AI 25% |
| **O2** | Frontend & Dashboard | UI/UX 25% |
| **O3** | Layer AI | Technical + AI 25% |
| **O4** | Produk, Pitch & Integrasi | Inovasi 30% · Video 20% |

---

## ⚠️ Aturan yang mengikat semua

**Keempat orang wajib bisa mengubah margin engine sendiri.**

Final EXASTI menilai **live coding 40%**. Kalau juri menunjuk O2 dan hanya O1 yang paham
`lib/margin.ts`, kalian selesai. Sisihkan 30 menit di Hari 4 untuk semua orang
mengerjakan satu perubahan kecil di file itu secara bergantian.

---

## O1 — Data & Engine

Pemilik jantung sistem. Mulai paling awal karena O2–O4 menunggu datanya.

### Tugas

1. **Mapping wilayah** — petakan `bi_province_id` / `bi_regency_id` ke nama kota.
   Tidak terdokumentasi, harus dicoba satu per satu. **Kerjakan pertama**, karena
   tanpa ini tidak ada yang bisa jalan. Minimal: Jawa Tengah + Kota Semarang.
2. **Ingestion** (`/api/cron/ingest`) — tarik `GetGridDataDaerah`, parse, upsert ke `prices`.
   Wajib tangani: format `MM/DD/YYYY`, header `X-Requested-With`, nilai `"-"`,
   pemisah ribuan koma, forward-fill akhir pekan dengan flag `is_filled`.
3. **Seed** — tarik mundur **90 hari** harga. Ini yang membuat grafik tren dan forecast
   punya isi saat demo. Jangan ditunda.
4. **Margin engine** (`lib/margin.ts`) — fungsi murni, tanpa I/O. Plus unit test.
5. **Trend detector** — Δ7 hari dan Δ30 hari per komoditas (view `price_change_7d`).
6. **Recompute job** (`/api/cron/recompute`) — isi `margin_snapshots` harian.

### Selesai jika

- [ ] `npm run ingest` mengisi `prices` untuk Kota Semarang, 90 hari ke belakang
- [ ] `npm test` hijau untuk `lib/margin.ts` (minimal 6 kasus, termasuk bahan hilang)
- [ ] `margin_snapshots` terisi untuk semua menu aktif
- [ ] `ingest_runs` mencatat tiap eksekusi

### Jebakan

Format tanggal salah **tidak menghasilkan error** — hanya baris berisi `"-"`.
Kalau semua kosong, cek format tanggal sebelum apa pun.

---

## O2 — Frontend & Dashboard

Pemilik 25% UI/UX. Bisa mulai Hari 1 dengan data palsu, ganti ke API asli Hari 3.

### Tugas

1. **Onboarding** — daftar warung, pilih kabupaten.
2. **CRUD menu & resep** — tambah menu, harga jual, bahan + takaran, biaya tetap.
3. **Dashboard utama** — inilah killer demo:
   - satu baris per menu
   - margin sebagai bar horizontal
   - **warna + ikon + angka** (jangan warna saja — aksesibilitas dinilai)
   - urut dari margin terburuk
4. **Detail menu** — rincian HPP, grafik margin 30 hari, komoditas pendorong.
5. **Inbox alert** — kartu alert dengan penyebab dan saran.
6. **Transparansi sumber** — tiap HPP menampilkan berapa bahan dari BI vs manual.

### Selesai jika

- [ ] Jalan di lebar 375px tanpa scroll horizontal
- [ ] Status margin terbaca tanpa mengandalkan warna
- [ ] Kontras memenuhi WCAG AA
- [ ] Tidak ada layar kosong tanpa penjelasan (empty state selalu ada teksnya)

### Visual kunci

```
Ayam Geprek      ███░░░░░░░  11%  🔴  turun dari 31%
Nasi Goreng      ██████░░░░  24%  🟡  stabil
Es Teh           █████████░  68%  🟢  stabil
```

---

## O3 — Layer AI

Pemilik komponen AI **dan** dokumentasi proses AI yang diminta rubrik.

### Tugas

1. **VLM parse resep** (`/api/ai/parse-recipe`) — foto tulisan tangan atau nota →
   `{ items: [{ nameRaw, qty, unit, matchedCommodityId }] }`.
   Pencocokan ke 21 komoditas BI dilakukan **di kode**, bukan diserahkan ke model.
2. **Alert agent** (`/api/cron/recompute` bagian akhir) — dari semua menu, pilih ≤3 yang
   layak diganggu. Gunakan structured outputs supaya JSON dijamin valid.
3. **Saran substitusi** (`/api/ai/suggest`) — usul bahan pengganti yang masuk akal
   secara masakan, bukan sekadar termurah.
4. **📋 Dokumentasi proses AI** — rubrik meminta eksplisit:
   - prompt utama yang dipakai
   - halusinasi / kesalahan yang ditemukan
   - bagaimana re-prompting memperbaikinya
   - bagian mana yang akhirnya diperbaiki manual

   **Catat sambil jalan.** Jangan direkonstruksi malam sebelum deadline —
   akan terlihat karangan, dan ini 25% dari nilai.

### Selesai jika

- [ ] Foto resep tulis tangan terbaca benar ≥80% dari 10 sampel uji
- [ ] Alert agent tidak pernah mengembalikan JSON invalid (100 kali percobaan)
- [ ] `docs/AI-PROCESS.md` terisi dan bertanggal, bukan ditulis sekaligus

### Batas

Jangan sebut VLM parse sebagai "agent". Itu satu panggilan. Yang agent hanya alert selector.

---

## O4 — Produk, Pitch & Integrasi

Pemilik 30% inovasi dan 20% video. Ini bukan peran "non-teknis" — dia yang deploy.

### Tugas

1. **Wawancara 2–3 pemilik warung** — ambil resep nyata, takaran nyata, harga jual nyata.
   **Kerjakan Hari 1–2.** Ini yang mengubah pitch dari *"misalnya ada warung"* jadi
   *"Bu Sri di Tembalang menjual ayam geprek Rp 15.000, dan ini yang terjadi bulan lalu."*
2. **Seed data demo** — masukkan resep hasil wawancara sebagai data demo.
3. **Deploy + integrasi** — Vercel, env vars, cron, pantau `ingest_runs`.
4. **Video demo** — lihat skrip di [04-EXECUTION.md](04-EXECUTION.md#skrip-video-demo).
5. **Deck** — Why/How/What dari [01-PRODUCT.md](01-PRODUCT.md).
6. **Latihan Q&A** — siapkan jawaban untuk pertanyaan di 04-EXECUTION.

### Selesai jika

- [ ] Minimal 2 warung nyata terwawancara, resepnya masuk sistem
- [ ] Aplikasi live di URL publik, cron berjalan otomatis
- [ ] Video ≤3 menit, selesai H-1 (bukan hari-H)
- [ ] Seluruh tim sudah latihan Q&A minimal sekali

---

## Batas kepemilikan file

Supaya tidak saling menimpa saat merge:

| Path | Pemilik |
|---|---|
| `lib/margin.ts`, `lib/trend.ts`, `app/api/cron/**` | O1 |
| `app/(dashboard)/**`, `components/**` | O2 |
| `lib/ai/**`, `app/api/ai/**` | O3 |
| `docs/**`, `scripts/seed/**` | O4 |
| `db/schema.sql` | O1 (usul lewat PR dari siapa pun) |

`lib/margin.ts` dimiliki O1 **untuk ditulis**, tapi wajib **dipahami semua**.
