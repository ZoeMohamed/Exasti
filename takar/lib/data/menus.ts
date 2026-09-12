import type { Menu } from "@/types/menu";
import { MENU_RECIPES, FALLBACK_LATEST_PRICES, FALLBACK_THEN_PRICES } from "../services/menu-engine";

function computeBaseMenus(): Menu[] {
  return MENU_RECIPES.map((item) => {
    let modalPerPortion = 0;
    const candidates: Array<{ name: string; diff: number }> = [];

    for (const r of item.recipe) {
      const pNow = FALLBACK_LATEST_PRICES[r.commodityName] || 20000;
      const pThen = FALLBACK_THEN_PRICES[r.commodityName] || pNow;
      const portionQty = r.batchQty / item.batchYield;
      const sub = portionQty * pNow;
      modalPerPortion += sub;

      const diff = portionQty * (pNow - pThen);
      candidates.push({ name: r.commodityName, diff });
    }

    for (const f of item.fixedCosts) {
      modalPerPortion += f.amount;
    }

    modalPerPortion = Math.round(modalPerPortion);
    const profit = item.sellPrice - modalPerPortion;
    const margin = (profit / item.sellPrice) * 100;

    let status: "sehat" | "tipis" | "rugi" = "sehat";
    if (profit < 0 || margin < 5) status = "rugi";
    else if (margin < 15) status = "tipis";

    let driver = "Biaya Bahan Stabil";
    if (candidates.length > 0) {
      const top = candidates.reduce((prev, curr) => (curr.diff > prev.diff ? curr : prev));
      if (top.diff > 50) driver = top.name;
    }

    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      icon: item.icon,
      price: item.sellPrice,
      modal: modalPerPortion,
      profit,
      margin: Math.round(margin * 10) / 10,
      status,
      driver,
      servingsPerWeek: item.servingsPerWeek,
      category: item.category,
    };
  });
}

// Menus dihitung dinamis dari takaran resep batch & harga Bank Indonesia
export const menus: Menu[] = computeBaseMenus();

export const getMenu = (id: string): Menu =>
  menus.find((menu) => menu.id === id) ?? menus[0];
