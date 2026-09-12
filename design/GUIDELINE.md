# Panduan Desain — Takar

> Disusun mengikuti struktur [claude-design-system-prompt](https://github.com/Trystan-SA/claude-design-system-prompt)
> (MIT), disesuaikan dengan segmen Takar: pemilik warung makan Indonesia.
>
> Angka kontras di bawah **dihitung, bukan dikira** — semuanya lolos WCAG 2.1 AA.

---

## 1. Keputusan warna yang paling menentukan

**Hijau adalah warna merek. Hijau BUKAN warna status.**

Ini terdengar sepele, tapi menyelesaikan dua masalah sekaligus.

### Masalah pertama — merah + hijau

Panduan yang kita ikuti melarangnya terang-terangan:

> *"Avoid difficult color combinations: red+green (most common colorblindness)"*

Sekitar 8% pria kesulitan membedakan keduanya. Palet status merah/kuning/hijau
adalah kombinasi yang persis dilarang.

### Masalah kedua — tabrakan makna

Kalau hijau dipakai untuk merek **dan** untuk status "sehat", tidak ada yang
bisa membedakan mana tombol dan mana penilaian.

### Penyelesaiannya

```
Hijau      →  merek. Tombol utama, logo, konfirmasi "harga sudah masuk".
Oker       →  perlu dicek.
Bata       →  rugi.
Sehat      →  TANPA WARNA. Teks netral, tenang, tanpa lencana.
```

Dan ini justru **sesuai filosofi produknya**: Takar hanya bersuara kalau ada
masalah. Menu yang sehat seharusnya diam, bukan diberi lencana hijau.

Hasilnya: hanya **dua** warna status, tidak ada merah-hijau, dan hijau bebas
menjadi identitas.

---

## 2. Kenapa hijau — dan hijau yang mana

Bukan hijau SaaS (`#10B981` emerald, hijau neon dashboard). Itu warna produk
teknologi, bukan warung.

Hijau yang dipakai adalah **hijau daun pisang** — hue 152, chroma sedang,
gelap. Warna yang sudah akrab di warung: pembungkus nasi, daun pandan, sayur.
Alami, teduh, tidak berteriak.

```
oklch(0.46 0.10 152)   →  #22683B
```

Chroma ditahan di 0,10 supaya tidak berubah jadi hijau plastik.

---

## 3. Palet lengkap

Semua dibuat dengan `oklch()` — hue bervariasi, lightness dan chroma dijaga
sedekat mungkin, sesuai disiplin warna panduan sumber.

### Netral — bernada hijau sangat tipis

```css
--latar        oklch(0.985 0.004 150)   #F8FBF9
--latar-2      oklch(0.965 0.006 150)   #F1F5F1    kartu, baris perkiraan
--garis        oklch(0.900 0.010 150)   #DAE0DA
--teks         oklch(0.230 0.012 150)   #191F1A    kontras 16,1 ✓
--teks-lembut  oklch(0.520 0.012 150)   #646B65    kontras  5,3 ✓
```

Putih dan hitamnya **sengaja tidak murni.** `#FFFFFF` di atas `#000000` keras,
dingin, dan terbaca seperti belum selesai.

### Merek

```css
--hijau-600    oklch(0.46 0.100 152)    #22683B    kontras 6,5 ✓   PRIMER
--hijau-700    oklch(0.38 0.085 152)    #164F2B    kontras 9,2 ✓   tekan/hover
--hijau-100    oklch(0.935 0.030 152)   #DCF0E0                    latar lembut
```

### Status — hanya dua

```css
--oker-600     oklch(0.54 0.115 75)     #956300    kontras 5,0 ✓   perlu dicek
--oker-100     oklch(0.945 0.040 80)    #FBEBCF
--bata-600     oklch(0.47 0.140 32)     #9A3322    kontras 7,0 ✓   rugi
--bata-100     oklch(0.935 0.030 32)    #FDE3DD
```

**Lima warna inti. Tidak lebih.** Lebih dari itu, tidak ada yang terbaca utama.

---

## 4. Tipografi

Panduan sumber melarang Inter, Roboto, Arial, dan Fraunces sebagai pilihan
diam-diam. Takar memakai **IBM Plex Sans** — dipilih sadar karena tiga alasan:

- angka `tabular-nums` sejati, jadi kolom rupiah lurus
- terbaca di ukuran besar maupun kecil, di layar retak dan di bawah matahari
- berkarakter tanpa jadi dekoratif — cocok untuk alat, bukan brosur

```css
font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
font-variant-numeric: tabular-nums;
```

### Skala

| Peran | Ukuran | Tebal | Contoh |
|---|---|---|---|
| Angka pahlawan | 64 / 56 px | 700 | `Rp 3.085` di layar hasil |
| Angka besar | 30 px | 700 | untung di detail menu |
| Judul layar | 26 px | 600 | "Warungmu di mana?" |
| Judul bagian | 20 px | 600 | "Menu Warungmu" |
| Angka baris | 17 px | 600 | untung per menu |
| Isi | 15–16 px | 400–500 | |
| Keterangan | 13–14 px | 400 | "turun dari Rp 3.085" |
| Label kelompok | 13 px | 600 | `RUGI · 1 MENU`, huruf besar, jarak 0,08em |

**Aturan yang mengikat: angka uang selalu jauh lebih besar dari labelnya.**
Itu yang dicari Bu Sri saat membuka aplikasi.

---

## 5. Ritme dan jarak

Kelipatan 4, dengan lompatan yang terasa:

```
4  ·  8  ·  12  ·  16  ·  20  ·  28  ·  40
```

```
Tepi layar        20 px
Antar baris menu  16 px atas-bawah, garis 1 px di antaranya
Antar kelompok    28 px
Sebelum tombol    minimal 24 px
```

Jangan pakai jarak yang nyaris sama (14 vs 16) — pembaca tidak melihatnya
sebagai pemisah, cuma sebagai ketidakrapian.

---

## 6. Komponen

### Tombol

```
Utama      hijau-600, teks #F8FBF9, radius 10 px, tinggi minimal 52 px
Kedua      transparan, garis 1,5 px --garis, teks --teks
Tekan      hijau-700
```

Satu tombol utama per layar. Kalau ada dua tombol yang sama menonjolnya,
tidak ada yang menonjol.

### Kolom isian

```
tinggi 56 px · radius 10 px · garis 1,5 px --garis · latar putih
fokus: garis 2 px hijau-600
```

Target sentuh minimal **44 × 44 px** — Bu Sri mengetik satu jari.

### Kartu

Panduan sumber melarang `border-radius: 12px; border-left: 4px solid` sebagai
kartu default — itu pola template SaaS.

```
Kartu biasa    latar --latar-2, tanpa garis, radius 10 px
Kartu penting  garis penuh 2 px --teks, latar putih, radius 12 px
```

Kartu penting **hanya** untuk blok "Gara-gara" di detail menu. Kalau semuanya
dibingkai tebal, tidak ada yang penting.

### Baris status — tiga penanda, selalu

```
[ikon]  Ayam Geprek
        ██░░░░░░░░░░   Rp 1.260   (7%)
        turun dari Rp 3.085
```

1. **Ikon** — SVG stroke, bukan emoji
2. **Panjang bar** — proporsional
3. **Angka rupiah** — selalu ada

Hilangkan seluruh warna dari layar, ketiganya harus tetap terbaca.

### Baris perkiraan — teks, bukan input mati

```
·  Gas, bumbu & listrik              Rp 500
   perkiraan kami · bisa diubah nanti
```

Latar `--latar-2`, tanpa kotak, tanpa fokus keyboard. **Field abu-abu yang
dinonaktifkan terbaca sebagai rusak** — Bu Sri akan menyentuhnya, tidak terjadi
apa-apa, lalu mengira aplikasinya error.

### Ikon

Stroke-based, grid 20/24 px, tebal 2 px, satu gaya. Feather atau Phosphor.
**Tidak ada emoji** — panduan sumber jelas: emoji hanya kalau merek memakainya
atau fungsinya nyata.

---

## 7. Aksesibilitas

```
Kontras teks       ≥ 4,5:1   ✓ semua token di §3 sudah diverifikasi
Target sentuh      ≥ 44 × 44 px
Lebar              375 px tanpa gulir horizontal
Warna              tidak pernah jadi satu-satunya penanda
Merah + hijau      tidak pernah berpasangan sebagai status
```

Konteks yang memaksa ini: **layar retak, sinar matahari, mata 45 tahun.**
Teks kecil dan kontras rendah di sini bukan gaya — itu kerusakan.

Setiap keadaan kosong menjelaskan langkah berikutnya. Tidak pernah layar
kosong tanpa teks.

---

## 8. Yang dihindari

Dari panduan sumber, yang relevan untuk Takar:

```
❌  Gradien                      pakai warna rata
❌  Emoji sebagai hiasan          ikon SVG
❌  border-left 4px sebagai kartu default
❌  Inter · Roboto · Arial · Fraunces
❌  #FFFFFF di atas #000000       pakai netral bernada
❌  Ilustrasi SVG buatan sendiri  kalau tidak ada aset, pakai penanda jujur
❌  Warm-editorial (krem + serif) sebagai bawaan diam-diam
❌  Lebih dari lima warna
```

Ditambah yang khusus Takar:

```
❌  Hijau sebagai penanda status  hijau itu merek
❌  Merah dan hijau berpasangan
❌  Kata "margin", "HPP", "komoditas" di antarmuka
❌  Angka persen lebih besar dari angka rupiah
❌  Lencana pada menu yang sehat   yang sehat diam saja
```

---

## 9. Ringkasan token

```css
:root {
  /* netral — bernada hijau tipis */
  --latar:        oklch(0.985 0.004 150);
  --latar-2:      oklch(0.965 0.006 150);
  --garis:        oklch(0.900 0.010 150);
  --teks:         oklch(0.230 0.012 150);
  --teks-lembut:  oklch(0.520 0.012 150);

  /* merek */
  --hijau-600:    oklch(0.460 0.100 152);
  --hijau-700:    oklch(0.380 0.085 152);
  --hijau-100:    oklch(0.935 0.030 152);

  /* status — hanya dua, tidak ada hijau */
  --oker-600:     oklch(0.540 0.115 75);
  --oker-100:     oklch(0.945 0.040 80);
  --bata-600:     oklch(0.470 0.140 32);
  --bata-100:     oklch(0.935 0.030 32);

  /* ritme */
  --r-1: 4px;  --r-2: 8px;  --r-3: 12px;
  --r-4: 16px; --r-5: 20px; --r-6: 28px; --r-7: 40px;

  --radius:      10px;
  --radius-besar: 12px;

  font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}
```
