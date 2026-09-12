import { MenuItem, DriverResult, MarginCalculation } from "../types";

// BR-05: Konfigurasi ambang keparahan alert
export const SEVERITY = {
  critical: { margin_below: 10, drop_points: 15 },
  warning: { margin_below: 20, drop_points: 8 },
  info: { margin_below: 30, drop_points: 5 },
};

// BR-06: Margin rendah tapi stabil (< 2 poin penurunan) tidak menghasilkan alert panik
export const STABLE_THRESHOLD_POINTS = 2.0;

/**
 * Format angka rupiah: 18000 -> "Rp 18.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * BR-03: Forward-fill harga hari kerja terakhir (maksimal mundur 7 hari).
 */
export function priceOn(
  series: Record<string, number>, // date -> price
  targetDate: string,
  maxGapDays = 7
): { price: number | null; isFilled: boolean } {
  if (series[targetDate] !== undefined) {
    return { price: series[targetDate], isFilled: false };
  }

  const target = new Date(targetDate);
  for (let back = 1; back <= maxGapDays; back++) {
    const d = new Date(target);
    d.setDate(d.getDate() - back);
    const key = d.toISOString().split("T")[0];
    if (series[key] !== undefined) {
      return { price: series[key], isFilled: true };
    }
  }

  return { price: null, isFilled: false };
}

/**
 * BR-08: Konversi resep batch ke per porsi terjadi sekali saat perhitungan.
 */
export function perPorsi(batchQty: number, batchYield: number): number {
  if (!batchYield || batchYield <= 0) return 0;
  return batchQty / batchYield;
}

/**
 * BR-01: Hitung HPP (Modal per porsi). Fungsi murni tanpa akses IO.
 */
export function computeHpp(
  menu: MenuItem,
  seriesMap: Record<string, Record<string, number>>, // commodity_name -> (date -> price)
  targetDate: string
): {
  hpp: number;
  lines: Array<{
    name: string;
    batch_qty: number | null;
    qty_per_portion: number | null;
    unit_price: number | null;
    subtotal: number;
    is_filled: boolean;
  }>;
  missing: string[];
  filled: string[];
} {
  let hpp = 0;
  const lines = [];
  const missing: string[] = [];
  const filled: string[] = [];

  for (const item of menu.recipe) {
    const series = seriesMap[item.name];
    const { price, isFilled } = series
      ? priceOn(series, targetDate)
      : { price: null, isFilled: false };

    if (price === null) {
      missing.push(item.name);
      continue;
    }

    const qty = perPorsi(item.batch_qty, menu.batch_yield);
    const subtotal = qty * price;
    hpp += subtotal;

    lines.push({
      name: item.name,
      batch_qty: item.batch_qty,
      qty_per_portion: qty,
      unit_price: price,
      subtotal,
      is_filled: isFilled,
    });

    if (isFilled) {
      filled.push(item.name);
    }
  }

  // Tambahkan biaya tetap (gas, kemasan)
  for (const fixed of menu.fixed_costs) {
    hpp += fixed.amount;
    lines.push({
      name: fixed.label,
      batch_qty: null,
      qty_per_portion: null,
      unit_price: null,
      subtotal: fixed.amount,
      is_filled: false,
    });
  }

  return { hpp, lines, missing, filled };
}

/**
 * BR-02: Hitung margin persentase untung dari harga jual.
 */
export function computeMargin(sellPrice: number, hpp: number): number {
  if (sellPrice <= 0) return 0;
  return ((sellPrice - hpp) / sellPrice) * 100;
}

/**
 * BR-04: PEMBEDA PRODUK — Pendorong adalah kontribusi RUPIAH terbesar, BUKAN persentase kenaikan.
 * kontribusi(k) = takaran_per_porsi(k) * (harga_kini - harga_lalu)
 */
export function findDriver(
  menu: MenuItem,
  seriesMap: Record<string, Record<string, number>>,
  nowDate: string,
  windowDays = 7
): { driver: DriverResult | null; biggestPct: DriverResult | null; allRows: DriverResult[] } {
  const now = new Date(nowDate);
  const thenDateObj = new Date(now);
  thenDateObj.setDate(thenDateObj.getDate() - windowDays);
  const thenDate = thenDateObj.toISOString().split("T")[0];

  const rows: DriverResult[] = [];

  for (const item of menu.recipe) {
    const series = seriesMap[item.name];
    if (!series) continue;

    const { price: pNow } = priceOn(series, nowDate);
    const { price: pThen } = priceOn(series, thenDate, 10);

    if (pNow === null || pThen === null || pThen === 0) continue;

    const qty = perPorsi(item.batch_qty, menu.batch_yield);
    const rpDiff = qty * (pNow - pThen);
    const pctDiff = ((pNow - pThen) / pThen) * 100;

    rows.push({
      name: item.name,
      pct: pctDiff,
      rp: rpDiff,
      now: pNow,
      then: pThen,
    });
  }

  if (rows.length === 0) {
    return { driver: null, biggestPct: null, allRows: [] };
  }

  // Pendorong utama = kontribusi kenaikan rupiah terbesar
  const driver = rows.reduce((prev, current) => (current.rp > prev.rp ? current : prev));
  const biggestPct = rows.reduce((prev, current) => (current.pct > prev.pct ? current : prev));

  return { driver, biggestPct, allRows: rows.sort((a, b) => b.rp - a.rp) };
}

/**
 * BR-05 & BR-06: Tentukan tingkat peringatan berdasarkan margin saat ini dan penurunannya.
 */
export function severityOf(marginNow: number, dropPoints: number): "critical" | "warning" | "info" | "safe" {
  if (dropPoints < STABLE_THRESHOLD_POINTS) {
    return marginNow < 10 ? "warning" : "safe";
  }

  if (marginNow < SEVERITY.critical.margin_below || dropPoints >= SEVERITY.critical.drop_points) {
    return "critical";
  }
  if (marginNow < SEVERITY.warning.margin_below || dropPoints >= SEVERITY.warning.drop_points) {
    return "warning";
  }
  if (marginNow < SEVERITY.info.margin_below || dropPoints >= SEVERITY.info.drop_points) {
    return "info";
  }

  return "safe";
}

/**
 * BR-07: Saran harga jual baru untuk mengembalikan margin target, dibulatkan ke atas ke kelipatan Rp 500.
 */
export function suggestPrice(hpp: number, targetMarginPct: number): number {
  const target = Math.max(targetMarginPct, 15.0) / 100;
  if (target >= 1) return Math.ceil(hpp);
  const raw = hpp / (1 - target);
  return Math.ceil(raw / 500) * 500;
}

/**
 * Hitung kalkulasi lengkap satu menu pada tanggal tertentu
 */
export function evaluateMenu(
  menu: MenuItem,
  seriesMap: Record<string, Record<string, number>>,
  targetDate: string,
  comparisonWindowDays = 7
): MarginCalculation {
  const { hpp, lines, missing, filled } = computeHpp(menu, seriesMap, targetDate);
  const marginNow = computeMargin(menu.sell_price, hpp);
  const profitRp = menu.sell_price - hpp;

  // Bandingkan dengan minggu lalu
  const now = new Date(targetDate);
  const thenObj = new Date(now);
  thenObj.setDate(thenObj.getDate() - comparisonWindowDays);
  const thenDate = thenObj.toISOString().split("T")[0];

  const { hpp: hppThen } = computeHpp(menu, seriesMap, thenDate);
  const marginThen = computeMargin(menu.sell_price, hppThen);
  const dropPoints = marginThen - marginNow;

  const { driver, biggestPct } = findDriver(menu, seriesMap, targetDate, comparisonWindowDays);
  const severity = severityOf(marginNow, dropPoints);
  const suggested = suggestPrice(hpp, marginThen);

  return {
    hpp,
    margin_pct: marginNow,
    profit_rp: profitRp,
    lines,
    missing_prices: missing,
    filled_prices: filled,
    driver,
    biggest_pct: biggestPct,
    severity,
    suggested_price: suggested,
    margin_drop_points: dropPoints,
  };
}
