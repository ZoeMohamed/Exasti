import Link from "next/link";
import { MenuList } from "@/components/menu/MenuList";

export default function MenuPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
            Menu Warung
          </h1>
          <p className="text-sm text-ink/70">
            Total 12 menu aktif dipantau secara langsung berdasarkan harga pasar
            Semarang hari ini.
          </p>
        </div>
        <Link
          href="/dashboard/menu/tambah"
          className="brutal-btn bg-warning-yellow px-5 py-2.5 font-heading text-sm font-extrabold"
        >
          + Tambah Menu Baru
        </Link>
      </header>
      <MenuList />
      <div className="bg-cream p-6 brutal-card">
        <h2 className="font-heading text-lg font-bold">
          💡 Contoh Panduan Jika Menu Kosong
        </h2>
        <p className="mt-1 text-sm text-ink/80">
          Tambahkan satu menu dulu. Dalam sekitar 2 menit kamu sudah bisa
          melihat perkiraan untungnya.
        </p>
      </div>
    </div>
  );
}
