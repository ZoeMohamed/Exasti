"use client";

import { useState } from "react";
import { MenuCard } from "@/components/ui/MenuCard";
import type { Menu, MenuStatus } from "@/types/menu";

interface MenuListProps {
  menus: Menu[];
}

export function MenuList({ menus }: MenuListProps) {
  const [active, setActive] = useState<MenuStatus | undefined>();

  const counts = {
    all: menus.length,
    sehat: menus.filter((m) => m.status === "sehat").length,
    tipis: menus.filter((m) => m.status === "tipis").length,
    rugi: menus.filter((m) => m.status === "rugi").length,
    diistirahatkan: menus.filter((m) => m.status === "diistirahatkan").length,
  };

  const filters: { label: string; count: number; status?: MenuStatus }[] = [
    { label: "Semua", count: counts.all },
    { label: "Sehat", count: counts.sehat, status: "sehat" },
    { label: "Tipis", count: counts.tipis, status: "tipis" },
    { label: "Rugi", count: counts.rugi, status: "rugi" },
    { label: "Diistirahatkan", count: counts.diistirahatkan, status: "diistirahatkan" },
  ];

  const visibleMenus = active
    ? menus.filter((menu) => menu.status === active)
    : menus;

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b-2 border-ink pb-4">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.label}
            onClick={() => setActive(filter.status)}
            className={`px-4 py-2 font-heading text-xs font-bold brutal-border-2 transition-all ${
              active === filter.status
                ? "bg-ink text-cream shadow-[2px_2px_0_#111]"
                : "bg-white hover:bg-cream"
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visibleMenus.length ? (
          visibleMenus.map((menu) => <MenuCard key={menu.id} menu={menu} />)
        ) : (
          <div className="col-span-full bg-cream p-6 font-heading font-bold brutal-card">
            Belum ada menu dengan status ini.
          </div>
        )}
      </div>
    </>
  );
}
