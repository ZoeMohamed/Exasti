import type { Ingredient } from "@/types/menu";
import { formatRupiah } from "@/lib/formatRupiah";
import { MENU_RECIPES, FALLBACK_LATEST_PRICES } from "../services/menu-engine";

function computeAyamGeprekIngredients(): Ingredient[] {
  const def = MENU_RECIPES.find((m) => m.id === "ayam-geprek") || MENU_RECIPES[0];
  const list: Ingredient[] = [];

  for (const r of def.recipe) {
    const unitPrice = FALLBACK_LATEST_PRICES[r.commodityName] || 25000;
    const portionQty = r.batchQty / def.batchYield;
    const cost = Math.round(portionQty * unitPrice);

    list.push({
      name: r.commodityName.toUpperCase(),
      quantity: `${portionQty.toFixed(2)} ${r.unit} × ${formatRupiah(unitPrice)} /${r.unit}`,
      unitPrice,
      cost,
      source: r.sourceType,
    });
  }

  for (const f of def.fixedCosts) {
    list.push({
      name: f.label.toUpperCase(),
      quantity: "Perkiraan per porsi",
      unitPrice: f.amount,
      cost: f.amount,
      source: "PERKIRAAN",
    });
  }

  return list;
}

export const ayamGeprekIngredients: Ingredient[] = computeAyamGeprekIngredients();
