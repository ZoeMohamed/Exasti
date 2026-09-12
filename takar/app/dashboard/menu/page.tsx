import Link from "next/link";
import { calculateDynamicMenus } from "@/lib/services/menu-engine";
import { MenuList } from "@/components/menu/MenuList";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { menus, latestDate } = await calculateDynamicMenus();

  const formattedDate = (() => {
    try {
      const d = new Date(latestDate);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch {}
    return latestDate;
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
            Menu Warung
          </h1>
          <p className="text-sm text-ink/70">
            Total {menus.length} menu aktif dipantau secara langsung berdasarkan harga pasar
            Kota Semarang ({formattedDate}).
          </p>
        </div>
        <Link
          href="/dashboard/menu/tambah"
          className="brutal-btn bg-warning-yellow px-5 py-2.5 font-heading text-sm font-extrabold"
        >
          + Tambah Menu Baru
        </Link>
      </header>
      <MenuList menus={menus} />
      <div className="bg-cream p-6 brutal-card">
        <h2 className="font-heading text-lg font-bold">
          💡 Informasi Perhitungan Modal
        </h2>
        <p className="mt-1 text-sm text-ink/80">
          Setiap menu dihitung dari takaran resep batch (sekali masak) dibagi jumlah porsi yang dihasilkan, kemudian dikalikan harga harian komoditas Bank Indonesia.
        </p>
      </div>
    </div>
  );
}
