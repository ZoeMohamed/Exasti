"""
Uji OCR nota belanja dengan Gemini Flash.

Membuat nota uji sintetis (tercetak dan "tulisan tangan"), mengirimkannya ke
Gemini, lalu membandingkan hasil bacaan dengan jawaban yang benar.

Ini kerangka untuk Tes 1 di docs/10-AI-VALIDATION.md — ganti nota sintetis
dengan foto nota sungguhan untuk pengujian yang sebenarnya.

Jalankan:  .venv/bin/python scripts/test_ocr.py
"""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ai-lab"
# Rantai fallback model. Alias "-latest" sering kena 503 karena ramai;
# model yang dipin lebih stabil. Pola ini masuk ke lib/ai/client.ts nanti.
MODELS = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
]
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"

PROMPT = """Baca nota belanja ini. Kembalikan JSON dengan struktur:

{
  "items": [
    { "nameRaw": "<nama barang persis seperti tertulis>",
      "qty": <angka>,
      "unit": "<satuan seperti tertulis, misal kg/botol/pcs/sak>",
      "totalPrice": <angka rupiah tanpa titik atau koma> }
  ]
}

Aturan:
- Salin nama barang APA ADANYA, jangan diterjemahkan atau dirapikan.
- Kalau satuan tidak tertulis, isi null.
- Kalau angka tidak terbaca jelas, isi null — JANGAN menebak.
- Abaikan baris total, diskon, kembalian, dan PPN.
"""

# Jawaban yang benar untuk nota sintetis di bawah
TRUTH = [
    {"nameRaw": "ABC Sambal 935ml", "qty": 1, "totalPrice": 25800},
    {"nameRaw": "Tepung Segitiga 5kg", "qty": 1, "totalPrice": 58000},
    {"nameRaw": "Minyak Bimoli 2L", "qty": 2, "totalPrice": 37000},
    {"nameRaw": "Ayam Broiler", "qty": 5, "totalPrice": 195000},
    {"nameRaw": "Cabe Rawit", "qty": 2, "totalPrice": 34000},
]


def buat_nota(path: Path, gaya: str = "cetak") -> None:
    """Bikin gambar nota uji."""
    W, H = 380, 520
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13)
        fb = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
    except OSError:
        f = fb = ImageFont.load_default()

    y = 18
    d.text((W // 2 - 60, y), "TOKO MAKMUR", font=fb, fill="black"); y += 22
    d.text((30, y), "Jl. Raya Tembalang No. 12", font=f, fill="black"); y += 18
    d.text((30, y), "11/09/2026  14:23", font=f, fill="black"); y += 14
    d.text((20, y), "-" * 42, font=f, fill="black"); y += 22

    for it in TRUTH:
        d.text((25, y), it["nameRaw"], font=f, fill="black"); y += 17
        qty = f"  {it['qty']} x" if it["qty"] > 1 else "   "
        harga = f"{it['totalPrice']:,}".replace(",", ".")
        d.text((45, y), qty, font=f, fill="black")
        d.text((W - 30 - len(harga) * 8, y), harga, font=f, fill="black")
        y += 24

    d.text((20, y), "-" * 42, font=f, fill="black"); y += 22
    total = sum(i["totalPrice"] for i in TRUTH)
    d.text((25, y), "TOTAL", font=fb, fill="black")
    t = f"{total:,}".replace(",", ".")
    d.text((W - 30 - len(t) * 9, y), t, font=fb, fill="black"); y += 24
    d.text((25, y), "TUNAI", font=f, fill="black"); y += 17
    d.text((25, y), "KEMBALI            200", font=f, fill="black")

    if gaya == "miring":
        img = img.rotate(-4, expand=True, fillcolor="white")

    img.save(path)


def panggil_gemini(api_key: str, gambar: Path) -> tuple[dict | None, str]:
    """Coba tiap model berurutan sampai ada yang berhasil (ketahanan)."""
    for model in MODELS:
        hasil, pesan = _panggil_satu(api_key, gambar, model)
        if hasil is not None:
            return hasil, f"[{model}] {pesan}"
        lanjut = any(k in pesan for k in ("503", "429", "404"))
        if not lanjut:
            return None, f"[{model}] {pesan}"   # error sungguhan — hentikan
        sebab = "sibuk" if "503" in pesan or "429" in pesan else "tidak tersedia"
        print(f"    {model}: {sebab}, coba berikutnya…")
    return None, "semua model sibuk"


def _panggil_satu(api_key: str, gambar: Path, model: str) -> tuple[dict | None, str]:
    b64 = base64.b64encode(gambar.read_bytes()).decode()
    body = {
        "contents": [{"parts": [
            {"text": PROMPT},
            {"inline_data": {"mime_type": "image/png", "data": b64}},
        ]}],
        # structured output — skema JSON dijamin (Tes 3)
        "generationConfig": {"responseMimeType": "application/json"},
    }
    req = urllib.request.Request(
        ENDPOINT.format(m=model) + f"?key={api_key}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.read().decode()[:300]}"
    except Exception as e:  # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"

    try:
        teks = resp["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(teks), "ok"
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return None, f"gagal parse: {e} · {json.dumps(resp)[:300]}"


def nilai(hasil: dict) -> tuple[int, int, int]:
    """Kembalikan (nama benar, harga benar, total baris kebenaran)."""
    items = hasil.get("items", [])
    nama_ok = harga_ok = 0
    for benar in TRUTH:
        kunci = benar["nameRaw"].lower().split()[0]
        cocok = next((i for i in items if kunci in str(i.get("nameRaw", "")).lower()), None)
        if cocok:
            nama_ok += 1
            if cocok.get("totalPrice") == benar["totalPrice"]:
                harga_ok += 1
    return nama_ok, harga_ok, len(TRUTH)


def main() -> int:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        env = ROOT / ".env.local"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    key = line.split("=", 1)[1].strip()
    if not key:
        print("GEMINI_API_KEY tidak ditemukan di env maupun .env.local")
        return 1

    OUT.mkdir(exist_ok=True)
    print("=" * 62)
    print(f"UJI OCR NOTA — fallback: {' → '.join(MODELS[:3])}")
    print("=" * 62)

    skor_total = []
    for gaya in ("cetak", "miring"):
        path = OUT / f"nota_{gaya}.png"
        buat_nota(path, gaya)
        print(f"\n[{gaya}]  {path.relative_to(ROOT)}")

        hasil, mentah = panggil_gemini(key, path)
        if hasil is None:
            print(f"  GAGAL — {mentah}")
            continue

        nama_ok, harga_ok, total = nilai(hasil)
        print(f"  nama barang terbaca : {nama_ok}/{total}")
        print(f"  harga benar         : {harga_ok}/{total}")
        ditebak = [i for i in hasil.get("items", []) if i.get("totalPrice") is None]
        print(f"  dikembalikan null   : {len(ditebak)}  (bagus — tidak menebak)")
        skor_total.append((nama_ok, harga_ok, total))

        for it in hasil.get("items", [])[:6]:
            print(f"    · {str(it.get('nameRaw'))[:28]:<30} {it.get('qty')} "
                  f"{it.get('unit') or '-':<6} {it.get('totalPrice')}")

    if skor_total:
        n = sum(s[0] for s in skor_total); h = sum(s[1] for s in skor_total)
        t = sum(s[2] for s in skor_total)
        print(f"\n{'=' * 62}")
        print(f"TOTAL  nama {n}/{t} ({n/t*100:.0f}%)   harga {h}/{t} ({h/t*100:.0f}%)")
        print(f"Ambang lolos docs/10-AI-VALIDATION.md: 80%")
        print("=" * 62)
    return 0


if __name__ == "__main__":
    sys.exit(main())
