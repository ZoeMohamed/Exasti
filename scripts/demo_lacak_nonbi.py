"""
Demo — bagaimana barang di luar 21 komoditas BI dilacak dari waktu ke waktu.

Tiga masalah yang harus diselesaikan, dan ini jawabannya:

  1. IDENTITAS   nota menulis nama berbeda tiap toko  → katalog + konfirmasi
  2. SATUAN      kemasan 1 kg vs 500 g tidak sebanding → normalisasi per satuan dasar
  3. TREN        data jarang, hanya saat pemilik beli  → cukup, karena barangnya lambat

Jalankan:  .venv/bin/python scripts/demo_lacak_nonbi.py
"""

from __future__ import annotations

from datetime import date

# ── Katalog: identitas barang, dipilih sekali oleh pemilik ────────────────
KATALOG = {
    "cat_mayones_maestro": {"nama": "Mayones Maestro", "satuan_dasar": "g"},
    "cat_saus_abc":        {"nama": "Saus Sambal ABC", "satuan_dasar": "g"},
}

# Konversi satuan kemasan → satuan dasar katalog
KE_DASAR = {"kg": 1000, "g": 1, "gr": 1, "l": 1000, "ml": 1, "pcs": 1, "botol": 1}

# ── Nota nyata yang masuk dari waktu ke waktu ─────────────────────────────
# Perhatikan: nama berbeda, toko berbeda, UKURAN KEMASAN BERBEDA
NOTA = [
    (date(2026, 8, 12), "Superindo",  "MAYONAISE MAESTRO 1000G",  1, "kg",  42_000),
    (date(2026, 9,  3), "Indomaret",  "Mayonnaise Maestro 500gr", 1, "g",   22_500,
     500),  # kemasan 500 g
    (date(2026, 10, 18), "Superindo", "MAYONAISE MAESTRO 1KG",    1, "kg",  45_000),
]


def normalisasi(total_harga: float, jumlah: float, satuan: str,
                isi_kemasan: float | None = None) -> float:
    """Harga per satuan dasar. Inilah yang membuat kemasan beda bisa dibandingkan.

    1 kg  @ Rp 42.000  →  Rp 42,0 / g
    500 g @ Rp 22.500  →  Rp 45,0 / g     ← ternyata LEBIH MAHAL per gram
    """
    faktor = KE_DASAR.get(satuan.lower(), 1)
    total_dasar = (isi_kemasan if isi_kemasan else jumlah * faktor)
    return total_harga / total_dasar


def main() -> None:
    print("=" * 74)
    print("MELACAK BARANG DI LUAR DATA BI — Mayones Maestro")
    print("=" * 74)

    print("\n[1] IDENTITAS — nota menulis nama berbeda tiap kali\n")
    for tgl, toko, mentah, *_ in NOTA:
        print(f"    {tgl}  {toko:<11} \"{mentah}\"")
    print("\n    AI mencocokkan ketiganya ke satu item katalog:")
    print("       → Mayones Maestro   [pemilik mengonfirmasi sekali]")
    print("    Tanpa katalog, ketiganya jadi tiga barang berbeda dan tren mustahil.")

    print("\n[2] SATUAN — normalisasi ke satuan dasar\n")
    print(f"    {'tanggal':<12}{'toko':<12}{'kemasan':>12}{'harga':>12}{'per gram':>12}")
    print("    " + "-" * 60)
    seri: list[tuple[date, float]] = []
    for entri in NOTA:
        tgl, toko, mentah, jml, satuan, harga = entri[:6]
        isi = entri[6] if len(entri) > 6 else None
        per = normalisasi(harga, jml, satuan, isi)
        seri.append((tgl, per))
        kemasan = f"{isi:g} g" if isi else f"{jml:g} {satuan}"
        print(f"    {str(tgl):<12}{toko:<12}{kemasan:>12}"
              f"{'Rp ' + format(harga, ',').replace(',', '.'):>12}{per:>11.1f}")

    print("\n    ⚠️  Kemasan 500 g ternyata Rp 45/g — LEBIH MAHAL dari yang 1 kg.")
    print("        Tanpa normalisasi, ini terlihat seperti 'harga turun'")
    print("        (Rp 42.000 → Rp 22.500) padahal sebenarnya naik per gram.")

    print("\n[3] TREN — dari notanya sendiri\n")
    for i in range(1, len(seri)):
        (t0, p0), (t1, p1) = seri[i - 1], seri[i]
        hari = (t1 - t0).days
        print(f"    {t0} → {t1}   Rp {p0:.1f}/g → Rp {p1:.1f}/g   "
              f"{(p1/p0-1)*100:+.1f}%  dalam {hari} hari")
    t0, p0 = seri[0]; t1, p1 = seri[-1]
    print(f"\n    Total: {(p1/p0-1)*100:+.1f}% dalam {(t1-t0).days} hari")

    print("\n[4] YANG DISIMPAN — tabel `prices` yang sama dengan data BI\n")
    for tgl, per in seri:
        print(f"    commodity_id='cat_mayones_maestro'  business_id=<Bu Sri>")
        print(f"      date={tgl}  price={per:.1f}  source='nota_ocr'")
    print("\n    Karena tersimpan di tabel yang sama, BR-04 berlaku seragam —")
    print("    mayones BISA disebut sebagai 'gara-gara' di peringatan.")

    print("\n[5] KEBASIAN — ditandai, bukan disembunyikan\n")
    umur = (date(2026, 12, 20) - t1).days
    print(f"    Misal hari ini 2026-12-20, harga terakhir {t1} ({umur} hari lalu):")
    print(f"      UI menampilkan : \"Rp {p1:.0f}/g · dari notamu {t1}\"")
    print(f"      Sistem mengingatkan: \"Harga mayonesmu {umur} hari lalu. Masih segitu?\"")

    print("\n" + "=" * 74)
    print("Kuncinya: KATALOG memberi identitas, NORMALISASI membuat sebanding.")
    print("Tanpa keduanya, nota cuma jadi tumpukan angka yang tidak bisa dibandingkan.")
    print("=" * 74)


if __name__ == "__main__":
    main()
