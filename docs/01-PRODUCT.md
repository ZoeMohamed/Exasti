# 01 — Produk

## Why / How / What

### WHY

> Pemilik warung kehilangan untung tanpa sadar. Harga bahan merayap naik, harga
> di banner menu diam, dan selisihnya dimakan diam-diam berbulan-bulan. Warung
> makan jarang mati karena sepi pembeli — mereka mati karena berjualan rugi
> tanpa tahu.

### HOW

> Datanya sudah ada. Bank Indonesia menerbitkan harga 21 varian komoditas pangan
> setiap hari kerja, per kabupaten, terbuka dan gratis. Yang belum ada adalah
> jembatan dari harga komoditas ke untung per menu. Takar membangun jembatan itu.

### WHAT

> Aplikasi web. Pemilik memasukkan satu resep sekali — dalam bahasa dia sendiri,
> "sekali masak 2 kg ayam jadi 8 porsi". Setiap hari sistem menghitung ulang
> modal tiap menu terhadap harga hari itu di kotanya, lalu hanya memberi tahu
> yang benar-benar perlu ditindaklanjuti.

**Kalimat penutup pitch:**

> Bukan aplikasi kasir. Bukan aplikasi promosi.
> **Takar menjaga agar warung tidak kehilangan untung tanpa sadar.**

---

## Takar bukan aplikasi penetapan harga

Ini kesalahpahaman yang paling sering muncul, termasuk di dalam tim sendiri.

Kalau Takar disebut "aplikasi penetapan harga", ada asumsi tersembunyi: bahwa
pemiliknya **sudah tahu** dia perlu mengambil keputusan. Padahal tidak. Itu
seluruh masalahnya.

Urutan sebenarnya tiga langkah:

```
1. DETEKSI      "untungmu menyusut"                ← tidak ada di produk mana pun
2. ATRIBUSI     "gara-gara ayam, bukan cabai"      ← hanya Takar
3. KEPUTUSAN    naikkan harga / ganti bahan        ← bagian yang paling mudah
```

Langkah 3 bisa dilakukan kalkulator, bahkan hitung manual. Langkah 1 dan 2 yang
tidak dimiliki siapa pun.

> **Takar itu detektor asap, bukan alat pemadam.**
> Kamu tidak membuka detektor asap saat memutuskan memadamkan api — detektor
> asap yang memberitahumu ada api, waktu kamu belum tahu.

Dan keputusannya tidak selalu "naikkan harga". Bisa juga ganti bahan, kurangi
porsi, hentikan menu, atau **biarkan karena cuma musiman** — yang terakhir itu
keputusan sah dan sering paling benar. Mengetahui bahwa ini sementara juga hasil
yang berguna, dan itu butuh riwayat harga.

---

## Wawasan inti — sudah diuji dengan angka nyata

Dijalankan dengan harga sungguhan, satu porsi ayam geprek, jual Rp 18.000:

| Skenario | Kenaikan | Dampak ke untung |
|---|---|---|
| Cabai rawit melonjak — **ramai di berita** | +58% | turun **3,4 poin** |
| Daging ayam naik — **tidak jadi berita** | +20% | turun **10,1 poin** |

Kenaikan yang sunyi memukul **tiga kali lebih keras**, karena ayam menyumbang
61% dari modal menu ini sementara cabai hanya 9%.

> **Berita nasional tidak bisa memberitahu pemilik warung kenaikan mana yang
> penting baginya, karena jawabannya tergantung resepnya sendiri. Itulah yang
> Takar hitung.**

Ini pembeda utama produk. Bukan "kami menampilkan harga pangan" — itu sudah ada
di mana-mana. Tapi **"kami memberi bobot harga itu terhadap resepmu, lalu
memberitahu mana yang benar-benar mengancam."**

Aturan teknisnya ada di [BR-04](06-SRS.md#br-04--penentuan-pendorong-). Kalau
diimplementasikan sebagai "persentase kenaikan terbesar", produk kehilangan
seluruh pembedanya.

---

## Posisi terhadap produk lain

### Tiga alat, tiga pertanyaan berbeda

```
POS                 →  "Hari ini uang masuk berapa?"
                       Melihat penjualan. Buta terhadap biaya bahan.

Kalkulator HPP      →  "Kalau bahan segini, modal saya berapa?"
(KalKuliner, dll)      Dijawab sekali. Lalu angkanya beku selamanya.

Takar               →  "Untung saya menyusut nggak, dan gara-gara apa?"
```

Bedanya: POS dan kalkulator **menjawab kalau ditanya**. Takar **memberi tahu
tanpa ditanya**. Tidak ada pemilik warung yang membuka kalkulator HPP tiap minggu
untuk mengecek ulang — persis karena itu masalahnya tetap ada meski kalkulatornya
sudah bertahun-tahun tersedia.

### Untuk mengucapkan kalimat pembeda itu, butuh tiga hal sekaligus

```
1. harga harian semua bahan      ← POS tidak punya
2. resep spesifik warung itu     ← data harga publik tidak punya
3. pembobotan keduanya (BR-04)   ← kalkulator tidak melakukan
```

POS punya nol dari tiga. Kalkulator punya satu. Takar punya ketiganya.

### Takar melengkapi POS, tidak melawannya

```
POS    mengurus uang MASUK
Takar  mengurus uang KELUAR
```

Jangan memposisikan diri sebagai pengganti POS di pitch. Mengisi ruang kosong
lebih kuat daripada menggantikan yang sudah dipakai.

### Kategorinya sudah terbukti — di luar negeri

| Produk | Bukti |
|---|---|
| **xtraCHEF** | Diakuisisi Toast (Juni 2021) |
| **MarginEdge** | Platform back-office restoran mapan |
| **meez** | Klaim penurunan COGS 3–5% |

Mekanismenya persis sama: foto faktur → OCR → biaya resep diperbarui otomatis →
peringatan margin. **Masalahnya nyata dan orang mau membayar.**

Tapi semuanya bergantung pada **faktur pemasok**, yang warung Indonesia tidak
punya — mereka belanja di pasar, tunai, sering tanpa nota. Dan Indonesia punya
sesuatu yang pasar Barat tidak punya: **data harga komoditas publik harian per
kabupaten.**

```
Restoran besar   →  MarginEdge, xtraCHEF        butuh faktur pemasok
                    ─────────────────────
                         CELAH  ←  Takar
                    ─────────────────────
Warung           →  kalkulator HPP statis       beku setelah sekali hitung
```

Terlalu kecil untuk alat kelas MarginEdge. Terlalu dinamis untuk kalkulator.

---

## Segmentasi

Produk ini hanya masuk akal kalau **empat syarat** terpenuhi sekaligus:

```
✓ Punya resep dengan bahan terukur     →  makanan, bukan ritel
✓ Harga jual LENGKET                   →  syarat kuncinya
✓ Beli bahan sendiri di pasar          →  bukan pemasok kontrak
✓ Margin tipis, turun 10 poin terasa   →  warung, bukan restoran mahal
```

Syarat kedua paling menentukan. **Kalau harga jual gampang diubah, masalahnya
tidak ada.**

### Segmen utama

**Warung makan dan rumah makan kecil bermenu tetap** — ayam geprek, penyetan,
nasi rames, warteg, soto, bakso. 5–20 menu, harga di banner, belanja sendiri di
pasar, tanpa back-office.

### Yang BUKAN segmen ini

| Segmen | Kenapa tidak |
|---|---|
| Kafe / coffee shop | Bahannya kopi, susu, sirup — hampir tidak ada di data BI, dan mereka lebih mudah menaikkan harga |
| Katering | Harga dikutip per pesanan, biaya sudah dihitung saat menawar |
| Waralaba | Harga ditentukan pusat, pemilik tidak boleh mengubah |
| Toko kelontong | Tidak ada resep |
| Restoran besar | Punya pemasok dan faktur — MarginEdge lebih cocok |

---

## Cakupan data — diukur, bukan dikira

21 varian komoditas BI menutup **88,8%** modal untuk menu berbasis protein dan nasi:

```
Ayam Geprek     92,0%        Rendang         89,2%
Nasi Goreng     86,7%        Es Teh Manis    43,5%
Telur Balado    89,6%
```

Bukan kebetulan: BI melacak keranjang inflasi pangan — komoditas yang porsinya
besar **dan** harganya bergejolak. Yang tidak dilacak (tepung, kecap, gas,
kemasan) justru stabil dan kecil. Barang stabil tidak butuh pelacakan harian.

```
volatil + porsi besar   →  BI, otomatis, harian
stabil  + porsi kecil   →  input manual, sekali saja
```

**Di mana ini patah:** mie ayam, bakso, warteg sayur, seafood — bahan dominannya
di luar BI. Sebut batas ini terang-terangan; juri menghargai batasan yang
disadari dan menghukum klaim "untuk semua UMKM".

---

## Peran AI — jujur dan sempit

Rubrik EXASTI menilai **efektivitas pemanfaatan AI tools dalam proses pembuatan**,
bukan mewajibkan model canggih di dalam produk. Jangan mengarang peran AI.

| Komponen | AI? | Alasan |
|---|---|---|
| Hitung modal & untung | ❌ | `Σ(takaran × harga)`. Aritmetika. Harus bisa diaudit pemilik. |
| Tentukan bahan pendorong | ❌ | BR-04, formula kontribusi rupiah. Deterministik. |
| Deteksi tren harga | ❌ | Selisih dan rata-rata bergerak. |
| Pilih alert yang layak | ⚪ | Cincin 0 pakai aturan (3 penurunan terbesar). AI = peningkatan di Cincin 2. |
| **Baca foto nota belanja** | ✅ | Teks bebas, tulisan tangan, tata letak tiap toko beda |
| **Baca foto resep** | ✅ | Sama |
| **Cocokkan nama bahan ke katalog** | ✅ | Nama lokal tak terhingga, tidak bisa di-hardcode |
| **Saran substitusi bahan** | ✅ | Butuh paham kendala masakan, bukan cari termurah |

### Garis yang memisahkan

> **AI tidak pernah menulis langsung ke jalur uang tanpa ada manusia yang melihat.**

OCR → pemilik mengonfirmasi. Pencocokan → pemilik menyetujui. Alert agent → hanya
memilih apa yang ditampilkan, tidak menghitung angkanya.

Kalau AI salah baca, yang terjadi adalah pemilik mengoreksi — bukan untung
diam-diam jadi bohong.

### Bentuknya berbeda, jangan disamakan

```
Panggilan tunggal (VLM)  →  OCR nota · baca resep · pencocokan
Agent sungguhan          →  alert selector (terjadwal, otonom, memilih)
Penalaran satu arah      →  saran substitusi
```

Hanya satu yang boleh disebut **agent**. Menyebut OCR sebagai agent akan
ketahuan juri teknis.

**Kalimat Q&A:**

> Aritmetikanya sengaja deterministik supaya bisa diaudit — pemilik warung
> berhak tahu dari mana angkanya. AI hanya kami pakai di lapisan input dan
> penyaringan, dan tidak pernah menulis ke jalur uang tanpa dikonfirmasi manusia.

---

## Ruang lingkup — tiga cincin

Lihat [04-EXECUTION.md](04-EXECUTION.md#cincin) untuk isinya. Ringkasnya:

```
Cincin 0   ingestion · resep · engine · BR-04 · dashboard · detail
           TANPA AI SAMA SEKALI — dan itu sudah produk utuh

Cincin 1   simulator · peta eksposur · onboarding template · OCR nota

Cincin 2   alert agent AI · substitusi · katalog · input suara
```

**Kalau Cincin 0 belum selesai akhir Hari 3, jangan sentuh Cincin 1.**

### Tidak masuk, jangan tergoda

POS/kasir · manajemen stok · multi-cabang · pembayaran · aplikasi native ·
prediksi harga jangka panjang · agregat lintas warung

---

## Klaim yang TIDAK boleh dibuat

| Jangan bilang | Kenapa |
|---|---|
| "Kami memprediksi harga pangan" | Kita ekstrapolasi tren, bukan meramal pasar |
| "Data real-time" | BI terbit sekali per hari kerja. Sebut **harian**. |
| "Harga di pasar dekat warungmu" | Granularitas BI adalah kabupaten |
| "AI menghitung marginmu" | Margin dihitung rumus. Mengaku AI = bunuh diri di Q&A |
| "Kami pakai banyak sumber data" | Satu sumber resmi + data yang dibangun pengguna |
| "Untuk semua UMKM" | Warung makan bermenu tetap. Sebut batasnya. |
| "Sudah ada penggunanya" | Belum. Jangan mengaku mewawancarai siapa pun. |
| "Untung bulananmu sekian" | Tidak ada data penjualan. Hanya untung **per porsi**. |

### Yang harus diungkap terbuka di antarmuka

Setiap angka modal menampilkan berapa bahan yang harganya dari BI dan berapa
yang manual:

```
Modal Ayam Geprek   Rp 14.915
  ├ 92% dari data Bank Indonesia (11 Sep 2026)
  └ Gas + kemasan Rp 1.200 — perkiraan, bisa dibetulkan
```

Transparansi ini bukan kelemahan — ini yang membuat angkanya dipercaya, dan
jawaban siap pakai saat juri bertanya soal akurasi.
