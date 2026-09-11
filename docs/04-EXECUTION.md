# 04 — Eksekusi

> **Sesuaikan tanggalnya.** Rencana ini 7 hari kerja. Kalau deadline kalian lebih pendek,
> potong dari Hari 5–6 (poles), **jangan** dari Hari 1 (fondasi data) atau Hari 7 (video).

---

## Timeline

### Hari 1 — Fondasi (semua orang, bareng)

Jangan paralel dulu. Satu ruangan, satu sore.

| Siapa | Kerjaan |
|---|---|
| Semua | Setup repo, Next.js, Supabase, jalankan `db/schema.sql` |
| O1 | **Mapping wilayah BI** — ini blocker semua orang. Kerjakan pertama. |
| O2 | Layout dasar + komponen `ui/` dengan data palsu |
| O3 | Uji panggilan Claude API, pastikan key jalan |
| O4 | Scaffold rute onboarding + form registrasi warung |

**Gerbang Hari 1:** `regions` terisi minimal Kota Semarang, dan `npm run dev` menyala.
Kalau ini tidak tercapai, jangan lanjut — perbaiki dulu.

### Hari 2 — Data mengalir

| O1 | Ingestion jalan + **seed 90 hari ke belakang** |
| O2 | Kerangka dashboard + komponen bar margin |
| O3 | VLM parse resep, versi pertama |
| O4 | CRUD menu + editor resep & biaya tetap |

**Gerbang Hari 2:** `select count(*) from prices` mengembalikan ribuan baris.

### Hari 3 — Engine hidup

| O1 | Margin engine + unit test + recompute job |
| O2 | Dashboard utama tersambung API asli |
| O3 | Alert agent versi pertama |
| O4 | `scripts/seed.ts` — 5 menu demo masuk sistem |

**Gerbang Hari 3:** satu menu di sistem menampilkan margin yang dihitung dari harga BI asli.
**Ini momen produk jadi ada.** Kalau meleset, potong fitur, jangan geser hari.

### Hari 4 — Integrasi

| O1 | Trend detector, perbaiki kasus tepi |
| O2 | Detail menu + grafik 30 hari + inbox alert |
| O3 | Saran substitusi, rapikan prompt |
| O4 | Deploy ke Vercel, cron menyala |
| **Semua** | **30 menit: tiap orang mengubah `lib/margin.ts` bergantian** |

### Hari 5 — Poles

| O2 | Aksesibilitas, responsif, empty state |
| O1+O3 | Perbaiki bug hasil pemakaian sungguhan |
| O4 | Draf deck, mulai rekam bahan video |

### Hari 6 — Uji dan kunci

- Uji penuh oleh orang di luar tim (ajak teman yang belum pernah lihat)
- **Freeze fitur.** Setelah hari ini hanya perbaikan bug.
- O3 rampungkan `docs/AI-PROCESS.md`

### Hari 7 — Video dan latihan

- Rekam dan edit video (≤3 menit)
- Latihan Q&A minimal 2 putaran
- Simpan backup: database dump + rekaman demo cadangan

---

## Skrip video demo

Target ≤3 menit. Struktur yang menang: **masalah → produk → bukti**.

| Detik | Isi |
|---|---|
| 0–20 | **Masalah.** Bu Sri, warung ayam geprek. Harga menu Rp 15.000 sejak Januari. Tunjukkan grafik cabai rawit naik. "Dia tidak tahu marginnya sudah tinggal 11%." |
| 20–35 | **Data.** Tunjukkan endpoint BI asli di browser. "Data ini sudah ada, gratis, tiap hari kerja — tapi belum pernah sampai ke Bu Sri." |
| 35–75 | **Produk — ini inti video.** Dashboard, Ayam Geprek merah. Klik. Tunjukkan bahwa cabai naik 58% tapi dampaknya cuma 3,4 poin, sementara ayam naik 20% dan menghabiskan 10,1 poin. *"Berita ramai soal cabai. Yang membunuh Bu Sri adalah ayam."* Lalu saran: naikkan ke Rp 19.500. |
| 75–110 | **Onboarding.** Foto resep tulis tangan → terbaca otomatis jadi bahan + takaran. |
| 110–140 | **Bukti berjalan.** Tunjukkan `ingest_runs` — sistem menarik data tiap hari, bukan dihitung saat demo. Grafik margin 30 hari. |
| 140–170 | **Penutup.** "Bukan aplikasi kasir. Bukan aplikasi promosi. Takar menjaga agar warung tidak kehilangan untung tanpa sadar." |

**Wajib ada di video:** sorot layar endpoint BI yang asli dan tabel `ingest_runs`.
Tanpa pengguna nyata, **bukti bahwa datanya nyata** adalah aset kredibilitas utama kalian —
tunjukkan, jangan cuma diklaim.

---

## Persiapan Q&A

Pertanyaan yang hampir pasti muncul, dan jawabannya.

**"Bagaimana kalau bahannya tidak ada di 21 komoditas BI?"**
> Masuk ke `fixed_costs`, diinput pemilik sekali. UI selalu menampilkan berapa bahan dari
> data BI dan berapa manual — kami tidak menyembunyikan itu.

**"Data BI kan level kabupaten, bukan pasar dekat warung?"**
> Betul, dan kami menyebutnya kabupaten di UI. Yang kami deteksi adalah *perubahan*, dan
> arah perubahan harga kabupaten sangat berkorelasi dengan pasar di dalamnya.

**"Di mana AI-nya?"**
> Di dua tempat: memilih alert mana yang layak mengganggu pemilik, dan membaca foto resep.
> Perhitungan marginnya sengaja bukan AI — deterministik supaya bisa diaudit. Pemilik warung
> berhak tahu angkanya dari mana.

**"Ini cuma kalkulator, kan?"**
> Kalkulator butuh pemilik warung yang tahu kapan harus menghitung. Justru itu masalahnya —
> mereka baru menghitung setelah rugi. Takar yang menghitung tiap hari dan memanggil mereka.

**"Kenapa tidak pakai Google/data lain?"**
> Kami audit dulu. Portal open data daerah mati, API PLN dan ESDM tidak bisa dihubungi,
> scraping Google melanggar ToS. BI Hargapangan satu-satunya yang harian, terbuka, resmi,
> dan terverifikasi jalan. Kami tunjukkan hasil auditnya.

**"Sudah ada penggunanya?"**
> Belum — ini prototipe. Harga di dalamnya nyata dari Bank Indonesia dan diperbarui otomatis
> tiap hari kerja; resep dan takarannya kami susun dari porsi warung pada umumnya, dan bisa
> diubah pemilik sesuai resepnya sendiri dalam satu menit.

> ⚠️ **Jangan mengaku sudah mewawancarai pemilik warung.** Kalau juri menggali dan ternyata
> tidak ada, seluruh kredibilitas presentasi runtuh — termasuk bagian yang benar.

---

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Endpoint BI berubah / down saat final | Fatal | **Seed 90 hari di Hari 2.** Aplikasi tetap hidup dari database walau API mati. Siapkan dump. |
| Format tanggal salah, tidak disadari | Boros hari | Sudah didokumentasikan: `MM/DD/YYYY`. Uji dengan tanggal yang jelas berbeda hari/bulannya. |
| Tanpa pengguna nyata, pitch terasa teoretis | Inovasi 30% melemah | Ganti bukti: tunjukkan endpoint BI langsung + `ingest_runs` di video. Kredibilitas pindah dari "ada penggunanya" ke "datanya terverifikasi". |
| Hanya O1 paham engine | Gagal live coding 40% | Sesi 30 menit wajib di Hari 4 |
| Kehabisan waktu | Fitur setengah jadi | Freeze di Hari 6. Lebih baik 4 fitur rapi daripada 7 setengah. |
| Kuota / key Claude habis | AI mati saat demo | Simpan hasil parse dan alert dari demo run sebagai fallback statis |

---

## Definition of Done untuk MVP

Produk dianggap layak demo jika seluruhnya terpenuhi:

- [ ] Harga Kota Semarang terisi ≥90 hari ke belakang
- [ ] Cron ingestion berjalan otomatis dan tercatat di `ingest_runs`
- [ ] Seed menghasilkan ≥5 menu dengan eksposur komoditas yang berbeda-beda
- [ ] Warung baru bisa didaftarkan sampai punya menu bermargin, tanpa bantuan developer
- [ ] Dashboard menampilkan margin harian yang berubah mengikuti harga
- [ ] Riwayat margin 30 hari tampil sebagai grafik
- [ ] Alert muncul otomatis dengan penyebab dan saran
- [ ] Foto resep tulis tangan bisa diparse
- [ ] Jalan di layar 375px, status tidak bergantung warna saja
- [ ] `docs/AI-PROCESS.md` lengkap dan bertanggal
- [ ] Video ≤3 menit selesai
- [ ] Keempat anggota pernah mengubah `lib/margin.ts`
