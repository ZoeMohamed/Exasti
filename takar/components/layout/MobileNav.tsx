import Link from "next/link";
const links = [
  ["Beranda", "/dashboard"],
  ["Menu", "/dashboard/menu"],
  ["Coba Harga", "/dashboard/simulator"],
  ["Setelan", "/dashboard/pengaturan"],
] as const;
export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-[3px] border-ink bg-white p-1 shadow-[0_-4px_0_#111] md:hidden">
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-11 flex-1 items-center justify-center px-1 py-2 text-center font-heading text-[11px] font-bold"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
