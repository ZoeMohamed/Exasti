# Takar

> **Tahu untungmu sebelum habis.**

Aplikasi web yang menjaga agar pemilik warung tidak kehilangan untung tanpa sadar —
dengan menghubungkan harga pangan harian Bank Indonesia ke resep mereka sendiri.

**EXASTI 2026 · SDG 9 — Sustainable Innovation & Digitalisasi UMKM**

---

## Masalahnya

Harga bahan merayap naik. Harga di banner menu diam. Selisihnya dimakan diam-diam
berbulan-bulan. **Warung makan jarang mati karena sepi pembeli — mereka mati karena
berjualan rugi tanpa tahu.**

Datanya sebenarnya sudah ada: Bank Indonesia menerbitkan harga 21 varian komoditas
pangan setiap hari kerja, per kabupaten, terbuka dan gratis. Yang belum ada adalah
jembatan dari **harga komoditas** ke **untung per menu**.

## Yang dilakukan

```
Ayam Geprek          untung Rp 3.085 → Rp 1.260   🔴

  gara-gara : daging ayam +20%   (61% dari modalmu)
  bukan     : cabai rawit +58%   (cuma 9% dari modalmu)
  saran     : jual Rp 20.000
```

Perhatikan baris keduanya. **Berita ramai soal cabai. Yang membunuh warung Bu Sri
adalah ayam yang naik diam-diam** — karena ayam 61% dari modalnya dan cabai hanya 9%.

Tidak ada artikel berita yang bisa memberitahu itu, karena jawabannya tergantung
resep masing-masing warung. Itulah yang Takar hitung.

## Bukan aplikasi penetapan harga

```
1. DETEKSI      "untungmu menyusut"              ← tidak ada di produk mana pun
2. ATRIBUSI     "gara-gara ayam, bukan cabai"    ← hanya Takar
3. KEPUTUSAN    naikkan harga / ganti bahan      ← bagian yang paling mudah
```

**Takar itu detektor asap, bukan alat pemadam.**

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/01-PRODUCT.md](docs/01-PRODUCT.md) | Why/How/What, posisi vs POS & kalkulator, segmentasi, peran AI, klaim terlarang |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | Arsitektur, ER diagram, kontrak API, jebakan endpoint BI, ketahanan |
| [docs/03-TEAM.md](docs/03-TEAM.md) | Pembagian 4 orang per cincin, batas kepemilikan file |
| [docs/04-EXECUTION.md](docs/04-EXECUTION.md) | Cincin, timeline 7 hari, skrip video, Q&A, risiko |
| [docs/05-PRD.md](docs/05-PRD.md) | Persona, job stories, prioritas fitur, metrik |
| [docs/06-SRS.md](docs/06-SRS.md) | 15 aturan bisnis, 57 kebutuhan fungsional, 23 non-fungsional |
| [docs/07-UX.md](docs/07-UX.md) | **Persona, prinsip teks, rancangan layar, simulasi friksi** |
| [docs/08-AI-USECASE.md](docs/08-AI-USECASE.md) | Peran AI per fitur, apa yang bukan AI, ketahanan, jawaban Q&A |
| [docs/09-CARA-PAKAI.md](docs/09-CARA-PAKAI.md) | **Penjelasan untuk pemilik warung — tanpa istilah teknis** |
| [docs/10-AI-VALIDATION.md](docs/10-AI-VALIDATION.md) | Brief validasi AI — 4 tes, kriteria lolos, rencana mundur |
| [db/schema.sql](db/schema.sql) | DDL — tervalidasi di PostgreSQL 15 |

> **Merancang antarmuka?** Mulai dari [07-UX.md](docs/07-UX.md) — persona,
> kosakata yang boleh dipakai, dan alasan di balik tiap keputusan layar.
>
> **Menulis narasi video atau menjelaskan aplikasi ke orang luar?**
> Pakai [09-CARA-PAKAI.md](docs/09-CARA-PAKAI.md) apa adanya.
>
> **Membangun fitur AI atau menyiapkan Q&A soal AI?**
> Semua ada di [08-AI-USECASE.md](docs/08-AI-USECASE.md).

---

## Dua kebutuhan paling kritis

**[FR-18 / BR-04](docs/06-SRS.md#br-04--penentuan-pendorong-) — penentuan bahan pendorong**
harus memakai **kontribusi rupiah**, bukan persentase kenaikan.

```
Cabai rawit   +58,2%   kontribusi Rp   480
Daging ayam   +20,0%   kontribusi Rp 1.800   ← pendorong yang benar
```

Kalau ini salah, Takar jadi aplikasi harga pangan biasa.

**[FR-09](docs/06-SRS.md#32-data-warung) — input resep berbasis batch.**
Tanya *"sekali masak habis 2 kg ayam, jadi 8 porsi"* — **jangan pernah** meminta
takaran per porsi. Pemilik warung tahu angka pertama; dia tidak tahu yang kedua.
Satu label input yang salah di sini membuat onboarding gagal.

---

## Ruang lingkup — tiga cincin

```
Cincin 0   ingestion · resep · engine · BR-04 · dashboard · detail
           TANPA AI SAMA SEKALI — dan sudah produk utuh

Cincin 1   simulator · peta eksposur · onboarding template · OCR nota

Cincin 2   alert agent AI · substitusi · katalog · input suara
```

**Kalau Cincin 0 belum selesai akhir Hari 3, jangan sentuh Cincin 1.**
Detail: [04-EXECUTION.md](docs/04-EXECUTION.md#cincin)

---

## Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend + API | Next.js 15 (App Router) + TypeScript | Satu repo, satu bahasa, satu deploy |
| Styling | Tailwind | Cepat, konsisten |
| Database | Postgres (Supabase) | Relasional, cocok untuk time-series harga |
| Cron | Vercel Cron | Tidak perlu server terpisah |
| AI | **Gemini Flash** (Google AI Studio) | Gratis, tanpa kartu kredit, vision, structured output |
| Chart | Recharts | Ringan |

Membosankan itu disengaja — final EXASTI menilai **live coding 40%**, jadi stack
harus bisa dimodifikasi siapa pun di tim dalam hitungan detik.

## Menjalankan

```bash
npm install
cp .env.example .env.local     # isi DATABASE_URL dan GEMINI_API_KEY
npm run db:migrate
npm run seed -- --days 90      # tarik 90 hari harga Kota Semarang
npm run dev
```

---

## Sumber data

| Sumber | Isi | Auth | Status |
|---|---|---|---|
| [BI Hargapangan](https://www.bi.go.id/hargapangan) | 21 varian komoditas, harian, per kabupaten | tidak perlu | ✅ terverifikasi 11 Sep 2026 |
| Gemini Flash | OCR nota & resep | API key gratis | — |

**Satu sumber eksternal terverifikasi.** Sisanya lapisan data yang dibangun
pengguna sendiri. Jangan pernah bilang "kami pakai banyak sumber data" — sumber
lain (SiHati Jateng, SP2KP, Bapanas) sudah dicek dan tidak bisa dipakai; rinciannya
di [02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md#sumber-lain-yang-sudah-dicek--jangan-dipakai).

Jebakan endpoint BI — terutama **format tanggal `MM/DD/YYYY`** yang gagal tanpa
error — ada di [02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md#️-jebakan-yang-sudah-ditemukan-dan-diverifikasi).
