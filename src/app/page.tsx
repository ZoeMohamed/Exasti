"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuItem, MarginCalculation } from "@/lib/types";
import { formatRupiah } from "@/lib/engine/margin";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronRight,
  Plus,
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
        <RefreshCw className="w-7 h-7 text-[#22683B] animate-spin" />
        <p className="text-sm font-medium text-[#78716C]">Menghitung untung warung terhadap harga BI...</p>
      </div>
    );
  }

  const formattedDate = latestDate
    ? new Date(latestDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    : "Hari ini";

  return (
    <div className="space-y-4 pb-12">
      {/* Header Warung Sesuai Design System */}
      <div className="flex items-baseline justify-between pt-1">
        <h1 className="text-[20px] font-semibold text-[#1C1917] tracking-tight">Warung Bu Sri</h1>
        <div className="text-[14px] text-[#78716C]">{formattedDate}</div>
      </div>

      {/* Subline: Harga hari ini sudah masuk */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] text-[#22683B] font-medium">
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>Harga hari ini sudah masuk</span>
        </div>

        <button
          onClick={triggerSync}
          disabled={syncing}
          className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 transition"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-[#22683B]" : ""}`} />
          <span>{syncing ? "Memperbarui..." : "Perbarui"}</span>
        </button>
      </div>

      {/* Daftar Menu List Sesuai design/Dashboard.dc.html */}
      <div className="pt-2">
        {data.map(({ menu, calc }) => {
          const isWarning = calc.severity === "warning" || calc.severity === "critical";
          const isCritical = calc.severity === "critical";

          // Bar color sesuai GUIDELINE: Oker untuk warning, Bata untuk rugi/critical, Hijau merek untuk sehat
          let barColor = "bg-[#22683B]";
          let iconColor = "text-[#22683B]";
          if (isCritical) {
            barColor = "bg-[#9A3322]";
            iconColor = "text-[#9A3322]";
          } else if (isWarning) {
            barColor = "bg-[#956300]";
            iconColor = "text-[#956300]";
          }

          const previousProfit = calc.profit_rp + (calc.driver ? calc.driver.rp : 0);

          return (
            <Link
              key={menu.id}
              href={`/menu/${menu.id}`}
              className="block py-4 border-b border-[#E7E5E4] group hover:bg-[#F1F5F1]/50 px-2 -mx-2 rounded-lg transition"
            >
              {/* Row 1: Icon + Title */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`${iconColor} flex shrink-0`}>
                  {isWarning ? (
                    <AlertTriangle className="w-[18px] h-[18px] stroke-[2]" />
                  ) : (
                    <Check className="w-[18px] h-[18px] stroke-[2.5]" />
                  )}
                </span>
                <span className="flex-grow text-[17px] font-semibold text-[#1C1917] group-hover:text-[#22683B] transition">
                  {menu.name}
                </span>
                <ChevronRight className="w-4 h-4 text-[#A8A29E] group-hover:text-[#1C1917] transition" />
              </div>

              {/* Row 2: Progress Bar + Profit + Percentage */}
              <div className="flex items-center gap-3">
                <div className="flex-grow h-[10px] bg-[#E7E5E4] rounded-[5px] overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-[5px] transition-all duration-500`}
                    style={{ width: `${Math.min(Math.max(calc.margin_pct, 6), 100)}%` }}
                  />
                </div>
                <div className="text-[17px] font-semibold text-[#1C1917] whitespace-nowrap">
                  {formatRupiah(calc.profit_rp)}
                </div>
                <div className="text-[14px] text-[#78716C] w-10 text-right">
                  ({calc.margin_pct.toFixed(0)}%)
                </div>
              </div>

              {/* Row 3: Status Penurunan atau Tetap */}
              <div className="text-[14px] text-[#78716C] mt-1.5 flex items-center justify-between">
                {isWarning && calc.driver && calc.driver.rp > 50 ? (
                  <span>
                    turun dari {formatRupiah(previousProfit)} ·{" "}
                    <strong className="text-[#1C1917] font-medium">
                      gara-gara {calc.driver.name.toLowerCase()} naik
                    </strong>
                  </span>
                ) : (
                  <span>tetap</span>
                )}
                <span className="text-[12px] text-[#A8A29E]">jual {formatRupiah(menu.sell_price)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Catatan Kaki Sesuai design/Dashboard.dc.html */}
      <div className="pt-3 flex gap-2 items-start text-[13px] leading-relaxed text-[#78716C]">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#A8A29E]" />
        <span>Angka untung belum dikurangi sewa dan listrik bulanan.</span>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#E7E5E4] p-6">
          <p className="text-sm text-[#78716C]">Belum ada menu yang didaftarkan.</p>
          <Link
            href="/menu/new"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#22683B] rounded-lg hover:bg-[#164F2B] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu Pertama</span>
          </Link>
        </div>
      )}
    </div>
  );
}
