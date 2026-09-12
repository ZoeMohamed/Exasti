"use client";

import Link from "next/link";

export function MenuPriceActions() {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() =>
          alert("Harga Ayam Geprek diperbarui menjadi Rp 20.000 di sistem!")
        }
        className="brutal-btn flex-1 bg-bright-green px-4 py-3 text-sm font-heading font-extrabold text-ink"
      >
        Gunakan Harga Ini
      </button>
      <Link
        href="/dashboard/simulator"
        className="brutal-btn bg-warning-yellow px-3 py-3 text-xs font-heading font-bold text-ink"
      >
        🎚️ Uji Dulu
      </Link>
    </div>
  );
}
