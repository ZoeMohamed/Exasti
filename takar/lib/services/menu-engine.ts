import { queryDb } from "../db/client";
import { formatRupiah } from "../formatRupiah";
import type { Menu, Ingredient } from "@/types/menu";

export interface ProfitHistoryPoint {
  date: string;
  label: string;
  hpp: number;
  profit: number;
  marginPct: number;
}

export interface DbMenuDetail {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  category: string;
  sellPrice: number;
  batchYield: number;
  weeklyVolume: number;
  modal: number;
  profit: number;
  margin: number;
  status: "sehat" | "tipis" | "rugi";
  driver: string;
  ingredients: Ingredient[];
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
  recipeRows?: Array<{
    commodityId: string;
    name: string;
    price: number;
    batchQty: number;
    unit: string;
    note?: string;
  }>;
}

function nameToSlug(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("geprek")) return "ayam-geprek";
  if (n.includes("bakar")) return "ayam-bakar-madu";
  if (n.includes("goreng") && n.includes("nasi")) return "nasi-goreng";
  if (n.includes("lele")) return "pecel-lele";
  if (n.includes("mie") || n.includes("dok")) return "mie-dok-dok";
  if (n.includes("teh")) return "es-teh-jumbo";
  return n.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getMenuIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("ayam")) return "🍗";
  if (n.includes("nasi")) return "🍳";
  if (n.includes("lele") || n.includes("ikan")) return "🐟";
  if (n.includes("mie")) return "🍜";
  if (n.includes("teh") || n.includes("es") || n.includes("kopi")) return "🧊";
  if (n.includes("sapi") || n.includes("daging")) return "🥩";
  return "🍱";
}

/**
 * [Q5a] Mengambil semua menu aktif dari Supabase terurut dari untung terkecil
 */
export async function getDbMenus(): Promise<{ menus: Menu[]; latestDate: string }> {
  try {
    const res = await queryDb(`
      SELECT m.id,
             m.name,
             m.sell_price,
             m.batch_yield,
             m.weekly_volume,
             coalesce(s.hpp, 0) as hpp,
             coalesce(s.margin_pct, 0) as margin_pct,
             (SELECT max(date) FROM prices WHERE region_id = 1 AND business_id IS NULL) as latest_price_date
      FROM   menu_items m
      LEFT JOIN LATERAL (
               SELECT hpp, margin_pct
               FROM   margin_snapshots
               WHERE  menu_item_id = m.id
               ORDER  BY date DESC LIMIT 1
             ) s ON true
      WHERE  m.active
      ORDER  BY s.margin_pct ASC NULLS LAST, (m.sell_price - coalesce(s.hpp, 0)) ASC NULLS LAST;
    `);

    if (res && res.rows.length > 0) {
      const latestDate = res.rows[0].latest_price_date
        ? new Date(res.rows[0].latest_price_date).toISOString().split("T")[0]
        : "2026-09-11";

      const menus: Menu[] = await Promise.all(
        res.rows.map(async (row) => {
          const sellPrice = Math.round(parseFloat(row.sell_price));
          let hpp = Math.round(parseFloat(row.hpp));

          // Jika snapshot belum ada (menu baru), hitung HPP live dari resep
          if (hpp === 0) {
            const hppRes = await queryDb(
              `SELECT coalesce(sum(r.qty * coalesce(lp.price, 25000)), 0) + 
                      coalesce((SELECT sum(amount) FROM fixed_costs WHERE menu_item_id = $1), 0) as live_hpp
               FROM recipe_items r
               JOIN businesses b ON b.id = '00000000-0000-0000-0000-000000000001'
               LEFT JOIN latest_prices lp ON lp.commodity_id = r.commodity_id AND lp.region_id = b.region_id
               WHERE r.menu_item_id = $1;`,
              [row.id]
            );
            if (hppRes && hppRes.rows.length > 0) {
              hpp = Math.round(parseFloat(hppRes.rows[0].live_hpp));
            }
          }

          const profit = sellPrice - hpp;
          const margin = sellPrice > 0 ? Math.round(((profit / sellPrice) * 100) * 10) / 10 : 0;
          const status: "sehat" | "tipis" | "rugi" = profit < 0 || margin < 5 ? "rugi" : margin < 15 ? "tipis" : "sehat";

          // Cari pendorong utama dari resep
          let driver = "Biaya Bahan Stabil";
          const dRes = await queryDb(
            `SELECT coalesce(c.name, r.commodity_id) as nama,
                    round(r.qty * (coalesce(lp.price, 0) - coalesce(lama.price, lp.price, 0))) as diff_rp
             FROM recipe_items r
             LEFT JOIN commodities c ON c.id = r.commodity_id
             LEFT JOIN latest_prices lp ON lp.commodity_id = r.commodity_id AND lp.region_id = 1
             LEFT JOIN LATERAL (
               SELECT price FROM prices p WHERE p.region_id = 1 AND p.commodity_id = r.commodity_id AND p.date <= lp.date - 7 ORDER BY p.date DESC LIMIT 1
             ) lama ON true
             WHERE r.menu_item_id = $1
             ORDER BY diff_rp DESC LIMIT 1;`,
            [row.id]
          );
          if (dRes && dRes.rows.length > 0 && Number(dRes.rows[0].diff_rp) > 50) {
            driver = dRes.rows[0].nama;
          } else if (row.name.toLowerCase().includes("ayam")) {
            driver = "Daging Ayam Ras Segar";
          }

          const slug = nameToSlug(row.name);

          return {
            id: slug,
            name: row.name,
            shortName: row.name.toUpperCase(),
            icon: getMenuIcon(row.name),
            price: sellPrice,
            modal: hpp,
            profit,
            margin,
            status,
            driver,
            servingsPerWeek: row.weekly_volume || 100,
            category: row.name.toLowerCase().includes("teh") ? "Minuman" : "Makanan Utama",
          };
        })
      );

      return { menus, latestDate };
    }
  } catch (err) {
    console.error("Error getDbMenus:", err);
  }

  return { menus: [], latestDate: "2026-09-11" };
}

/**
 * [Q6a, Q6b, Q6c] Mengambil rincian lengkap satu menu dari Supabase
 */
export async function getDbMenuDetail(menuIdOrSlug: string): Promise<DbMenuDetail | null> {
  try {
    // 1. Temukan menu_item id
    const menuRes = await queryDb(
      `SELECT id, name, sell_price, batch_yield, weekly_volume, active
       FROM menu_items
       WHERE id::text = $1 
          OR lower(name) LIKE $2 
          OR lower(replace(name, ' ', '-')) LIKE $2
       LIMIT 1;`,
      [menuIdOrSlug, `%${menuIdOrSlug.replace(/-/g, "%")}%`]
    );

    if (!menuRes || menuRes.rows.length === 0) {
      return null;
    }

    const m = menuRes.rows[0];
    const menuUuid = m.id;
    const sellPrice = Math.round(parseFloat(m.sell_price));

    // 2. [Q6a] Rincian bahan dari resep & harga satuan terbaru
    const ingRes = await queryDb(
      `SELECT r.commodity_id,
              coalesce(c.name, ci.name, r.commodity_id) as nama,
              r.batch_qty,
              coalesce(c.unit, ci.unit, 'kg') as unit,
              m.batch_yield,
              r.qty,
              coalesce(lp.price, 25000) as harga_satuan,
              round(r.qty * coalesce(lp.price, 25000)) as subtotal,
              coalesce(lp.source, 'DATA PASAR') as source_type
       FROM   recipe_items r
       JOIN   menu_items m ON m.id = r.menu_item_id
       JOIN   businesses b ON b.id = m.business_id
       LEFT JOIN commodities c ON c.id = r.commodity_id
       LEFT JOIN catalog_items ci ON ci.id = r.commodity_id
       LEFT JOIN latest_prices lp
              ON lp.commodity_id = r.commodity_id
             AND lp.region_id = b.region_id
             AND (lp.business_id IS NULL OR lp.business_id = b.id)
       WHERE  r.menu_item_id = $1
       ORDER  BY r.qty * coalesce(lp.price, 25000) DESC NULLS LAST;`,
      [menuUuid]
    );

    const ingredients: Ingredient[] = [];
    const recipeRows: Array<{
      commodityId: string;
      name: string;
      price: number;
      batchQty: number;
      unit: string;
      note?: string;
    }> = [];
    let modalTotal = 0;

    if (ingRes && ingRes.rows.length > 0) {
      for (const row of ingRes.rows) {
        const cost = Math.round(parseFloat(row.subtotal));
        const unitPrice = Math.round(parseFloat(row.harga_satuan));
        const portionQty = parseFloat(row.qty);
        modalTotal += cost;

        ingredients.push({
          name: String(row.nama).toUpperCase(),
          quantity: `${portionQty.toFixed(2)} ${row.unit} × ${formatRupiah(unitPrice)} /${row.unit}`,
          unitPrice,
          cost,
          source: "DATA PASAR",
        });

        recipeRows.push({
          commodityId: row.commodity_id,
          name: row.nama,
          price: unitPrice,
          batchQty: parseFloat(row.batch_qty),
          unit: row.unit,
        });
      }
    }

    // Biaya tetap (fixed costs)
    const fcRes = await queryDb(
      `SELECT label, amount, is_estimated FROM fixed_costs WHERE menu_item_id = $1;`,
      [menuUuid]
    );

    if (fcRes && fcRes.rows.length > 0) {
      for (const fc of fcRes.rows) {
        const amt = Math.round(parseFloat(fc.amount));
        modalTotal += amt;
        ingredients.push({
          name: String(fc.label).toUpperCase(),
          quantity: "Perkiraan per porsi",
          unitPrice: amt,
          cost: amt,
          source: "PERKIRAAN",
        });
      }
    }

    const profit = sellPrice - modalTotal;
    const margin = sellPrice > 0 ? Math.round(((profit / sellPrice) * 100) * 10) / 10 : 0;
    const status: "sehat" | "tipis" | "rugi" = profit < 0 || margin < 5 ? "rugi" : margin < 15 ? "tipis" : "sehat";

    // 3. [Q6c] Penyelidikan Driver Kenaikan Harga (BR-04)
    let driverNote: DbMenuDetail["driverNote"] = null;
    const changeRes = await queryDb(
      `SELECT r.commodity_id,
              coalesce(c.name, ci.name, r.commodity_id) as nama,
              r.qty,
              pc.price_now,
              pc.price_7d_ago,
              pc.change_pct,
              round(r.qty * (pc.price_now - pc.price_7d_ago)) as kontribusi_rp
       FROM   recipe_items r
       JOIN   menu_items m ON m.id = r.menu_item_id
       JOIN   businesses b ON b.id = m.business_id
       LEFT JOIN commodities c ON c.id = r.commodity_id
       LEFT JOIN catalog_items ci ON ci.id = r.commodity_id
       JOIN   price_change_7d pc
              ON pc.commodity_id = r.commodity_id
             AND pc.region_id = b.region_id
             AND (pc.business_id IS NULL OR pc.business_id = b.id)
       WHERE  r.menu_item_id = $1
       ORDER  BY kontribusi_rp DESC NULLS LAST;`,
      [menuUuid]
    );

    if (changeRes && changeRes.rows.length > 0) {
      const top = changeRes.rows[0];
      const second = changeRes.rows[1] || null;

      if (Number(top.kontribusi_rp) > 0) {
        driverNote = {
          driverName: top.nama,
          driverPct: Math.round(parseFloat(top.change_pct) || 0),
          driverRp: Math.round(parseFloat(top.kontribusi_rp)),
          altName: second ? second.nama : "Bahan Lainnya",
          altPct: second ? Math.round(parseFloat(second.change_pct) || 0) : 0,
          altRp: second ? Math.round(parseFloat(second.kontribusi_rp) || 0) : 0,
        };
      }
    }

    // 4. [Q6b] Riwayat 30 hari untuk grafik profit
    const histRes = await queryDb(
      `SELECT date, hpp, sell_price, margin_pct, round(sell_price - hpp) as untung_per_porsi
       FROM   margin_snapshots
       WHERE  menu_item_id = $1
       ORDER  BY date ASC
       LIMIT  30;`,
      [menuUuid]
    );

    const history: ProfitHistoryPoint[] = (histRes?.rows || []).map((row) => {
      const d = new Date(row.date);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return {
        date: new Date(row.date).toISOString().split("T")[0],
        label,
        hpp: Math.round(parseFloat(row.hpp)),
        profit: Math.round(parseFloat(row.untung_per_porsi)),
        marginPct: Math.round(parseFloat(row.margin_pct) * 10) / 10,
      };
    });

    // Perhitungan Saran Repricing Target Margin 15% (Cincin 0)
    const targetMargin = 0.15;
    const rawSuggested = modalTotal / (1 - targetMargin);
    const suggestedPrice = Math.ceil(rawSuggested / 500) * 500;

    return {
      id: menuUuid,
      name: m.name,
      shortName: m.name.toUpperCase(),
      icon: getMenuIcon(m.name),
      category: m.name.toLowerCase().includes("teh") ? "Minuman" : "Makanan Utama",
      sellPrice,
      batchYield: m.batch_yield,
      weeklyVolume: m.weekly_volume || 100,
      modal: modalTotal,
      profit,
      margin,
      status,
      driver: driverNote ? driverNote.driverName : "Biaya Bahan Stabil",
      ingredients,
      driverNote,
      suggestedPrice,
      history,
      recipeRows,
    };
  } catch (err) {
    console.error("Error getDbMenuDetail:", err);
    return null;
  }
}

/**
 * [Q8] Simpan menu baru ke Supabase dalam satu transaksi
 */
export async function createDbMenu(data: {
  name: string;
  sellPrice: number;
  batchYield: number;
  weeklyVolume?: number;
  recipe: Array<{ commodityId: string; batchQty: number; note?: string }>;
  fixedCosts?: Array<{ label: string; amount: number }>;
}): Promise<string | null> {
  try {
    const bizRes = await queryDb(`SELECT id FROM businesses LIMIT 1;`);
    const businessId = bizRes?.rows[0]?.id || "00000000-0000-0000-0000-000000000001";

    // Insert menu_item
    const mRes = await queryDb(
      `INSERT INTO menu_items (business_id, name, sell_price, batch_yield, weekly_volume, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id;`,
      [businessId, data.name, data.sellPrice, data.batchYield, data.weeklyVolume || 100]
    );

    if (!mRes || mRes.rows.length === 0) return null;
    const menuId = mRes.rows[0].id;

    // Insert recipe_items
    for (const r of data.recipe) {
      const perPortionQty = r.batchQty / data.batchYield;
      await queryDb(
        `INSERT INTO recipe_items (menu_item_id, commodity_id, batch_qty, qty, note)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (menu_item_id, commodity_id) DO UPDATE SET batch_qty = EXCLUDED.batch_qty, qty = EXCLUDED.qty;`,
        [menuId, r.commodityId, r.batchQty, perPortionQty, r.note || null]
      );
    }

    // Insert fixed_costs
    if (data.fixedCosts && data.fixedCosts.length > 0) {
      for (const fc of data.fixedCosts) {
        await queryDb(
          `INSERT INTO fixed_costs (menu_item_id, label, amount, is_estimated)
           VALUES ($1, $2, $3, true);`,
          [menuId, fc.label, fc.amount]
        );
      }
    }

    return menuId;
  } catch (err) {
    console.error("Error createDbMenu:", err);
    return null;
  }
}

/**
 * [Q7] Update harga jual menu di Supabase
 */
export async function updateDbMenuPrice(menuIdOrSlug: string, newPrice: number): Promise<boolean> {
  try {
    const res = await queryDb(
      `UPDATE menu_items
       SET sell_price = $1
       WHERE id::text = $2 
          OR lower(name) LIKE $3
          OR lower(replace(name, ' ', '-')) LIKE $3;`,
      [newPrice, menuIdOrSlug, `%${menuIdOrSlug.replace(/-/g, "%")}%`]
    );
    return Boolean(res && res.rowCount && res.rowCount > 0);
  } catch (err) {
    console.error("Error updateDbMenuPrice:", err);
    return false;
  }
}

/**
 * Update lengkap menu (harga, porsi, resep, dan biaya tetap) di Supabase
 */
export async function updateDbMenuComplete(
  menuIdOrSlug: string,
  data: {
    name?: string;
    sellPrice?: number;
    batchYield?: number;
    weeklyVolume?: number;
    recipe?: Array<{ commodityId: string; batchQty: number; note?: string }>;
    fixedCosts?: Array<{ label: string; amount: number }>;
  }
): Promise<boolean> {
  try {
    // 1. Temukan UUID menu
    const mRes = await queryDb(
      `SELECT id, batch_yield FROM menu_items
       WHERE id::text = $1 
          OR lower(name) LIKE $2 
          OR lower(replace(name, ' ', '-')) LIKE $2
       LIMIT 1;`,
      [menuIdOrSlug, `%${menuIdOrSlug.replace(/-/g, "%")}%`]
    );

    if (!mRes || mRes.rows.length === 0) return false;
    const menuId = mRes.rows[0].id;
    const yieldCount = data.batchYield || mRes.rows[0].batch_yield || 8;

    // 2. Update kolom menu_items
    await queryDb(
      `UPDATE menu_items
       SET name = coalesce($1, name),
           sell_price = coalesce($2, sell_price),
           batch_yield = coalesce($3, batch_yield),
           weekly_volume = coalesce($4, weekly_volume)
       WHERE id = $5;`,
      [data.name || null, data.sellPrice || null, data.batchYield || null, data.weeklyVolume || null, menuId]
    );

    // 3. Update resep bila dikirim
    if (data.recipe && data.recipe.length > 0) {
      await queryDb(`DELETE FROM recipe_items WHERE menu_item_id = $1;`, [menuId]);
      for (const r of data.recipe) {
        const perPortionQty = r.batchQty / yieldCount;
        await queryDb(
          `INSERT INTO recipe_items (menu_item_id, commodity_id, batch_qty, qty, note)
           VALUES ($1, $2, $3, $4, $5);`,
          [menuId, r.commodityId, r.batchQty, perPortionQty, r.note || null]
        );
      }
    }

    // 4. Update biaya tetap bila dikirim
    if (data.fixedCosts && data.fixedCosts.length > 0) {
      await queryDb(`DELETE FROM fixed_costs WHERE menu_item_id = $1;`, [menuId]);
      for (const fc of data.fixedCosts) {
        await queryDb(
          `INSERT INTO fixed_costs (menu_item_id, label, amount, is_estimated)
           VALUES ($1, $2, $3, true);`,
          [menuId, fc.label, fc.amount]
        );
      }
    }

    return true;
  } catch (err) {
    console.error("Error updateDbMenuComplete:", err);
    return false;
  }
}

/**
 * Mengambil profil warung aktif dari Supabase
 */
export async function getDbBusinessProfile() {
  try {
    const res = await queryDb(`
      SELECT b.id,
             b.name,
             b.packaging_mode,
             r.id as region_id,
             r.name as region_name,
             (SELECT count(*) FROM menu_items WHERE active) as active_menus_count,
             (SELECT ran_at FROM ingest_runs ORDER BY ran_at DESC LIMIT 1) as last_ingest_time,
             (SELECT max(date) FROM prices WHERE region_id = 1) as latest_price_date
      FROM businesses b
      LEFT JOIN regions r ON r.id = b.region_id
      LIMIT 1;
    `);

    if (res && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.error("Error getDbBusinessProfile:", err);
  }

  return {
    name: "Warung Bu Sri",
    packaging_mode: "mixed",
    region_name: "Kota Semarang",
    active_menus_count: 6,
    latest_price_date: "2026-09-11",
  };
}

/**
 * Memperbarui profil warung di Supabase
 */
export async function updateDbBusinessProfile(data: {
  name: string;
  packagingMode: "dine_in" | "takeaway" | "mixed";
  regionId?: number;
}): Promise<boolean> {
  try {
    const res = await queryDb(
      `UPDATE businesses
       SET name = $1, packaging_mode = $2, region_id = coalesce($3, region_id);`,
      [data.name, data.packagingMode, data.regionId || null]
    );
    return Boolean(res && res.rowCount && res.rowCount > 0);
  } catch (err) {
    console.error("Error updateDbBusinessProfile:", err);
    return false;
  }
}

// Backward compatibility alias functions
export const calculateDynamicMenus = getDbMenus;
export const getDynamicIngredients = async (slugOrId: string) => {
  const detail = await getDbMenuDetail(slugOrId);
  if (!detail) {
    throw new Error("Menu tidak ditemukan di database");
  }
  return {
    menu: {
      id: detail.id,
      uuid: detail.id,
      name: detail.name,
      shortName: detail.shortName,
      icon: detail.icon,
      category: detail.category,
      sellPrice: detail.sellPrice,
      batchYield: detail.batchYield,
      servingsPerWeek: detail.weeklyVolume,
      recipe: [],
      fixedCosts: [],
    },
    currentSellPrice: detail.sellPrice,
    ingredients: detail.ingredients,
    modalTotal: detail.modal,
    driverNote: detail.driverNote,
    suggestedPrice: detail.suggestedPrice,
    history: detail.history,
  };
};
export const updateMenuPrice = updateDbMenuPrice;
