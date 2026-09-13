export type SimulationInput = {
  ayamPercent: number;
  cabaiPercent: number;
  sellingPrice: number;
  baseAyamPrice?: number;
  baseCabaiPrice?: number;
  portionAyamQty?: number;
  portionCabaiQty?: number;
  otherIngredientsCost?: number;
};

export function simulatePrice({
  ayamPercent,
  cabaiPercent,
  sellingPrice,
  baseAyamPrice = 40500,
  baseCabaiPrice = 48000,
  portionAyamQty = 0.25,
  portionCabaiQty = 0.015,
  otherIngredientsCost = 4308,
}: SimulationInput) {
  const simAyamPrice = Math.round(baseAyamPrice * (1 + ayamPercent / 100));
  const simCabaiPrice = Math.round(baseCabaiPrice * (1 + cabaiPercent / 100));

  const ayamCost = Math.round(portionAyamQty * simAyamPrice);
  const cabaiCost = Math.round(portionCabaiQty * simCabaiPrice);
  const modal = ayamCost + cabaiCost + otherIngredientsCost;
  const profit = sellingPrice - modal;
  const margin = hitungMargin(sellingPrice, modal);
  const status = kesehatan(margin);

  return {
    simAyamPrice,
    simCabaiPrice,
    ayamCost,
    cabaiCost,
    modal,
    profit,
    margin,
    status,
  } as const;
}
import { hitungMargin, kesehatan } from "../margin";
