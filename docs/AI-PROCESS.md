# AI-PROCESS — catatan pemakaian AI tools

> Rubrik EXASTI meminta dokumentasi ini secara eksplisit: prompt utama,
> halusinasi yang ditemukan, re-prompting, dan bagian yang diperbaiki manual.
>
> **Ditulis sambil mengerjakan, bertanggal.** Jangan direkonstruksi di akhir.

---

## 11 September 2026 — Validasi OCR nota

### Tujuan

Membuktikan apakah OCR nota bisa diandalkan **sebelum** ada yang membangun di
atasnya. Ini menentukan seluruh cerita cakupan data: setelah SiHati (502),
SP2KP (tanpa API), dan Bapanas (401) semua gagal diverifikasi, nota belanja
tinggal satu-satunya jalur untuk harga bahan di luar 21 komoditas BI.

### Prompt utama (versi 1 — masih dipakai)

```
Baca nota belanja Indonesia ini. Kembalikan JSON:

{
  "items": [
    { "nameRaw": "<nama barang persis seperti tertulis>",
      "qty": <angka atau null>,
      "totalPrice": <angka rupiah tanpa titik/koma, atau null> }
  ]
}

Aturan:
- Salin nama barang APA ADANYA, jangan diterjemahkan atau dirapikan.
- Kalau angka tidak terbaca jelas, isi null — JANGAN menebak.
- Abaikan baris subtotal, total, diskon, pajak, tunai, dan kembalian.
```

**Dua aturan terakhir sengaja ditulis tegas.** Nilai yang ditebak masuk ke
perhitungan modal tanpa ada yang curiga — jauh lebih berbahaya daripada baris
yang dilewati. Sampai catatan ini ditulis, model **tidak pernah** mengembalikan
harga tebakan pada pengujian.

### Masalah yang ditemukan dan cara mengatasinya

**1. Model `-latest` sering kena 503 (sibuk)**

Percobaan pertama memakai `gemini-flash-latest` → HTTP 503 "experiencing high
demand" pada kedua panggilan. Alias populer ternyata paling ramai.

*Perbaikan:* rantai fallback model, bukan satu model.

**2. `gemini-2.5-flash` kena 404 — sudah pensiun**

Rantai fallback pertama menaruh `gemini-2.5-flash` di urutan pertama. Hasilnya
HTTP 404: *"no longer available to new users"*. Logika fallback saat itu hanya
melanjutkan pada 503/429, jadi berhenti di model pertama.

*Perbaikan:* perlakukan **404, 503, dan 429 sama** — semuanya lanjut ke model
berikutnya. Rantai final:

```
gemini-3.6-flash → gemini-3.5-flash → gemini-3.8-flash → gemini-flash-lite-latest
```

Rantai ini membuktikan dirinya pada pengujian berikutnya: panggilan kedua kena
`gemini-3.6-flash` sibuk, jatuh ke `3.5-flash`, berhasil tanpa intervensi.

**3. Batas free tier lebih ketat dari dokumentasi**

Dokumentasi Google menyebut 15 permintaan/menit. Pengukuran nyata
(`scripts/test_ratelimit.py`): **429 mulai permintaan ke-7** dalam satu burst,
pulih penuh setelah 60 detik.

*Perbaikan:* jeda 9 detik antar panggilan pada skrip pengujian, dan keputusan
desain **memproses nota satu per satu, tidak beruntun** (NFR-22).

### Yang diputuskan TIDAK dilakukan

**Rotasi banyak API key.** Sempat dipertimbangkan untuk menghindari 429. Ditolak
karena dua alasan: pemakaian nyata (satu nota per unggahan) tidak akan mendekati
batas, dan menumpuk kunci free tier untuk melipatgandakan kuota bukan sesuatu
yang bisa dijelaskan dengan nyaman ke juri. Yang sah: satu kunci per anggota tim.

### Hasil pengujian

Nota sintetis (teks dirender bersih) — **100%**, tapi angka ini tidak berarti
banyak. Lihat pengujian nota asli di bawah.

Nota Indonesia asli dari dataset **CORD** (NAVER CLOVA AI), split test:

| Sampel | Nama barang | Harga | Harga ditebak | Latensi |
|---|---|---|---|---|
| 10 nota · 16 barang | 15/16 (94%) | 15/16 (94%) | 0 | 6,3 s |
| **35 nota · 81 barang** | **79/81 (98%)** | **73/81 (90%)** | **0** | **14,4 s** |

Ambang lolos di [10-AI-VALIDATION.md](10-AI-VALIDATION.md) adalah 80% → **lolos**.

### Tiga hal yang terbaca dari angka ini

**1. Nama lebih akurat daripada harga (98% vs 90%).** Model membaca teks lebih
baik daripada angka. Konsekuensi desain: layar konfirmasi harus menonjolkan
**angka**, bukan nama — di situlah kesalahan berkumpul.

**2. Nol harga ditebak, di 81 kesempatan.** Aturan "JANGAN menebak" di prompt
bekerja. Ini syarat yang tidak bisa ditawar, dan terbukti bisa dipenuhi.

**3. Latensi melonjak di bawah beban berkelanjutan.** Sepuluh nota pertama
rata-rata 6,3 detik. Tiga puluh lima nota berturut-turut: **14,4 detik**, dan
nota terakhir jatuh sampai `flash-lite-latest` karena model di atasnya sibuk
semua.

Pemakaian nyata (satu nota sesekali) akan mendekati 6 detik. Tapi antarmuka
harus tetap anggun sampai **20 detik**, bukan 4.

### Yang BELUM terbukti

**Nota tulisan tangan.** CORD mayoritas nota tercetak. Warung belanja di toko
kelontong dan pasar, yang notanya coretan tangan. Itu bagian paling berisiko dan
masih harus diuji dengan nota yang dikumpulkan sendiri.

Jangan mengklaim OCR "bekerja" sebelum bagian ini diuji.

---

## 12 September 2026 — Integrasi OCR Nota ke Next.js (Cincin 1)

### Komponen yang dibangun
1. **`lib/ai/client.ts`**: Pembungkus tunggal provider Google Gemini Flash dengan model fallback chain (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-flash-latest`), penanganan 404/503/429, serta lapisan `ai_cache` berbasis SHA-256 hash dan memory fallback.
2. **`lib/ai/match.ts`**: Pencocokan string deterministik tanpa AI (FR-39) untuk memetakan hasil bacaan mentah nota ke 21 komoditas Bank Indonesia dan katalog non-BI menggunakan algoritma *Longest Match First* guna mencegah benturan kata (contoh: "telur ayam ras" tidak salah dicocokkan sebagai "ayam").
3. **`lib/ai/ocr.ts`**: Eksekusi parsing gambar nota dengan skema structured output JSON, normalisasi harga per satuan standar (kg/liter), serta 3 data sampel nota pasar siap uji untuk simulasi offline / mode pesawat (NFR-19 & FR-41).
4. **`app/api/ai/parse-nota/route.ts`**: Endpoint API POST resmi yang menerima file gambar `multipart/form-data` maupun JSON Base64.
5. **`app/dashboard/belanja/page.tsx`**: Layar konfirmasi belanja interaktif (S11) yang mematuhi prinsip FR-38 (*"AI hanya menyarankan, pemilik selalu menyetujui"*), memungkinkan pengeditan angka rupiah, jumlah, dan penambahan item secara langsung.

