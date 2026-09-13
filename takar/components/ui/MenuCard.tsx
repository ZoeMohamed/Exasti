import Link from "next/link";
import type { Menu } from "@/types/menu";
import { formatRupiah } from "@/lib/formatRupiah";
import { statusClass, statusLabel } from "@/lib/utils";

export function MenuCard({ menu }: { menu: Menu }) {
  return (
    <Link
      href={`/dashboard/menu/${menu.id}`}
      prefetch={false}
      className="block cursor-pointer bg-white p-5 brutal-card"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`px-2.5 py-0.5 text-xs font-heading font-extrabold brutal-border-2 ${statusClass(menu.status)}`}
        >
          {statusLabel(menu.status)} ({menu.profitRate.toLocaleString("id-ID")}%)
        </span>
        <span className="font-mono text-[11px] text-ink/60">
          Harga: {formatRupiah(menu.price)}
        </span>
      </div>
      <h3 className="mt-2 font-heading text-xl font-extrabold">{menu.name}</h3>

      {/* FR-22 — penanda ketiga: panjang bar proporsional.
          Hilangkan seluruh warna dari layar, keadaan menu harus tetap terbaca
          dari label teks, panjang bar, dan angka rupiah. */}
      <div
        className="mt-2 h-2 w-full overflow-hidden bg-ink/10 brutal-border"
        role="img"
        aria-label={`Untung ${menu.profitRate} dari tiap seratus rupiah penjualan`}
      >
        <div
          className="h-full bg-ink"
          style={{ width: `${Math.max(0, Math.min(100, menu.profitRate))}%` }}
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between bg-cream p-3 brutal-border-2">
        <div>
          <span className="font-mono text-[11px] uppercase text-ink/70">
            Untung per porsi:
          </span>
          <div
            className={`font-mono text-2xl font-bold ${
              menu.status === "sehat"
                ? "text-accent-green"
                : menu.status === "diistirahatkan"
                  ? "text-ink/60"
                  : "text-critical-red"
            }`}
          >
            {formatRupiah(menu.profit)}
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-[11px] uppercase text-ink/70">
            Modal:
          </span>
          <div className="font-mono text-sm font-bold">
            {formatRupiah(menu.modal)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 border-t border-ink/10 pt-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold">
          Biaya terbesar: {menu.driver}
        </span>
        <span className="font-mono text-[11px] text-ink/60 sm:shrink-0 sm:text-right">
          {menu.servingsPerWeek} porsi/minggu
        </span>
      </div>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink/55">
        Belum dikurangi sewa tempat, listrik bulanan, dan gaji pemilik.
      </p>
    </Link>
  );
}
