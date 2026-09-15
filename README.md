# Takar

> **Tahu untungmu sebelum habis.**

Aplikasi web yang menjaga pemilik warung makan agar tidak kehilangan untung tanpa
sadar. Takar menghubungkan harga pangan harian Bank Indonesia ke resep tiap warung,
lalu menunjukkan bahan mana yang benar-benar menggerus untung.

**EXASTI 2026 · SDG 9 — Sustainable Innovation & Digitalisasi UMKM**

**Aplikasi:** [takar-mocha.vercel.app](https://takar-mocha.vercel.app)

---

## Masalahnya

Harga bahan merayap naik. Harga di banner menu diam. Selisihnya dimakan diam-diam
berbulan-bulan. **Warung makan jarang mati karena sepi pembeli — mereka mati karena
berjualan rugi tanpa tahu.**

Datanya sebenarnya sudah ada: Bank Indonesia menerbitkan harga 21 varian komoditas
pangan setiap hari kerja untuk 110 kota/kabupaten, terbuka dan gratis. Yang belum
ada adalah jembatan dari **harga komoditas** ke **untung per menu**.

## Yang dilakukan

```
Ayam Geprek          untung Rp 3.085 → Rp 1.260

  gara-gara : daging ayam +20%   (61% dari modalmu)
  bukan     : cabai rawit +58%   (cuma 9% dari modalmu)
  saran     : jual Rp 20.000
```

Perhatikan baris keduanya. **Berita ramai soal cabai. Yang menggerus untung warung
adalah ayam yang naik diam-diam** — karena ayam 61% dari modal dan cabai hanya 9%.

Jawabannya tergantung resep masing-masing warung, jadi tidak ada artikel berita yang
bisa memberitahunya. Itulah yang Takar hitung.

## Bukan aplikasi penetapan harga

```
1. DETEKSI      "untungmu menyusut"
2. ATRIBUSI     "gara-gara ayam, bukan cabai"
3. KEPUTUSAN    naikkan harga / ganti bahan      ← tetap di tangan pemilik
```

**Takar itu detektor asap, bukan alat pemadam.**

---

## Fitur yang sudah berjalan

| Fitur | Halaman |
|---|---|
| Daftar dan masuk akun; satu akun hanya melihat warungnya sendiri | `/login` |
| Panduan awal 4 langkah untuk warung baru | tur di dashboard |
| Dashboard: kondisi menu diurutkan dari dampak terbesar, kotak peringatan harian | `/dashboard` |
| Tambah dan ubah menu: resep "sekali masak", kolom ketik bahan, bahan milik warung, kemasan grosir | `/dashboard/menu/tambah` |
| Detail menu: rincian modal dan sumber harga per bahan, bahan penyebab, saran harga jual, riwayat untung | `/dashboard/menu/[id]` |
| Catat nota belanja: foto nota dibaca AI, diperiksa pemilik sebelum disimpan | `/dashboard/belanja` |
| Coba perubahan harga bahan dan harga jual | `/dashboard/simulator` |
| Pengaturan warung, termasuk kota acuan harga pasar | `/dashboard/pengaturan` |
| Pekerjaan harian: tarik harga BI, isi hari libur, catat untung harian, susun peringatan | `/api/cron/harian` · 13:30 WIB |

## Cara kerja

```
Bank Indonesia (PIHPS) ── cron 13:30 WIB ──▶ /api/cron/harian ──▶ Supabase Postgres
                                                                   harga · resep · riwayat · peringatan
Pemilik warung ──▶ Next.js 16 di Vercel (region bom1) ────────────▶ (RLS: satu akun, satu warung)
                        │
                        ├──▶ Gemini Flash — membaca foto nota
                        └──▶ Supabase Edge Function register-user — pendaftaran akun
```

Modal, untung, bahan penyebab, dan peringatan dihitung oleh kode biasa di
[`takar/lib/margin.ts`](takar/lib/margin.ts), bukan oleh AI. AI hanya membaca foto
nota, dan hasilnya selalu diperiksa pemilik sebelum disimpan.

## Stack

| Lapisan | Pilihan |
|---|---|
| Aplikasi dan API | Next.js 16 (App Router), React 19, TypeScript |
| Tampilan | Tailwind CSS; grafik digambar dengan SVG tanpa pustaka tambahan |
| Database dan akun | Supabase: Postgres dengan RLS, Auth, Edge Function |
| Penjadwalan | Vercel Cron |
| AI | Gemini Flash (Google AI Studio) |

Membosankan itu disengaja — final EXASTI menilai **live coding 40%**, jadi stack harus
bisa diubah siapa pun di tim dengan cepat.

---

## Struktur repositori

```text
.
├── takar/            Aplikasi Next.js (Root Directory di Vercel)
│   ├── app/          Halaman dan API route
│   ├── components/   Komponen antarmuka
│   ├── lib/          Mesin hitung, layanan data, integrasi BI dan Gemini, autentikasi
│   ├── tests/        Uji unit, dijalankan lewat npm test
│   ├── scripts/      Seed data, cek database, QA browser
│   └── vercel.json   Region fungsi dan jadwal cron
├── db/supabase/      Migrasi SQL berurutan dan skrip verifikasi — acuan skema yang berlaku
├── supabase/         Konfigurasi Supabase CLI dan Edge Function register-user
├── docs/             Dokumen produk, arsitektur, SRS, UX, dan AI
├── design/           Brief dan panduan desain, kanvas eksplorasi antarmuka
├── scripts/          Skrip Python riset awal (validasi data BI dan OCR)
└── package.json      Pintasan perintah yang meneruskan ke takar/
```

`db/schema.sql` adalah skema awal dan sudah tidak sinkron dengan migrasi. Gunakan
`db/supabase/` sebagai acuan.

## Menjalankan secara lokal

Butuh Node.js 24.

```bash
cp takar/.env.example takar/.env.local
npm ci --prefix takar
npm run dev
```

Buka <http://localhost:3000>. Pengguna yang belum masuk diarahkan ke `/login`.

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Konfigurasi Supabase untuk browser; aman berada di contoh |
| `DATABASE_URL` | Transaction pooler Supabase, port `6543` |
| `GEMINI_API_KEY` | Membaca foto nota belanja |
| `GEMINI_API_KEY_NEXT` | Opsional, hanya saat merotasi kunci |
| `CRON_SECRET` | String acak minimal 16 karakter; dipakai Vercel Cron |
| `TAKAR_DEMO_MODE`, `TAKAR_DEMO_BUSINESS_ID` | `true` hanya untuk presentasi lokal dengan data seed; produksi wajib `false` |

Nilai rahasia dibagikan lewat password manager tim. Jangan kirim lewat chat dan jangan
commit `.env.local`.

## Database

Gunakan connection string admin untuk migrasi, bukan kredensial browser. Jalankan
berurutan:

```bash
db_url="postgresql://..."

psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/01_migration.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/03_security_alignment.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/04_integrity_alignment.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/05_resep_efektif.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/06_security_and_price_provenance.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/06_ai_ocr_hardening.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/06_timezone_jakarta.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/07_bahan_warung.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/08_bi_semarang_repair.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -1 -f db/supabase/09_onboarding_panduan.sql

# Uji skema, zona waktu, constraint, privilege, view, dan isolasi antarwarung.
psql "$db_url" -X -v ON_ERROR_STOP=1 -f db/supabase/05_verify.sql
psql "$db_url" -X -v ON_ERROR_STOP=1 -f db/supabase/07_verify.sql
```

- `07_rollback.sql` hanya dipakai bila akses katalog dari migrasi 07 perlu dibatalkan.
- `02_queries.sql` adalah catatan kueri dari tahap perancangan dan tidak dijalankan.

Isi data awal dari folder `takar`:

```bash
npx tsx scripts/seed-regions.ts   # 110 kota/kabupaten BI
npx tsx scripts/seed.ts           # warung demo, menu, dan 90 hari harga BI Kota Semarang
```

## Pendaftaran akun

Formulir daftar memanggil Edge Function `register-user`, yang membuat akun tanpa
verifikasi email. Tanpa fungsi ini, pendaftaran gagal.

```bash
supabase functions deploy register-user --project-ref <PROJECT_REF>
```

[`supabase/config.toml`](supabase/config.toml) mematikan pemeriksaan JWT untuk fungsi
ini. Fungsi membaca `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, dan
`SUPABASE_SECRET_KEYS` dari environment Supabase.

## Deploy

Hubungkan repository ke Vercel dengan Production Branch `main` dan Root Directory
`takar`. Isi environment dari `takar/.env.example`. Cron `/api/cron/harian` berjalan
setiap hari pukul 06:30 UTC (13:30 WIB), dengan `CRON_SECRET` sebagai bearer token.
Panduan lengkap ada di [takar/README.md](takar/README.md#deployment-vercel).

## Pengujian

```bash
npm test            # 9 rangkaian uji: margin, tanggal, bahan, biaya, prioritas, ocr, bi, rupiah, onboarding
npm run lint
npm run build
npm run db:check    # koneksi dan isi database; butuh DATABASE_URL
```

QA browser end-to-end ada di [`takar/scripts/qa-browser.mjs`](takar/scripts/qa-browser.mjs);
cara menjalankannya ada di [takar/README.md](takar/README.md#qa-browser).

---

## Sumber data

| Sumber | Isi | Akses |
|---|---|---|
| [BI Hargapangan (PIHPS)](https://www.bi.go.id/hargapangan) | 21 varian komoditas, harian, pasar tradisional, 110 kota/kabupaten | Tanpa autentikasi |
| Gemini Flash | Membaca foto nota belanja | API key |

Acuan bawaan adalah Kota Semarang (provinsi `14`, kota `35` pada referensi BI). Sumber
lain (SiHati Jateng, SP2KP, Bapanas) sudah dicek dan tidak dipakai; rinciannya serta
jebakan endpoint BI, termasuk format tanggal `MM/DD/YYYY`, ada di
[02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md).

## Dua kebutuhan paling kritis

**[BR-04](docs/06-SRS.md) — bahan penyebab** harus dihitung dari **kontribusi rupiah**,
bukan persentase kenaikan.

```
Cabai rawit   +58,2%   kontribusi Rp   480
Daging ayam   +20,0%   kontribusi Rp 1.800   ← penyebab yang benar
```

Kalau ini salah, Takar jadi aplikasi harga pangan biasa.

**[FR-09](docs/06-SRS.md) — resep berbasis sekali masak.** Tanya *"sekali masak habis
2 kg ayam, jadi 8 porsi"* — **jangan pernah** meminta takaran per porsi. Pemilik warung
tahu angka pertama; dia tidak tahu yang kedua.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/01-PRODUCT.md](docs/01-PRODUCT.md) | Why/How/What, posisi vs POS dan kalkulator, segmentasi, peran AI |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | Arsitektur, ER diagram, kontrak API, jebakan endpoint BI |
| [docs/03-TEAM.md](docs/03-TEAM.md) | Pembagian peran dan kepemilikan file |
| [docs/04-EXECUTION.md](docs/04-EXECUTION.md) | Ruang lingkup bertahap, timeline, skrip video, Q&A, risiko |
| [docs/05-PRD.md](docs/05-PRD.md) | Persona, job stories, prioritas fitur, metrik |
| [docs/06-SRS.md](docs/06-SRS.md) | Aturan bisnis, kebutuhan fungsional dan non-fungsional |
| [docs/07-UX.md](docs/07-UX.md) | Persona, prinsip teks, rancangan layar, simulasi friksi |
| [docs/08-AI-USECASE.md](docs/08-AI-USECASE.md) | Peran AI per fitur dan yang sengaja bukan AI |
| [docs/09-CARA-PAKAI.md](docs/09-CARA-PAKAI.md) | Penjelasan untuk pemilik warung, tanpa istilah teknis |
| [docs/10-AI-VALIDATION.md](docs/10-AI-VALIDATION.md) | Rencana validasi AI dan kriteria lolos |
| [docs/11-PLAN-INPUT-BAHAN.md](docs/11-PLAN-INPUT-BAHAN.md) | Rencana perubahan input bahan tanpa dropdown |
| [docs/AI-PROCESS.md](docs/AI-PROCESS.md) | Catatan pemakaian AI tools selama pengembangan |
| [design/BRIEF.md](design/BRIEF.md) · [design/GUIDELINE.md](design/GUIDELINE.md) | Brief dan panduan visual |
