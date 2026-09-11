"""
Cari jendela waktu terbaik untuk demo.

Pembeda Takar (BR-04) baru terlihat ketika bahan dengan kenaikan PERSEN terbesar
BUKAN bahan penyumbang RUPIAH terbesar. Data minggu berjalan sering datar, jadi
skrip ini menyisir setahun ke belakang dan mencari tanggal di mana kontras itu
paling tajam.

Hasilnya dipakai untuk memilih tanggal demo dan seed data.

Jalankan:  .venv/bin/python scripts/cari_demo_window.py
"""

from __future__ import annotations

import sys
from datetime import date, timedelta

from skeleton import (  # type: ignore
    BATCH_RECIPE,
    BATCH_YIELD,
    SELL_PRICE,
    compute_hpp,
    compute_margin,
    fetch_prices,
    find_driver,
    per_porsi,
    rp,
)


def fetch_chunked(start: date, end: date, chunk_days: int = 90):
    """Rentang panjang harus dipecah — satu permintaan 400 hari timeout."""
    merged: dict[str, dict[date, float]] = {}
    cur = start
    while cur < end:
        stop = min(cur + timedelta(days=chunk_days), end)
        print(f"    {cur} → {stop}…", end=" ", flush=True)
        try:
            part = fetch_prices(cur, stop)
            for name, pts in part.items():
                merged.setdefault(name, {}).update(pts)
            print(f"{sum(len(p) for p in part.values())} titik")
        except Exception as exc:  # noqa: BLE001
            print(f"gagal ({type(exc).__name__})")
        cur = stop + timedelta(days=1)
    return merged


def main() -> int:
    end = date.today()
    start = end - timedelta(days=400)

    print(f"Menarik harga {start} → {end} (Kota Semarang), dipecah per 90 hari:")
    series = fetch_chunked(start, end)
    print(f"\n  {len(series)} komoditas, {sum(len(v) for v in series.values())} titik\n")

    all_days = sorted({d for s in series.values() for d in s})
    candidates = []

    for day in all_days:
        if day - timedelta(days=7) < all_days[0]:
            continue
        driver, rows = find_driver(BATCH_RECIPE, series, day)
        if not driver or len(rows) < 3:
            continue
        top_pct = max(rows, key=lambda r: r["pct"])
        if top_pct["name"] == driver["name"]:
            continue  # tidak ada kontras — lewati

        hpp_now, *_ = compute_hpp(BATCH_RECIPE, series, day)
        hpp_then, *_ = compute_hpp(BATCH_RECIPE, series, day - timedelta(days=7))
        m_now = compute_margin(SELL_PRICE, hpp_now)
        m_then = compute_margin(SELL_PRICE, hpp_then)
        drop = m_then - m_now
        if drop < 1.0:
            continue

        candidates.append(
            {
                "day": day, "driver": driver, "top_pct": top_pct,
                "drop": drop, "m_now": m_now, "m_then": m_then,
                "hpp_now": hpp_now, "hpp_then": hpp_then,
                # seberapa menyesatkan kalau orang melihat persen saja
                "misleading": top_pct["pct"] - driver["pct"],
            }
        )

    if not candidates:
        print("Tidak ditemukan hari dengan kontras. Coba perpanjang rentang.")
        return 1

    print(f"{len(candidates)} hari punya kontras persen-vs-rupiah.\n")
    print("Sepuluh terbaik untuk demo (penurunan untung terbesar):\n")
    print(f"{'tanggal':<12}{'untung turun':>14}{'pendorong (Rp)':>30}{'naik % terbesar':>30}")
    print("-" * 86)

    for c in sorted(candidates, key=lambda x: x["drop"], reverse=True)[:10]:
        d, dr, tp = c["day"], c["driver"], c["top_pct"]
        kol_driver = f"{dr['name'][:18]} {rp(dr['rp'])}"
        kol_pct = f"{tp['name'][:18]} {tp['pct']:+.0f}%"
        print(f"{str(d):<12}{c['drop']:>13.1f}p{kol_driver:>30}{kol_pct:>30}")

    best = max(candidates, key=lambda x: x["drop"])
    d, dr, tp = best["day"], best["driver"], best["top_pct"]

    print("\n" + "=" * 86)
    print(f"JENDELA DEMO TERBAIK — {d}")
    print("=" * 86)
    print(f"\n  Ayam Geprek · jual {rp(SELL_PRICE)} · sekali masak {BATCH_YIELD} porsi\n")
    print(f"  Untung  {rp(SELL_PRICE - best['hpp_then'])} ({best['m_then']:.1f}%)"
          f"  →  {rp(SELL_PRICE - best['hpp_now'])} ({best['m_now']:.1f}%)")
    print(f"  Turun   {best['drop']:.1f} poin dalam 7 hari\n")
    print(f"  Gara-gara : {dr['name']}  {dr['pct']:+.1f}%  →  {rp(dr['rp'])} per porsi")
    print(f"  Bukan     : {tp['name']}  {tp['pct']:+.1f}%  →  {rp(tp['rp'])} per porsi")
    print(f"\n  Selisih persepsi: {tp['name']} naik {best['misleading']:.0f} poin persen")
    print(f"  lebih tinggi, tapi dampaknya ke untung jauh lebih kecil.")
    print(f"\n  → Inilah kalimat yang tidak bisa diucapkan aplikasi lain.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
