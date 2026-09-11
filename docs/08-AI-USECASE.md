# 08 — Peran AI di Takar

> Dokumen ini menjelaskan **di mana AI dipakai, di mana tidak, dan kenapa.**
> Untuk O3 saat membangun, dan untuk seluruh tim saat menghadapi Q&A.

---

## Prinsip yang mengikat semuanya

> **AI tidak pernah menulis langsung ke jalur uang tanpa ada manusia yang melihat.**

Setiap hasil AI selalu melewati satu dari dua hal:

```
1. Dikonfirmasi pemilik sebelum disimpan     (OCR, pencocokan)
2. Hanya memilih apa yang ditampilkan,
   tidak menghitung angkanya                  (alert agent)
```

Kalau AI salah baca, yang terjadi adalah pemilik mengoreksi — **bukan untung
diam-diam jadi bohong.** Ini yang membuat produk bisa dipercaya, dan ini jawaban
Q&A terkuat kalian.

---

## Peta cepat

| # | Peran | Bentuk | Cincin | Tanpa ini? |
|---|---|---|---|---|
| 1 | **Baca foto nota belanja** | panggilan tunggal (VLM) | 1 | Bahan non-BI harus diketik manual |
| 2 | **Cocokkan nama bahan** | panggilan tunggal | 1 | Nama tidak seragam, tidak bisa diagregasi |
| 3 | **Baca foto resep tulis tangan** | panggilan tunggal (VLM) | 2 | Onboarding lebih lama |
| 4 | **Pilih peringatan yang layak** | **agent** | 2 | Cincin 0 pakai aturan — sudah cukup |
| 5 | **Saran ganti bahan** | penalaran satu arah | 2 | Pemilik memutuskan sendiri |

**Cincin 0 tidak memakai AI sama sekali dan sudah produk utuh.** Ini penting:
kalau kunci API bermasalah, produk inti tetap jalan.

---

## 1. Baca foto nota belanja

**Cincin 1 · panggilan tunggal · peran AI terpenting**

### Masalah

Bahan di luar 21 komoditas BI — saus sambal, tepung, mie, gas, kemasan — tidak
punya harga otomatis. Kalau pemilik harus mengetik semuanya, dia berhenti.

Dan setelah sumber lain dicek dan gagal (SiHati 502, SP2KP tanpa API, Bapanas
401), **nota belanja adalah satu-satunya jalur** yang menutup bahan-bahan itu
untuk warung Semarang. Ini bukan fitur kenyamanan — ini infrastruktur.

### Kenapa harus AI

Tulisan tangan, tata letak tiap toko berbeda, singkatan lokal, nota lecek yang
difoto miring. Tidak ada aturan yang bisa ditulis untuk itu.

### Input → output

```
📷 foto nota
      ↓
{
  "items": [
    { "nameRaw": "ABC Sambal 935ml", "qty": 1,  "unit": "botol", "totalPrice": 25800 },
    { "nameRaw": "Tepung 5kg",       "qty": 1,  "unit": "sak",   "totalPrice": 58000 },
    { "nameRaw": "Ayam 5kg",         "qty": 5,  "unit": "kg",    "totalPrice": 195000 }
  ]
}
```

### Yang dilihat pengguna

**Selalu layar konfirmasi**, tidak pernah langsung tersimpan:

```
Kami baca notamu seperti ini — betul?

  ABC Sambal 935ml    Rp 25.800    [betul] [betulkan]
  Tepung 5kg          Rp 58.000    [betul] [betulkan]
  Ayam 5kg            Rp 195.000   [betul] [betulkan]
```

### Kenapa ini lebih berharga dari data BI sekalipun

Data BI menjawab *"berapa harga ayam di Kota Semarang?"*
Nota menjawab *"berapa harga ayam yang **warung ini** benar-benar bayar?"*

Untuk menghitung modal, yang kedua lebih akurat. Harga BI tetap berguna untuk
mendeteksi **apa yang sedang berubah di pasar**.

```
NOTA WARUNG        →  "berapa sebenarnya saya bayar?"
DATA HARGA PUBLIK  →  "apa yang sedang berubah di pasar?"
```

### Kalau gagal

Pemilik mengetik manual. Aplikasi tidak crash, untung tetap terhitung (FR-42).

---

## 2. Cocokkan nama bahan

**Cincin 1 · panggilan tunggal**

### Masalah

Satu warung menulis "tepung terigu", yang lain "terigu segitiga biru", yang lain
"tepung". Tanpa penyeragaman, harga dari banyak warung tidak bisa digabungkan.

### Kenapa bukan kode saja

Untuk **21 komoditas BI**, pencocokan string di kode sudah cukup — daftarnya
kecil, tetap, dan sudah diketahui. **Itu tetap dilakukan di kode** (FR-39).

Untuk **katalog barang warung** yang tumbuh sampai ratusan item dengan nama
daerah — gendar, krecek, ceker, sebutan pasar setempat — aturan string jadi
rapuh. Di situlah AI masuk.

| Sasaran | Cara | Alasan |
|---|---|---|
| 21 komoditas BI | kode | kecil, tetap, deterministik |
| Katalog barang warung | **AI + konfirmasi pemilik** | besar, tumbuh, nama lokal |
| Naik jadi item katalog baru | ambang ≥3 warung | melindungi data bersama |

### Yang dilihat pengguna

```
Kamu ketik   "terigu segitiga biru"
                    ↓
      ┌──────────────────────────────┐
      │  Maksudmu: Tepung Terigu?    │
      │      [ Ya ]    [ Bukan ]     │
      └──────────────────────────────┘
```

### Bahaya yang dihindari

Kalau AI menggabungkan "tepung terigu" dengan "tepung tapioka" tanpa ada yang
melihat: harga salah → modal salah → untung bohong, **dan tidak ada error apa
pun.** Angkanya tetap keluar, tetap masuk akal dilihat, tetap salah.

Lebih buruk lagi kalau pengelompokan itu lintas pengguna — satu kesalahan
merusak harga rata-rata untuk semua orang.

Karena itu: **AI menyarankan, katalog memutuskan, pemilik menyetujui.**

---

## 3. Baca foto resep tulis tangan

**Cincin 2 · panggilan tunggal**

Sebagian pemilik punya catatan resep di buku tulis. Memotretnya lebih cepat
daripada mengetik. Output-nya sama seperti nota: daftar bahan + takaran, selalu
dikonfirmasi.

Jalur utamanya tetap **template + input batch** — itu sudah di bawah 2 menit
tanpa AI sama sekali. Fitur ini untuk yang resepnya tidak cocok template.

---

## 4. Pilih peringatan yang layak

**Cincin 2 · satu-satunya yang boleh disebut agent**

### Masalah

Warung dengan 8 menu dan 21 komoditas menghasilkan ratusan perubahan kecil tiap
hari. Kalau semuanya dilaporkan, pemilik berhenti membaca.

### Cincin 0 — aturan, bukan AI

Ini sudah cukup untuk MVP:

```
ambil 3 penurunan untung terbesar yang melewati ambang BR-05,
buang yang perubahannya < 2 poin
```

### Cincin 2 — di mana AI menambah nilai

Memilih **2 dari 40** yang benar-benar layak mengganggu seseorang hari ini adalah
masalah pertimbangan, bukan aritmetika. Contoh yang aturan sulit tangkap:

- menu yang marginnya rendah **tapi stabil** — pemilik sudah tahu, jangan diulang
- dua menu turun karena **bahan yang sama** — gabungkan jadi satu pesan
- penurunan yang **sudah dilaporkan kemarin** — jangan diulang

### Kenapa ini agent, bukan panggilan biasa

```
terjadwal      jalan tiap hari tanpa dipicu manusia
otonom         memutuskan sendiri mana yang layak
memilih        keluarannya keputusan, bukan transformasi
```

**Hanya ini yang boleh kalian sebut agent.** Menyebut OCR sebagai agent akan
ketahuan juri teknis, dan kredibilitas seluruh presentasi ikut turun.

### Batas

Agent ini **tidak menghitung satu angka pun.** Semua angka sudah dihitung
`lib/margin.ts` dan `lib/trend.ts` secara deterministik. Agent hanya memilih
mana yang ditampilkan dan menyusun kalimatnya.

---

## 5. Saran ganti bahan

**Cincin 2 · penalaran satu arah**

*"Cabai rawit mahal, ganti apa?"* — butuh paham kendala masakan, bukan sekadar
mencari yang termurah. Mengganti cabai rawit dengan gula karena lebih murah
jelas konyol, tapi aturan sederhana tidak tahu itu.

Keluarannya **saran, bukan perubahan**. Pemilik yang memutuskan.

---

## Yang TIDAK memakai AI — dan kenapa

```
❌ Hitung modal dan untung        rumus. harus bisa diaudit pemilik.
❌ Tentukan bahan pendorong       BR-04, formula kontribusi rupiah
❌ Deteksi tren harga             selisih dan rata-rata bergerak
❌ Konversi batch ke per porsi    pembagian
❌ Saran harga jual baru          BR-07, rumus
❌ Putuskan item naik ke katalog  ambang kemunculan
❌ Urutan prioritas harga         aturan tetap
```

Ini bukan kekurangan. Ini yang membuat produk bisa dipertanggungjawabkan:

> Aritmetikanya sengaja deterministik supaya bisa diaudit — pemilik warung
> berhak tahu dari mana angkanya.

---

## Penyedia dan biaya

**Google AI Studio — Gemini Flash (free tier)**

```
gratis, tanpa kartu kredit   ✓   key dari aistudio.google.com, 2 menit
vision                       ✓   pemakaian utama: OCR
structured output            ✓   skema JSON dijamin
~1.000 request/hari          ✓   demo butuh puluhan
```

Seluruh panggilan lewat **satu file**: `lib/ai/client.ts`. Ganti provider = ubah
satu file — dan itu jawaban bagus kalau juri bertanya *"bisa ganti model?"*

> ⚠️ **Privasi:** di free tier, data boleh dipakai Google untuk melatih produknya.
> Aman untuk demo dengan data buatan sendiri. **Jangan unggah nota warung
> sungguhan tanpa izin pemiliknya, dan jangan klaim "data pengguna aman".**

---

## Ketahanan — wajib, bukan optimasi

> **Demo tidak boleh bergantung pada satu pun panggilan API live.**

Rate limit, jaringan panitia, kuota habis — semuanya terjadi tepat saat kalian
presentasi.

```
Lapis 1   AI gagal → margin tetap jalan              FR-42
Lapis 2   semua hasil AI di-cache ke `ai_cache`      FR-40
Lapis 3   video cadangan fitur AI                    manual
```

**Bangun cache sejak awal, bukan ditambahkan belakangan.** Dan Hari 6, latihan
demo dengan **mode pesawat menyala** (NFR-19). Ini yang paling sering dilewatkan
tim, dan paling sering menjatuhkan mereka.

---

## Dokumentasi proses AI — bagian dari nilai

Rubrik EXASTI meminta eksplisit:

```
✓ prompt utama yang dipakai
✓ halusinasi / kesalahan yang ditemukan
✓ bagaimana re-prompting memperbaikinya
✓ bagian mana yang akhirnya diperbaiki manual
```

Catat di `docs/AI-PROCESS.md` **sambil jalan, bertanggal.** Rekonstruksi di malam
terakhir akan terlihat karangan — dan ini bagian dari 25%.

---

## Jawaban Q&A

> AI kami pakai di lapisan input dan penyaringan — membaca nota belanja,
> mencocokkan nama bahan, dan memilih peringatan mana yang layak mengganggu
> pemilik. Perhitungan modal dan untungnya sendiri sengaja **tidak** memakai AI:
> rumusnya deterministik supaya pemilik warung bisa mengaudit dari mana angkanya.
> AI tidak pernah menulis ke jalur uang tanpa dikonfirmasi manusia.

Justru **membatasi** peran AI yang membuatnya terdengar seperti keputusan teknik
— bukan tempelan untuk mengejar rubrik.
