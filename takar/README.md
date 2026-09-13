# TAKAR

TAKAR adalah dashboard keuangan warung untuk membantu pemilik warung memahami modal, untung, kondisi menu, dan dampak perubahan harga bahan.

## Prasyarat

Pastikan software berikut sudah terpasang:

- [Node.js](https://nodejs.org/) versi 24
- npm, biasanya sudah ikut terpasang bersama Node.js
- Git, jika project diambil dari repository Git

Cek instalasi:

```bash
node --version
npm --version
git --version
```

## Instalasi Local

### 1. Clone repository

Jalankan dari folder tempat project akan disimpan:

```bash
git clone git@github.com:ZoeMohamed/Exasti.git
cd Exasti/takar
```

Jika repository sudah tersedia, masuk ke folder aplikasi:

```bash
cd takar
```

### 2. Install dependency

```bash
npm ci
```

Perintah ini memasang versi dependency yang sudah dikunci di `package-lock.json`.

### 3. Salin konfigurasi environment

```bash
cp .env.example .env.local
```

Project URL dan publishable key Supabase sudah tersedia di contoh karena memang
aman dipakai browser. Isi `DATABASE_URL`, `GEMINI_API_KEY`, dan `CRON_SECRET`
melalui password manager tim; jangan kirim nilainya di chat atau commit Git.

Gunakan `TAKAR_DEMO_MODE=true` hanya untuk presentasi lokal dengan data seed.
Deployment bersama wajib memakai `false`, lalu setiap developer masuk dengan
akun Supabase masing-masing sehingga RLS memisahkan data warung.

### 4. Jalankan development server

```bash
npm run dev
```

Buka alamat berikut di browser:

<http://localhost:3000>

Halaman `/` akan mengarahkan ke `/dashboard`.

## Perintah yang Tersedia

Jalankan perintah dari folder `takar`:

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan development server dengan hot reload |
| `npm run lint` | Memeriksa masalah ESLint |
| `npm run build` | Membuat production build dan memeriksa TypeScript |
| `npm test` | Menjalankan uji aturan hitung dan zona waktu Jakarta |
| `npm run db:check` | Memeriksa koneksi serta integritas data Supabase |
| `npm run start` | Menjalankan hasil production build |

Untuk menjalankan aplikasi dalam mode production:

```bash
npm run build
npm run start
```

Kemudian buka <http://localhost:3000>.

## Deployment Vercel

Hubungkan repository GitHub `ZoeMohamed/Exasti`, lalu gunakan pengaturan berikut:

| Pengaturan | Nilai |
| --- | --- |
| Production Branch | `main` |
| Framework Preset | Next.js |
| Root Directory | `takar` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |

Tambahkan seluruh variabel dari `.env.example` melalui Vercel Project Settings.
Nilai produksi wajib memakai:

- `DATABASE_URL` transaction pooler Supabase pada port `6543`, dengan
  `uselibpqcompat=true&sslmode=require`
- `TAKAR_DEMO_MODE=false`
- `CRON_SECRET` acak, minimal 16 karakter

Jangan menyalin `.env.local` ke Git. Simpan `DATABASE_URL`, `GEMINI_API_KEY`, dan
`CRON_SECRET` hanya di pengelola environment Vercel/password manager tim.

Sesudah URL produksi tersedia, buka Supabase Auth > URL Configuration:

- Site URL: URL produksi Vercel
- Redirect URL lokal: `http://localhost:3000/**`
- Redirect URL preview: `https://*-NAMA_TIM.vercel.app/**`

Cron di `vercel.json` berjalan pukul 06.30 UTC atau 13.30 WIB. Vercel mengirim
`CRON_SECRET` sebagai bearer token ke `/api/cron/harian` secara otomatis.

## Struktur Utama

```text
takar/
├── app/                    # Route dan layout Next.js App Router
├── components/             # Komponen UI reusable
├── lib/                    # Mock data, format angka, dan kalkulasi
├── types/                  # TypeScript types
├── public/                 # Asset publik
└── referensi/code.html     # Prototype UI asli TAKAR
```

Route utama:

- `/dashboard`
- `/dashboard/menu`
- `/dashboard/menu/tambah`
- `/dashboard/menu/ayam-geprek`
- `/dashboard/menu/ayam-geprek/edit`
- `/dashboard/belanja`
- `/dashboard/simulator`
- `/dashboard/pengaturan`

## Troubleshooting

### Port 3000 sedang digunakan

Jalankan Next.js pada port lain:

```bash
npm run dev -- --port 3001
```

Buka <http://localhost:3001>.

### Dependency bermasalah

Hapus instalasi dependency lokal lalu install ulang.

PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

Command Prompt:

```bat
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Perubahan kode tidak terlihat

Pastikan terminal berada di folder project yang benar:

```bash
cd takar
npm run dev
```

Lalu refresh browser. Development server akan memuat ulang perubahan secara otomatis.

## Catatan

- Dashboard membaca dan menulis Supabase PostgreSQL secara langsung dari server.
- OCR memakai Gemini bila `GEMINI_API_KEY` tersedia dan selalu meminta konfirmasi sebelum menyimpan.
- Harga publik ditarik dari BI oleh cron harian pukul 13.30 WIB.
- Prototype asli tetap tersedia di `referensi/code.html` sebagai referensi visual.
