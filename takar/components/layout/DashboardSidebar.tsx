"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Beranda", "/dashboard"],
  ["Daftar Menu", "/dashboard/menu"],
  ["Tambah Menu", "/dashboard/menu/tambah"],
  ["Catat Nota Belanja", "/dashboard/belanja"],
  ["Coba Perubahan Harga", "/dashboard/simulator"],
  ["Pengaturan Warung", "/dashboard/pengaturan"],
] as const;

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/dashboard/menu")
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) && pathname !== "/dashboard/menu/tambah")
    );
  return pathname === href;
}

interface DashboardSidebarProps {
  businessName?: string;
  regionName?: string;
  criticalCount?: number;
  menuCount?: number;
  lastSyncText?: string;
  priceDateText?: string | null;
  priceStale?: boolean;
}

export function DashboardSidebar({
  businessName = "Warung Bu Sri",
  regionName = "Kota Semarang",
  criticalCount = 1,
  menuCount = 6,
  lastSyncText = "Hari ini",
  priceDateText,
  priceStale = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col justify-between border-r-[3px] border-ink bg-cream p-5 sticky top-0 h-screen">
      <div>
        <Link
          href="/dashboard"
          className="relative mb-6 block rotate-[-1deg] bg-warning-yellow p-4 brutal-border shadow-[4px_4px_0_#111]"
        >
          <span className="absolute right-[-8px] top-[-12px] rotate-6 bg-critical-red px-2 py-0.5 font-mono text-[10px] font-bold text-white brutal-border-2">
            HARGA TERBARU
          </span>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Takar" className="h-15 w-auto" />
          </div>
        </Link>

        <div className="mb-6 bg-white p-2.5 font-mono text-xs font-bold brutal-border-2 shadow-[2px_2px_0_#111]">
          <div>
            {regionName}, Jawa Tengah
            <div className="font-normal text-ink/60">
              Harga pasar: {priceDateText ?? "belum tersedia"}{priceStale ? " — perlu diperbarui" : ""}
            </div>
            <div className="font-normal text-ink/60">
              Diperbarui: {lastSyncText}
            </div>
          </div>
        </div>

        <nav className="space-y-2.5" aria-label="Navigasi utama">
          {links.map(([label, href]) => {
            const active = isActiveRoute(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                data-tour={href === "/dashboard/pengaturan" ? "nav-settings" : undefined}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 font-heading font-bold brutal-border-2 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[4px_4px_0_#111] ${active ? "bg-white shadow-[4px_4px_0_#111]" : ""}`}
              >
                <span>{label}</span>
                {label === "Beranda" && criticalCount > 0 && (
                  <span className="ml-auto bg-critical-red px-1.5 text-xs text-white border border-ink">
                    {criticalCount}
                  </span>
                )}
                {label === "Daftar Menu" && (
                  <span className="ml-auto bg-cream-surface px-1.5 text-xs border border-ink">
                    {menuCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 border-t-2 border-ink pt-4">
        <div className="relative bg-cream-surface p-3 brutal-border-2 shadow-[2px_2px_0_#111]">
          <span className="absolute right-2 top-[-12px] bg-accent-green px-1.5 py-0.5 font-mono text-[10px] font-bold text-white border border-ink">
            WARUNGMU
          </span>
          <p className="font-heading text-sm font-bold">{businessName}</p>
          <p className="font-mono text-xs text-ink/70">{regionName}</p>
        </div>
      </div>
    </aside>
  );
}
