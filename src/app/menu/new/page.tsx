"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Sparkles, Store } from "lucide-react";
import { formatRupiah } from "@/lib/engine/margin";

const AVAILABLE_COMMODITIES = [
  { id: "com_ayam", name: "Daging Ayam Ras Segar", unit: "kg", defaultPrice: 38000 },
  { id: "com_beras", name: "Beras Kualitas Medium I", unit: "kg", defaultPrice: 15750 },
  { id: "com_cabai_rawit", name: "Cabai Rawit Hijau", unit: "kg", defaultPrice: 48000 },
  { id: "com_cabai_merah", name: "Cabai Merah Keriting", unit: "kg", defaultPrice: 42000 },
  { id: "com_bawang", name: "Bawang Merah Ukuran Sedang", unit: "kg", defaultPrice: 32000 },
  { id: "com_minyak", name: "Minyak Goreng Curah", unit: "kg", defaultPrice: 17500 },
  { id: "com_telur", name: "Telur Ayam Ras Segar", unit: "kg", defaultPrice: 28000 },
  { id: "com_gula", name: "Gula Pasir Kualitas Premium", unit: "kg", defaultPrice: 18500 },
];

export default function NewMenuPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [sellPrice, setSellPrice] = useState<number | "">(18000);
  const [batchYield, setBatchYield] = useState<number | "">(8);
  const [fixedCost, setFixedCost] = useState<number | "">(1200);
  const [items, setItems] = useState([
    { commodity_id: "com_ayam", name: "Daging Ayam Ras Segar", batch_qty: 2.0, unit: "kg" },
    { commodity_id: "com_beras", name: "Beras Kualitas Medium I", batch_qty: 1.2, unit: "kg" },
    { commodity_id: "com_cabai_rawit", name: "Cabai Rawit Hijau", batch_qty: 0.12, unit: "kg" },
  ]);
  const [saving, setSaving] = useState(false);

  function addItem() {
    setItems([
      ...items,
      { commodity_id: "com_minyak", name: "Minyak Goreng Curah", batch_qty: 0.2, unit: "kg" },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, idx) => idx !== index));
  }

  function updateItem(index: number, field: string, val: string | number) {
    const next = [...items];
    if (field === "name") {
      const found = AVAILABLE_COMMODITIES.find((c) => c.name === val);
      next[index].name = String(val);
      if (found) {
        next[index].commodity_id = found.id;
        next[index].unit = found.unit;
      }
    } else if (field === "batch_qty") {
      next[index].batch_qty = parseFloat(String(val)) || 0;
    }
    setItems(next);
  }

  // Estimasi kasar modal
  const validYield = Number(batchYield) || 1;
  const validFixed = Number(fixedCost) || 0;
  const estimatedHpp =
    items.reduce((acc, it) => {
      const comm = AVAILABLE_COMMODITIES.find((c) => c.name === it.name);
      const price = comm ? comm.defaultPrice : 20000;
      return acc + (it.batch_qty / validYield) * price;
    }, 0) + validFixed;

  const validSell = Number(sellPrice) || 0;
  const estimatedProfit = validSell - estimatedHpp;
  const estimatedMargin = validSell > 0 ? (estimatedProfit / validSell) * 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sellPrice || !batchYield) {
      alert("Mohon lengkapi nama menu, harga jual, dan jumlah porsi.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sell_price: Number(sellPrice),
          batch_yield: Number(batchYield),
          category: "Menu Warung",
          recipe: items,
          fixed_costs: [{ label: "Perkiraan Gas & Kemasan", amount: validFixed }],
        }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        alert("Gagal menyimpan menu.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Ringkasan Warung</span>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Tambah Menu Resep Baru</h1>
        <p className="text-xs text-slate-500 mt-1">
          Tulis resep seperti caramu masak di warung — sekali masak beli berapa kilo, dan jadi berapa porsi.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Nama Menu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Menu apa yang mau dipantau?
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pecel Lele, Ayam Bakar, Nasi Uduk..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Harga Jual & Hasil Porsi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Harga di banner menu (Rp)
              </label>
              <input
                type="number"
                required
                step="500"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">Harga jual ke pembeli per porsi</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sekali masak jadi berapa porsi?
              </label>
              <input
                type="number"
                required
                min="1"
                value={batchYield}
                onChange={(e) => setBatchYield(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">Contoh: sekali masak jadi 8 porsi</span>
            </div>
          </div>

          {/* Bahan-bahan Batch */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bahan yang dibeli untuk sekali masak
              </label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bahan</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={it.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {AVAILABLE_COMMODITIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.unit})
                      </option>
                    ))}
                  </select>

                  <div className="w-24 sm:w-28 relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={it.batch_qty}
                      onChange={(e) => updateItem(idx, "batch_qty", e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-medium">
                      {it.unit}
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Biaya Tambahan Gas / Kemasan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Perkiraan Gas & Kemasan per Porsi (Rp)
            </label>
            <input
              type="number"
              value={fixedCost}
              onChange={(e) => setFixedCost(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Kotak Estimasi Modal Instan */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Perkiraan Modal per Porsi:</span>
              <span className="font-bold text-slate-900">{formatRupiah(estimatedHpp)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
              <span>Perkiraan Untung:</span>
              <span className="font-bold text-emerald-700">
                {formatRupiah(estimatedProfit)} ({estimatedMargin.toFixed(0)}%)
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {saving ? "Menyimpan Menu..." : "Simpan dan Mulai Pantau"}
          </button>
        </form>
      </div>
    </div>
  );
}
