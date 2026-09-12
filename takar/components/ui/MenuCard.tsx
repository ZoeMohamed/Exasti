import Link from "next/link";
import type { Menu } from "@/types/menu";
import { formatRupiah } from "@/lib/formatRupiah";
import { statusClass, statusLabel } from "@/lib/utils";

export function MenuCard({ menu }: { menu: Menu }) {
  return (
    <Link
      href={`/dashboard/menu/${menu.id}`}
      className="block cursor-pointer bg-white p-5 brutal-card"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`px-2.5 py-0.5 text-xs font-heading font-extrabold brutal-border-2 ${statusClass(menu.status)}`}
        >
          {statusLabel(menu.status)} ({menu.margin.toLocaleString("id-ID")}%)
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
        aria-label={`Untung ${menu.margin} dari tiap seratus rupiah penjualan`}
      >
        <div
          className="h-full bg-ink"
          style={{ width: `${Math.max(0, Math.min(100, menu.margin))}%` }}
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between bg-cream p-3 brutal-border-2">
        <div>
          <span className="font-mono text-[11px] uppercase text-ink/70">
            Untung per porsi:
          </span>
          <div
            className={`font-mono text-2xl font-bold ${menu.status === "sehat" ? "text-accent-green" : "text-critical-red"}`}
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
      <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
        <span className="font-semibold">
          {menu.icon} Pendorong: {menu.driver}
        </span>
        <span className="font-mono text-[11px] text-ink/60">
          {menu.servingsPerWeek} porsi/minggu
        </span>
      </div>
    </Link>
  );
}
