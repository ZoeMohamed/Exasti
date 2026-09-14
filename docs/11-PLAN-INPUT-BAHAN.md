# 11 — Rencana Perubahan: Isi Bahan Tanpa Dropdown

> **Status:** siap dikerjakan · **Basis kode:** `origin/main` @ `c53d956`
> (yang berjalan di Production Vercel) · **Disusun:** 13 Sep 2026
>
> Dokumen ini berdiri sendiri. Agent yang mengerjakannya tidak perlu membaca
> percakapan sebelumnya. Semua klaim soal kode dan database di bawah sudah
> diperiksa langsung pada tanggal di atas; nomor baris mengacu ke `c53d956`.

---

## 0. Cara memakai dokumen ini

1. Baca §1–§4 untuk memahami *kenapa* dan *apa yang sudah diputuskan*.
2. Kerjakan §7 **berurutan** — tiap fase punya kriteria selesai sendiri.
3. Sebelum menulis kode Next.js, baca `takar/AGENTS.md`: versi Next.js di repo
   ini (16.x) punya perubahan besar; panduannya ada di `node_modules/next/dist/docs/`.
4. §10 berisi jebakan yang **sudah pernah terjadi** di proyek ini. Jangan diulang.
5. Keputusan bertanda **DEFAULT** (§4.2) boleh dijalankan tanpa bertanya, tapi
   sebutkan di deskripsi PR.

---

## 1. Ringkasan

Pemilik warung tidak bisa memasukkan bahan seperti **saus sambal, kecap, tepung,
lele, tahu, mie, madu** ke resep. Form hanya menyediakan `<select>` berisi 31 baris
komoditas Bank Indonesia. Akibatnya bahan utama dijejalkan ke "biaya tetap" sebagai
angka beku, sehingga Takar buta terhadap kenaikan harganya — janji inti produk
("tahu bahan mana yang menggerus untung") gagal diam-diam.

Perubahan ini mengganti pemilih bahan dengan **kolom ketik + saran**, mengizinkan
**bahan milik warung** dengan harga belanja sendiri, dan membuat bahan tersebut ikut
dihitung penuh: modal, penyebab (BR-04), alert, dan riwayat.

Database sebagian besar sudah siap (`recipe_items.commodity_id` teks tanpa FK,
tabel `catalog_items` ada, `prices` menerima `source='manual'`). Yang kurang:
izin tulis katalog, kolom input asli, view harga untuk bahan non-BI, API, dan UI.

---

## 2. Masalah yang terverifikasi

### 2.1 Di layar — `takar/components/menu/MenuForm.tsx`

| Baris | Temuan |
|---|---|
| 83–92 | Daftar bahan diambil dari `/api/commodities` — hanya tabel `commodities` |
| 310–321 | Bahan dipilih lewat `<select>`; tidak ada cara mengetik nama bahan |
| 367–373 | Tombol **"Tambah Bahan Lain"** hanya menambah baris `<select>` yang sama |
| 126–140 | Baris baru otomatis diisi komoditas pertama di daftar |
| 54–69 | Baris awal dipatok "Daging Ayam Ras Segar" dan "Cabai Rawit Hijau" |
| 377–410, 148–152 | Satu-satunya jalur lain: 4 checkbox bernominal tetap (Kemasan 350, Gas 450, Bumbu & Garam 300, Plastik 250) — tidak bisa diberi nama atau angka |
| 325–327 | Label "Harga Pasar" dipasang di semua baris |
| 413–428 | Layar resep menampilkan untung — melanggar UX §5.8 |
| 160–161, 204, 208 | Umpan balik memakai `alert()` |

Isi dropdown juga membingungkan: 31 baris itu terdiri dari 21 varian BI **ditambah
10 baris rata-rata kategori** (`Beras`, `Cabai Rawit`, `Daging Ayam`, …). Pengguna
melihat 7 pilihan beras, tapi tidak ada saus sambal.

### 2.2 Di data — `takar/scripts/seed.ts`

Karena form tidak bisa, data demo menaruh bahan utama di `fixed_costs`:

| Menu | Baris seed | Bahan yang dibekukan | Porsi modal |
|---|---|---|---|
| Pecel Lele Goreng Crispy | 126–128 | "Ikan Lele Segar (Pasar)" Rp 7.200 | ±60% |
| Mie Dok-Dok Pedas | 143–146 | "Mie Instan & Sayur Sawi" Rp 3.800 | ±48% |
| Ayam Bakar Madu | 93–95 | madu di "Arang, Gas & Bumbu Madu" Rp 2.500 | — |

Jika harga lele naik, modal Pecel Lele tidak berubah dan lele tidak mungkin
disebut sebagai penyebab. Pengguna asli tidak punya jalan pintas ini sama sekali —
mereka akan melewatkan bahannya, sehingga modal terlalu kecil dan menu tampak sehat.

### 2.3 Di database dan keamanan (live, 13 Sep 2026)

| Fakta | Dampak |
|---|---|
| `catalog_items`: kolom hanya `id, name, unit, approved`; **0 baris** | Tidak ada pemilik (`business_id`) → bahan warung A akan terlihat warung B |
| RLS `catalog_items`: hanya policy `ref_baca_catalog` (SELECT); grant `authenticated` = **SELECT saja** | Dalam mode akun, aplikasi berjalan sebagai role `authenticated` (`lib/db/client.ts` `withAuthenticatedTransaction`) → **insert bahan warung pasti ditolak** |
| `prices_source_owner_check`: harga warung boleh `manual` atau `nota_ocr` | Jalur harga belanja manual **sudah diizinkan** |
| Policy `harga_tulis` hanya memeriksa kepemilikan warung, tidak memeriksa `commodity_id` | API wajib memvalidasi id bahan, kalau tidak bisa tercipta harga yatim |
| `recipe_items` hanya menyimpan `batch_qty` (satuan dasar) + `qty` | Tidak bisa menampilkan ulang "340 gram, cukup 25 porsi" (FR-10) |
| `fixed_costs` sudah punya `pack_price, pack_qty, usage_qty` | Kalkulator kemasan (Fase 7) tidak butuh migrasi |
| 8 baris harga milik warung, semuanya id BI; resep yang menunjuk id tak dikenal: 0 | Belum ada data yatim — bersihkan jalurnya sebelum terjadi |

### 2.4 Di mesin harga — `db/supabase/06_security_and_price_provenance.sql`

Definisi `resep_efektif` terbaru (baris 39–125):

- Bahan non-BI dengan harga warung: `bi_saat_beli` null → `faktor` null →
  `harga = harga_nota` **dan** `harga_lalu = harga_nota` (baris 107–111).
  Selisihnya selalu nol → **bahan non-BI tidak pernah bisa jadi penyebab (BR-04)**.
- `dari_data = (bi_kini is not null)` → false untuk bahan non-BI. Ini **benar** untuk
  cakupan (BR-10), tapi `menu-engine.ts:261–265` lalu melabelinya `PERKIRAAN`,
  padahal angkanya harga belanja pemilik. Label harus `HARGA KAMU`.

### 2.5 Di jalur nota — `takar/app/dashboard/belanja/page.tsx`

- `handleSavePrices` mengirim `commodity_id: it.match.matchedName` untuk barang
  non-BI → akan menulis harga dengan id berupa nama bebas yang tidak ada di katalog.
- `addNewItem` mengisi harga karangan `|| 20000`.
- `lib/ai/match.ts:166–206` menyimpan katalog non-BI (termasuk "saus sambal") **di kode**,
  bukan di database, dengan id seperti `"Saus Sambal Extra Pedas"`.

### 2.6 Di dokumen — saling bertentangan

| Dokumen | Isi |
|---|---|
| `06-SRS.md` C-3 | "Hanya 21 komoditas otomatis; **sisanya input manual**" |
| `07-UX.md` §5.6 | Alur bahan tanpa harga sudah dirancang lengkap |
| `05-PRD.md:126` | F-21 "Katalog barang non-BI + custom items" → **Cincin 2** |
| `02-ARCHITECTURE.md` ER | `catalog_items` berlabel "CINCIN 2" |

Pengembang mengambil tafsiran tersempit. Perubahan ini sekaligus menyelaraskan dokumen.

---

## 3. Tujuan dan batas cakupan

### 3.1 Tujuan

- **T1** Pengguna tidak pernah memilih bahan dari dropdown. Ia mengetik; sistem menyarankan.
- **T2** Bahan apa pun bisa masuk resep, termasuk yang tidak ada di data BI.
- **T3** Bahan warung ikut dihitung penuh: modal, cakupan, penyebab, alert, snapshot.
- **T4** Bahan kemasan/bumbu yang dipakai lintas masak bisa diisi dengan angka yang
  pemilik memang tahu: "sebotol cukup untuk berapa porsi".
- **T5** Angka asli pemilik ditampilkan kembali saat mengedit (FR-10).
- **T6** Tidak ada harga karangan di jalur mana pun.

### 3.2 Di luar cakupan

- AI untuk mencocokkan nama di form (Cincin 0 harus bebas AI).
- Katalog bersama lintas warung / crowdsourcing harga (tetap Cincin 2).
- Mengganti gaya visual aplikasi ke `design/GUIDELINE.md` (pekerjaan terpisah).
- Template onboarding F-14 (boleh menyusul memakai struktur baru).

---

## 4. Keputusan

### 4.1 Sudah disetujui pemilik produk

- **K1** Tidak ada dropdown untuk memilih bahan. Diganti kolom ketik dengan saran.
- **K2** Bahan non-BI naik dari Cincin 2 ke **Cincin 0** dalam bentuk minimal:
  bahan milik warung + harga manual. Pencocokan AI dan katalog bersama tetap Cincin 2.

### 4.2 DEFAULT — jalankan kecuali tim menyatakan lain

| # | Pertanyaan | Default | Alasan |
|---|---|---|---|
| D1 | Katalog per warung atau bersama? | **Per warung** (`catalog_items.business_id`) | Privasi; `02-ARCHITECTURE` sudah mensyaratkan ≥3 warung sebelum item jadi bersama |
| D2 | Pemakaian bumbu/kemasan: gram per porsi atau per kemasan? | **Dua cara**: "habis sekali masak" *atau* "sekemasan cukup untuk N porsi" | Pemilik tahu "sebotol buat ±25 porsi", tidak tahu "15 gram". Tetap mematuhi FR-09 (tidak pernah input per porsi) |
| D3 | Bahan pasar boleh diberi harga belanja sendiri di form? | **Ya, opsional** → baris `prices` `source='manual'` | Menjadi level BR-09; gerakan tetap mengikuti BI |
| D4 | Ganti 4 checkbox biaya kecil di PR yang sama? | **Tidak** — Fase 7, PR terpisah | Menjaga PR utama kecil |
| D5 | Angka lele/mie/madu untuk data demo | **Minta harga nota asli ke tim.** Bila belum ada: pertahankan rupiah per porsi persis, beri catatan `ASUMSI` di seed | Jangan mengarang harga pasar |

---

## 5. Rancangan pengalaman pengguna

### 5.1 Layar isi resep (S4), versi baru

```
┌───────────────────────────────────────────────────────────┐
│  Sekali masak Pecel Lele, kamu beli apa saja?             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Lele                                    bahan warungmu │
│  │ Sekali masak beli  [ 2   ] [ kg ▾ ]                   │
│  │ Harga belanjamu    Rp [ 32000 ] untuk [ 1 ] [ kg ]    │
│  │                    → Rp 32.000 per kg                 │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Saus sambal                             bahan warungmu │
│  │ ( ) habis sekali masak   (•) sekemasan cukup lama     │
│  │ Isi sebotol  [ 340 ] [ gram ▾ ]  cukup [ 25 ] porsi   │
│  │ Harga sebotol Rp [ 12500 ]                            │
│  │                    → Rp 500 per porsi                 │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Beras                               harga pasar otomatis │
│  │ Sekali masak beli  [ 1   ] [ kg ▾ ]                   │
│  │ Rp 15.750/kg · Semarang, 11 Sep   harga belanjaku beda │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [ ketik nama bahan…                              ]       │
│                                                           │
│  Jadi berapa porsi?  [ 8 ] porsi                          │
│  modal bahan sementara: Rp 10.469 per porsi               │
└───────────────────────────────────────────────────────────┘
```

Angka di atas ilustrasi tata letak, tapi hitungannya konsisten: lele
2 kg × Rp 32.000 ÷ 8 = Rp 8.000 · saus Rp 12.500 ÷ 25 = Rp 500 · beras
1 kg × Rp 15.750 ÷ 8 = Rp 1.969 → **Rp 10.469**. Harga lele adalah contoh, bukan data.

### 5.2 Kolom ketik dan saran

```
[ saus sa|                                  ]
  ┌──────────────────────────────────────────┐
  │ BAHAN WARUNGMU                           │
  │   Saus sambal            Rp …/kg         │
  │ ＋ Tambah "saus sa" sebagai bahan baru    │
  └──────────────────────────────────────────┘

[ cabe|                                      ]
  ┌──────────────────────────────────────────┐
  │ HARGA PASAR OTOMATIS                     │
  │   Cabai rawit             Rp …/kg        │
  │   Cabai rawit merah       Rp …/kg        │
  │   Cabai merah             …              │
  │ ＋ Tambah "cabe" sebagai bahan baru       │
  └──────────────────────────────────────────┘
```

Aturan:

1. Saran muncul sejak huruf pertama; tanpa ketikan, tampilkan bahan warung yang
   pernah dipakai lalu bahan pasar yang umum.
2. Nama yang tampil adalah **nama sehari-hari** (FR-55), bukan nama BI.
3. Baris **"＋ Tambah …"** selalu ada kecuali ada kecocokan persis — pengguna
   tidak boleh dipaksa memilih yang kurang tepat.
4. Baris rata-rata kategori BI (`Beras`, `Cabai Rawit`, `Daging Ayam`, …) **tidak
   pernah muncul** di saran.
5. Varian BI dipilih lewat tombol kecil setelah bahan dipilih, bukan daftar:
   `Beras · biasa | premium | murah` (lihat §6.4 peta nama).
6. Bahan yang sudah ada di resep ditandai "sudah ada" dan tidak bisa dipilih lagi (FR-12).
7. Aksesibilitas: pola ARIA combobox (`role="combobox"`, `listbox`, `option`),
   panah atas/bawah, Enter, Esc; target sentuh ≥44 px; tidak mengandalkan warna.

### 5.3 Dua cara pakai

| Cara | Pertanyaan di layar | Yang disimpan | Cocok untuk |
|---|---|---|---|
| `per_masak` | "Sekali masak kamu **beli** berapa?" | jumlah + satuan input, dikonversi ke satuan dasar | ayam, beras, cabai, lele, tahu |
| `per_kemasan` | "Isi sebotol/sebungkus berapa?" + "cukup untuk berapa porsi?" | isi + satuan + porsi | saus, kecap, tepung, penyedap |

Default cara pakai: `per_kemasan` untuk bahan baru yang satuan isinya gram/ml dan
namanya cocok dengan saran umum bumbu (§6.4); selain itu `per_masak`. Pengguna
selalu bisa mengganti.

Tidak ada label "per porsi" pada **input** mana pun (FR-09). Angka per porsi hanya
muncul sebagai hasil hitungan.

### 5.4 Harga

| Jenis bahan | Tampilan | Wajib? |
|---|---|---|
| Pasar, ada harga BI | Teks: "Rp 15.750/kg · Semarang, 11 Sep" + tautan "harga belanjaku beda" | Tidak |
| Pasar, pernah diberi harga warung | "Rp 16.000/kg · harga belanjamu, 13 Sep, ikut gerak pasar" | Tidak |
| Warung, sudah punya harga | "Rp 36.765/kg · harga belanjamu, 13 Sep" + "perbarui" | Tidak |
| Warung baru / belum berharga | Isian **harga kemasan + isi + satuan** → hasil per satuan dasar | **Ya** |

Harga selalu diminta **per kemasan yang dibeli** — sistem yang membagi (BR-11).
Untuk `per_kemasan`, isi kemasan pada blok harga otomatis sama dengan isi pemakaian.

### 5.5 Teks

- Dilarang: "margin", "HPP", "komoditas", "dropdown", "pilih komoditas" (FR-29).
- Galat tampil di baris bahan yang bermasalah, bukan `alert()`.
- Layar ini **tidak** menampilkan untung — hanya "modal bahan sementara" (UX §5.8).

---

## 6. Rancangan teknis

### 6.1 Peta berkas

| Berkas | Perubahan |
|---|---|
| `db/supabase/07_bahan_warung.sql` | **Baru** — migrasi (§6.2) |
| `db/supabase/07_verify.sql` | **Baru** — uji RLS & view dalam transaksi rollback |
| `takar/lib/units.ts` | **Baru** — konversi satuan (spesifikasi ada di `02-ARCHITECTURE.md`) |
| `takar/lib/bahan/katalog-pasar.ts` | **Baru** — peta id BI ↔ nama tampil ↔ alias ↔ varian (satu sumber untuk form dan OCR) |
| `takar/lib/bahan/cari.ts` | **Baru** — fungsi murni pencarian & peringkat saran |
| `takar/lib/bahan/takaran.ts` | **Baru** — fungsi murni: input → `batch_qty`, `qty`, harga per satuan dasar |
| `takar/lib/bahan/validasi.ts` | **Baru** — validasi payload tanpa dependensi baru |
| `takar/lib/services/bahan.ts` | **Baru** — muat daftar bahan, pastikan bahan warung, catat harga manual |
| `takar/app/api/bahan/route.ts` | **Baru** — `GET` daftar bahan untuk form & nota |
| `takar/app/api/menus/route.ts`, `[id]/route.ts` | Payload baru, galat per baris |
| `takar/lib/services/menu-engine.ts` | `createDbMenu`, `updateDbMenuComplete`, `periksaResepSebelumSimpan`, `getDbMenuDetail` |
| `takar/components/menu/BahanCombobox.tsx` | **Baru** |
| `takar/components/menu/KartuBahan.tsx` | **Baru** |
| `takar/components/menu/MenuForm.tsx` | Tulis ulang bagian bahan |
| `takar/app/dashboard/belanja/page.tsx`, `takar/app/api/prices/route.ts` | Jalur nota non-BI (Fase 5) |
| `takar/lib/ai/match.ts` | Impor alias dari `katalog-pasar.ts`; katalog non-BI jadi saran, bukan id |
| `takar/scripts/seed.ts`, `takar/scripts/pindah-biaya-ke-bahan.ts` | Data demo (Fase 6) |
| `takar/tests/uji-bahan.ts` | **Baru**; tambahkan ke `npm test` |
| `takar/app/api/commodities/route.ts` | Hapus setelah Fase 5 bila tidak ada pemakai |

### 6.2 Migrasi `07_bahan_warung.sql`

**Wajib aditif dan kompatibel mundur.** Hanya ada satu database Supabase dan itu
Production. Migrasi dijalankan **sebelum** deploy aplikasi baru, dan aplikasi lama
harus tetap berjalan setelahnya.

Sketsa — uji dulu dalam `begin … rollback`, lalu jadikan idempoten:

```sql
-- ── catalog_items: pemilik, nama ternormalisasi ──────────────────
alter table public.catalog_items
  add column if not exists business_id uuid
    references public.businesses(id) on delete cascade,     -- null = katalog umum
  add column if not exists nama_normal text,
  add column if not exists created_at timestamptz not null default now();

update public.catalog_items
set nama_normal = lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
where nama_normal is null;

alter table public.catalog_items alter column nama_normal set not null;

create unique index if not exists catalog_items_warung_nama_uk
  on public.catalog_items (business_id, nama_normal) where business_id is not null;
create unique index if not exists catalog_items_umum_nama_uk
  on public.catalog_items (nama_normal) where business_id is null;
create index if not exists catalog_items_business_idx
  on public.catalog_items (business_id) where business_id is not null;

-- satuan dasar dibatasi (BR-11). Bungkus dalam DO-block agar idempoten.
--   check (unit in ('kg','liter','pcs'))

-- ── RLS catalog_items ────────────────────────────────────────────
drop policy if exists ref_baca_catalog on public.catalog_items;
create policy katalog_baca_publik on public.catalog_items
  for select to anon using (business_id is null);
create policy katalog_baca_pengguna on public.catalog_items
  for select to authenticated using (
    business_id is null or exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id and b.owner_id = (select auth.uid())));
create policy katalog_tulis on public.catalog_items
  for insert to authenticated with check (
    business_id is not null and exists (
      select 1 from public.businesses b
      where b.id = catalog_items.business_id and b.owner_id = (select auth.uid())));
create policy katalog_ubah on public.catalog_items
  for update to authenticated
  using      (business_id is not null and exists (select 1 from public.businesses b
              where b.id = catalog_items.business_id and b.owner_id = (select auth.uid())))
  with check (business_id is not null and exists (select 1 from public.businesses b
              where b.id = catalog_items.business_id and b.owner_id = (select auth.uid())));
create policy katalog_hapus on public.catalog_items
  for delete to authenticated using (
    business_id is not null and exists (select 1 from public.businesses b
      where b.id = catalog_items.business_id and b.owner_id = (select auth.uid())));

revoke all on public.catalog_items from anon, authenticated;
grant select on public.catalog_items to anon, authenticated;
grant insert, update, delete on public.catalog_items to authenticated;

-- ── recipe_items: angka asli pemilik (FR-10) ─────────────────────
alter table public.recipe_items
  add column if not exists cara_pakai        text not null default 'per_masak',
  add column if not exists jumlah_input      numeric(12,4),
  add column if not exists satuan_input      text,
  add column if not exists isi_kemasan       numeric(12,4),
  add column if not exists satuan_kemasan    text,
  add column if not exists porsi_per_kemasan numeric(10,2);

-- constraint (DO-block, NOT VALID lalu VALIDATE):
--   check (cara_pakai = 'per_masak'
--       or (cara_pakai = 'per_kemasan' and isi_kemasan > 0 and porsi_per_kemasan > 0))
```

Id bahan warung dibuat server: `'w_' || gen_random_uuid()`. **Jangan** memakai nama
sebagai id — nama bisa diganti dan bisa bentrok dengan id BI.

Siapkan juga `07_rollback.sql` yang mengembalikan policy `ref_baca_catalog` dan grant
SELECT saja. Kolom baru boleh dibiarkan.

### 6.3 View `resep_efektif`

Ubah **di tempat** (`create or replace view`), pertahankan `security_invoker = true`
dan pola revoke/grant:

1. Tambah lateral `nota_lalu`: harga warung sendiri untuk bahan yang sama pada
   tanggal `<= nota.date - 7`, ambil yang terbaru.
2. `harga_lalu`: untuk bahan **non-BI** (`not komoditas_bi`) pakai `nota_lalu.price`.
   Logika bahan BI **tidak berubah**.
3. `alasan`: bahan non-BI dengan harga → `'harga belanjamu'`.
4. `dari_data` tetap `bi_kini is not null` (cakupan BR-10 tetap jujur).
5. Kolom baru, bila perlu, **ditambahkan di akhir** daftar kolom.

Hasilnya: tren bahan warung dihitung dari riwayat belanja pemilik sendiri,
sehingga "saus sambal naik Rp 40 per porsi" bisa muncul sebagai penyebab.

`lib/services/harian.ts:58–62` dan `menu-engine.ts` sudah membaca view ini, jadi
snapshot dan alert otomatis ikut.

### 6.4 Pustaka murni

Tidak boleh mengimpor klien database atau `fetch` (sejalan dengan FR-19).

**`lib/units.ts`**

```ts
export type Satuan = "kg" | "gram" | "ons" | "liter" | "ml" | "pcs" | "butir" | "ekor";
export type SatuanDasar = "kg" | "liter" | "pcs";

// ke satuan dasar; bertanda "berisiko" wajib menampilkan asumsinya (FR-56)
// kg 1 · gram 0,001 · ons 0,1 · liter 1 · ml 0,001 · pcs 1
// butir telur → 0,06 kg (berisiko) · ekor ayam → 1,2 kg (berisiko)
export function keSatuanDasar(jumlah: number, satuan: Satuan, dasar: SatuanDasar):
  { nilai: number; berisiko: boolean; asumsi?: string } | { galat: string };
```

**`lib/bahan/takaran.ts`**

```ts
// per_masak:   batch_qty = keDasar(jumlah)            qty = batch_qty / batch_yield
// per_kemasan: qty = keDasar(isi) / porsi             batch_qty = qty * batch_yield
// harga:       hargaPerDasar = hargaKemasan / keDasar(isi)             (BR-11)
```

Contoh wajib lolos uji:

| Kasus | Masukan | Harapan |
|---|---|---|
| Ayam per masak | 2 kg, 8 porsi | `batch_qty` 2 · `qty` 0,25 |
| Bawang dalam gram | 80 gram, 8 porsi | `batch_qty` 0,08 · `qty` 0,01 |
| Saus per kemasan | isi 340 gram, cukup 25 porsi, 8 porsi/masak | `qty` 0,0136 kg · `batch_qty` 0,1088 |
| Harga saus | Rp 12.500 untuk 340 gram | Rp 36.764,71/kg → **Rp 500 per porsi** |
| BR-11 | 1 kg Rp 42.000 vs 500 g Rp 22.500 | Rp 42/g vs **Rp 45/g** (yang kedua lebih mahal) |

**`lib/bahan/katalog-pasar.ts`** — pindahkan `BI_COMMODITIES` dari `lib/ai/match.ts`
ke sini dan lengkapi. `match.ts` mengimpor dari berkas ini.

| Id BI | Nama tampil | Kelompok varian |
|---|---|---|
| Daging Ayam Ras Segar | Ayam | — |
| Daging Sapi Kualitas 1 | Daging sapi | sapi: biasa |
| Daging Sapi Kualitas 2 | Daging sapi tetelan | sapi: tetelan |
| Beras Kualitas Medium I | Beras | beras: **biasa** (bawaan) |
| Beras Kualitas Super I | Beras premium | beras: premium |
| Beras Kualitas Bawah I | Beras murah | beras: murah |
| Beras Kualitas Medium II / Super II / Bawah II | (disembunyikan dari saran; tetap valid bila sudah dipakai) | — |
| Telur Ayam Ras Segar | Telur | — |
| Cabai Rawit Hijau | Cabai rawit | cabai rawit: **hijau** (bawaan) |
| Cabai Rawit Merah | Cabai rawit merah | cabai rawit: merah |
| Cabai Merah Keriting | Cabai merah | — |
| Cabai Merah Besar | Cabai merah besar | — |
| Bawang Merah Ukuran Sedang | Bawang merah | — |
| Bawang Putih Ukuran Sedang | Bawang putih | — |
| Minyak Goreng Curah | Minyak goreng | minyak: **curah** (bawaan) |
| Minyak Goreng Kemasan Bermerk 1 | Minyak goreng kemasan | minyak: kemasan |
| Minyak Goreng Kemasan Bermerk 2 | Minyakita | minyak: minyakita |
| Gula Pasir Lokal | Gula pasir | gula: **biasa** (bawaan) |
| Gula Pasir Kualitas Premium | Gula pasir premium | gula: premium |

Nama tampil yang tidak tercantum di `07-UX.md` §5.2 adalah usulan — sertakan di PR.
Sepuluh id kategori (`Beras`, `Bawang Merah`, `Bawang Putih`, `Cabai Merah`,
`Cabai Rawit`, `Daging Ayam`, `Daging Sapi`, `Gula Pasir`, `Minyak Goreng`,
`Telur Ayam`) disembunyikan dari saran, tapi nama tampilnya tetap dipetakan
karena data lama memakainya (contoh: resep Tahu Gimbal, 3 harga nota).

`WARUNG_NON_BI_CATALOG` di `match.ts` diubah menjadi **saran umum** (nama + satuan
dasar + cara pakai bawaan), bukan id. Saat dipilih, sistem membuat bahan warung.

**`lib/bahan/cari.ts`**

```ts
export function cariBahan(
  daftar: BahanTersedia[],     // pasar + warung milik sendiri
  saranUmum: SaranUmum[],
  kueri: string,
  sudahDipakai: Set<string>,
): HasilCari[];
```

- Normalisasi: huruf kecil, rapikan spasi, buang tanda baca.
- Ejaan setara: `cabe→cabai`, `telor→telur`, `saos→saus`, `bwg→bawang`,
  `brambang→bawang merah` (lewat alias, bukan menulis ulang kueri).
- Peringkat: persis > awalan > kata di tengah; seri → bahan warung dulu, lalu pasar,
  lalu saran umum. Maksimal 8 hasil + baris "Tambah".
- Tanpa pustaka fuzzy baru.

### 6.5 Service dan API

**`GET /api/bahan`** (lewat `queryAppDb`, jadi RLS berlaku)

```json
{
  "status": "ok",
  "bahan": [
    { "id": "Daging Ayam Ras Segar", "jenis": "pasar", "namaTampil": "Ayam",
      "alias": ["ayam", "ayam potong"], "satuanDasar": "kg",
      "harga": 40500, "sumberHarga": "harga pasar", "tanggalHarga": "2026-09-11" },
    { "id": "w_…", "jenis": "warung", "namaTampil": "Saus sambal",
      "alias": [], "satuanDasar": "kg",
      "harga": 36764.71, "sumberHarga": "harga belanjamu", "tanggalHarga": "2026-09-13" }
  ],
  "saranUmum": [
    { "nama": "Saus sambal", "satuanDasar": "kg", "caraPakai": "per_kemasan" }
  ]
}
```

`harga` boleh `null` — tampilkan apa adanya, jangan diisi angka.

**Payload `POST /api/menus` dan `PUT /api/menus/[id]`**

```ts
type RefBahan =
  | { jenis: "pasar";  id: string }
  | { jenis: "warung"; id: string }
  | { jenis: "baru";   nama: string };

type Pemakaian =
  | { cara: "per_masak";   jumlah: number; satuan: Satuan }
  | { cara: "per_kemasan"; isi: number; satuan: Satuan; porsi: number };

interface HargaBelanja { hargaKemasan: number; isi: number; satuan: Satuan }

interface BahanResepInput {
  bahan: RefBahan;
  pemakaian: Pemakaian;
  harga?: HargaBelanja;   // wajib untuk "baru" dan "warung" tanpa harga
  catatan?: string;
}
```

Selama transisi, bentuk lama `{ commodityId, batchQty }` tetap diterima dan
diperlakukan sebagai `{ bahan: {jenis:"pasar"}, pemakaian: {cara:"per_masak", satuan: satuan dasar} }`.

**Urutan di server — satu `withAppTransaction`:**

1. Validasi bentuk (`lib/bahan/validasi.ts`) → 400.
2. Ambil `region_id` warung.
3. Selesaikan tiap `RefBahan`:
   - `pasar` → id wajib ada di `commodities`, kalau tidak 422.
   - `warung` → id wajib ada di `catalog_items` milik warung ini, kalau tidak 422.
   - `baru` → `insert … on conflict (business_id, nama_normal) where business_id is not null
     do update set name = excluded.name returning id` (memakai ulang bila sudah ada).
     Bila bahan sudah ada dengan keluarga satuan berbeda → 422
     ("Saus sambal sudah tercatat dalam liter").
4. Hitung takaran dan harga per satuan dasar (`takaran.ts`).
5. FR-12: id yang sama muncul dua kali → 422 berindeks baris.
6. FR-57: jalankan `periksaSatuan` memakai **harga dari payload bila ada**, lalu harga
   DB. `periksaResepSebelumSimpan` (`menu-engine.ts:628–681`) saat ini hanya membaca
   DB, sehingga bahan baru lolos tanpa diperiksa — perbaiki.
7. Tulis `menu_items`, `recipe_items` (termasuk kolom input asli), `prices`
   (`source='manual'`, `date = hariIniJakarta()`, upsert per hari), `fixed_costs`.
8. Galat bertipe dilempar di dalam transaksi supaya **rollback**, lalu route
   mengubahnya jadi 422: `{ error, keberatan: [{ indeks, nama, pesan }] }`.
9. Tangkap pelanggaran unik `23505` pada `recipe_items` → 422, bukan 500.

**`getDbMenuDetail`** (`menu-engine.ts:187–357`)

- `recipeRows` mengembalikan `bahan: RefBahan`, `pemakaian: Pemakaian` (disusun dari
  kolom input asli; baris lama → `per_masak` dengan satuan dasar), `harga`,
  `sumberHarga`, `tanggalHarga`.
- Label sumber (baris 261–265): bahan non-BI yang punya harga → `HARGA KAMU`
  dengan catatan "harga belanjamu, dicatat 13 Sep".
- Teks jumlah (baris 255–258) memakai angka asli: "340 gram · cukup 25 porsi",
  "2 kg untuk 8 porsi".

### 6.6 Antarmuka

**`BahanCombobox`** — input + listbox (§5.2). Filter di klien memakai `cariBahan`
atas hasil `GET /api/bahan` yang dimuat sekali. Tidak ada panggilan jaringan per
ketikan.

**`KartuBahan`** — satu kartu per bahan (§5.1): nama + lencana jenis, pilihan cara
pakai, isian jumlah/satuan, blok harga (§5.4), hasil "Rp … per porsi", tombol hapus,
galat 422 untuk baris itu.

**`MenuForm`**

- Hapus `<select>`, baris bawaan Ayam/Cabai (54–69), dan `addIngredient` yang
  memakai komoditas pertama.
- Mulai dengan satu `BahanCombobox` kosong; memilih saran menambah `KartuBahan`.
- Ringkasan hanya "modal bahan sementara" (hapus baris untung 418–427).
- Ganti semua `alert()` dengan pesan di dalam halaman.
- Checkbox biaya kecil **dibiarkan** di PR ini (D4); jangan diubah logikanya.
- Ikuti kelas gaya yang sudah dipakai (`brutal-border-2`, dll.). **Jangan
  menambah emoji** baru.

**Halaman edit** (`app/dashboard/menu/[id]/edit/page.tsx`) — meneruskan `recipeRows`
bentuk baru; form menampilkan kembali angka asli.

### 6.7 Jalur nota (Fase 5)

- Pengganti pilihan bahan di `belanja/page.tsx` memakai `BahanCombobox` yang sama.
- Barang non-BI: sarankan bahan warung yang cocok (nama ternormalisasi atau alias);
  bila tidak ada, tawarkan "Tambah sebagai bahan baru". **Pemilik mengonfirmasi** (BR-12).
- `POST /api/prices`: terima `RefBahan` + `HargaBelanja`; tolak id yang tidak ada di
  `commodities` maupun katalog milik warung (422). `source`: `nota_ocr` untuk hasil
  pembacaan, `manual` untuk baris yang ditambah tangan.
- Hapus `|| 20000` di `addNewItem`.

### 6.8 Data demo (Fase 6)

- `seed.ts`: ubah lele, mie instan + sawi, dan madu menjadi bahan warung dengan
  harga manual. Nilai mengikuti D5.
- `scripts/pindah-biaya-ke-bahan.ts` untuk database live warung demo
  `00000000-0000-0000-0000-000000000001`:
  - **Dry-run bawaan**: cetak modal per menu sebelum/sesudah.
  - Butuh flag `--terapkan` untuk menulis.
  - Tolak menerapkan bila modal per porsi berubah lebih dari Rp 1, kecuali harga
    asli dari tim sudah diisi.
- Dua menu kembar di data demo (Ayam Geprek Sambal Korek ×2, Tahu Gimbal ×2)
  **jangan dihapus** tanpa persetujuan tim; laporkan saja.

---

## 7. Fase kerja

Buat branch `feat/bahan-tanpa-dropdown` dari `origin/main`. Satu PR per fase
disarankan; fase 1–4 boleh digabung bila tim ingin satu rilis.

| Fase | Isi | Selesai bila |
|---|---|---|
| **0** | Baca `takar/AGENTS.md` dan panduan Next.js di `node_modules/next/dist/docs/`; jalankan `npm test` & `npm run build` pada `main` sebagai garis dasar | Keduanya lolos sebelum ada perubahan |
| **1** | `07_bahan_warung.sql`, `07_verify.sql`, `07_rollback.sql`, perubahan view §6.3 | Verify lolos dalam transaksi rollback; aplikasi `main` yang lama tetap berjalan normal setelah migrasi diterapkan |
| **2** | `units.ts`, `katalog-pasar.ts`, `cari.ts`, `takaran.ts`, `validasi.ts` + `tests/uji-bahan.ts` | Semua contoh §6.4 lolos; `npm test` memuat uji baru |
| **3** | `services/bahan.ts`, `GET /api/bahan`, payload baru `POST/PUT /api/menus`, perbaikan FR-57, `getDbMenuDetail` | Payload lama & baru sama-sama tersimpan; 422 berindeks baris |
| **4** | `BahanCombobox`, `KartuBahan`, `MenuForm`, halaman edit, label sumber di detail | Kriteria §8.1 AC-1…AC-9 lolos |
| **5** | Jalur nota non-BI | AC-12, AC-13 |
| **6** | Seed & skrip pindah data | Dry-run menunjukkan selisih modal ≤ Rp 1 (atau harga asli tim) |
| **7** *(PR terpisah)* | Ganti 4 checkbox: baris perkiraan teks (UX §5.4) + kemasan menurut `packaging_mode` (UX §5.5) + kalkulator pack memakai kolom `fixed_costs.pack_*` | FR-13, FR-43, FR-44, FR-45 |
| **8** | Pembaruan dokumen §9 | Tidak ada lagi pertentangan §2.6 |

**Urutan rilis:** terapkan migrasi Fase 1 ke Supabase → deploy aplikasi Fase 2–4 →
Fase 5 → jalankan skrip Fase 6 dengan `--terapkan` setelah disetujui.

---

## 8. Uji dan kriteria selesai

### 8.1 Kriteria penerimaan

| # | Uji | Harapan |
|---|---|---|
| AC-1 | `grep -rn "<select" components/menu app/dashboard/belanja` | Tidak ada `<select>` untuk memilih bahan |
| AC-2 | Ketik "saus sambal" → Tambah → isi 340 gram, cukup 25 porsi, harga Rp 12.500 → simpan | Tersimpan; baris modal **Rp 500 per porsi** |
| AC-3 | Ketik "cabe" | Saran teratas "Cabai rawit"; varian cabai lain ikut tampil |
| AC-4 | Ketik "telor", "brambang" | "Telur", "Bawang merah" |
| AC-5 | Buka ulang menu di halaman edit | Tampil "340 gram · cukup 25 porsi" dan "2 kg", bukan 0,0136 / 0,25 |
| AC-6 | Bahan yang sama dimasukkan dua kali | 422 dengan pesan di baris itu, bukan 500 |
| AC-7 | Saus sambal isi "340" dengan satuan kg | FR-57 menolak dan menyebut saus sambal |
| AC-8 | Halaman detail | Saus sambal berlabel **HARGA KAMU · dicatat {tanggal}**, bukan PERKIRAAN; peringatan cakupan tampil bila <70% |
| AC-9 | Layar resep | Tidak menampilkan untung; tidak ada `alert()` |
| AC-10 | Warung B mencoba membaca / menulis bahan warung A (SQL, rollback) | Ditolak RLS |
| AC-11 | Harga saus warung ≥7 hari lalu lebih murah, lalu harga baru lebih mahal (uji SQL + unit) | Saus sambal bisa menjadi penyebab (BR-04) |
| AC-12 | `POST /api/prices` dengan id tak dikenal | 422; tidak ada baris harga yatim |
| AC-13 | Barang non-BI dari nota dikonfirmasi | Terhubung ke bahan warung; tidak ada id berupa nama bebas |
| AC-14 | Pekerjaan harian | Snapshot modal = modal di halaman detail untuk menu berbahan warung |
| AC-15 | Cari harga karangan (perintah di bawah tabel) | Kosong |
| AC-16 | Aplikasi `main` lama setelah migrasi (sebelum deploy baru) | Tambah/edit menu tetap berfungsi |
| AC-17 | `npm run build`, `npm test`, `npm run lint` | Lolos |
| AC-18 | Konsol browser di `/dashboard/menu/tambah`, halaman edit, `/dashboard/belanja` | Tanpa error/warning |

Perintah AC-15, dijalankan dari root repo:

```bash
grep -rnE '\|\| ?(20000|25000|15750)|coalesce\([^)]*, ?25000\)' takar/app takar/components takar/lib
```

### 8.2 Uji yang wajib tetap lolos

- `tests/uji-margin.ts` — termasuk uji BR-04 ayam vs cabai.
- `tests/uji-tanggal.ts` — perilaku di `TZ=UTC` (seperti Vercel) dan lokal.

### 8.3 Cara memeriksa konsol tanpa Playwright

Chrome headless lewat CDP sudah terbukti bekerja di proyek ini. Sebelum mempercayai
"0 error", **picu satu `console.error` sengaja** dan pastikan tertangkap.

---

## 9. Pembaruan dokumen

| Dokumen | Perubahan |
|---|---|
| `05-PRD.md` | F-21 dipecah: **F-21a** bahan warung + harga manual (Cincin 0); **F-21b** pencocokan AI & katalog bersama (Cincin 2) |
| `06-SRS.md` | Perjelas C-3. Tambah FR baru: kolom ketik tanpa dropdown; membuat bahan warung; cara pakai `per_kemasan`; tren bahan warung dari riwayat sendiri; isolasi katalog per warung. Perbarui uji FR-09 dan FR-10 untuk `per_kemasan`. BR-12 dicatat berlaku per warung |
| `07-UX.md` | §5.1 dan §5.6 memakai mockup §5.1–5.4 dokumen ini; §5.2 memakai tabel nama tampil §6.4; §10 baris "nota campuran" diperbarui |
| `02-ARCHITECTURE.md` | ER: `catalog_items.business_id`, kolom input `recipe_items`; hapus label "CINCIN 2"; tambah `lib/bahan/*` |
| `09-CARA-PAKAI.md` | Cara menambah bahan yang tidak ada di daftar |
| `03-TEAM.md` | Pemilik berkas baru |

---

## 10. Pagar pengaman dan jebakan yang sudah diketahui

1. **Database live = Production.** Migrasi harus aditif. Uji perubahan data dalam
   `begin … rollback`. Jangan menghapus data demo tanpa persetujuan.
2. **Uji lintas koneksi tidak melihat transaksi yang belum di-commit.** Menghapus
   data dalam transaksi lalu memanggil aplikasi lewat HTTP **tidak** menguji apa pun —
   aplikasi memakai koneksi lain. Uji logika semacam ini sebagai unit test.
3. **Semua kueri dari request web lewat `queryAppDb` / `withAppTransaction`**
   (`lib/auth/context.ts:69–84`) supaya RLS berlaku. `queryDb` hanya untuk cron dan
   pekerjaan sistem.
4. **`create or replace view` tidak boleh mengubah nama, urutan, atau tipe kolom yang
   sudah ada.** Tambah kolom hanya di akhir. Pertahankan `security_invoker = true`.
5. **Tidak ada harga karangan.** `null` berarti tidak diketahui; tampilkan apa adanya.
6. **Tanggal "hari ini" selalu `hariIniJakarta()`** (`lib/tanggal.ts`). Server Vercel
   berjalan di UTC; database disetel `Asia/Jakarta`.
7. **Tidak ada input berlabel "per porsi"** (FR-09) dan tidak ada kata "margin",
   "HPP", "komoditas" di layar (FR-29).
8. **Tidak ada panggilan AI di jalur form** — Cincin 0 harus tetap berfungsi tanpa AI.
9. **Jangan menambah dependensi** bila tidak perlu (repo belum memakai zod; validasi manual cukup).
10. Pemuat data baru di server dibungkus `cache()` dari React seperti pemuat yang ada,
    supaya layout dan halaman tidak mengulang kueri yang sama.
11. Di skrip shell zsh, tulis `"${ref}:path"`, bukan `$ref:path` — `:t` dibaca
    sebagai modifier dan merusak path.
12. `.env.local` tidak boleh di-commit. Nama variabel yang dipakai lihat
    `lib/supabase/config.ts` dan `lib/db/client.ts`.

---

## 11. Risiko

| Risiko | Kemungkinan | Penanganan |
|---|---|---|
| Nama bahan kembar dengan ejaan berbeda ("saos abc" vs "saus sambal") | Tinggi | Normalisasi + saran bahan yang mirip sebelum membuat baru |
| Salah satuan saat mengisi isi kemasan | Tinggi | FR-57 memakai harga payload; asumsi satuan berisiko ditampilkan |
| Harga bahan warung basi | Sedang | Tampilkan "dicatat N hari lalu"; dorong scan nota (Fase 5) |
| Migrasi mengganggu Production | Rendah bila aditif | Verify + rollback script; migrasi sebelum deploy |
| Varian BI yang disembunyikan ternyata dibutuhkan | Rendah | Tetap valid bila sudah dipakai; bisa dimunculkan lewat tombol varian |

---

## 12. Lampiran — fakta rujukan

### 12.1 Production

- Vercel Production: `c53d956` (`origin/main`), 13 Sep 2026 07:32 UTC.
- `main` sudah memuat seluruh commit `takarV2` (merge `9409c80`).

### 12.2 Database live, 13 Sep 2026

- `commodities` 31 baris (21 varian BI + 10 rata-rata kategori).
- `catalog_items` 0 baris; grant `authenticated`: SELECT.
- `prices`: 1.876 baris BI; 8 baris milik warung (`nota_ocr`), semuanya id BI.
- `recipe_items` yang menunjuk id tak dikenal: 0.
- `fixed_costs` kolom: `id, menu_item_id, label, amount, pack_price, pack_qty, usage_qty, is_estimated, updated_at`.
- Zona waktu database: `Asia/Jakarta`.

### 12.3 Rujukan kode (`c53d956`)

| Area | Lokasi |
|---|---|
| Form resep | `takar/components/menu/MenuForm.tsx` |
| Daftar bahan sekarang | `takar/app/api/commodities/route.ts:18–43` |
| Simpan menu | `takar/app/api/menus/route.ts:21–71`, `takar/app/api/menus/[id]/route.ts:47–100` |
| Mesin menu | `takar/lib/services/menu-engine.ts` — detail 187–357, buat 362–413, ubah 451–515, FR-57 628–681 |
| Mesin murni | `takar/lib/margin.ts` — `BahanResep` 41–48, `hitungHpp` 61–88, kontribusi & pendorong 117–139, `periksaSatuan` ±320 |
| Identitas & RLS request | `takar/lib/auth/context.ts:43–84`, `takar/lib/db/client.ts` `withAuthenticatedTransaction` |
| Alias & satuan OCR | `takar/lib/ai/match.ts` — BI 15–163, non-BI 166–206, satuan 220–253 |
| Simpan harga nota | `takar/app/api/prices/route.ts:46–115`, `takar/app/dashboard/belanja/page.tsx` (`handleSavePrices`, `addNewItem`, `updateItemCommodity`) |
| View harga efektif | `db/supabase/06_security_and_price_provenance.sql:39–125` |
| Snapshot & alert | `takar/lib/services/harian.ts:58–62` |
| Data demo | `takar/scripts/seed.ts` |

Sebelum mengubah `hitungKontribusi`, periksa bagaimana `lib/margin.ts:117–139`
memperlakukan `hargaLalu = null` dan tambahkan uji untuk bahan warung.
