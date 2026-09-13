import { cache } from "react";
import {
  getCurrentBusinessId,
  queryAppDb,
  withAppTransaction,
} from "../auth/context";
import { keIsoTanggal } from "../tanggal";
import type { Menu, Ingredient } from "@/types/menu";
import {
  hitungHpp, hitungMargin, kesehatan, cariPendorong, cariPembanding,
  saranHarga, penyumbangTerbesar, periksaSatuan, type BahanResep,
} from "../margin";

/**
 * Memuat bahan seluruh menu dalam SATU kueri lewat view resep_efektif,
 * yang sudah menerapkan BR-09 (harga efektif) dan menyediakan harga
 * pembanding 7 hari untuk BR-04. Menggantikan kueri per-menu yang lama
 * berikut fallback harga karangan Rp 25.000.
 */
const muatSemuaBahan = cache(async function (businessId: string): Promise<Map<string, BahanResep[]>> {
  const res = await queryAppDb(
    `select menu_item_id, commodity_id, nama, qty, harga, harga_lalu, dari_data
     from resep_efektif where business_id = $1`,
    [businessId],
  );
  const peta = new Map<string, BahanResep[]>();
  for (const r of res?.rows ?? []) {
    const daftar = peta.get(r.menu_item_id) ?? [];
    daftar.push({
      komoditasId: r.commodity_id,
      nama: r.nama,
      qty: Number(r.qty),
      harga: r.harga === null ? null : Number(r.harga),
      hargaLalu: r.harga_lalu === null ? null : Number(r.harga_lalu),
      dariData: Boolean(r.dari_data),
    });
    peta.set(r.menu_item_id, daftar);
  }
  return peta;
});

const muatSemuaBiayaTetap = cache(async function (businessId: string): Promise<Map<string, number>> {
  const res = await queryAppDb(
    `select fc.menu_item_id, coalesce(sum(fc.amount), 0) total
     from fixed_costs fc
     join menu_items m on m.id = fc.menu_item_id
     where m.business_id = $1
     group by fc.menu_item_id`,
    [businessId],
  );
  const peta = new Map<string, number>();
  for (const r of res?.rows ?? []) peta.set(r.menu_item_id, Number(r.total));
  return peta;
});

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
  profitRate: number;
  status: "sehat" | "tipis" | "rugi" | "diistirahatkan";
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
  /** BR-10 / FR-28 — persen modal yang berasal dari data harga otomatis. */
  cakupan?: number;
  bahanTanpaHarga?: number;
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
/**
 * Dibungkus cache() dari React: layout dan halaman sama-sama memanggil ini
 * dalam satu permintaan yang sama. Tanpa dedup, seluruh perhitungan menu
 * berjalan dua kali — enam perjalanan ke Mumbai, bukan tiga.
 */
export const getDbMenus = cache(async function (): Promise<{ menus: Menu[]; latestDate: string }> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `select m.id, m.name, m.sell_price, m.batch_yield, m.weekly_volume, m.active,
              (select max(date) from prices
               where region_id = b.region_id and business_id is null
                 and not is_filled) as latest_price_date
       from menu_items m
       join businesses b on b.id = m.business_id
       where m.business_id = $1`,
      [businessId],
    );
    if (!res || res.rows.length === 0) return { menus: [], latestDate: "" };

    const [petaBahan, petaBiaya] = await Promise.all([
      muatSemuaBahan(businessId),
      muatSemuaBiayaTetap(businessId),
    ]);
    const latestDate = keIsoTanggal(res.rows[0].latest_price_date) ?? "";

    const menus: Menu[] = res.rows.map((row) => {
      const bahan = petaBahan.get(row.id) ?? [];
      const biayaTetap = petaBiaya.get(row.id) ?? 0;

      // Seluruh keputusan angkanya diambil lib/margin.ts — tidak ada ambang
      // yang ditulis ulang di sini (BR-01, BR-02, BR-15).
      const { hpp } = hitungHpp(bahan, biayaTetap);
      const sellPrice = Math.round(Number(row.sell_price));
      const margin = hitungMargin(sellPrice, hpp);
      const pendorong = cariPendorong(bahan) ?? penyumbangTerbesar(bahan);

      return {
        id: row.id,
        name: row.name,
        shortName: row.name.toUpperCase(),
        icon: getMenuIcon(row.name),
        price: sellPrice,
        modal: hpp,
        profit: sellPrice - hpp,
        profitRate: margin,
        status: row.active ? kesehatan(margin) : "diistirahatkan",
        driver: pendorong ? pendorong.nama : "Harga bahan stabil",
        servingsPerWeek: row.weekly_volume ?? 0,
        category: row.name.toLowerCase().includes("teh") ? "Minuman" : "Makanan Utama",
      };
    });

    // FR-21 — terurut dari untung paling tipis
    menus.sort((a, b) => {
      if (a.status === "diistirahatkan" && b.status !== "diistirahatkan") return 1;
      if (a.status !== "diistirahatkan" && b.status === "diistirahatkan") return -1;
      return a.profit - b.profit;
    });

    return { menus, latestDate };
  } catch (err) {
    console.error("Error getDbMenus:", err);
    throw err;
  }
});

/**
 * Rincian satu menu. Memakai view resep_efektif (BR-09) dan lib/margin.ts,
 * sehingga angka di layar detail tidak mungkin berbeda dari angka di dashboard.
 */
export async function getDbMenuDetail(menuIdOrSlug: string): Promise<DbMenuDetail | null> {
  try {
    const businessId = await getCurrentBusinessId();
    const menuRes = await queryAppDb(
      `select m.id, m.name, m.sell_price, m.batch_yield, m.weekly_volume, m.active
       from menu_items m
       where m.business_id = $1
         and (m.id::text = $2
          or lower(m.name) = $3
          or lower(replace(m.name, ' ', '-')) = $3)
       limit 1`,
      [businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
    );
    if (!menuRes || menuRes.rows.length === 0) return null;

    const m = menuRes.rows[0];
    const sellPrice = Math.round(Number(m.sell_price));

    // Empat kueri berikut tidak saling bergantung. Dijalankan berurutan,
    // masing-masing menunggu ~180 ms ke Mumbai; dijalankan bersamaan,
    // totalnya tinggal satu kali tunggu.
    const fcPromise = queryAppDb(
      `select label, amount, is_estimated from fixed_costs where menu_item_id = $1`,
      [m.id],
    );
    const margin30Promise = queryAppDb(
      `select margin_pct from margin_snapshots
       where menu_item_id = $1 and date <= current_date - 30
       order by date desc limit 1`,
      [m.id],
    );
    const histPromise = queryAppDb(
      `select date, hpp, sell_price, margin_pct, round(sell_price - hpp) as untung
       from margin_snapshots where menu_item_id = $1
       order by date desc limit 30`,
      [m.id],
    );

    // ── bahan lewat resep_efektif ──
    const bahanRes = await queryAppDb(
      `select commodity_id, nama, satuan, qty, batch_qty, harga, harga_lalu,
              dari_data, alasan, harga_diisi_mundur, bi_tanggal
       from resep_efektif where menu_item_id = $1`,
      [m.id],
    );

    const bahan: BahanResep[] = [];
    const ingredients: Ingredient[] = [];
    const recipeRows: DbMenuDetail["recipeRows"] = [];

    for (const r of bahanRes?.rows ?? []) {
      const harga = r.harga === null ? null : Number(r.harga);
      bahan.push({
        komoditasId: r.commodity_id,
        nama: r.nama,
        qty: Number(r.qty),
        harga,
        hargaLalu: r.harga_lalu === null ? null : Number(r.harga_lalu),
        dariData: Boolean(r.dari_data),
      });

      // FR-27: harga hasil isi mundur ditandai di UI
      const tandaIsiMundur = r.harga_diisi_mundur
        ? ` · memakai harga ${keIsoTanggal(r.bi_tanggal)}`
        : "";

      ingredients.push({
        name: String(r.nama).toUpperCase(),
        quantity:
          harga === null
            ? "harga belum ada"
            : `${Number(r.batch_qty)} ${r.satuan} untuk ${m.batch_yield} porsi`,
        unitPrice: harga === null ? 0 : Math.round(harga),
        cost: harga === null ? 0 : Math.round(Number(r.qty) * harga),
        source: !r.dari_data
          ? "PERKIRAAN"
          : String(r.alasan).includes("notamu")
            ? "HARGA KAMU"
            : "DATA PASAR",
        sourceNote: String(r.alasan) + tandaIsiMundur,
      });

      recipeRows.push({
        commodityId: r.commodity_id,
        name: r.nama,
        price: harga === null ? 0 : Math.round(harga),
        batchQty: Number(r.batch_qty),
        unit: r.satuan,
      });
    }

    // ── biaya tetap ──
    const fcRes = await fcPromise;
    let biayaTetap = 0;
    for (const fc of fcRes?.rows ?? []) {
      const amt = Math.round(Number(fc.amount));
      biayaTetap += amt;
      ingredients.push({
        name: String(fc.label).toUpperCase(),
        quantity: fc.is_estimated ? "perkiraan kami · bisa diubah" : "kamu yang isi",
        unitPrice: amt,
        cost: amt,
        source: fc.is_estimated ? "PERKIRAAN" : "HARGA KAMU",
        sourceNote: fc.is_estimated ? "perkiraan kami, bisa kamu ubah" : "kamu yang mengisi",
      });
    }

    // ── angka, semuanya dari mesin murni ──
    const { hpp, cakupan, jumlahHilang } = hitungHpp(bahan, biayaTetap);
    const margin = hitungMargin(sellPrice, hpp);
    const pendorong = cariPendorong(bahan);
    const pembanding = pendorong ? cariPembanding(bahan, pendorong.komoditasId) : null;

    // BR-07 — saran harga memakai margin 30 hari lalu, minimum 15%
    const lamaRes = await margin30Promise;
    const margin30 = lamaRes?.rows?.[0]?.margin_pct ?? null;

    // FR-26 — riwayat 30 hari
    const histRes = await histPromise;
    const history: ProfitHistoryPoint[] = (histRes?.rows ?? [])
      .map((r) => {
        const iso = keIsoTanggal(r.date) as string;
        const [, bln, hri] = iso.split("-");
        return {
          date: iso,
          label: `${Number(hri)}/${Number(bln)}`,
          hpp: Math.round(Number(r.hpp)),
          profit: Math.round(Number(r.untung)),
          marginPct: Math.round(Number(r.margin_pct) * 10) / 10,
        };
      })
      .reverse();

    return {
      id: m.id,
      name: m.name,
      shortName: String(m.name).toUpperCase(),
      icon: getMenuIcon(m.name),
      category: String(m.name).toLowerCase().includes("teh") ? "Minuman" : "Makanan Utama",
      sellPrice,
      batchYield: m.batch_yield,
      weeklyVolume: m.weekly_volume ?? 0,
      modal: hpp,
      profit: sellPrice - hpp,
      profitRate: margin,
      status: m.active ? kesehatan(margin) : "diistirahatkan",
      driver: pendorong ? pendorong.nama : "Harga bahan stabil",
      ingredients,
      // FR-24 — blok "gara-gara X, bukan Y"
      driverNote: pendorong
        ? {
            driverName: pendorong.nama,
            driverPct: pendorong.kenaikanPct,
            driverRp: pendorong.kontribusiRp,
            altName: pembanding ? pembanding.nama : "Bahan lainnya",
            altPct: pembanding ? pembanding.kenaikanPct : 0,
            altRp: pembanding ? pembanding.kontribusiRp : 0,
          }
        : null,
      suggestedPrice: saranHarga(hpp, margin30 === null ? null : Number(margin30)),
      history,
      recipeRows,
      // FR-28 / BR-10 — peringatan cakupan data
      cakupan: Math.round(cakupan * 100),
      bahanTanpaHarga: jumlahHilang,
    };
  } catch (err) {
    console.error("Error getDbMenuDetail:", err);
    throw err;
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
    const businessId = await getCurrentBusinessId();
    return await withAppTransaction(async (query) => {
      const mRes = await query<{ id: string }>(
        `insert into menu_items (business_id, name, sell_price, batch_yield, weekly_volume, active)
         values ($1, $2, $3, $4, $5, true)
         returning id`,
        [businessId, data.name, data.sellPrice, data.batchYield, data.weeklyVolume ?? null],
      );
      const menuId = mRes.rows[0]?.id;
      if (!menuId) throw new Error("Menu tidak berhasil dibuat.");

      for (const recipe of data.recipe) {
        await query(
          `insert into recipe_items (menu_item_id, commodity_id, batch_qty, qty, note)
           values ($1, $2, $3, $4, $5)`,
          [
            menuId,
            recipe.commodityId,
            recipe.batchQty,
            recipe.batchQty / data.batchYield,
            recipe.note || null,
          ],
        );
      }

      for (const fixedCost of data.fixedCosts ?? []) {
        await query(
          `insert into fixed_costs (menu_item_id, label, amount, is_estimated)
           values ($1, $2, $3, true)`,
          [menuId, fixedCost.label, fixedCost.amount],
        );
      }

      return menuId;
    });
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
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `update menu_items
       set sell_price = $1
       where business_id = $2
         and (id::text = $3
          or lower(name) = $4
          or lower(replace(name, ' ', '-')) = $4)`,
      [newPrice, businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
    );
    return Boolean(res && res.rowCount && res.rowCount > 0);
  } catch (err) {
    console.error("Error updateDbMenuPrice:", err);
    return false;
  }
}

export async function updateDbMenuActive(menuIdOrSlug: string, active: boolean): Promise<boolean> {
  const businessId = await getCurrentBusinessId();
  const result = await queryAppDb(
    `update menu_items
     set active = $1
     where business_id = $2
       and (id::text = $3
        or lower(name) = $4
        or lower(replace(name, ' ', '-')) = $4)`,
    [active, businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
  );
  return Boolean(result.rowCount);
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
    const businessId = await getCurrentBusinessId();
    return await withAppTransaction(async (query) => {
      const mRes = await query<{ id: string; batch_yield: number }>(
        `select id, batch_yield from menu_items
         where business_id = $1
           and (id::text = $2
            or lower(name) = $3
            or lower(replace(name, ' ', '-')) = $3)
         limit 1`,
        [businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
      );
      const menu = mRes.rows[0];
      if (!menu) return false;
      const yieldCount = data.batchYield ?? menu.batch_yield;

      await query(
        `update menu_items
         set name = coalesce($1, name),
             sell_price = coalesce($2, sell_price),
             batch_yield = coalesce($3, batch_yield),
             weekly_volume = coalesce($4, weekly_volume)
         where id = $5 and business_id = $6`,
        [data.name ?? null, data.sellPrice ?? null, data.batchYield ?? null, data.weeklyVolume ?? null, menu.id, businessId],
      );

      if (data.recipe !== undefined) {
        await query("delete from recipe_items where menu_item_id = $1", [menu.id]);
        for (const recipe of data.recipe) {
          await query(
            `insert into recipe_items (menu_item_id, commodity_id, batch_qty, qty, note)
             values ($1, $2, $3, $4, $5)`,
            [menu.id, recipe.commodityId, recipe.batchQty, recipe.batchQty / yieldCount, recipe.note || null],
          );
        }
      }

      if (data.fixedCosts !== undefined) {
        await query("delete from fixed_costs where menu_item_id = $1", [menu.id]);
        for (const fixedCost of data.fixedCosts) {
          await query(
            `insert into fixed_costs (menu_item_id, label, amount, is_estimated)
             values ($1, $2, $3, true)`,
            [menu.id, fixedCost.label, fixedCost.amount],
          );
        }
      }
      return true;
    });
  } catch (err) {
    console.error("Error updateDbMenuComplete:", err);
    return false;
  }
}

/**
 * Mengambil profil warung aktif dari Supabase
 */
export const getDbBusinessProfile = cache(async function () {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(`
      SELECT b.id,
             b.name,
             b.packaging_mode,
             r.id as region_id,
             r.name as region_name,
             (SELECT count(*) FROM menu_items WHERE business_id = b.id AND active) as active_menus_count,
             (SELECT ran_at FROM ingest_runs ORDER BY ran_at DESC LIMIT 1) as last_ingest_time,
             (SELECT max(date) FROM prices
              WHERE region_id = b.region_id AND business_id IS NULL AND NOT is_filled) as latest_price_date
      FROM businesses b
      LEFT JOIN regions r ON r.id = b.region_id
      WHERE b.id = $1
      LIMIT 1;
    `, [businessId]);

    const profile = res.rows[0];
    if (!profile) throw new Error("Profil warung tidak ditemukan.");
    return profile;
  } catch (err) {
    console.error("Error getDbBusinessProfile:", err);
    throw err;
  }
});

/**
 * Memperbarui profil warung di Supabase
 */
export async function updateDbBusinessProfile(data: {
  name: string;
  packagingMode: "dine_in" | "takeaway" | "mixed";
  regionId?: number;
}): Promise<boolean> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `update businesses
       set name = $1, packaging_mode = $2, region_id = coalesce($3, region_id)
       where id = $4`,
      [data.name, data.packagingMode, data.regionId ?? null, businessId],
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

/**
 * FR-08 — hapus menu. recipe_items, fixed_costs, margin_snapshots dan alerts
 * ikut terhapus lewat on delete cascade di skema.
 */
export async function hapusDbMenu(menuIdOrSlug: string): Promise<boolean> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `delete from menu_items
       where business_id = $1
         and (id::text = $2
          or lower(name) = $3
          or lower(replace(name, ' ', '-')) = $3)`,
      [businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
    );
    return Boolean(res?.rowCount);
  } catch (err) {
    console.error("Error hapusDbMenu:", err);
    return false;
  }
}

/**
 * FR-57 — memeriksa resep yang akan disimpan, memakai harga terkini tiap bahan.
 * Dipanggil sebelum insert/update sehingga angka mustahil tidak pernah masuk DB.
 */
export async function periksaResepSebelumSimpan(
  recipe: Array<{ commodityId: string; batchQty: number }>,
  batchYield: number,
  sellPrice: number,
): Promise<Array<{ nama: string; biayaPerPorsi: number; pesan: string }>> {
  if (!recipe?.length || !batchYield || batchYield <= 0) return [];

  const businessId = await getCurrentBusinessId();
  const ids = recipe.map((r) => r.commodityId);
  const res = await queryAppDb(
    `select ids.commodity_id,
            coalesce(c.name, ci.name, ids.commodity_id) nama,
            coalesce(nota.price, pasar.price) price
     from unnest($1::text[]) ids(commodity_id)
     join businesses b on b.id = $2
     left join commodities c on c.id = ids.commodity_id
     left join catalog_items ci on ci.id = ids.commodity_id
     left join lateral (
       select p.price from prices p
       where p.commodity_id = ids.commodity_id and p.region_id = b.region_id
         and p.business_id = b.id
       order by p.date desc limit 1
     ) nota on true
     left join lateral (
       select p.price from prices p
       where p.commodity_id = ids.commodity_id and p.region_id = b.region_id
         and p.business_id is null
       order by p.date desc limit 1
     ) pasar on true`,
    [ids, businessId],
  );

  const harga = new Map<string, { nama: string; price: number }>();
  for (const r of res?.rows ?? []) {
    harga.set(r.commodity_id, { nama: r.nama, price: Number(r.price) });
  }

  const bahan: BahanResep[] = recipe.map((r) => {
    const h = harga.get(r.commodityId);
    return {
      komoditasId: r.commodityId,
      nama: h?.nama ?? r.commodityId,
      qty: r.batchQty / batchYield,   // BR-08
      harga: h ? h.price : null,
      dariData: Boolean(h),
    };
  });

  return periksaSatuan(bahan, sellPrice).map((k) => ({
    nama: k.nama,
    biayaPerPorsi: k.biayaPerPorsi,
    pesan: k.pesan,
  }));
}
