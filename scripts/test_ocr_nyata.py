"""
Tes 1 SUNGGUHAN — OCR nota Indonesia asli dari dataset CORD.

CORD (Consolidated Receipt Dataset, NAVER CLOVA AI) berisi nota nyata dari toko
dan restoran Indonesia, lengkap dengan label kebenaran. Ini menggantikan nota
sintetis di test_ocr.py — angka dari sini baru berarti.

Rate limit terukur: ~7 permintaan per burst, jadi diberi jeda.

Jalankan:  .venv/bin/python scripts/test_ocr_nyata.py [jumlah]
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ai-lab" / "cord"
DS = "naver-clova-ix/cord-v2"
ROWS_API = "https://datasets-server.huggingface.co/rows"
MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash",
          "gemini-flash-lite-latest"]
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
JEDA_DETIK = 9   # dari batas terukur: ~7 per burst

PROMPT = """Baca nota belanja Indonesia ini. Kembalikan JSON:

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
"""


def kunci() -> str | None:
    k = os.environ.get("GEMINI_API_KEY")
    if k:
        return k
    env = ROOT / ".env.local"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    return None


def ambil_baris(n: int) -> list[dict]:
    url = (f"{ROWS_API}?dataset={urllib.parse.quote(DS)}"
           f"&config=default&split=test&offset=0&length={n}")
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.load(r)["rows"]


def angka(teks: str) -> int | None:
    """'60.000' -> 60000 · '1,500' -> 1500."""
    bersih = re.sub(r"[^\d]", "", str(teks or ""))
    return int(bersih) if bersih else None


def kebenaran(row: dict) -> list[dict]:
    """Ambil daftar barang dari ground truth CORD."""
    gt = row.get("ground_truth")
    g = json.loads(gt) if isinstance(gt, str) else gt
    parse = g.get("gt_parse", {})
    menu = parse.get("menu", [])
    if isinstance(menu, dict):
        menu = [menu]
    hasil = []
    for m in menu:
        if not isinstance(m, dict):
            continue
        nm = m.get("nm")
        if isinstance(nm, list):
            nm = " ".join(str(x) for x in nm)
        hasil.append({
            "nama": str(nm or "").strip(),
            "harga": angka(m.get("price")),
            "qty": angka(m.get("cnt")),
        })
    return [h for h in hasil if h["nama"]]


def panggil(key: str, gambar: bytes) -> tuple[dict | None, str, float]:
    b64 = base64.b64encode(gambar).decode()
    body = {
        "contents": [{"parts": [
            {"text": PROMPT},
            {"inline_data": {"mime_type": "image/png", "data": b64}},
        ]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    for model in MODELS:
        t0 = time.perf_counter()
        req = urllib.request.Request(
            ENDPOINT.format(m=model) + f"?key={key}",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.load(r)
            teks = resp["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(teks), model, time.perf_counter() - t0
        except urllib.error.HTTPError as e:
            if e.code in (404, 429, 503):
                time.sleep(2)
                continue
            return None, f"HTTP {e.code}", time.perf_counter() - t0
        except Exception as e:  # noqa: BLE001
            return None, type(e).__name__, time.perf_counter() - t0
    return None, "semua model gagal", 0.0


def normalisasi(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())


def cocokkan(benar: list[dict], baca: list[dict]) -> tuple[int, int, int]:
    """Kembalikan (nama cocok, harga benar, total barang sebenarnya)."""
    sisa = list(baca)
    nama_ok = harga_ok = 0
    for b in benar:
        nb = normalisasi(b["nama"])
        pilih = None
        for kand in sisa:
            nk = normalisasi(kand.get("nameRaw"))
            if not nk:
                continue
            if nk == nb or (len(nb) > 3 and (nb in nk or nk in nb)):
                pilih = kand
                break
        if pilih:
            sisa.remove(pilih)
            nama_ok += 1
            if b["harga"] is not None and angka(pilih.get("totalPrice")) == b["harga"]:
                harga_ok += 1
    return nama_ok, harga_ok, len(benar)


def main() -> int:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    key = kunci()
    if not key:
        print("GEMINI_API_KEY tidak ditemukan")
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    print("=" * 70)
    print(f"TES OCR — {n} NOTA INDONESIA ASLI (dataset CORD)")
    print("=" * 70)

    rows = ambil_baris(n)
    tot_nama = tot_harga = tot_barang = 0
    tot_null = 0
    latensi: list[float] = []
    gagal = 0

    for i, row in enumerate(rows, 1):
        r = row["row"]
        benar = kebenaran(r)
        if not benar:
            continue

        src = r["image"]["src"]
        path = OUT / f"nota_{i:02d}.png"
        if not path.exists():
            with urllib.request.urlopen(src, timeout=90) as resp:
                path.write_bytes(resp.read())

        hasil, model, dtk = panggil(key, path.read_bytes())
        if hasil is None:
            print(f"  {i:>2}. GAGAL — {model}")
            gagal += 1
            time.sleep(JEDA_DETIK)
            continue

        baca = hasil.get("items", [])
        nama_ok, harga_ok, total = cocokkan(benar, baca)
        null_harga = sum(1 for x in baca if x.get("totalPrice") is None)

        tot_nama += nama_ok
        tot_harga += harga_ok
        tot_barang += total
        tot_null += null_harga
        latensi.append(dtk)

        tanda = "✓" if nama_ok == total else "~" if nama_ok else "✗"
        print(f"  {i:>2}. {tanda} nama {nama_ok}/{total}  harga {harga_ok}/{total}"
              f"  ({dtk:.1f}s, {model.replace('gemini-','')})")

        if nama_ok < total and i <= 3:
            for b in benar[:3]:
                print(f"        benar : {b['nama'][:34]:<36} {b['harga']}")
            for x in baca[:3]:
                print(f"        dibaca: {str(x.get('nameRaw'))[:34]:<36} {x.get('totalPrice')}")

        time.sleep(JEDA_DETIK)

    print(f"\n{'-' * 70}")
    if tot_barang:
        pn, ph = tot_nama / tot_barang * 100, tot_harga / tot_barang * 100
        print(f"  nama barang terbaca : {tot_nama}/{tot_barang}  ({pn:.0f}%)")
        print(f"  harga benar         : {tot_harga}/{tot_barang}  ({ph:.0f}%)")
        print(f"  harga dikembalikan null : {tot_null}  (menolak menebak)")
        if latensi:
            print(f"  latensi rata-rata   : {sum(latensi)/len(latensi):.1f}s")
        if gagal:
            print(f"  panggilan gagal     : {gagal}")
        print(f"\n  Ambang docs/10-AI-VALIDATION.md: 80%")
        lolos = pn >= 80 and ph >= 80
        print(f"  → {'LOLOS' if lolos else 'BELUM LOLOS'}")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
