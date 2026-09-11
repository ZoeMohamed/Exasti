"""
Takar — walking skeleton.

Membuktikan seluruh tulang punggung Cincin 0 berjalan dengan data sungguhan:

    API BI  →  parse  →  forward-fill  →  HPP  →  margin  →  BR-04  →  alert

Bukan aplikasinya. Cuma buktinya — dan kode acuan untuk bagian paling menjebak.

Jalankan:  .venv/bin/python scripts/skeleton.py
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, timedelta

BASE = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga"
PROVINCE_ID = 13   # Jawa Tengah
REGENCY_ID = 1     # Kota Semarang

# ── JEBAKAN #1 ────────────────────────────────────────────────────────────
# Parameter request memakai MM/DD/YYYY, tetapi kunci tanggal di respons
# memakai DD/MM/YYYY. Format BERBEDA di satu API yang sama.
# Salah format pada request tidak menghasilkan error — seluruh nilai jadi "-".
REQ_DATE = "%m/%d/%Y"
RESP_DATE = "%d/%m/%Y"


def _get(path: str, params: dict) -> dict:
    url = f"{BASE}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={
            # ── JEBAKAN #2: header ini wajib, tanpa itu respons kosong ──
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "takar-skeleton/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def parse_rupiah(raw: str) -> float | None:
    """'16,350' -> 16350.0 · '-' atau '' -> None (JEBAKAN #3: koma ribuan)."""
    raw = (raw or "").strip()
    if raw in ("-", ""):
        return None
    try:
        return float(raw.replace(",", ""))
    except ValueError:
        return None


def fetch_prices(start: date, end: date) -> dict[str, dict[date, float]]:
    """Tarik harga Kota Semarang. Kembalikan {nama_komoditas: {tanggal: harga}}."""
    data = _get(
        "GetGridDataDaerah",
        {
            "price_type_id": 1,
            "comcat_id": "",
            "province_id": PROVINCE_ID,
            "regency_id": REGENCY_ID,
            "market_id": "",
            "tipe_laporan": 1,
            "start_date": start.strftime(REQ_DATE),
            "end_date": end.strftime(REQ_DATE),
        },
    ).get("data", [])

    series: dict[str, dict[date, float]] = {}
    for row in data:
        # ── JEBAKAN #4: nama komoditas punya spasi di belakang ──
        #    contoh: "Cabai Merah Keriting "
        name = (row.get("name") or "").strip()
        if not name:
            continue
        # ── JEBAKAN #5: respons memuat baris KATEGORI induk (level 1) ──
        #    bersama variannya. Keduanya punya harga; jangan dobel hitung.
        points: dict[date, float] = {}
        for key, val in row.items():
            if "/" not in key:
                continue
            try:
                d = date(*reversed([int(x) for x in key.split("/")]))
            except (ValueError, TypeError):
                continue
            price = parse_rupiah(val)
            if price is not None:
                points[d] = price
        if points:
            series[name] = points
    return series


def price_on(series: dict[date, float], target: date, max_gap_days: int = 7):
    """BR-03 forward-fill: pakai harga hari kerja terakhir, maksimal 7 hari mundur.

    Kembalikan (harga, is_filled) atau (None, False) bila terlalu jauh.
    """
    if target in series:
        return series[target], False
    for back in range(1, max_gap_days + 1):
        d = target - timedelta(days=back)
        if d in series:
            return series[d], True
    return None, False


# ── Resep contoh — DIMASUKKAN SEBAGAI BATCH, bukan per porsi (BR-08) ──────
BATCH_YIELD = 8          # sekali masak jadi 8 porsi
SELL_PRICE = 18_000.0

BATCH_RECIPE = [
    # (nama komoditas BI, jumlah sekali masak dalam satuan komoditas)
    ("Daging Ayam Ras Segar", 2.00),    # 2 kg
    ("Beras Kualitas Medium I", 1.20),  # 1,2 kg
    ("Cabai Rawit Hijau", 0.12),        # 120 g
    ("Bawang Merah Ukuran Sedang", 0.08),
    ("Minyak Goreng Curah", 0.24),
]
FIXED_COSTS = [("gas + kemasan (perkiraan)", 1_200.0)]


def per_porsi(batch_qty: float) -> float:
    """BR-08 — konversi terjadi sekali saat menyimpan, bukan di engine."""
    return batch_qty / BATCH_YIELD


def compute_hpp(recipe, prices_today, on: date):
    """BR-01. Fungsi murni: tidak menyentuh jaringan atau database."""
    hpp = 0.0
    lines, missing, filled = [], [], []
    for name, batch_qty in recipe:
        series = prices_today.get(name)
        price, is_filled = (None, False) if series is None else price_on(series, on)
        if price is None:
            missing.append(name)
            continue
        qty = per_porsi(batch_qty)
        sub = qty * price
        hpp += sub
        lines.append((name, batch_qty, qty, price, sub))
        if is_filled:
            filled.append(name)
    for label, amount in FIXED_COSTS:
        hpp += amount
        lines.append((label, None, None, None, amount))
    return hpp, lines, missing, filled


def compute_margin(sell: float, hpp: float) -> float:
    """BR-02."""
    return 0.0 if sell <= 0 else (sell - hpp) / sell * 100


def find_driver(recipe, series_map, now: date, window_days: int = 7):
    """BR-04 — PEMBEDA PRODUK.

    Pendorong = kontribusi RUPIAH terbesar, BUKAN persentase kenaikan terbesar.
        kontribusi(k) = takaran_per_porsi(k) × [harga(k, hari_ini) − harga(k, hari_ini − w)]
    """
    then = now - timedelta(days=window_days)
    rows = []
    for name, batch_qty in recipe:
        s = series_map.get(name)
        if not s:
            continue
        p_now, _ = price_on(s, now)
        p_then, _ = price_on(s, then, max_gap_days=10)
        if p_now is None or p_then is None or p_then == 0:
            continue
        qty = per_porsi(batch_qty)
        rows.append(
            {
                "name": name,
                "pct": (p_now / p_then - 1) * 100,
                "rp": qty * (p_now - p_then),
                "now": p_now,
                "then": p_then,
            }
        )
    if not rows:
        return None, rows
    return max(rows, key=lambda r: r["rp"]), rows


SEVERITY = {  # BR-05 — satu objek konfigurasi, bukan if tersebar
    "critical": {"margin_below": 10, "drop_points": 15},
    "warning": {"margin_below": 20, "drop_points": 8},
    "info": {"margin_below": 30, "drop_points": 5},
}


# BR-06 — margin rendah TAPI STABIL tidak menghasilkan alert.
# Pemilik sudah tahu menunya tipis; mengulanginya tiap hari bikin dia
# berhenti membaca. Yang dilaporkan adalah PERUBAHAN.
STABLE_THRESHOLD_POINTS = 2.0


def severity_of(margin_now: float, drop_points: float) -> str | None:
    if drop_points < STABLE_THRESHOLD_POINTS:
        return None  # stabil — diam saja, apa pun level marginnya
    for level in ("critical", "warning", "info"):
        c = SEVERITY[level]
        if margin_now < c["margin_below"] or drop_points >= c["drop_points"]:
            return level
    return None


def suggest_price(hpp: float, target_margin_pct: float) -> float:
    """BR-07 — bulatkan ke atas ke kelipatan Rp 500."""
    target = max(target_margin_pct, 15.0) / 100
    raw = hpp / (1 - target)
    return round(-(-raw // 500) * 500)


def rp(x) -> str:
    return f"Rp {x:,.0f}".replace(",", ".")


def main() -> int:
    today = date.today()
    start = today - timedelta(days=120)

    print("=" * 68)
    print("TAKAR — WALKING SKELETON")
    print("=" * 68)

    print(f"\n[1] Tarik harga BI · Kota Semarang · {start} → {today}")
    print(f"    request  {REQ_DATE}   respons  {RESP_DATE}   ← format berbeda")
    try:
        series_map = fetch_prices(start, today)
    except Exception as exc:  # noqa: BLE001
        print(f"    GAGAL: {type(exc).__name__}: {exc}")
        return 1

    total_points = sum(len(v) for v in series_map.values())
    print(f"    {len(series_map)} komoditas · {total_points} titik harga")

    missing_ref = [n for n, _ in BATCH_RECIPE if n not in series_map]
    if missing_ref:
        print("\n    ⚠️  nama komoditas tidak ditemukan di respons:")
        for n in missing_ref:
            print(f"        - {n!r}")
        print("    Nama yang tersedia:")
        for n in sorted(series_map)[:30]:
            print(f"        · {n}")
        return 1

    latest = max(max(v) for v in series_map.values())
    print(f"    harga terbaru tersedia: {latest}")

    print(f"\n[2] Resep — dimasukkan sebagai BATCH (BR-08)")
    print(f"    Ayam Geprek · sekali masak → {BATCH_YIELD} porsi · jual {rp(SELL_PRICE)}")

    hpp_now, lines, missing, filled = compute_hpp(BATCH_RECIPE, series_map, latest)
    margin_now = compute_margin(SELL_PRICE, hpp_now)

    print(f"\n[3] Modal per porsi (BR-01)")
    for name, bq, q, price, sub in lines:
        if bq is None:
            print(f"    {name:<32} {'':>20}  {rp(sub):>12}")
        else:
            unit = f"{bq:g} → {BATCH_YIELD} porsi"
            print(f"    {name:<32} {unit:>20}  {rp(sub):>12}")
    print(f"    {'':<32} {'MODAL':>20}  {rp(hpp_now):>12}")
    if missing:
        print(f"    ⚠️  tanpa harga: {', '.join(missing)}")
    if filled:
        print(f"    ℹ️  forward-fill: {', '.join(filled)}")

    auto = sum(s for n, bq, q, p, s in lines if bq is not None)
    print(f"\n    cakupan otomatis {auto / hpp_now * 100:.0f}%  (BR-10)")

    print(f"\n[4] Untung (BR-02)")
    print(f"    {rp(SELL_PRICE - hpp_now)} per porsi   ({margin_now:.1f}%)")

    then = latest - timedelta(days=7)
    hpp_then, *_ = compute_hpp(BATCH_RECIPE, series_map, then)
    margin_then = compute_margin(SELL_PRICE, hpp_then)
    drop = margin_then - margin_now

    print(f"\n[5] Bandingkan 7 hari lalu ({then})")
    print(f"    untung  {rp(SELL_PRICE - hpp_then)} ({margin_then:.1f}%)"
          f"  →  {rp(SELL_PRICE - hpp_now)} ({margin_now:.1f}%)")
    print(f"    selisih {drop:+.1f} poin")

    print(f"\n[6] Pendorong (BR-04) — kontribusi RUPIAH, bukan persentase")
    driver, rows = find_driver(BATCH_RECIPE, series_map, latest)
    rows.sort(key=lambda r: r["rp"], reverse=True)
    print(f"    {'bahan':<32}{'ubah %':>10}{'kontribusi':>14}")
    print("    " + "-" * 56)
    for r in rows:
        mark = "  ← pendorong" if driver and r["name"] == driver["name"] else ""
        print(f"    {r['name']:<32}{r['pct']:>9.1f}%{rp(r['rp']):>14}{mark}")

    biggest_pct = max(rows, key=lambda r: r["pct"]) if rows else None
    if driver and biggest_pct and biggest_pct["name"] != driver["name"]:
        print(f"\n    ✅ UJI BR-04 LOLOS")
        print(f"       kenaikan % terbesar : {biggest_pct['name']} ({biggest_pct['pct']:+.1f}%)")
        print(f"       pendorong sebenarnya: {driver['name']} ({rp(driver['rp'])})")
        print(f"       → keduanya berbeda, persis kasus yang jadi pembeda produk")
    elif driver:
        print(f"\n    ℹ️  minggu ini kenaikan % terbesar kebetulan sama dengan pendorong")

    print(f"\n[7] Alert")
    sev = severity_of(margin_now, drop)
    if sev is None:
        print("    tidak ada yang perlu dilaporkan (BR-06)")
    else:
        saran = suggest_price(hpp_now, margin_then)
        print(f"    ┌{'─' * 56}┐")
        print(f"    │ Ayam Geprek — {sev.upper():<41}│")
        print(f"    │ Untung {rp(SELL_PRICE - hpp_then)} → {rp(SELL_PRICE - hpp_now):<32}│")
        if driver:
            print(f"    │ Gara-gara: {driver['name']} {driver['pct']:+.0f}%{'':<23}│")
            if biggest_pct and biggest_pct["name"] != driver["name"]:
                print(f"    │ Bukan {biggest_pct['name'][:20]} — naik {biggest_pct['pct']:+.0f}%,"
                      f" tapi porsinya kecil{'':<1}│")
        print(f"    │ Saran: jual {rp(saran):<41}│")
        print(f"    └{'─' * 56}┘")

    print(f"\n{'=' * 68}")
    print("SELURUH RANTAI CINCIN 0 BERJALAN DENGAN DATA SUNGGUHAN")
    print("=" * 68)
    return 0


if __name__ == "__main__":
    sys.exit(main())
