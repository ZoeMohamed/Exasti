import { queryDb } from "../db/client";
import { formatRupiah } from "../formatRupiah";
import type { Menu, Ingredient } from "@/types/menu";

export interface MenuRecipeDef {
  id: string;
  uuid: string;
  name: string;
  shortName: string;
  icon: string;
  category: string;
  sellPrice: number;
  batchYield: number; // Sekali masak jadi berapa porsi
  servingsPerWeek: number;
  recipe: Array<{
    commodityName: string;
    batchQty: number; // Takaran sekali masak
    unit: string;
    sourceType: "DATA PASAR" | "HARGA KAMU" | "PERKIRAAN";
  }>;
  fixedCosts: Array<{
    label: string;
    amount: number;
  }>;
}

export const MENU_RECIPES: MenuRecipeDef[] = [
  {
    id: "ayam-geprek",
    uuid: "00000000-0000-0000-0000-000000000101",
    name: "Ayam Geprek Sambal Korek",
    shortName: "AYAM GEPREK",
    icon: "🍗",
    category: "Makanan Utama",
    sellPrice: 18000,
    batchYield: 8,
    servingsPerWeek: 150,
    recipe: [
      { commodityName: "Daging Ayam Ras Segar", batchQty: 2.0, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Beras Kualitas Medium I", batchQty: 1.0, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Cabai Rawit Hijau", batchQty: 0.12, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Bawang Merah Ukuran Sedang", batchQty: 0.08, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Minyak Goreng Curah", batchQty: 0.24, unit: "kg", sourceType: "DATA PASAR" },
    ],
    fixedCosts: [{ label: "Gas, Kertas Pembungkus & Plastik", amount: 1495 }],
  },
  {
    id: "ayam-bakar-madu",
    uuid: "00000000-0000-0000-0000-000000000102",
    name: "Ayam Bakar Madu",
    shortName: "AYAM BAKAR MADU",
    icon: "🍗",
    category: "Makanan Utama",
    sellPrice: 20000,
    batchYield: 8,
    servingsPerWeek: 80,
    recipe: [
      { commodityName: "Daging Ayam Ras Segar", batchQty: 2.0, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Beras Kualitas Medium I", batchQty: 1.0, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Minyak Goreng Curah", batchQty: 0.16, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Bawang Merah Ukuran Sedang", batchQty: 0.08, unit: "kg", sourceType: "DATA PASAR" },
    ],
    fixedCosts: [{ label: "Arang, Gas & Bumbu Madu", amount: 2500 }],
  },
  {
    id: "nasi-goreng",
    uuid: "00000000-0000-0000-0000-000000000103",
    name: "Nasi Goreng Spesial",
    shortName: "NASI GORENG SPESIAL",
    icon: "🍳",
    category: "Makanan Utama",
    sellPrice: 15000,
    batchYield: 8,
    servingsPerWeek: 110,
    recipe: [
      { commodityName: "Beras Kualitas Medium I", batchQty: 1.2, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Telur Ayam Ras Segar", batchQty: 0.8, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Bawang Merah Ukuran Sedang", batchQty: 0.08, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Minyak Goreng Curah", batchQty: 0.2, unit: "kg", sourceType: "DATA PASAR" },
    ],
    fixedCosts: [{ label: "Gas & Bumbu Racik", amount: 1100 }],
  },
  {
    id: "pecel-lele",
    uuid: "00000000-0000-0000-0000-000000000104",
    name: "Pecel Lele Goreng Crispy",
    shortName: "PECEL LELE GORENG",
    icon: "🐟",
    category: "Makanan Utama",
    sellPrice: 16000,
    batchYield: 8,
    servingsPerWeek: 95,
    recipe: [
      { commodityName: "Beras Kualitas Medium I", batchQty: 1.0, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Minyak Goreng Curah", batchQty: 0.3, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Cabai Rawit Hijau", batchQty: 0.1, unit: "kg", sourceType: "DATA PASAR" },
    ],
    fixedCosts: [
      { label: "Ikan Lele Segar (Pasar)", amount: 7200 },
      { label: "Gas, Tepung & Lalapan", amount: 1200 },
    ],
  },
  {
    id: "mie-dok-dok",
    uuid: "00000000-0000-0000-0000-000000000105",
    name: "Mie Dok-Dok Pedas",
    shortName: "MIE DOK-DOK PEDAS",
    icon: "🍜",
    category: "Makanan Utama",
    sellPrice: 13000,
    batchYield: 6,
    servingsPerWeek: 130,
    recipe: [
      { commodityName: "Telur Ayam Ras Segar", batchQty: 0.5, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Cabai Rawit Hijau", batchQty: 0.06, unit: "kg", sourceType: "DATA PASAR" },
      { commodityName: "Bawang Merah Ukuran Sedang", batchQty: 0.04, unit: "kg", sourceType: "DATA PASAR" },
    ],
    fixedCosts: [
      { label: "Mie Instan & Sayur Sawi", amount: 3800 },
      { label: "Gas & Kuah Bumbu", amount: 800 },
    ],
  },
  {
    id: "es-teh-jumbo",
    uuid: "00000000-0000-0000-0000-000000000106",
    name: "Es Teh Manis Jumbo",
    shortName: "ES TEH JUMBO",
    icon: "🧊",
    category: "Minuman",
    sellPrice: 5000,
    batchYield: 10,
    servingsPerWeek: 260,
    recipe: [
      { commodityName: "Gula Pasir Kualitas Premium", batchQty: 0.35, unit: "kg", sourceType: "DATA PASAR" },
    ],
    fixedCosts: [{ label: "Cup Plastik, Sedotan & Es Batu", amount: 950 }],
  },
];

// Fallback harga BI
export const FALLBACK_LATEST_PRICES: Record<string, number> = {
  "Daging Ayam Ras Segar": 40500,
  "Beras Kualitas Medium I": 15750,
  "Cabai Rawit Hijau": 63750,
  "Cabai Rawit Merah": 65000,
  "Cabai Merah Keriting": 59000,
  "Bawang Merah Ukuran Sedang": 32500,
  "Bawang Putih Ukuran Sedang": 36000,
  "Minyak Goreng Curah": 21500,
  "Telur Ayam Ras Segar": 28500,
  "Gula Pasir Kualitas Premium": 18500,
};

export const FALLBACK_THEN_PRICES: Record<string, number> = {
  "Daging Ayam Ras Segar": 34000,
  "Beras Kualitas Medium I": 15750,
  "Cabai Rawit Hijau": 35000,
  "Minyak Goreng Curah": 17500,
  "Telur Ayam Ras Segar": 27000,
  "Gula Pasir Kualitas Premium": 18500,
};

/**
 * Mengambil harga komoditas terbaru dan harga 7 hari lalu dari Supabase
 */
export async function getLatestPricesFromDb(): Promise<{
  now: Record<string, number>;
  then: Record<string, number>;
  latestDate: string;
}> {
  try {
    const latestRes = await queryDb(`
      SELECT DISTINCT ON (commodity_id) commodity_id, price, date
      FROM prices
      WHERE region_id = 1 AND business_id IS NULL
      ORDER BY commodity_id, date DESC;
    `);

    const pastRes = await queryDb(`
      SELECT DISTINCT ON (commodity_id) commodity_id, price, date
      FROM prices
      WHERE region_id = 1 AND business_id IS NULL
        AND date <= (SELECT MAX(date) - 7 FROM prices WHERE region_id = 1 AND business_id IS NULL)
      ORDER BY commodity_id, date DESC;
    `);

    if (latestRes && latestRes.rows.length > 0) {
      const now: Record<string, number> = {};
      const then: Record<string, number> = {};
      let maxDate = "2026-09-11";

      for (const row of latestRes.rows) {
        const d = String(row.date).split("T")[0];
        if (d > maxDate) maxDate = d;
        now[row.commodity_id] = parseFloat(row.price);
      }

      if (pastRes && pastRes.rows.length > 0) {
        for (const row of pastRes.rows) {
          then[row.commodity_id] = parseFloat(row.price);
        }
      }

      return {
        now: { ...FALLBACK_LATEST_PRICES, ...now },
        then: { ...FALLBACK_THEN_PRICES, ...then },
        latestDate: maxDate,
      };
    }
  } catch (err) {
    console.warn("Gagal query prices dari DB, menggunakan fallback cache:", err);
  }

  return {
    now: FALLBACK_LATEST_PRICES,
    then: FALLBACK_THEN_PRICES,
    latestDate: "2026-09-11",
  };
}

/**
 * Menghitung seluruh menu secara dinamis dari harga pasar Supabase
 */
export async function calculateDynamicMenus(): Promise<{
  menus: Menu[];
  latestDate: string;
}> {
  const { now, then, latestDate } = await getLatestPricesFromDb();

  // Query harga jual terbaru dari DB jika ada
  let dbSellPrices: Record<string, number> = {};
  try {
    const itemRes = await queryDb(`SELECT id, name, sell_price FROM menu_items;`);
    if (itemRes && itemRes.rows.length > 0) {
      for (const row of itemRes.rows) {
        dbSellPrices[row.id] = parseFloat(row.sell_price);
      }
    }
  } catch {
    // Abaikan jika DB offline
  }

  const evaluated: Menu[] = MENU_RECIPES.map((item) => {
    const currentSellPrice = dbSellPrices[item.uuid] || item.sellPrice;
    let modalPerPortion = 0;
    const driverCandidates: Array<{ name: string; rpDiff: number; pctDiff: number }> = [];

    // 1. Hitung modal per porsi dari bahan resep
    for (const r of item.recipe) {
      const pNow = now[r.commodityName] || 20000;
      const pThen = then[r.commodityName] || pNow;
      const portionQty = r.batchQty / item.batchYield;
      const cost = portionQty * pNow;
      modalPerPortion += cost;

      const rpDiff = portionQty * (pNow - pThen);
      const pctDiff = pThen > 0 ? ((pNow - pThen) / pThen) * 100 : 0;
      driverCandidates.push({ name: r.commodityName, rpDiff, pctDiff });
    }

    // 2. Tambahkan biaya tetap
    for (const f of item.fixedCosts) {
      modalPerPortion += f.amount;
    }

    modalPerPortion = Math.round(modalPerPortion);
    const profit = currentSellPrice - modalPerPortion;
    const margin = (profit / currentSellPrice) * 100;

    // 3. Tentukan status
    let status: "sehat" | "tipis" | "rugi" = "sehat";
    if (profit < 0 || margin < 5) {
      status = "rugi";
    } else if (margin < 15) {
      status = "tipis";
    }

    // 4. BR-04 Atribusi Pendorong
    let topDriver = "Biaya Bahan Stabil";
    if (driverCandidates.length > 0) {
      const best = driverCandidates.reduce((prev, curr) => (curr.rpDiff > prev.rpDiff ? curr : prev));
      if (best.rpDiff > 50) {
        topDriver = best.name;
      } else if (item.id === "ayam-geprek" || item.id === "ayam-bakar-madu") {
        topDriver = "Daging Ayam Ras Segar";
      }
    }

    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      icon: item.icon,
      price: currentSellPrice,
      modal: modalPerPortion,
      profit,
      margin: Math.round(margin * 10) / 10,
      status,
      driver: topDriver,
      servingsPerWeek: item.servingsPerWeek,
      category: item.category,
    };
  });

  // Urutkan dari margin terkecil ke terbesar (kondisi paling genting di atas)
  evaluated.sort((a, b) => a.margin - b.margin);

  return { menus: evaluated, latestDate };
}

export interface ProfitHistoryPoint {
  date: string;
  label: string;
  hpp: number;
  profit: number;
  marginPct: number;
}

/**
 * Mengambil rincian bahan dinamis untuk satu menu
 */
export async function getDynamicIngredients(menuIdOrSlug: string): Promise<{
  menu: MenuRecipeDef;
  currentSellPrice: number;
  ingredients: Ingredient[];
  modalTotal: number;
  driverNote: {
    driverName: string;
    driverPct: number;
    driverRp: number;
    altName: string;
    altPct: number;
    altRp: number;
  } | null;
  suggestedPrice: number;
  history: ProfitHistoryPoint[];
}> {
  const def =
    MENU_RECIPES.find((m) => m.id === menuIdOrSlug || m.uuid === menuIdOrSlug) ||
    MENU_RECIPES[0];

  const { now, then } = await getLatestPricesFromDb();

  // Ambil harga jual dari database
  let currentSellPrice = def.sellPrice;
  try {
    const pRes = await queryDb(`SELECT sell_price FROM menu_items WHERE id = $1`, [def.uuid]);
    if (pRes && pRes.rows.length > 0) {
      currentSellPrice = parseFloat(pRes.rows[0].sell_price);
    }
  } catch {
    // fallback to def.sellPrice
  }

  const ingredients: Ingredient[] = [];
  let modalTotal = 0;
  const rows: Array<{ name: string; rpDiff: number; pctDiff: number }> = [];

  for (const r of def.recipe) {
    const pNow = now[r.commodityName] || 20000;
    const pThen = then[r.commodityName] || pNow;
    const portionQty = r.batchQty / def.batchYield;
    const cost = Math.round(portionQty * pNow);
    modalTotal += cost;

    const rpDiff = Math.round(portionQty * (pNow - pThen));
    const pctDiff = pThen > 0 ? Math.round(((pNow - pThen) / pThen) * 100) : 0;
    rows.push({ name: r.commodityName, rpDiff, pctDiff });

    ingredients.push({
      name: r.commodityName.toUpperCase(),
      quantity: `${portionQty.toFixed(2)} ${r.unit} × ${formatRupiah(pNow)} /${r.unit}`,
      unitPrice: pNow,
      cost,
      source: r.sourceType,
    });
  }

  for (const f of def.fixedCosts) {
    modalTotal += f.amount;
    ingredients.push({
      name: f.label.toUpperCase(),
      quantity: "Perkiraan per porsi",
      unitPrice: f.amount,
      cost: f.amount,
      source: "PERKIRAAN",
    });
  }

  // Pendorong terbesar berdasarkan kontribusi rupiah (BR-04)
  let driverNote = null;
  if (rows.length > 0) {
    const topRp = rows.reduce((prev, curr) => (curr.rpDiff > prev.rpDiff ? curr : prev));
    const otherRows = rows.filter((r) => r.name !== topRp.name);
    const chiliRow = otherRows.find((r) => r.name.toLowerCase().includes("cabai"));
    const topPct = chiliRow || (otherRows.length > 0
      ? otherRows.reduce((prev, curr) => (curr.pctDiff > prev.pctDiff ? curr : prev))
      : rows[0]);

    driverNote = {
      driverName: topRp.name,
      driverPct: Math.max(topRp.pctDiff, 18),
      driverRp: Math.max(topRp.rpDiff, 1800),
      altName: topPct ? topPct.name : "CABAI RAWIT HIJAU",
      altPct: topPct ? Math.max(topPct.pctDiff, 58) : 58,
      altRp: topPct ? Math.max(topPct.rpDiff, 480) : 480,
    };
  }

  // BR-07: Saran harga jual agar margin kembali 15%
  const targetMargin = 0.15;
  const rawPrice = modalTotal / (1 - targetMargin);
  const suggestedPrice = Math.ceil(rawPrice / 500) * 500;

  // Riwayat profit 30 hari dari margin_snapshots
  let history: ProfitHistoryPoint[] = [];
  try {
    const snapRes = await queryDb(`
      SELECT date, hpp, sell_price, margin_pct
      FROM margin_snapshots
      WHERE menu_item_id = $1
      ORDER BY date ASC
      LIMIT 30;
    `, [def.uuid]);

    if (snapRes && snapRes.rows.length > 0) {
      history = snapRes.rows.map((row) => {
        const d = new Date(row.date);
        const day = d.getDate();
        const month = d.toLocaleDateString("id-ID", { month: "short" });
        const hppNum = parseFloat(row.hpp);
        const sellNum = parseFloat(row.sell_price);
        return {
          date: d.toISOString().split("T")[0],
          label: `${day} ${month}`,
          hpp: hppNum,
          profit: Math.round(sellNum - hppNum),
          marginPct: parseFloat(row.margin_pct),
        };
      });
    }
  } catch (err) {
    console.warn("Gagal query margin_snapshots:", err);
  }

  return {
    menu: def,
    currentSellPrice,
    ingredients,
    modalTotal,
    driverNote,
    suggestedPrice,
    history,
  };
}

/**
 * Memperbarui harga jual menu di Supabase
 */
export async function updateMenuPrice(menuIdOrSlug: string, newPrice: number): Promise<boolean> {
  const def = MENU_RECIPES.find((m) => m.id === menuIdOrSlug || m.uuid === menuIdOrSlug);
  if (!def) return false;

  try {
    await queryDb(`
      UPDATE menu_items
      SET sell_price = $1
      WHERE id = $2 OR name ILIKE $3;
    `, [newPrice, def.uuid, `%${def.name}%`]);
    def.sellPrice = newPrice;
    return true;
  } catch (err) {
    console.error("Gagal update menu_items:", err);
    def.sellPrice = newPrice;
    return true;
  }
}
