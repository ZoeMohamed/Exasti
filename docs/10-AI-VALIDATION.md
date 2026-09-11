# 10 — Brief Validasi AI

> **Untuk:** anggota tim yang menguji kemampuan AI
> **Lama:** 1–2 hari
> **Dikerjakan:** sebelum fitur AI dibangun, bukan sesudah

---

## Kenapa ini dikerjakan duluan

Kita sudah memverifikasi bahwa **satu-satunya jalur** untuk mendapatkan harga
bahan di luar 21 komoditas BI adalah **nota belanja pemilik warung**. Sumber lain
sudah dicek dan gagal semua:

```
SiHati Jawa Tengah   HTTP 502    mati
SP2KP Kemendag       SPA         tidak ada API
Bapanas              HTTP 401    terkunci token
Siskaperbapo         ada         tapi Jawa Timur, salah provinsi
```

Artinya: **kalau OCR nota tidak bisa diandalkan, cerita cakupan data Takar runtuh.**
Saus sambal, tepung, mie, gas, kemasan — semua tidak punya jalan masuk lain.

Jadi tugas ini bukan riset sampingan. Ini menjawab apakah salah satu tiang produk
berdiri atau tidak.

---

## Persiapan

1. **Ambil API key Gemini** di [aistudio.google.com](https://aistudio.google.com) —
   gratis, tanpa kartu kredit, sekitar 2 menit.
2. Simpan sebagai `GEMINI_API_KEY` di `.env.local`.
3. Buat folder kerja: `ai-lab/` (di luar `app/`, ini eksperimen bukan produksi).

> ⚠️ **Privasi:** di free tier, data boleh dipakai Google untuk melatih produknya.
> Untuk nota pribadi atau nota tim, aman. **Jangan pakai nota warung orang lain
> tanpa izin mereka.**

---

## Tes 1 — OCR nota belanja ⭐ paling penting

### Kumpulkan 10 nota

Sengaja yang beragam, karena inilah yang akan ditemui di lapangan:

```
3 nota minimarket     Indomaret/Alfamart — thermal, rapi, tercetak
3 nota toko kelontong tulisan tangan, kertas kecil
2 nota pasar          coretan, singkatan, kadang tanpa kop
2 nota "buruk"        lecek, difoto miring, cahaya kurang
```

Sumber: belanja sendiri, minta ke keluarga, atau nota lama di dompet. Tidak perlu
nota warung sungguhan — yang diuji adalah kemampuan membaca, bukan isinya.

### Jalankan

Satu prompt yang sama untuk semua 10, tanpa diubah-ubah dulu. Prompt awal:

```
Baca nota belanja ini. Kembalikan JSON dengan struktur:

{
  "items": [
    { "nameRaw": "<nama barang persis seperti tertulis>",
      "qty": <angka>,
      "unit": "<satuan seperti tertulis, misal kg/botol/pcs/sak>",
      "totalPrice": <angka rupiah tanpa titik atau koma> }
  ]
}

Aturan:
- Salin nama barang APA ADANYA, jangan diterjemahkan atau dirapikan.
- Kalau satuan tidak tertulis, isi null.
- Kalau angka tidak terbaca jelas, isi null — JANGAN menebak.
- Abaikan baris total, diskon, kembalian, dan PPN.
```

Perhatikan dua aturan terakhir. **Menebak lebih berbahaya daripada mengaku tidak
tahu** — nilai tebakan masuk ke perhitungan modal tanpa ada yang curiga.

### Skor

Untuk tiap baris barang, catat tiga hal terpisah:

| Yang dinilai | Benar? |
|---|---|
| Nama barang terbaca | ya / tidak |
| Jumlah + satuan | ya / tidak |
| Harga | ya / tidak |

```
Lolos jika  ≥80% baris barang benar ketiganya
            DAN nol kasus "harga ditebak padahal tidak terbaca"
```

Syarat kedua tidak bisa ditawar. Satu harga karangan lebih merusak daripada
sepuluh baris yang dilewati.

### Catat kegagalannya

Untuk tiap kesalahan, tulis: nota mana, barang apa, keluar apa, **seharusnya apa**.
Ini bahan mentah `docs/AI-PROCESS.md`.

---

## Tes 2 — Pencocokan nama bahan

Nama barang di nota tidak pernah sama dengan nama di data BI.

### Siapkan 30 nama nyata

```
"terigu segitiga biru"      →  Tepung Terigu
"ayam broiler 1 ekor"       →  Daging Ayam Ras Segar
"cabe setan"                →  Cabai Rawit
"telor ayam neger"          →  Telur Ayam Ras Segar
"mgrg bimoli 2L"            →  Minyak Goreng Kemasan
"bwg brambang"              →  Bawang Merah
"gula pasir gulaku 1kg"     →  Gula Pasir
...
```

Sertakan singkatan, salah ketik, nama merek, dan istilah lokal Jawa Tengah.

### Dua jalur yang diuji terpisah

| Sasaran | Cara | Target |
|---|---|---|
| **21 komoditas BI** | pencocokan string **di kode**, bukan AI | ≥90% |
| **Barang lain** | AI + konfirmasi pemilik | ≥80% saran teratas benar |

Nama komoditas BI yang sebenarnya — ambil dari `GetRefCommodityAndCategory`,
**jangan dikarang**. Perhatikan: `Cabai Merah Keriting ` punya **spasi di
belakang**, dan `Daging Ayam Ras Segar` bukan `Daging Ayam Ras`.

### Yang dicari

Catat setiap kasus di mana AI **salah tapi terdengar yakin.** Itu yang paling
berbahaya — misalnya menggabungkan "tepung terigu" dengan "tepung tapioka".
Kalau ini sering terjadi, layar konfirmasi wajib menampilkan alasan, bukan cuma
nama hasil.

---

## Tes 3 — Keandalan JSON

Fitur AI yang kadang mengembalikan JSON rusak akan mematikan demo.

```
Jalankan 100 panggilan dengan skema yang sama
Hitung berapa yang gagal di-parse

Target: 0 dari 100
```

Kalau ada yang gagal, aktifkan **structured output** (skema JSON dijamin) dan
ulangi. Catat perbedaannya — ini bahan bagus untuk `AI-PROCESS.md`.

---

## Tes 4 — Batas praktis free tier

Yang tertulis di dokumentasi adalah 5–15 permintaan/menit dan ~1.000/hari.
Yang perlu diketahui: **apa yang sebenarnya terjadi saat batas tercapai.**

```
Kirim 20 permintaan berturut-turut secepat mungkin.

Catat:
  - di permintaan ke berapa mulai ditolak
  - kode error / pesannya apa
  - berapa lama sampai bisa lagi
  - latensi rata-rata satu panggilan OCR (detik)
```

Angka terakhir penting untuk UX: kalau satu foto perlu 8 detik, layar harus
menunjukkan sesuatu selama menunggu.

---

## Hasil yang diserahkan

### 1. `ai-lab/hasil.md`

```markdown
## Tes 1 — OCR nota
10 nota · 63 baris barang
Benar ketiganya : 54 / 63  (86%)
Harga ditebak   : 0        ✅
Paling sering salah: nota tulisan tangan, angka 3 vs 8

## Tes 2 — Pencocokan
Komoditas BI (kode) : 28/30  (93%)
Barang lain (AI)    : 25/30  (83%)
Salah tapi yakin    : 2 kasus — dicatat di bawah

## Tes 3 — JSON
100 panggilan · 0 gagal parse  (dengan structured output)
Tanpa structured output: 3 gagal

## Tes 4 — Batas
Ditolak mulai permintaan ke-12 dalam satu menit
Error: 429 · pulih setelah ~40 detik
Latensi OCR rata-rata: 4,2 detik
```

### 2. Prompt final

Versi yang dipakai setelah diperbaiki, siap disalin O3 ke `lib/ai/client.ts`.

### 3. Bahan `docs/AI-PROCESS.md`

Rubrik EXASTI meminta ini **eksplisit** — dan ini bagian dari 25%:

```
✓ prompt utama yang dipakai
✓ halusinasi / kesalahan yang ditemukan   ← catat sambil jalan, bertanggal
✓ bagaimana re-prompting memperbaikinya   ← simpan versi sebelum & sesudah
✓ bagian mana yang diperbaiki manual
```

**Tulis sambil mengerjakan, jangan direkonstruksi di akhir.** Rekonstruksi akan
terlihat karangan, dan juri sering menanyakan detail yang hanya diketahui orang
yang benar-benar mengalaminya.

### 4. 10 nota uji + hasilnya

Disimpan sebagai data uji regresi, dan sebagai bahan demo.

---

## Kalau hasilnya gagal

Jangan dipaksakan. Ini rencana mundurnya, urut:

| Kalau | Maka |
|---|---|
| OCR di bawah 80% | Nota tercetak saja yang didukung; tulisan tangan diketik manual |
| OCR gagal total | Buang OCR dari Cincin 1. Input manual dengan kalkulator kemasan sudah cukup — **produk inti tidak bergantung padanya** |
| Pencocokan AI lemah | Pemilik memilih dari daftar, bukan mengetik bebas |
| JSON sering rusak | Wajib structured output; kalau masih rusak, ganti provider |
| Batas terlalu ketat | Proses nota satu per satu, bukan beruntun; tampilkan antrean |

Ingat: **Cincin 0 tidak memakai AI sama sekali dan sudah produk utuh.** Kalau
seluruh lapisan AI gagal, Takar tetap bisa didemokan. Itu memang disengaja.

---

## Yang TIDAK perlu diuji sekarang

Alert agent dan saran substitusi ada di Cincin 2 — kemungkinan besar tidak
dibangun. Jangan habiskan waktu di sana sebelum empat tes di atas selesai.
