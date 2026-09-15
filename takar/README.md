# Takar — aplikasi

Aplikasi Next.js untuk Takar. Gambaran produk, migrasi database, dan dokumentasi ada di
[README utama](../README.md).

## Prasyarat

- [Node.js](https://nodejs.org/) 24.x (sesuai `engines` di `package.json`)
- npm
- Nilai rahasia tim (`DATABASE_URL`, `GEMINI_API_KEY`, `CRON_SECRET`) dari password manager

## Menjalankan

```bash
git clone git@github.com:ZoeMohamed/Exasti.git
cd Exasti/takar
npm ci
cp .env.example .env.local
npm run dev
```

Buka <http://localhost:3000>. Halaman `/` diarahkan ke `/dashboard`; pengguna yang belum
masuk diarahkan ke `/login`.

URL dan publishable key Supabase sudah ada di contoh karena memang aman dipakai
browser. Gunakan `TAKAR_DEMO_MODE=true` hanya untuk presentasi lokal dengan data seed.
Deployment bersama wajib memakai `false`, sehingga setiap orang masuk dengan akunnya
sendiri dan RLS memisahkan data warung.

## Perintah

Jalankan dari folder `takar`:

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Development server dengan hot reload |
| `npm run build` | Production build dan pemeriksaan TypeScript |
| `npm run start` | Menjalankan hasil production build |
| `npm run lint` | Pemeriksaan ESLint |
| `npm test` | Seluruh uji unit (9 rangkaian) |
| `npm run test:<nama>` | Satu rangkaian: `margin`, `time`, `bahan`, `biaya`, `prioritas`, `ocr`, `bi`, `rupiah`, `onboarding` |
| `npm run db:check` | Koneksi, jumlah baris, dan contoh data Supabase |
| `npm run demo:bahan` | Memindahkan biaya lama warung demo menjadi bahan; uji coba bawaan, tambahkan `-- --terapkan` untuk menyimpan |
| `npx tsx scripts/seed-regions.ts` | Mengisi 110 kota/kabupaten BI ke tabel `regions` |
| `npx tsx scripts/seed.ts` | Mengisi warung demo, menu, dan 90 hari harga BI Kota Semarang |

## Halaman dan API

| Rute | Isi |
| --- | --- |
| `/login` | Masuk dan daftar akun |
| `/dashboard` | Ringkasan warung, kondisi menu, kotak peringatan |
| `/dashboard/menu` | Daftar menu dengan filter sehat, tipis, rugi, diistirahatkan |
| `/dashboard/menu/tambah` | Menu baru |
| `/dashboard/menu/[id]` | Rincian modal, bahan penyebab, saran harga, riwayat |
| `/dashboard/menu/[id]/edit` | Ubah resep dan porsi |
| `/dashboard/belanja` | Catat nota belanja dari foto |
| `/dashboard/simulator` | Coba perubahan harga |
| `/dashboard/pengaturan` | Nama warung, kota acuan harga, keluar akun |
| `/dashboard/panduan` | Mengarahkan ke langkah panduan awal yang sedang berjalan |
| `/api/menus`, `/api/menus/[id]` | Daftar, buat, ubah, dan hapus menu |
| `/api/bahan` | Bahan pasar dan bahan warung untuk form |
| `/api/prices` | Riwayat dan penyimpanan harga nota |
| `/api/ai/parse-nota` | Membaca foto nota dengan Gemini |
| `/api/alerts` | Kotak peringatan dan tandai dibaca |
| `/api/business`, `/api/onboarding` | Profil warung dan progres panduan |
| `/api/cron/harian`, `/api/ingest` | Pekerjaan sistem; wajib `CRON_SECRET` |
| `/api/health` | Status koneksi database |

## Struktur

```text
takar/
├── app/                 Halaman dan API route (App Router)
├── components/
│   ├── dashboard/       Ringkasan dan kotak peringatan
│   ├── layout/          Sidebar dan navigasi ponsel
│   ├── menu/            Form menu, kolom bahan, kartu bahan, biaya kemasan
│   ├── onboarding/      Tur panduan awal
│   └── ui/              Komponen umum
├── lib/
│   ├── margin.ts        Mesin hitung murni: modal, untung, penyebab, peringatan
│   ├── services/        Akses data: menu, bahan, pekerjaan harian, ingest BI, peringatan
│   ├── bahan/           Pencarian bahan, katalog pasar, takaran, validasi
│   ├── ai/              OCR nota, pencocokan bahan, batas permintaan
│   ├── auth/, supabase/, db/   Sesi pengguna, klien Supabase, koneksi Postgres dengan RLS
│   └── data/            Katalog kota/kabupaten BI
├── tests/               Uji unit (tsx)
├── scripts/             Seed, cek database, pemindahan data demo, QA browser
├── public/              Logo
├── referensi/code.html  Prototipe HTML awal, hanya referensi visual
├── proxy.ts             Pembaruan sesi dan pengalihan ke halaman masuk
└── vercel.json          Region bom1 dan cron harian
```

## Deployment Vercel

Hubungkan repository GitHub `ZoeMohamed/Exasti`, lalu gunakan pengaturan berikut:

| Pengaturan | Nilai |
| --- | --- |
| Production Branch | `main` |
| Framework Preset | Next.js |
| Root Directory | `takar` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Function Region | `bom1` (Mumbai, dekat dengan database) |

Tambahkan seluruh variabel dari `.env.example` melalui Vercel Project Settings. Nilai
produksi wajib memakai:

- `DATABASE_URL` transaction pooler Supabase pada port `6543`, dengan
  `uselibpqcompat=true&sslmode=require`
- `TAKAR_DEMO_MODE=false`
- `CRON_SECRET` acak, minimal 16 karakter

Sesudah URL produksi tersedia, buka Supabase Auth > URL Configuration:

- Site URL: URL produksi Vercel
- Redirect URL lokal: `http://localhost:3000/**`
- Redirect URL preview: `https://*-NAMA_TIM.vercel.app/**`

Pendaftaran akun membutuhkan Edge Function `register-user`; cara deploy-nya ada di
[README utama](../README.md#pendaftaran-akun).

Cron di `vercel.json` berjalan setiap hari pukul 06:30 UTC (13:30 WIB). Vercel mengirim
`CRON_SECRET` sebagai bearer token ke `/api/cron/harian` secara otomatis. Cron hanya
berjalan pada deployment Production.

## QA browser

`scripts/qa-browser.mjs` menjalankan alur daftar atau masuk, membuat menu dengan bahan
warung, memeriksa detail, edit, simulator, pengaturan, dan catat nota, lalu menghapus
menu uji. Skrip ini mengendalikan Chrome yang sudah berjalan dengan remote debugging:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9223 --headless=new --user-data-dir=/tmp/takar-qa-profile &

QA_BASE_URL=https://takar-mocha.vercel.app \
QA_EMAIL=akun-uji@example.com QA_PASSWORD='sandi-uji' \
QA_REGISTER=1 \
node scripts/qa-browser.mjs
```

| Variabel | Keterangan |
| --- | --- |
| `QA_BASE_URL` | Default `http://localhost:3000` |
| `QA_EMAIL`, `QA_PASSWORD` | Wajib; gunakan akun uji, bukan akun sungguhan |
| `QA_REGISTER` | `1` untuk mendaftarkan akun terlebih dahulu |
| `QA_CDP_PORT` | Port remote debugging Chrome, default `9223` |
| `QA_OUTPUT_DIR` | Folder screenshot, default `/tmp/takar-browser-qa` |

Skrip ini menulis data ke database yang dituju. Jalankan hanya dengan akun uji.

## Troubleshooting

### Port 3000 sedang digunakan

```bash
npm run dev -- --port 3001
```

### Dependency bermasalah

Hapus `node_modules`, lalu pasang ulang dari `package-lock.json`. Jangan hapus
`package-lock.json` — versi dependency yang terkunci itulah yang dipakai Vercel.

```bash
rm -rf node_modules
npm ci
```

PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

### Perubahan kode tidak terlihat

Pastikan terminal berada di folder `takar`, lalu jalankan ulang `npm run dev` dan
refresh browser.

## Catatan

- Server membaca dan menulis Supabase PostgreSQL langsung; setiap permintaan pengguna
  berjalan dengan RLS miliknya.
- OCR memakai Gemini bila `GEMINI_API_KEY` tersedia dan selalu meminta konfirmasi
  pemilik sebelum menyimpan harga.
- Harga pasar ditarik dari BI oleh cron harian pukul 13:30 WIB.
