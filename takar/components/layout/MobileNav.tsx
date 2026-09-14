"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["Beranda", "/dashboard"],
  ["Menu", "/dashboard/menu"],
  ["Coba Harga", "/dashboard/simulator"],
  ["Setelan", "/dashboard/pengaturan"],
] as const;
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-[3px] border-ink bg-white p-1 shadow-[0_-4px_0_#111] md:hidden">
      {links.map(([label, href]) => {
        const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            data-tour={href === "/dashboard/pengaturan" ? "nav-settings" : undefined}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center px-1 py-2 text-center font-heading text-[11px] font-bold ${active ? "bg-warning-yellow brutal-border-2" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
