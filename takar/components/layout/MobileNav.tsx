import Link from "next/link";
const links = [
  ["🏠", "Beranda", "/dashboard"],
  ["📋", "Menu", "/dashboard/menu"],
  ["📸", "Nota", "/dashboard/belanja"],
  ["🎚️", "Simulasi", "/dashboard/simulator"],
  ["⚙️", "Setelan", "/dashboard/pengaturan"],
] as const;
export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-[3px] border-ink bg-white p-1 shadow-[0_-4px_0_#111] md:hidden">
      {links.map(([icon, label, href]) => (
        <Link
          key={href}
          href={href}
          className="flex-1 py-2 text-center font-heading text-[10px] font-bold"
        >
          <span className="block text-lg leading-none">{icon}</span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
