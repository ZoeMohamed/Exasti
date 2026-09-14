"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PanduanKontekstual } from "./PanduanKontekstual";

export function PanduanHasil() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selesai() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (!response.ok) throw new Error("Panduan belum berhasil diselesaikan.");
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Coba lagi sebentar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanduanKontekstual
      langkah={4}
      judul="Baca hasil dari data warungmu"
      action={(
        <button
          type="button"
          onClick={selesai}
          disabled={saving}
          className="brutal-btn min-h-11 bg-ink px-5 py-2.5 font-heading text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Selesai, buka beranda"}
        </button>
      )}
    >
      <p>
        Angka di bawah berasal dari menu, resep, dan harga yang kamu simpan—bukan contoh.
        Lihat <strong>Untung Rata-Rata</strong>, lalu periksa <strong>Kondisi Menu</strong> dan
        <strong> Yang Perlu Kamu Perhatikan</strong>. Merah berarti perlu ditangani lebih dulu.
      </p>
      {error ? <p role="alert" className="mt-2 font-bold text-critical-red">{error}</p> : null}
    </PanduanKontekstual>
  );
}
