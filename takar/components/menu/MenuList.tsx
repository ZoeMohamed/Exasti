"use client";

import { useState } from "react";
import { menus } from "@/lib/data/menus";
import { MenuCard } from "@/components/ui/MenuCard";
import type { MenuStatus } from "@/types/menu";

const filters: { label: string; status?: MenuStatus }[] = [
  { label: "Semua (12)" },
  { label: "Sehat (5)", status: "sehat" },
  { label: "Tipis (4)", status: "tipis" },
  { label: "Rugi (0)", status: "rugi" },
  { label: "Diistirahatkan (3)", status: "diistirahatkan" },
];

export function MenuList() {
  const [active, setActive] = useState<MenuStatus | undefined>();
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
            className={`px-4 py-2 font-heading text-xs font-bold brutal-border-2 ${active === filter.status ? "bg-ink text-cream shadow-[2px_2px_0_#111]" : "bg-white"}`}
          >
            {filter.label}
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
