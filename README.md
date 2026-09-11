# Takar

> **Tahu untungmu sebelum habis.**

Aplikasi web yang menjaga agar pemilik warung tidak kehilangan untung tanpa sadar —
dengan menghubungkan harga pangan harian Bank Indonesia ke margin per menu mereka.

**EXASTI 2026 · SDG 9 — Sustainable Innovation & Digitalisasi UMKM**

---

## Masalahnya

Cabai rawit bisa naik dua kali lipat dalam dua minggu. Harga di banner menu tidak ikut
berubah. Pemilik warung baru sadar rugi setelah sebulan — itu pun kalau sempat menghitung.

Datanya sebenarnya sudah ada: Bank Indonesia menerbitkan harga 21 komoditas pangan setiap
hari kerja, per kabupaten, terbuka dan gratis. Yang belum ada adalah jembatan dari
**harga komoditas** ke **margin per menu**.

Takar adalah jembatan itu.

## Yang dilakukan

1. Pemilik memasukkan resep sekali — bisa lewat foto tulisan tangan.
2. Setiap hari sistem menarik harga terbaru di kabupaten warung tersebut.
3. HPP dan margin tiap menu dihitung ulang.
4. Hanya menu yang perlu ditindaklanjuti yang dilaporkan ke pemilik.

```
Ayam Geprek          margin  22,9% → 12,8%   🔴
  penyebab utama : daging ayam +20%   (65% dari HPP-mu)
  bukan          : cabai rawit +58%   (cuma 6% dari HPP-mu)
  saran          : naikkan ke Rp 19.500
```

Perhatikan barisan keduanya. **Berita bilang cabai naik 58%. Yang sebenarnya memukul
warung Bu Sri adalah ayam yang naik 20% diam-diam** — karena ayam 65% dari HPP-nya
dan cabai hanya 6%.

Tidak ada artikel berita yang bisa memberitahu itu, karena jawabannya tergantung
resep masing-masing warung. Itulah yang Takar hitung.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/01-PRODUCT.md](docs/01-PRODUCT.md) | Why/How/What, ruang lingkup, klaim yang tidak boleh dibuat |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | Arsitektur sistem, skema database, kontrak API |
| [docs/03-TEAM.md](docs/03-TEAM.md) | Pembagian 4 orang, batas kepemilikan, definisi selesai |
| [docs/04-EXECUTION.md](docs/04-EXECUTION.md) | Timeline, milestone, skrip demo, mitigasi risiko |
| [docs/05-PRD.md](docs/05-PRD.md) | Persona, job stories, prioritas fitur, metrik keberhasilan |
| [docs/06-SRS.md](docs/06-SRS.md) | Aturan bisnis, 31 kebutuhan fungsional, 18 non-fungsional |
| [db/schema.sql](db/schema.sql) | DDL siap jalan — sudah divalidasi di PostgreSQL 15 |

> **Kebutuhan paling kritis: [FR-15 / BR-04](docs/06-SRS.md#br-04--penentuan-pendorong-).**
> Penentuan bahan pendorong harus memakai **kontribusi rupiah**, bukan persentase kenaikan.
> Kalau ini salah, produk kehilangan pembedanya.

## Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend + API | Next.js 15 (App Router) + TypeScript | Satu repo, satu bahasa, satu deploy |
| Styling | Tailwind | Cepat, konsisten |
| Database | Postgres (Supabase) | Relasional, cocok untuk time-series harga |
| Cron | Vercel Cron | Tidak perlu server terpisah |
| AI | Claude Haiku 4.5 | Murah, cukup untuk klasifikasi & OCR |
| Peta/chart | Recharts | Ringan |

Membosankan itu disengaja — final EXASTI menilai **live coding 40%**,
jadi stack harus bisa dimodifikasi siapa pun di tim dalam hitungan detik.

## Menjalankan

```bash
npm install
cp .env.example .env.local     # isi DATABASE_URL dan ANTHROPIC_API_KEY
npm run db:migrate
npm run ingest -- --date today # tarik harga hari ini
npm run dev
```

## Sumber data

| Sumber | Isi | Auth | Terverifikasi |
|---|---|---|---|
| [BI Hargapangan](https://www.bi.go.id/hargapangan) | 21 komoditas, harian, per kabupaten | tidak perlu | ✅ 11 Sep 2026 |
| Claude API | VLM foto resep, alert agent | API key | — |

Detail endpoint dan jebakannya ada di [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md#sumber-data-bi-hargapangan).
