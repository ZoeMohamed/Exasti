import type { Menu } from "@/types/menu";

/**
 * Dampak mingguan berasal dari perkiraan volume yang diisi pemilik warung.
 * Nilai absolut dipakai untuk prioritas: kerugian maupun keuntungan besar sama-
 * sama lebih penting untuk diperiksa daripada perubahan beberapa ratus rupiah.
 */
export function dampakMingguan(profit: number, weeklyVolume: number): number | null {
  if (!Number.isFinite(weeklyVolume) || weeklyVolume <= 0) return null;
  return profit * weeklyVolume;
}

export function bandingkanPrioritasMenu(a: Menu, b: Menu): number {
  if (a.status === "diistirahatkan" && b.status !== "diistirahatkan") return 1;
  if (a.status !== "diistirahatkan" && b.status === "diistirahatkan") return -1;

  const dampakA = dampakMingguan(a.profit, a.servingsPerWeek);
  const dampakB = dampakMingguan(b.profit, b.servingsPerWeek);
  if (dampakA !== null && dampakB !== null) {
    return Math.abs(dampakB) - Math.abs(dampakA) || a.profit - b.profit;
  }
  if (dampakA !== null) return -1;
  if (dampakB !== null) return 1;
  return a.profitRate - b.profitRate || a.profit - b.profit;
}
