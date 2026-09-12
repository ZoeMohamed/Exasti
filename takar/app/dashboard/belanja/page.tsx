"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/formatRupiah";
import Link from "next/link";

interface CommodityOption {
  id: string;
  name: string;
  unit: string;
  current_price: string;
}

interface ScannedItem {
  commodity_id: string;
  price: number;
  accuracy: string;
}

interface UserPriceHistory {
  commodity_id: string;
  name: string;
  unit: string;
  price: number;
  date: string;
  source: string;
}

export default function BelanjaPage() {
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [receiptHistory, setReceiptHistory] = useState<UserPriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // 1. Ambil daftar komoditas dari database Supabase
  useEffect(() => {
    fetch("/api/commodities")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.commodities) {
          setCommodities(data.commodities);
        }
      })
      .catch(console.error);

    fetchHistory();
  }, []);

  function fetchHistory() {
    setHistoryLoading(true);
    fetch("/api/prices")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.prices) {
          setReceiptHistory(data.prices);
        }
      })
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }

  // Simulasi OCR membaca nota belanja berdasarkan komoditas riil dari database
  function handleScan() {
    setLoading(true);
    setSaveSuccess(null);

    setTimeout(() => {
      setLoading(false);
      setDone(true);

      // Ambil 3 komoditas riil dari database yang paling sering dibeli
      const ayam = commodities.find((c) => c.id.toLowerCase().includes("ayam")) || commodities[0];
      const cabai = commodities.find((c) => c.id.toLowerCase().includes("cabai rawit")) || commodities[1];
      const minyak = commodities.find((c) => c.id.toLowerCase().includes("minyak")) || commodities[2];

      const detected: ScannedItem[] = [];
      if (ayam) {
        detected.push({
          commodity_id: ayam.id,
          price: Math.round(Number(ayam.current_price) * 1.02) || 41000,
          accuracy: "98%",
        });
      }
      if (cabai) {
        detected.push({
          commodity_id: cabai.id,
          price: Math.round(Number(cabai.current_price) * 0.98) || 62000,
          accuracy: "95%",
        });
      }
      if (minyak) {
        detected.push({
          commodity_id: minyak.id,
          price: Math.round(Number(minyak.current_price)) || 17000,
          accuracy: "92%",
        });
      }

      setItems(detected);
    }, 800);
  }

  function updateItemPrice(index: number, newPrice: number) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, price: newPrice } : item))
    );
  }

  function updateItemCommodity(index: number, newCommodityId: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, commodity_id: newCommodityId } : item))
    );
  }

  function addItem() {
    if (commodities.length === 0) return;
    const defaultComm = commodities[0];
    setItems((current) => [
      ...current,
      {
        commodity_id: defaultComm.id,
        price: Number(defaultComm.current_price) || 20000,
        accuracy: "Manual",
      },
    ]);
    setDone(true);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function handleSavePrices() {
    if (items.length === 0) return;
    setSaving(true);
    setSaveSuccess(null);

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            commodity_id: it.commodity_id,
            price: it.price,
          })),
        }),
      });

      const data = await res.json();
      if (data.status === "ok") {
        setSaveSuccess(data.message);
        setDone(false);
        setItems([]);
        fetchHistory();
      } else {
        alert("Gagal menyimpan: " + data.message);
      }
    } catch (err: unknown) {
      alert("Terjadi kesalahan saat menyimpan ke database.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
        >
          ⬅ Kembali ke Beranda
        </Link>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold brutal-border-2">
          Terhubung ke Database: {commodities.length} Komoditas Siap Dipetakan
        </span>
      </div>

      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="bg-bright-green px-2.5 py-0.5 font-mono text-xs font-bold brutal-border-2">
          OTOMATIS MASUK BUKU KAS & DATABASE
        </span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl">
          “Foto nota, biar Takar yang catat ke database.”
        </h1>
        <p className="mt-2 max-w-2xl text-ink/80 text-sm sm:text-base">
          Unggah nota dari pasar atau toko kelontong. Harga bahan yang kamu beli akan langsung mengupdate modal dan untung menu warungmu di Supabase.
        </p>

        {saveSuccess && (
          <div className="mt-4 bg-bright-green/20 border-2 border-bright-green p-4 font-mono text-sm font-bold text-ink">
            ✅ {saveSuccess}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Sisi Kiri: Upload / Kamera */}
          <div className="flex min-h-80 flex-col items-center justify-center bg-cream p-6 text-center border-2 border-dashed border-ink">
            <div className="mb-5 w-52 rotate-[-2deg] bg-white p-4 brutal-border-2 shadow-[2px_2px_0_#111]">
              <div className="font-mono text-[10px] leading-relaxed text-left">
                <b>PASAR JOHAR SEMARANG</b>
                <br />
                TGL: {new Date().toISOString().split("T")[0]}
                <br />
                ----------------------------
                <br />
                AYAM POTONG 2KG ........ 82.000
                <br />
                CABAI RAWIT 1KG ........ 62.000
                <br />
                MINYAK CURAH 2L ........ 34.000
                <br />
                ----------------------------
                <br />
                <b>TOTAL ................ 178.000</b>
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={loading}
              className="brutal-btn w-full max-w-xs bg-critical-red px-4 py-3 font-heading font-extrabold text-white"
            >
              {loading ? "“Sedang Membaca Nota…”" : "📷 Foto / Scan Nota Belanja"}
            </button>
            <button
              onClick={handleScan}
              disabled={loading}
              className="brutal-btn mt-3 w-full max-w-xs bg-white px-4 py-2.5 text-xs font-heading font-bold"
            >
              Pilih Foto Dari Galeri HP
            </button>
            <button
              onClick={addItem}
              className="mt-4 text-xs font-heading font-bold underline hover:text-critical-red"
            >
              + Atau Input Belanja Manual
            </button>
          </div>

          {/* Sisi Kanan: Verifikasi & Simpan ke DB */}
          <div className="border-t-8 border-t-warning-yellow bg-cream-surface p-6 brutal-card">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-critical-red">
                Verifikasi Data
              </span>
              {done && (
                <button
                  onClick={addItem}
                  className="bg-white px-2 py-1 text-xs font-mono font-bold brutal-border"
                >
                  + Tambah Baris
                </button>
              )}
            </div>
            <h2 className="font-heading text-xl font-extrabold mt-1">
              “Cek dulu sebelum disimpan ke database.”
            </h2>
            <p className="my-2 text-xs text-ink/70">
              Pastikan nama bahan dan harga per kilogram sesuai dengan bon belanjamu.
            </p>

            {done && items.length > 0 ? (
              <div className="mt-4 space-y-3">
                {items.map((item, index) => {
                  const comm = commodities.find((c) => c.id === item.commodity_id);
                  return (
                    <div key={index} className="bg-white p-3.5 brutal-border-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={item.commodity_id}
                          onChange={(e) => updateItemCommodity(index, e.target.value)}
                          className="bg-cream font-heading font-bold text-xs p-1.5 border border-ink flex-1"
                        >
                          {commodities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.unit})
                            </option>
                          ))}
                        </select>
                        <span className="bg-bright-green/30 px-1.5 py-0.5 text-[10px] font-mono border border-ink whitespace-nowrap">
                          {item.accuracy}
                        </span>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-critical-red font-mono text-xs font-bold px-1"
                          title="Hapus baris"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-ink/70">
                          Harga per {comm?.unit || "kg"}:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm font-bold">Rp</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemPrice(index, Number(e.target.value))}
                            className="w-32 bg-cream font-mono font-bold text-sm p-1.5 border border-ink text-right"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleSavePrices}
                  disabled={saving}
                  className="brutal-btn mt-4 w-full bg-bright-green px-4 py-3 font-heading font-extrabold text-ink"
                >
                  {saving ? "Menyimpan ke Supabase..." : "💾 Simpan ke Database & Update Untung Menu"}
                </button>
              </div>
            ) : (
              <div className="mt-6 bg-warning-yellow/20 p-8 text-center font-heading font-bold brutal-border-2">
                Belum ada nota yang dipindai. Klik tombol foto di samping untuk mulai.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Riwayat Belanja Warung dari Database Supabase */}
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-ink pb-4">
          <div>
            <h2 className="font-heading text-2xl font-extrabold">
              Riwayat Harga Nota Warungmu
            </h2>
            <p className="text-xs text-ink/70">
              Data harga yang telah kamu catat di database Supabase (prioritas di atas harga rata-rata BI).
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="brutal-btn bg-cream px-3 py-1.5 font-mono text-xs font-bold"
          >
            🔄 Muat Ulang
          </button>
        </div>

        {historyLoading ? (
          <div className="py-8 text-center font-mono text-xs">Memuat riwayat dari database...</div>
        ) : receiptHistory.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {receiptHistory.map((rec, i) => (
              <div key={i} className="bg-cream p-3 brutal-border-2 flex justify-between items-center">
                <div>
                  <strong className="font-heading text-sm block">{rec.name}</strong>
                  <span className="font-mono text-[11px] text-ink/70">
                    {new Date(rec.date).toISOString().split("T")[0]} · {rec.source}
                  </span>
                </div>
                <div className="text-right">
                  <strong className="font-mono text-base text-critical-red">
                    {formatRupiah(rec.price)}
                  </strong>
                  <span className="block font-mono text-[10px] text-ink/60">/{rec.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 bg-cream p-6 text-center font-mono text-xs text-ink/70 brutal-border-2">
            Belum ada riwayat nota yang tersimpan. Setiap kali kamu memindai nota, harga belanjamu akan muncul di sini.
          </div>
        )}
      </section>
    </div>
  );
}
