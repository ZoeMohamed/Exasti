"""
Tes 4 — batas praktis free tier Gemini.

Menjawab: berapa permintaan sebelum ditolak, error apa yang keluar, berapa lama
pulih, dan berapa latensi satu panggilan OCR.

Angka-angka ini menentukan desain UX (perlu indikator loading?) dan strategi
cache. Jalankan sekali, catat hasilnya ke docs/AI-PROCESS.md.

Jalankan:  .venv/bin/python scripts/test_ratelimit.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
]
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
BURST = 20


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


def panggil(key: str, model: str, teks: str) -> tuple[int, float, str]:
    """Kembalikan (kode http, detik, catatan)."""
    body = {
        "contents": [{"parts": [{"text": teks}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    req = urllib.request.Request(
        ENDPOINT.format(m=model) + f"?key={key}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            r.read()
        return 200, time.perf_counter() - t0, "ok"
    except urllib.error.HTTPError as e:
        return e.code, time.perf_counter() - t0, e.read().decode()[:120]
    except Exception as e:  # noqa: BLE001
        return 0, time.perf_counter() - t0, f"{type(e).__name__}"


def main() -> int:
    key = ambil_kunci()
    if not key:
        print("GEMINI_API_KEY tidak ditemukan")
        return 1

    prompt = 'Balas dengan JSON {"ok":true} saja.'
    print("=" * 64)
    print(f"TES BATAS FREE TIER — {BURST} permintaan beruntun")
    print("=" * 64)

    model = MODELS[0]
    hasil = []
    tolak_pertama = None

    for i in range(1, BURST + 1):
        kode, dtk, catatan = panggil(key, model, prompt)
        hasil.append((kode, dtk))
        tanda = "✓" if kode == 200 else "✗"
        print(f"  {i:>2}. {tanda} HTTP {kode:<4} {dtk:>6.2f}s", end="")
        if kode != 200:
            print(f"   {catatan[:60]}")
            if tolak_pertama is None:
                tolak_pertama = i
        else:
            print()

    ok = [d for k, d in hasil if k == 200]
    kode_gagal = {}
    for k, _ in hasil:
        if k != 200:
            kode_gagal[k] = kode_gagal.get(k, 0) + 1

    print(f"\n{'-' * 64}")
    print(f"  berhasil        : {len(ok)}/{BURST}")
    if kode_gagal:
        print(f"  gagal           : {kode_gagal}")
        print(f"  tolakan pertama : permintaan ke-{tolak_pertama}")
    if ok:
        ok_urut = sorted(ok)
        print(f"  latensi rata²   : {sum(ok)/len(ok):.2f}s")
        print(f"  latensi p50/max : {ok_urut[len(ok_urut)//2]:.2f}s / {max(ok):.2f}s")

    if kode_gagal:
        print(f"\n  Menunggu 60 detik untuk mengukur pemulihan…")
        time.sleep(60)
        kode, dtk, _ = panggil(key, model, prompt)
        print(f"  Setelah 60s: HTTP {kode} ({dtk:.2f}s)"
              f" — {'pulih' if kode == 200 else 'masih ditolak'}")

    print(f"\n{'=' * 64}")
    print("Implikasi desain:")
    if ok:
        rata = sum(ok) / len(ok)
        if rata > 3:
            print(f"  · Latensi {rata:.1f}s → WAJIB ada indikator tunggu di UI")
        else:
            print(f"  · Latensi {rata:.1f}s → cukup cepat, indikator sederhana")
    if kode_gagal:
        print("  · Batas tercapai dalam satu burst → proses nota SATU PER SATU,")
        print("    jangan beruntun. Tampilkan antrean kalau pengguna unggah banyak.")
    else:
        print(f"  · {BURST} permintaan beruntun lolos semua → batas lebih longgar")
        print("    daripada yang tertulis di dokumentasi")
    print("  · Apa pun hasilnya: cache tetap wajib (FR-40, NFR-19)")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    sys.exit(main())
