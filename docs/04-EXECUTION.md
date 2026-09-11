# 04 — Eksekusi

---

## Cincin

Ruang lingkup dipotong jadi tiga cincin. **Kerjakan berurutan. Jangan melompat.**

### Cincin 0 — tanpa ini tidak ada produk

```
1. Ingestion harga BI harian  +  seed 90 hari ke belakang
2. Satu warung · menu · resep (input batch: "2 kg → 8 porsi")
3. Margin engine — BR-01, BR-02
4. margin_snapshots harian
5. BR-04 atribusi pendorong              ← PEMBEDA PRODUK
6. Dashboard: menu terurut untung terkecil
7. Detail menu: penyebab + saran harga
```

**Tidak ada AI sama sekali di Cincin 0.** Pemilihan alert cukup aturan
deterministik: tiga penurunan terbesar. Itu sudah produk utuh dan bisa
didemokan.

### Cincin 1 — memenangkan demo

Bangun hanya kalau Cincin 0 selesai **akhir Hari 3**.

```
8.  Simulator "kalau harga jadi segini"   ~2 jam   ← momen terkuat di demo
9.  Peta eksposur menu × bahan            ~½ hari
10. Onboarding template + batch           ~1 hari  ← tanpa ini produk tidak dipakai
11. OCR nota belanja (Gemini Flash)       ~1 hari  ← komponen AI paling visual
```

### Cincin 2 — backlog, potong duluan

```
Alert agent AI · saran substitusi · katalog + custom items
foto resep tulis tangan · input suara
```

Ini bukan kegagalan — ini backlog yang jujur. Empat orang dalam tujuh hari tidak
muat semuanya.

---

## Timeline

> **Sesuaikan tanggalnya.** Rencana ini 7 hari kerja. Kalau deadline lebih pendek,
> potong dari Hari 5–6, **jangan** dari Hari 1 (fondasi) atau Hari 7 (video).

### Hari 1 — Fondasi (semua orang, satu ruangan)

| Siapa | Kerjaan |
|---|---|
| Semua | Setup repo, Next.js, Supabase, jalankan `db/schema.sql` |
| O1 | **Mapping wilayah BI** — blocker semua orang. Kerjakan pertama. |
| O2 | Layout dasar + komponen `ui/` dengan data palsu |
| O3 | **Ambil API key Gemini** di aistudio.google.com (gratis, 2 menit) + rangka `lib/ai/client.ts` dengan cache |
| O4 | Scaffold onboarding + form registrasi warung |

**Gerbang:** `regions` terisi minimal Kota Semarang, `npm run dev` menyala.
Kalau tidak tercapai, perbaiki dulu — jangan lanjut.

### Hari 2 — Data mengalir

| O1 | Ingestion jalan + **seed 90 hari ke belakang** |
| O2 | Kerangka dashboard + komponen bar untung |
| O3 | Lapisan cache `ai_cache` selesai dan teruji |
| O4 | CRUD menu + editor resep **batch** ("2 kg → 8 porsi") |

**Gerbang:** `select count(*) from prices` mengembalikan ribuan baris.

### Hari 3 — Engine hidup · akhir Cincin 0

| O1 | Margin engine + unit test + **BR-04** + recompute job |
| O2 | Dashboard + detail menu tersambung API asli |
| O3 | OCR nota versi pertama |
| O4 | `scripts/seed.ts` — 5 menu demo masuk |

**Gerbang Hari 3 — paling penting:** satu menu menampilkan untung yang dihitung
dari harga BI asli, dan blok "gara-gara" menyebut bahan yang benar.

**Kalau meleset, potong Cincin 1 sepenuhnya.** Jangan geser hari.

### Hari 4 — Cincin 1

| O1 | Trend detector, kasus tepi, endpoint `/api/simulate` |
| O2 | **Simulator** + **peta eksposur** |
| O3 | OCR nota + cache + `docs/AI-PROCESS.md` berjalan |
| O4 | Onboarding template, deploy ke Vercel, cron menyala |
| **Semua** | **30 menit: tiap orang mengubah `lib/margin.ts` bergantian** |

### Hari 5 — Poles

| O2 | Aksesibilitas, responsif 375 px, empty state |
| O1+O3 | Perbaiki bug dari pemakaian sungguhan |
| O4 | Draf deck, mulai rekam bahan video |

### Hari 6 — Uji dan kunci

- Uji oleh orang di luar tim yang belum pernah melihat aplikasinya
- **Latihan demo dengan mode pesawat menyala** — memastikan cache benar-benar bekerja
- **Freeze fitur.** Setelah ini hanya perbaikan bug.
- O3 rampungkan `docs/AI-PROCESS.md`

### Hari 7 — Video dan latihan

- Rekam dan edit video (≤3 menit)
- Latihan Q&A minimal 2 putaran
- Backup: dump database + rekaman demo cadangan

---

## Skrip video demo

Target ≤3 menit. **Masalah → produk → bukti.**

| Detik | Isi |
|---|---|
| 0–20 | **Masalah.** Bu Sri, warung ayam geprek, harga menu Rp 18.000 sejak Januari. Grafik harga ayam naik. *"Dia tidak tahu untungnya sudah tinggal Rp 1.260."* |
| 20–35 | **Data.** Buka endpoint BI asli di browser. *"Data ini sudah ada, gratis, tiap hari kerja — tapi belum pernah sampai ke Bu Sri."* |
| 35–80 | **Inti video.** Dashboard, Ayam Geprek merah. Klik. Tunjukkan cabai naik 58% tapi dampaknya cuma 3,4 poin, sementara ayam naik 20% menghabiskan 10,1 poin. *"Berita ramai soal cabai. Yang membunuh Bu Sri adalah ayam."* Saran: jual Rp 20.000. |
| 80–110 | **Simulator.** Geser slider harga ayam — menu berubah merah satu per satu, yang lain diam. Sepuluh detik tanpa penjelasan. |
| 110–140 | **Bukti berjalan.** Tabel `ingest_runs` — sistem menarik data tiap hari, bukan dihitung saat demo. Grafik 30 hari. |
| 140–170 | **Penutup.** *"Bukan aplikasi kasir. Bukan aplikasi promosi. Takar menjaga agar warung tidak kehilangan untung tanpa sadar."* |

**Wajib ada:** sorot layar endpoint BI asli dan tabel `ingest_runs`. Tanpa
pengguna nyata, **bukti bahwa datanya nyata** adalah aset kredibilitas utama —
tunjukkan, jangan diklaim.

---

## Persiapan Q&A

**"Bagaimana kalau bahannya tidak ada di 21 komoditas BI?"**
> Masuk ke biaya manual, diisi pemilik sekali. Antarmuka selalu menampilkan berapa
> persen modal yang berasal dari data BI — 89% untuk menu berbasis protein dan
> nasi. Kami ukur, bukan kira.

**"Data BI kan level kabupaten, bukan pasar dekat warung?"**
> Betul, dan kami menyebutnya kabupaten di antarmuka. Yang kami deteksi adalah
> *perubahan*, dan arahnya sangat berkorelasi dengan pasar di dalamnya.

**"Di mana AI-nya?"**
> Di lapisan input dan penyaringan — membaca nota, mencocokkan nama bahan,
> memilih peringatan. Perhitungannya sengaja bukan AI: deterministik supaya bisa
> diaudit. AI tidak pernah menulis ke jalur uang tanpa dikonfirmasi manusia.

**"Ini cuma kalkulator, kan?"**
> Kalkulator butuh pemilik yang tahu kapan harus menghitung. Justru itu
> masalahnya — mereka baru menghitung setelah rugi. Takar yang menghitung tiap
> hari dan memanggil mereka. Detektor asap, bukan alat pemadam.

**"Sudah ada yang serupa?"**
> Di luar negeri ya — xtraCHEF sampai diakuisisi Toast. Tapi semuanya bergantung
> faktur pemasok, yang warung Indonesia tidak punya. Di sini yang ada hanya
> kalkulator HPP statis: hitung sekali, lalu beku.

**"Sudah ada penggunanya?"**
> Belum — ini prototipe. Harganya nyata dari Bank Indonesia dan diperbarui
> otomatis tiap hari kerja; resep dan takarannya kami susun dari porsi warung
> pada umumnya.

> ⚠️ **Jangan mengaku sudah mewawancarai pemilik warung.** Kalau juri menggali
> dan ternyata tidak ada, seluruh kredibilitas runtuh — termasuk bagian yang benar.

**"Siapa yang akan pakai ini?"**
> Warung makan bermenu tetap — ayam geprek, warteg, soto. Bukan kafe, bukan
> katering, bukan waralaba. Syaratnya harga jual lengket; kalau gampang diubah,
> masalahnya tidak ada.

**"Orang mau isi resep 15 menit?"**
> Tidak, dan karena itu kami potong. Satu menu, template terisi, dia tinggal
> mengoreksi tiga angka — di bawah dua menit sampai dia melihat untung per
> porsinya, angka yang sebagian besar pemilik warung belum pernah tahu.

---

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Endpoint BI berubah / down saat final | Fatal | **Seed 90 hari di Hari 2.** Aplikasi hidup dari database. Siapkan dump. |
| Format tanggal salah, tidak disadari | Boros hari | Terdokumentasi: `MM/DD/YYYY`. Uji dengan tanggal yang jelas beda hari/bulan. |
| Kuota/kunci Gemini habis saat demo | AI mati di panggung | **`ai_cache` sejak awal** + latihan mode pesawat Hari 6 |
| Hanya O1 paham engine | Gagal live coding 40% | Sesi 30 menit wajib Hari 4 |
| Scope creep dari backlog Cincin 2 | Semua setengah jadi | Gerbang Hari 3. Kalau Cincin 0 belum kelar, Cincin 1 dibatalkan. |
| Tanpa pengguna nyata, pitch terasa teoretis | Inovasi melemah | Bukti pindah ke data: endpoint BI + `ingest_runs` di video |

---

## Definition of Done

- [ ] Harga Kota Semarang terisi ≥90 hari ke belakang
- [ ] Cron ingestion berjalan otomatis, tercatat di `ingest_runs`
- [ ] Seed ≥5 menu dengan eksposur komoditas berbeda-beda
- [ ] Dashboard menampilkan untung harian yang berubah mengikuti harga
- [ ] **Uji BR-04 lolos**: pada contoh ayam vs cabai, terpilih daging ayam
- [ ] Detail menu menampilkan kontras "gara-gara X, bukan Y"
- [ ] Riwayat 30 hari tampil sebagai grafik
- [ ] Warung baru bisa didaftarkan sampai punya menu bermargin tanpa bantuan developer
- [ ] Waktu sampai angka untung pertama ≤2 menit
- [ ] Jalan di 375 px, status tidak bergantung warna saja
- [ ] **Aplikasi tetap berfungsi dengan mode pesawat menyala**
- [ ] `docs/AI-PROCESS.md` lengkap dan bertanggal
- [ ] Video ≤3 menit selesai H-1
- [ ] Keempat anggota pernah mengubah `lib/margin.ts`
