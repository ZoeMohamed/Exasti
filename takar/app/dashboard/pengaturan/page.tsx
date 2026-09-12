"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const [name, setName] = useState("Warung Bu Sri");
  const [packagingMode, setPackagingMode] = useState<"dine_in" | "takeaway" | "mixed">("mixed");
  const [regionId, setRegionId] = useState(1);
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([
    { id: 1, name: "Kota Semarang" },
  ]);
  const [lastSyncText, setLastSyncText] = useState("Hari ini");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.profile) {
          setName(data.profile.name || "Warung Bu Sri");
          setPackagingMode(data.profile.packaging_mode || "mixed");
          if (data.profile.region_id) setRegionId(data.profile.region_id);
          if (data.available_regions) setRegions(data.available_regions);

          if (data.profile.last_ingest_time) {
            try {
              const d = new Date(data.profile.last_ingest_time);
              setLastSyncText(`${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} WIB`);
            } catch {
              // fallback
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          packagingMode,
          regionId: Number(regionId),
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          router.refresh();
        }, 2000);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan pengaturan");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 brutal-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-ink pb-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
            Pengaturan Warung
          </h1>
          <p className="mt-1 text-ink/80 text-sm">
            Data ini tersimpan langsung di tabel <code className="bg-cream px-1.5 py-0.5 border border-ink">businesses</code> Supabase PostgreSQL.
          </p>
        </div>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold border border-ink">
          Tenant ID: Warung Bu Sri
        </span>
      </div>

      {loading ? (
        <div className="py-12 font-mono text-center">Memuat pengaturan dari database...</div>
      ) : (
        <form onSubmit={handleSave} className="mt-6 max-w-2xl space-y-6">
          <label className="block font-heading text-sm font-bold">
            Nama Warung Kamu
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-cream p-3 brutal-border-2 font-mono"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="font-heading text-sm font-bold">
              Kota / Kabupaten (Wilayah Data BI)
              <select
                value={regionId}
                onChange={(e) => setRegionId(Number(e.target.value))}
                className="mt-1 w-full bg-cream p-3 font-mono brutal-border-2"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="font-heading text-sm font-bold">
              Jenis Makanan Utama
              <div className="mt-1 w-full bg-cream p-3 font-mono text-xs brutal-border-2">
                Warung Olahan Daging & Sambal
              </div>
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 font-heading text-sm font-bold">
              Kebiasaan Pembeli Terbanyak (Menentukan Estimasi Biaya Kemasan):
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: "dine_in", label: "Makan di Tempat (Piring)", desc: "Biaya kemasan Rp 0" },
                { key: "takeaway", label: "Bungkus / Takeaway", desc: "Biaya kemasan penuh" },
                { key: "mixed", label: "Campur (50:50)", desc: "Estimasi rata-rata" },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`p-3 text-center text-xs font-heading font-bold brutal-border-2 cursor-pointer transition ${
                    packagingMode === item.key ? "bg-warning-yellow shadow-[2px_2px_0_#111]" : "bg-white hover:bg-cream"
                  }`}
                >
                  <input
                    type="radio"
                    name="packagingMode"
                    value={item.key}
                    checked={packagingMode === item.key}
                    onChange={() => setPackagingMode(item.key as any)}
                    className="mr-1.5"
                  />
                  <span className="block font-bold">{item.label}</span>
                  <span className="block font-mono text-[10px] text-ink/70 mt-1">{item.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="bg-cream p-4 font-mono text-xs brutal-border-2 space-y-1">
            <div className="flex items-center gap-2">
              <b>STATUS DATA PASAR BANK INDONESIA:</b>
              <span className="bg-bright-green px-2 py-0.5 border border-ink text-ink font-bold">
                TERHUBUNG AKTIF (AWS Mumbai)
              </span>
            </div>
            <p className="mt-1 text-ink/70">Terakhir sinkronisasi: {lastSyncText}</p>
          </div>

          {saved && (
            <div className="bg-bright-green p-3 font-mono text-sm font-bold text-ink brutal-border-2">
              ✅ Pengaturan warung berhasil disimpan ke database Supabase!
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="brutal-btn bg-ink px-6 py-3 font-heading font-extrabold text-cream disabled:opacity-50"
          >
            {saving ? "Menyimpan ke Database..." : "Simpan Pengaturan Warung"}
          </button>
        </form>
      )}
    </div>
  );
}
