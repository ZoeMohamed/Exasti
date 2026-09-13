"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hariIniJakarta, keIsoTanggal, tanggalIndonesia } from "@/lib/tanggal";

type PackagingMode = "dine_in" | "takeaway" | "mixed";

const PACKAGING_OPTIONS: Array<{
  key: PackagingMode;
  label: string;
  desc: string;
}> = [
  { key: "dine_in", label: "Makan di Tempat (Piring)", desc: "Biaya kemasan Rp 0" },
  { key: "takeaway", label: "Dibungkus", desc: "Biaya kemasan penuh" },
  { key: "mixed", label: "Campur (50:50)", desc: "Perkiraan rata-rata" },
];

export default function SettingsPage() {
  const router = useRouter();

  const [name, setName] = useState("Warung Bu Sri");
  const [packagingMode, setPackagingMode] = useState<PackagingMode>("mixed");
  const [regionId, setRegionId] = useState(1);
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([
    { id: 1, name: "Kota Semarang" },
  ]);
  const [lastSyncText, setLastSyncText] = useState("Hari ini");
  const [latestPriceText, setLatestPriceText] = useState("belum masuk");
  const [priceStale, setPriceStale] = useState(true);

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
              const tanggal = d.toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const jam = d.toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              setLastSyncText(`${tanggal}, ${jam} WIB`);
            } catch {
              // fallback
            }
          }

          const latestPriceIso = keIsoTanggal(data.profile.latest_price_date);
          if (latestPriceIso) {
            setLatestPriceText(tanggalIndonesia(latestPriceIso));
            setPriceStale(latestPriceIso !== hariIniJakarta());
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
            Atur nama, lokasi, dan kebiasaan bungkus agar hitungan Takar sesuai dengan warungmu.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 font-mono text-center">Menyiapkan pengaturan warung...</div>
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
              Kota / Kabupaten untuk Harga Pasar
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
              Kebiasaan Pembeli Terbanyak (Menentukan Perkiraan Biaya Kemasan):
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PACKAGING_OPTIONS.map((item) => (
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
                    onChange={() => setPackagingMode(item.key)}
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
              <b>HARGA BAHAN ACUAN:</b>
              <span className={`${priceStale ? "bg-warning-yellow" : "bg-bright-green"} px-2 py-0.5 border border-ink text-ink font-bold`}>
                DATA TERAKHIR {latestPriceText.toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-ink/70">Diperbarui: {lastSyncText}</p>
          </div>

          {saved && (
            <div className="bg-bright-green p-3 font-mono text-sm font-bold text-ink brutal-border-2">
              Pengaturan warung berhasil disimpan.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="brutal-btn bg-ink px-6 py-3 font-heading font-extrabold text-cream disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan Warung"}
          </button>

          <button
            type="button"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace("/login");
              router.refresh();
            }}
            className="min-h-11 px-5 py-2 font-heading text-sm font-bold underline underline-offset-4"
          >
            Keluar dari akun
          </button>
        </form>
      )}
    </div>
  );
}
