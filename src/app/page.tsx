"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuItem, MarginCalculation } from "@/lib/types";
import { formatRupiah } from "@/lib/engine/margin";
import {
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
  Plus,
  Flame,
  Info,
} from "lucide-react";

interface EvaluatedMenu {
  menu: MenuItem;
  calc: MarginCalculation;
}

export default function DashboardPage() {
  const [data, setData] = useState<EvaluatedMenu[]>([]);
  const [latestDate, setLatestDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadMenus() {
    try {
      setLoading(true);
      const res = await fetch("/api/menus");
      const json = await res.json();
      if (json.menus) {
        setData(json.menus);
        setLatestDate(json.latest_date);
      }
    } catch (err) {
      console.error("Gagal memuat menu:", err);
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync() {
    try {
      setSyncing(true);
      await fetch("/api/ingest");
      await loadMenus();
    } catch (err) {
      console.error("Gagal sinkronisasi data BI:", err);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadMenus();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Menghitung untung warung terhadap harga BI...</p>
      </div>
    );
  }

  const criticalMenus = data.filter((m) => m.calc.severity === "critical" || m.calc.severity === "warning");
  const topCritical = data[0]; // Menu dengan untung terendah

  return (
    <div className="space-y-6 pb-12">
      {/* Peringatan Utama (Detektor Asap) */}
      {topCritical && topCritical.calc.margin_pct < 20 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Perlu Segera Dicek
                </span>
                <span className="text-xs text-rose-600 font-medium">· 1 menu untungnya tipis</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                {topCritical.menu.name} sisa untung {formatRupiah(topCritical.calc.profit_rp)} (
                {topCritical.calc.margin_pct.toFixed(0)}%)
              </h2>
              {topCritical.calc.driver && (
                <p className="text-sm text-slate-700 mt-1">
                  Gara-gara <strong className="text-rose-900 font-semibold">{topCritical.calc.driver.name}</strong>{" "}
                  naik (+{formatRupiah(topCritical.calc.driver.rp)} per porsi).
                  {topCritical.calc.biggest_pct &&
                    topCritical.calc.biggest_pct.name !== topCritical.calc.driver.name && (
                      <span className="text-slate-600 ml-1">
                        Bukan {topCritical.calc.biggest_pct.name.toLowerCase()} — meski naik{" "}
                        {topCritical.calc.biggest_pct.pct.toFixed(0)}%, porsinya kecil.
                      </span>
                    )}
                </p>
              )}
              <div className="mt-3">
                <Link
                  href={`/menu/${topCritical.menu.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-xs"
                >
                  <span>Lihat Saran Penyesuaian</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Baris Judul & Tombol Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Kondisi Untung Menu</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diurutkan dari yang untungnya paling tipis · Harga BI per {latestDate || "hari ini"}
          </p>
        </div>

        <button
          onClick={triggerSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-amber-500" : "text-slate-500"}`} />
          <span>{syncing ? "Memperbarui..." : "Cek Harga BI"}</span>
        </button>
      </div>

      {/* Daftar Menu Card */}
      <div className="space-y-3.5">
        {data.map(({ menu, calc }, index) => {
          const isCritical = calc.severity === "critical";
          const isWarning = calc.severity === "warning";
          const isSafe = calc.severity === "safe";

          let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
          let badgeText = "Untung Sehat";
          let barColor = "bg-emerald-500";

          if (isCritical) {
            badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
            badgeText = "Perlu Dicek";
            barColor = "bg-rose-500";
          } else if (isWarning) {
            badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
            badgeText = "Untung Tipis";
            barColor = "bg-amber-500";
          }

          return (
            <Link
              key={menu.id}
              href={`/menu/${menu.id}`}
              className="block group bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-slate-300 hover:shadow-md transition relative overflow-hidden"
            >
              {/* Top Row: Nama & Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition">
                      {menu.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Harga jual: <strong className="text-slate-800 font-semibold">{formatRupiah(menu.sell_price)}</strong>{" "}
                    · Modal: {formatRupiah(calc.hpp)}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {badgeText}
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    Untung {formatRupiah(calc.profit_rp)}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    ({calc.margin_pct.toFixed(0)}% dari harga jual)
                  </div>
                </div>
              </div>

              {/* Margin Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${Math.min(Math.max(calc.margin_pct, 5), 100)}%` }}
                  />
                </div>
              </div>

              {/* Bottom Note: Gara-gara atau Kondisi */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                {calc.driver && calc.driver.rp > 50 ? (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>
                      Gara-gara <strong className="text-slate-800 font-semibold">{calc.driver.name}</strong> naik{" "}
                      (+{formatRupiah(calc.driver.rp)})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Biaya bahan stabil minggu ini</span>
                  </div>
                )}

                <span className="text-slate-400 group-hover:text-amber-600 font-medium flex items-center gap-1 text-[11px]">
                  <span>Rincian</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty State jika belum ada menu */}
      {data.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <p className="text-sm font-medium text-slate-600">Belum ada menu yang didaftarkan.</p>
          <Link
            href="/menu/new"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu Pertama</span>
          </Link>
        </div>
      )}
    </div>
  );
}
