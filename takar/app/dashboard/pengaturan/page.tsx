"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hargaPasarPerluDiperbarui, keIsoTanggal, tanggalIndonesia } from "@/lib/tanggal";
import { simpanTahapPanduan } from "@/lib/onboarding-client";

interface RegionOption {
  id: number;
  name: string;
  province_name?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turAktif = searchParams.get("tur") === "1";

  const [name, setName] = useState("Warung Bu Sri");
  const [regionId, setRegionId] = useState(1);
  const [regions, setRegions] = useState<RegionOption[]>([
    { id: 1, name: "Kota Semarang", province_name: "Jawa Tengah" },
  ]);
  const [lastSyncText, setLastSyncText] = useState("Hari ini");
  const [latestPriceText, setLatestPriceText] = useState("belum masuk");
  const [priceStale, setPriceStale] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.profile) {
          setName(data.profile.name || "Warung Bu Sri");
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
            setPriceStale(hargaPasarPerluDiperbarui(latestPriceIso, data.profile.last_ingest_time));
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setSaving(true);
      const res = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          regionId: Number(regionId),
        }),
      });

      if (res.ok) {
        setSaved(true);
        if (turAktif) {
          await simpanTahapPanduan(2);
          router.push("/dashboard/menu/tambah?tur=2");
          router.refresh();
          return;
        }
        setTimeout(() => {
          setSaved(false);
          router.refresh();
        }, 2000);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Pengaturan belum berhasil disimpan.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Koneksi sedang bermasalah. Coba lagi sebentar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="bg-white p-6 sm:p-8 brutal-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-ink pb-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
            Pengaturan Warung
          </h1>
          <p className="mt-1 text-ink/80 text-sm">
            Atur nama dan lokasi acuan harga pasar untuk warungmu.
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
              data-tour="settings-name"
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
                data-tour="settings-region"
                value={regionId}
                onChange={(e) => setRegionId(Number(e.target.value))}
                className="mt-1 w-full bg-cream p-3 font-mono brutal-border-2"
              >
                {Object.entries(
                  regions.reduce<Record<string, RegionOption[]>>((acc, r) => {
                    const prov = r.province_name || "Wilayah Lainnya";
                    if (!acc[prov]) acc[prov] = [];
                    acc[prov].push(r);
                    return acc;
                  }, {}),
                ).map(([prov, list]) => (
                  <optgroup key={prov} label={prov}>
                    {list.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="bg-cream p-3 text-xs brutal-border-2">
              Harga kemasan dan biaya kecil diisi untuk setiap menu karena harga grosir dan kebutuhan bungkus bisa berbeda.
            </div>
          </div>

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
          {errorMessage ? (
            <div role="alert" className="bg-critical-red/10 p-3 text-sm font-bold text-critical-red brutal-border-2">
              {errorMessage}
            </div>
          ) : null}

          <button
            data-tour="settings-save"
            type="submit"
            disabled={saving}
            className="brutal-btn bg-ink px-6 py-3 font-heading font-extrabold text-cream disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : turAktif
                ? "Simpan dan buat menu pertama"
                : "Simpan Pengaturan Warung"}
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
      </section>
    </div>
  );
}
