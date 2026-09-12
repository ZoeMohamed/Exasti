# TAKAR

TAKAR adalah dashboard keuangan warung untuk membantu pemilik warung memahami modal, untung, kondisi menu, dan dampak perubahan harga bahan.

## Prasyarat

Pastikan software berikut sudah terpasang:

- [Node.js](https://nodejs.org/) versi LTS, minimal Node.js 20.9
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
git clone URL_REPOSITORY
cd nama-folder-repository
```

Jika repository sudah di-clone dan folder project berada di dalam folder `Exasti`, masuk ke folder Next.js:

```bash
cd takar
```

### 2. Install dependency

```bash
npm install
```

Perintah ini membaca `package.json` dan memasang dependency ke folder `node_modules`.

### 3. Jalankan development server

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
| `npm run start` | Menjalankan hasil production build |

Untuk menjalankan aplikasi dalam mode production:

```bash
npm run build
npm run start
```

Kemudian buka <http://localhost:3000>.

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

- Data aplikasi saat ini masih berupa mock data lokal.
- OCR nota masih berupa simulasi dan belum terhubung ke API eksternal.
- Data harga pasar belum terhubung ke API BI atau database.
- Prototype asli tetap tersedia di `referensi/code.html` sebagai referensi visual.
