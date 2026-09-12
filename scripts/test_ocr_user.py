"""
Uji OCR khusus untuk nota tulisan tangan pengguna: nota1.jpg dan nota2.jpg.
Membuktikan kemampuan Gemini membaca tulisan tangan warung/toko Indonesia.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Rantai model fallback
MODELS = [
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-lite-latest",
]
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"

PROMPT = """Baca nota belanja / struk belanja Indonesia bertulis tangan ini dengan cermat.
Kembalikan JSON dengan format:

{
  "toko": "<nama toko jika ada, atau null>",
  "tanggal": "<tanggal jika ada, atau null>",
  "items": [
    {
      "nameRaw": "<nama barang persis seperti tertulis>",
      "qty": <angka kuantitas/banyaknya atau null>,
      "unit": "<satuan misal kg/ltr/bks/pcs atau null jika tidak ada>",
      "unitPrice": <harga satuan dalam rupiah tanpa titik/koma atau null>,
      "totalPrice": <jumlah total harga barang ini dalam rupiah tanpa titik/koma atau null>
    }
  ],
  "totalNota": <total keseluruhan belanja jika tertulis, atau null>
}

Aturan Ketat:
- Salin nama barang APA ADANYA, jangan diterjemahkan atau dirapikan.
- Jika ada tulisan tangan yang kurang jelas, lakukan pembacaan terbaik tapi JANGAN mengarang angka.
- Jangan masukkan baris subtotal/total/tanda terima ke dalam array items.
"""


def ambil_kunci() -> str | None:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    env = ROOT / ".env.local"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    return None


def panggil_gemini_ocr(api_key: str, gambar_path: Path) -> tuple[dict | None, str, float]:
    b64 = base64.b64encode(gambar_path.read_bytes()).decode()
    mime = "image/jpeg" if gambar_path.suffix.lower() in (".jpg", ".jpeg") else "image/png"

    body = {
        "contents": [
            {
                "parts": [
                    {"text": PROMPT},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ]
            }
        ],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    for model in MODELS:
        t0 = time.perf_counter()
        req = urllib.request.Request(
            ENDPOINT.format(m=model) + f"?key={api_key}",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                resp = json.load(r)
                durasi = time.perf_counter() - t0
                teks = resp["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(teks), model, durasi
        except urllib.error.HTTPError as e:
            durasi = time.perf_counter() - t0
            err_msg = e.read().decode()[:200]
            print(f"    [{model}] HTTP {e.code} ({durasi:.1f}s): {err_msg[:60]}... -> mencoba fallback")
            time.sleep(2)
        except Exception as e:
            durasi = time.perf_counter() - t0
            print(f"    [{model}] Error ({durasi:.1f}s): {e} -> mencoba fallback")
            time.sleep(2)

    return None, "semua model gagal", 0.0


def rp(x) -> str:
    if x is None:
        return "-"
    try:
        return f"Rp {float(x):,.0f}".replace(",", ".")
    except (ValueError, TypeError):
        return str(x)


def uji_nota(api_key: str, nama_file: str):
    path = ROOT / nama_file
    if not path.exists():
        print(f"File {nama_file} tidak ditemukan di {path}")
        return

    print("=" * 72)
    print(f"MENGUJI OCR NOTA TULISAN TANGAN: {nama_file} ({path.stat().st_size / 1024:.1f} KB)")
    print("=" * 72)

    hasil, model_sukses, durasi = panggil_gemini_ocr(api_key, path)
    if not hasil:
        print("  GAGAL membaca nota.")
        return

    print(f"  Model berhasil : {model_sukses}")
    print(f"  Durasi latensi : {durasi:.2f} detik")
    print(f"  Toko terdeteksi: {hasil.get('toko') or '-'}")
    print(f"  Tanggal        : {hasil.get('tanggal') or '-'}")
    print(f"  Total di nota  : {rp(hasil.get('totalNota'))}")
    print("\n  Item yang berhasil diekstrak:")
    print("  " + "-" * 68)
    print(f"  {'Nama Barang':<24} {'Qty':>5} {'Satuan':<6} {'Harga Satuan':>14} {'Total Harga':>15}")
    print("  " + "-" * 68)

    items = hasil.get("items", [])
    total_hitung = 0
    for it in items:
        nama = str(it.get("nameRaw") or "-")[:23]
        qty = str(it.get("qty") or "-")
        satuan = str(it.get("unit") or "-")[:5]
        uprice = rp(it.get("unitPrice"))
        tprice = rp(it.get("totalPrice"))
        if it.get("totalPrice") and isinstance(it.get("totalPrice"), (int, float)):
            total_hitung += it["totalPrice"]
        print(f"  {nama:<24} {qty:>5} {satuan:<6} {uprice:>14} {tprice:>15}")

    print("  " + "-" * 68)
    print(f"  Total baris terbaca : {len(items)} item")
    print(f"  Total akumulasi item: {rp(total_hitung)}")
    print("=" * 72 + "\n")


def main():
    key = ambil_kunci()
    if not key:
        print("GEMINI_API_KEY tidak ditemukan!")
        return 1

    uji_nota(key, "nota1.jpg")
    print("Menunggu jeda 5 detik agar aman dari rate limit...")
    time.sleep(5)
    uji_nota(key, "nota2.jpg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
