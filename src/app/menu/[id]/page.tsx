"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { MenuItem, MarginCalculation } from "@/lib/types";
import { formatRupiah } from "@/lib/engine/margin";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Layers,
  Store,
  RefreshCw,
} from "lucide-react";

export default function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [menu, setMenu] = useState<MenuItem | null>(null);
  const [calc, setCalc] = useState<MarginCalculation | null>(null);
  const [latestDate, setLatestDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadDetail() {
    try {
      setLoading(true);
      const res = await fetch(`/api/menus/${resolvedParams.id}`);
      if (!res.ok) throw new Error("Menu tidak ditemukan");
      const json = await res.json();
      setMenu(json.menu);
      setCalc(json.calc);
      setLatestDate(json.latest_date);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [resolvedParams.id]);

  async function applySuggestedPrice(newPrice: number) {
    if (!menu) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/menus/${menu.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sell_price: newPrice }),
      });
      if (res.ok) {
        setSuccessMsg(`Harga jual berhasil diubah menjadi ${formatRupiah(newPrice)}`);
        await loadDetail();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading || !menu || !calc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Memuat rincian resep dan harga pasar...</p>
      </div>
    );
  }

  const isCritical = calc.severity === "critical";
  const isWarning = calc.severity === "warning";

  return (
    <div className="space-y-6 pb-16">
      {/* Back link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Ringkasan Warung</span>
        </Link>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Menu */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              {menu.category || "Menu Warung"}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{menu.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Harga di banner: <strong className="text-slate-800 font-semibold">{formatRupiah(menu.sell_price)}</strong>{" "}
              · Modal: {formatRupiah(calc.hpp)} per porsi
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:text-right">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Untung Hari Ini</div>
            <div className="text-xl font-extrabold text-slate-900">{formatRupiah(calc.profit_rp)}</div>
            <div className={`text-xs font-bold ${isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"}`}>
              {calc.margin_pct.toFixed(0)}% dari harga jual
            </div>
          </div>
        </div>

        {/* BR-04: Blok Pembeda Produk (Atribusi Pendorong) */}
        {calc.driver && calc.driver.rp > 50 && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-slate-800">
            <div className="flex items-start gap-2.5">
              <TrendingDown className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Penyebab Untung Berkurang (Atribusi Rupiah)
                </h4>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  Gara-gara: <span className="text-rose-600">{calc.driver.name}</span> naik (+
                  {formatRupiah(calc.driver.rp)} per porsi).
                </p>

                {calc.biggest_pct && calc.biggest_pct.name !== calc.driver.name && (
                  <p className="text-xs text-slate-600 mt-1">
                    ℹ️ Berita mungkin ramai soal <strong>{calc.biggest_pct.name}</strong> yang naik{" "}
                    {calc.biggest_pct.pct.toFixed(0)}%, tapi kontribusinya cuma{" "}
                    <strong>{formatRupiah(calc.biggest_pct.rp)}</strong> per porsi karena porsi resepmu kecil.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BR-07: Saran Penyesuaian Harga */}
        {calc.suggested_price > menu.sell_price && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Saran Penyesuaian Harga (BR-07)</span>
              </div>
              <p className="text-sm text-slate-200 mt-1">
                Jual di harga <strong className="text-white text-base">{formatRupiah(calc.suggested_price)}</strong>{" "}
                agar untung kembali aman di atas 15%.
              </p>
            </div>

            <button
              onClick={() => applySuggestedPrice(calc.suggested_price)}
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shrink-0 shadow-sm disabled:opacity-50"
            >
              {updating ? "Menyimpan..." : `Ubah ke ${formatRupiah(calc.suggested_price)}`}
            </button>
          </div>
        )}
      </div>

      {/* Rincian Resep Batch (BR-08) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h3 className="text-base font-bold text-slate-900">Rincian Resep & Modal</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Sekali masak jadi: <strong className="text-slate-800">{menu.batch_yield} porsi</strong>
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Harga dihitung otomatis dari rata-rata komoditas pangan Bank Indonesia Kota Semarang per {latestDate}.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                <th className="pb-2.5">Bahan</th>
                <th className="pb-2.5 text-center">Sekali Masak Beli</th>
                <th className="pb-2.5 text-right">Harga Pasar</th>
                <th className="pb-2.5 text-right">Modal / Porsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calc.lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-2.5 font-medium text-slate-800">
                    {line.name}
                    {line.is_filled && (
                      <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                        hari kerja lalu
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-center text-slate-600">
                    {line.batch_qty !== null ? `${line.batch_qty} kg` : "—"}
                  </td>
                  <td className="py-2.5 text-right text-slate-600">
                    {line.unit_price !== null ? `${formatRupiah(line.unit_price)}/kg` : "—"}
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatRupiah(line.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-extrabold text-sm text-slate-900">
                <td colSpan={3} className="pt-3 text-right">
                  Total Modal per Porsi:
                </td>
                <td className="pt-3 text-right text-amber-600">{formatRupiah(calc.hpp)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
