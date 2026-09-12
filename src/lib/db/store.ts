import { MenuItem } from "../types";
import { fetchBiPrices } from "../engine/bi";

/**
 * 5 Menu Demo Standar Warung Makan (EXASTI Cincin 0)
 */
export const DEFAULT_MENUS: MenuItem[] = [
  {
    id: "menu-ayam-geprek",
    name: "Ayam Geprek",
    sell_price: 18000,
    batch_yield: 8,
    category: "Makanan Utama",
    recipe: [
      { commodity_id: "com_ayam", name: "Daging Ayam Ras Segar", batch_qty: 2.0, unit: "kg" },
      { commodity_id: "com_beras", name: "Beras Kualitas Medium I", batch_qty: 1.2, unit: "kg" },
      { commodity_id: "com_cabai", name: "Cabai Rawit Hijau", batch_qty: 0.12, unit: "kg" },
      { commodity_id: "com_bawang", name: "Bawang Merah Ukuran Sedang", batch_qty: 0.08, unit: "kg" },
      { commodity_id: "com_minyak", name: "Minyak Goreng Curah", batch_qty: 0.24, unit: "kg" },
    ],
    fixed_costs: [{ label: "Gas & Kemasan Kertas", amount: 1200 }],
  },
  {
    id: "menu-nasgor-telur",
    name: "Nasi Goreng Telur",
    sell_price: 15000,
    batch_yield: 6,
    category: "Makanan Utama",
    recipe: [
      { commodity_id: "com_beras", name: "Beras Kualitas Medium I", batch_qty: 1.0, unit: "kg" },
      { commodity_id: "com_telur", name: "Telur Ayam Ras Segar", batch_qty: 0.6, unit: "kg" },
      { commodity_id: "com_bawang", name: "Bawang Merah Ukuran Sedang", batch_qty: 0.08, unit: "kg" },
      { commodity_id: "com_minyak", name: "Minyak Goreng Curah", batch_qty: 0.18, unit: "kg" },
    ],
    fixed_costs: [{ label: "Gas & Bumbu Penyedap", amount: 1000 }],
  },
  {
    id: "menu-soto-ayam",
    name: "Soto Ayam Semarang",
    sell_price: 17000,
    batch_yield: 8,
    category: "Makanan Utama",
    recipe: [
      { commodity_id: "com_ayam", name: "Daging Ayam Ras Segar", batch_qty: 1.5, unit: "kg" },
      { commodity_id: "com_beras", name: "Beras Kualitas Medium I", batch_qty: 1.0, unit: "kg" },
      { commodity_id: "com_bawang", name: "Bawang Merah Ukuran Sedang", batch_qty: 0.1, unit: "kg" },
      { commodity_id: "com_minyak", name: "Minyak Goreng Curah", batch_qty: 0.12, unit: "kg" },
    ],
    fixed_costs: [{ label: "Kuah, Gas & Kemasan", amount: 1400 }],
  },
  {
    id: "menu-sambal-telur",
    name: "Telur Balado",
    sell_price: 13000,
    batch_yield: 6,
    category: "Lauk",
    recipe: [
      { commodity_id: "com_telur", name: "Telur Ayam Ras Segar", batch_qty: 0.8, unit: "kg" },
      { commodity_id: "com_cabai_merah", name: "Cabai Merah Keriting", batch_qty: 0.15, unit: "kg" },
      { commodity_id: "com_bawang", name: "Bawang Merah Ukuran Sedang", batch_qty: 0.08, unit: "kg" },
      { commodity_id: "com_minyak", name: "Minyak Goreng Curah", batch_qty: 0.15, unit: "kg" },
    ],
    fixed_costs: [{ label: "Minyak goreng & bumbu", amount: 800 }],
  },
  {
    id: "menu-es-teh",
    name: "Es Teh Manis Jumbo",
    sell_price: 5000,
    batch_yield: 10,
    category: "Minuman",
    recipe: [
      { commodity_id: "com_gula", name: "Gula Pasir Kualitas Premium", batch_qty: 0.35, unit: "kg" },
    ],
    fixed_costs: [{ label: "Cup, Sedotan & Es Batu", amount: 900 }],
  },
];

/**
 * Cache harga in-memory untuk mode offline & kecepatan tinggi
 */
let cachedPrices: Record<string, Record<string, number>> | null = null;
let lastFetchTime = 0;
const memoryMenus: MenuItem[] = [...DEFAULT_MENUS];

/**
 * Dapatkan semua data harga (mencoba live API BI, atau fallback data lokal)
 */
export async function getCommodityPrices(): Promise<{
  series: Record<string, Record<string, number>>;
  source: string;
  latestDate: string;
}> {
  const now = Date.now();

  // Cache berlaku selama 30 menit
  if (cachedPrices && now - lastFetchTime < 30 * 60 * 1000) {
    const latestDate = getLatestDateFromSeries(cachedPrices);
    return { series: cachedPrices, source: "cache", latestDate };
  }

  try {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 90); // Tarik 90 hari ke belakang

    const liveData = await fetchBiPrices(start, today);
    if (Object.keys(liveData).length > 0) {
      cachedPrices = liveData;
      lastFetchTime = now;
      const latestDate = getLatestDateFromSeries(liveData);
      return { series: liveData, source: "bi_live", latestDate };
    }
  } catch (err) {
    console.warn("Gagal menarik live BI, beralih ke cache / fallback data:", err);
  }

  // Jika live gagal atau offline, gunakan data snapshot lokal
  if (!cachedPrices) {
    cachedPrices = generateFallbackPrices();
  }

  const latestDate = getLatestDateFromSeries(cachedPrices);
  return { series: cachedPrices, source: "local_snapshot", latestDate };
}

function getLatestDateFromSeries(series: Record<string, Record<string, number>>): string {
  let maxDate = "2026-09-11";
  for (const dates of Object.values(series)) {
    for (const d of Object.keys(dates)) {
      if (d > maxDate) maxDate = d;
    }
  }
  return maxDate;
}

/**
 * Fallback snapshot harga Bank Indonesia Kota Semarang (termasuk jendela kontras demo)
 */
function generateFallbackPrices(): Record<string, Record<string, number>> {
  const dates: string[] = [];
  const baseDate = new Date("2026-09-12");

  for (let i = 90; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const series: Record<string, Record<string, number>> = {
    "Daging Ayam Ras Segar": {},
    "Beras Kualitas Medium I": {},
    "Cabai Rawit Hijau": {},
    "Cabai Merah Keriting": {},
    "Bawang Merah Ukuran Sedang": {},
    "Minyak Goreng Curah": {},
    "Telur Ayam Ras Segar": {},
    "Gula Pasir Kualitas Premium": {},
  };

  // Isi data harga realistis dengan kenaikan ayam +20% di hari-hari terakhir (anomali BR-04)
  for (let idx = 0; idx < dates.length; idx++) {
    const dateStr = dates[idx];
    const progress = idx / dates.length;

    // Ayam naik dari 34.000 ke 40.500 (+19%)
    series["Daging Ayam Ras Segar"][dateStr] = Math.round(34000 + progress * 6500);
    // Beras stabil ~15.750
    series["Beras Kualitas Medium I"][dateStr] = 15750;
    // Cabai rawit hijau fluktuatif tinggi (+50% lalu turun)
    series["Cabai Rawit Hijau"][dateStr] = Math.round(45000 + Math.sin(idx * 0.3) * 18000);
    series["Cabai Merah Keriting"][dateStr] = Math.round(42000 + Math.cos(idx * 0.2) * 12000);
    series["Bawang Merah Ukuran Sedang"][dateStr] = Math.round(32000 + Math.sin(idx * 0.1) * 3000);
    series["Minyak Goreng Curah"][dateStr] = 17500;
    series["Telur Ayam Ras Segar"][dateStr] = Math.round(28000 + Math.sin(idx * 0.15) * 2500);
    series["Gula Pasir Kualitas Premium"][dateStr] = 18500;
  }

  return series;
}

export function getAllMenus(): MenuItem[] {
  return memoryMenus;
}

export function getMenuById(id: string): MenuItem | undefined {
  return memoryMenus.find((m) => m.id === id);
}

export function saveMenu(menu: MenuItem): void {
  const index = memoryMenus.findIndex((m) => m.id === menu.id);
  if (index >= 0) {
    memoryMenus[index] = menu;
  } else {
    memoryMenus.push(menu);
  }
}
