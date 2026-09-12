"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { MenuItem, MarginCalculation } from "@/lib/types";
import { formatRupiah } from "@/lib/engine/margin";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
        <RefreshCw className="w-7 h-7 text-[#22683B] animate-spin" />
        <p className="text-sm font-medium text-[#78716C]">Memuat rincian resep dan harga pasar...</p>
      </div>
    );
  }

  const isWarning = calc.severity === "warning" || calc.severity === "critical";
  const isCritical = calc.severity === "critical";
  const previousProfit = calc.profit_rp + (calc.driver ? calc.driver.rp : 0);

  // Sparkline visual bars (30 hari riwayat)
  const sparklineHeights = [30, 29, 28, 28, 26, 24, 25, 21, 18, 16, 13, 11];

  return (
    <div className="space-y-5 pb-16">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Ringkasan Warung</span>
        </Link>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-[#DCF0E0] border border-[#22683B]/30 text-[#164F2B] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#22683B] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Judul Menu */}
      <div className="text-[22px] font-semibold text-[#1C1917]">{menu.name}</div>

      {/* Untung Row Sesuai design/DetailMenu.dc.html */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        {isWarning && previousProfit > calc.profit_rp && (
          <span className="text-[17px] text-[#78716C] line-through">
            {formatRupiah(previousProfit)}
          </span>
        )}
        <span
          className={`text-[30px] font-bold tracking-tight ${
            isCritical ? "text-[#9A3322]" : isWarning ? "text-[#956300]" : "text-[#22683B]"
          }`}
        >
          {formatRupiah(calc.profit_rp)}
        </span>
        <span className="text-[15px] text-[#78716C]">({calc.margin_pct.toFixed(0)}%)</span>
      </div>

      {/* Sparkline 30 Hari Terakhir */}
      <div>
        <div className="flex gap-[3px] h-8 items-end">
          {sparklineHeights.map((h, i) => (
            <div
              key={i}
              className="w-[7px] bg-[#D6D3D1] rounded-[1px]"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <div className="text-[12px] text-[#78716C] mt-1.5">30 hari terakhir</div>
      </div>

      {/* Box Gara-gara Sesuai design/DetailMenu.dc.html */}
      {calc.driver && calc.driver.rp > 50 && (
        <div className="border-2 border-[#1C1917] rounded-xl p-4 sm:p-5 bg-white">
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wider uppercase text-[#956300]">
            <AlertTriangle className="w-4 h-4" />
            <span>Gara-gara</span>
          </div>

          <div className="text-[20px] font-semibold text-[#1C1917] leading-snug mt-2.5">
            {calc.driver.name} naik {calc.driver.pct.toFixed(0)}%
          </div>
          <div className="text-[15px] text-[#78716C] mt-1">
            Menyumbang kenaikan modal +{formatRupiah(calc.driver.rp)} per porsi
          </div>

          {calc.biggest_pct && calc.biggest_pct.name !== calc.driver.name && (
            <div className="border-t border-[#E7E5E4] mt-4 pt-3.5">
              <div className="text-[15px] font-semibold text-[#1C1917] mb-1">
                Bukan {calc.biggest_pct.name.toLowerCase()}
              </div>
              <div className="text-[15px] leading-relaxed text-[#78716C]">
                {calc.biggest_pct.name} memang naik {calc.biggest_pct.pct.toFixed(0)}%, tapi di menumu
                kontribusinya cuma {formatRupiah(calc.biggest_pct.rp)} per porsi karena porsi resepmu kecil.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saran Harga Baru */}
      {calc.suggested_price > menu.sell_price && (
        <div>
          <div className="text-[15px] leading-relaxed text-[#1C1917]">
            Kalau mau untungmu balik seperti dulu:
          </div>
          <div className="text-[26px] font-bold text-[#1C1917] my-1.5">
            jual {formatRupiah(calc.suggested_price)}
          </div>
          <button
            onClick={() => applySuggestedPrice(calc.suggested_price)}
            disabled={updating}
            className="w-full flex items-center justify-center min-h-[52px] rounded-xl text-[17px] font-semibold border-none bg-[#1C1917] text-[#FAFAF9] hover:bg-[#292524] transition shadow-xs disabled:opacity-50"
          >
            {updating ? "Menyimpan..." : "Ubah harga jual"}
          </button>
        </div>
      )}

      {/* Rincian Modal Per Porsi */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 text-[16px] font-semibold pb-1.5 border-b-[1.5px] border-[#E7E5E4] text-[#1C1917]">
          <span className="flex-grow">Rincian modal</span>
          <ChevronDown className="w-4 h-4 text-[#78716C]" />
        </div>

        <div className="divide-y divide-transparent">
          {calc.lines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2 py-2.5 text-[15px]">
              <span className="flex-grow text-[#1C1917] font-normal">{line.name}</span>
              <span className="text-[#78716C] text-[13px]">
                {line.batch_qty !== null ? `${line.batch_qty} kg → ${menu.batch_yield} porsi` : "perkiraan"}
              </span>
              <span className="font-medium w-20 text-right text-[#1C1917]">
                {formatRupiah(line.subtotal)}
              </span>
            </div>
          ))}

          <div className="flex py-3 border-t-[1.5px] border-[#E7E5E4] text-[16px] font-semibold text-[#1C1917]">
            <span className="flex-grow">Modal per porsi</span>
            <span>{formatRupiah(calc.hpp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
