export type SimulationInput = {
  ayamPercent: number;
  cabaiPercent: number;
  sellingPrice: number;
};
export function simulatePrice({
  ayamPercent,
  cabaiPercent,
  sellingPrice,
}: SimulationInput) {
  const ayamCost = Math.round(10800 * (1 + ayamPercent / 100));
  const cabaiCost = Math.round(1305 * (1 + cabaiPercent / 100));
  const modal = ayamCost + cabaiCost + 4635;
  const profit = sellingPrice - modal;
  const margin = (profit / sellingPrice) * 100;
  const status = profit < 0 ? "rugi" : margin < 20 ? "tipis" : "sehat";
  return { ayamCost, cabaiCost, modal, profit, margin, status } as const;
}
