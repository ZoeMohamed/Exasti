import Link from "next/link";
import { calculateDynamicMenus, getDbBusinessProfile } from "@/lib/services/menu-engine";
import { MenuList } from "@/components/menu/MenuList";
import { tanggalIndonesia } from "@/lib/tanggal";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [{ menus, latestDate }, profile] = await Promise.all([
    calculateDynamicMenus(),
    getDbBusinessProfile(),
  ]);

  const formattedDate = tanggalIndonesia(latestDate);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
            Menu Warung
          </h1>
          <p className="text-sm text-ink/70">
          Total {menus.filter((menu) => menu.status !== "diistirahatkan").length} menu aktif dari {menus.length} menu dihitung memakai harga pasar {profile.region_name} ({formattedDate}).
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
          Cara Takar Menghitung Modal
        </h2>
        <p className="mt-1 text-sm text-ink/80">
          Total bahan untuk sekali masak dibagi jumlah porsi yang dihasilkan. Hasilnya dihitung memakai harga bahan terbaru yang tersedia.
        </p>
      </div>
    </div>
  );
}
