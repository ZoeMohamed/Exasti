import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
let connectionString = process.env.DATABASE_URL;
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      connectionString = trimmed.replace("DATABASE_URL=", "").trim();
    }
  }
}
if (!connectionString) {
  console.error("DATABASE_URL tidak ditemukan di .env.local!");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const COMMODITIES = [
  { id: "Beras", name: "Beras", unit: "kg" },
  { id: "Beras Kualitas Bawah I", name: "Beras Kualitas Bawah I", unit: "kg" },
  { id: "Beras Kualitas Bawah II", name: "Beras Kualitas Bawah II", unit: "kg" },
  { id: "Beras Kualitas Medium I", name: "Beras Kualitas Medium I", unit: "kg" },
  { id: "Beras Kualitas Medium II", name: "Beras Kualitas Medium II", unit: "kg" },
  { id: "Beras Kualitas Super I", name: "Beras Kualitas Super I", unit: "kg" },
  { id: "Beras Kualitas Super II", name: "Beras Kualitas Super II", unit: "kg" },
  { id: "Daging Ayam", name: "Daging Ayam", unit: "kg" },
  { id: "Daging Ayam Ras Segar", name: "Daging Ayam Ras Segar", unit: "kg" },
  { id: "Daging Sapi", name: "Daging Sapi", unit: "kg" },
  { id: "Daging Sapi Kualitas 1", name: "Daging Sapi Kualitas 1", unit: "kg" },
  { id: "Daging Sapi Kualitas 2", name: "Daging Sapi Kualitas 2", unit: "kg" },
  { id: "Telur Ayam", name: "Telur Ayam", unit: "kg" },
  { id: "Telur Ayam Ras Segar", name: "Telur Ayam Ras Segar", unit: "kg" },
  { id: "Bawang Merah", name: "Bawang Merah", unit: "kg" },
  { id: "Bawang Merah Ukuran Sedang", name: "Bawang Merah Ukuran Sedang", unit: "kg" },
  { id: "Bawang Putih", name: "Bawang Putih", unit: "kg" },
  { id: "Bawang Putih Ukuran Sedang", name: "Bawang Putih Ukuran Sedang", unit: "kg" },
  { id: "Cabai Merah", name: "Cabai Merah", unit: "kg" },
  { id: "Cabai Merah Besar", name: "Cabai Merah Besar", unit: "kg" },
  { id: "Cabai Merah Keriting", name: "Cabai Merah Keriting", unit: "kg" },
  { id: "Cabai Rawit", name: "Cabai Rawit", unit: "kg" },
  { id: "Cabai Rawit Hijau", name: "Cabai Rawit Hijau", unit: "kg" },
  { id: "Cabai Rawit Merah", name: "Cabai Rawit Merah", unit: "kg" },
  { id: "Minyak Goreng", name: "Minyak Goreng", unit: "kg" },
  { id: "Minyak Goreng Curah", name: "Minyak Goreng Curah", unit: "kg" },
  { id: "Minyak Goreng Kemasan Bermerk 1", name: "Minyak Goreng Kemasan Bermerk 1", unit: "kg" },
  { id: "Minyak Goreng Kemasan Bermerk 2", name: "Minyak Goreng Kemasan Bermerk 2", unit: "kg" },
  { id: "Gula Pasir", name: "Gula Pasir", unit: "kg" },
  { id: "Gula Pasir Kualitas Premium", name: "Gula Pasir Kualitas Premium", unit: "kg" },
  { id: "Gula Pasir Lokal", name: "Gula Pasir Lokal", unit: "kg" },
];

const MENUS = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    slug: "ayam-geprek",
    name: "Ayam Geprek Sambal Korek",
    sell_price: 18000,
    batch_yield: 8,
    weekly_volume: 150,
    recipe: [
      { commodity_id: "Daging Ayam Ras Segar", batch_qty: 2.0, note: "Ayam potong segar" },
      { commodity_id: "Beras Kualitas Medium I", batch_qty: 1.0, note: "Beras nasi pulen" },
      { commodity_id: "Cabai Rawit Hijau", batch_qty: 0.12, note: "Cabai sambal korek" },
      { commodity_id: "Bawang Merah Ukuran Sedang", batch_qty: 0.08, note: "Bumbu sambal" },
      { commodity_id: "Minyak Goreng Curah", batch_qty: 0.24, note: "Minyak goreng deep-fry" },
    ],
    fixed_costs: [
      { label: "Gas, Kertas Pembungkus & Plastik", amount: 1495, is_estimated: true },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    slug: "ayam-bakar-madu",
    name: "Ayam Bakar Madu",
    sell_price: 20000,
    batch_yield: 8,
    weekly_volume: 80,
    recipe: [
      { commodity_id: "Daging Ayam Ras Segar", batch_qty: 2.0, note: "Ayam marinasi madu" },
      { commodity_id: "Beras Kualitas Medium I", batch_qty: 1.0, note: "Nasi pulen" },
      { commodity_id: "Minyak Goreng Curah", batch_qty: 0.16, note: "Minyak oles bakar" },
      { commodity_id: "Bawang Merah Ukuran Sedang", batch_qty: 0.08, note: "Bumbu ungkep" },
    ],
    fixed_costs: [
      { label: "Arang, Gas & Bumbu Madu", amount: 2500, is_estimated: true },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    slug: "nasi-goreng",
    name: "Nasi Goreng Spesial",
    sell_price: 15000,
    batch_yield: 8,
    weekly_volume: 110,
    recipe: [
      { commodity_id: "Beras Kualitas Medium I", batch_qty: 1.2, note: "Nasi pera" },
      { commodity_id: "Telur Ayam Ras Segar", batch_qty: 0.8, note: "Telur orak arik & ceplok" },
      { commodity_id: "Bawang Merah Ukuran Sedang", batch_qty: 0.08, note: "Bumbu tumis" },
      { commodity_id: "Minyak Goreng Curah", batch_qty: 0.2, note: "Minyak tumis" },
    ],
    fixed_costs: [
      { label: "Gas & Bumbu Racik", amount: 1100, is_estimated: true },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    slug: "pecel-lele",
    name: "Pecel Lele Goreng Crispy",
    sell_price: 16000,
    batch_yield: 8,
    weekly_volume: 95,
    recipe: [
      { commodity_id: "Beras Kualitas Medium I", batch_qty: 1.0, note: "Nasi putih" },
      { commodity_id: "Minyak Goreng Curah", batch_qty: 0.3, note: "Minyak goreng lele" },
      { commodity_id: "Cabai Rawit Hijau", batch_qty: 0.1, note: "Sambal terasi" },
    ],
    fixed_costs: [
      { label: "Ikan Lele Segar (Pasar)", amount: 7200, is_estimated: true },
      { label: "Gas, Tepung & Lalapan", amount: 1200, is_estimated: true },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000105",
    slug: "mie-dok-dok",
    name: "Mie Dok-Dok Pedas",
    sell_price: 13000,
    batch_yield: 6,
    weekly_volume: 130,
    recipe: [
      { commodity_id: "Telur Ayam Ras Segar", batch_qty: 0.5, note: "Telur kuah" },
      { commodity_id: "Cabai Rawit Hijau", batch_qty: 0.06, note: "Cabai iris" },
      { commodity_id: "Bawang Merah Ukuran Sedang", batch_qty: 0.04, note: "Bawang kuah" },
    ],
    fixed_costs: [
      { label: "Mie Instan & Sayur Sawi", amount: 3800, is_estimated: true },
      { label: "Gas & Kuah Bumbu", amount: 800, is_estimated: true },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000106",
    slug: "es-teh-jumbo",
    name: "Es Teh Manis Jumbo",
    sell_price: 5000,
    batch_yield: 10,
    weekly_volume: 260,
    recipe: [
      { commodity_id: "Gula Pasir Kualitas Premium", batch_qty: 0.35, note: "Gula seduh" },
    ],
    fixed_costs: [
      { label: "Cup Plastik, Sedotan & Es Batu", amount: 950, is_estimated: true },
    ],
  },
];

async function seed() {
  console.log("Menghubungkan ke Supabase PostgreSQL...");
  await client.connect();

  console.log("[1] Menyiapkan Wilayah Kota Semarang...");
  await client.query(`
    INSERT INTO regions (id, bi_province_id, bi_regency_id, name, level)
    VALUES (1, 13, 1, 'Kota Semarang', 'regency')
    ON CONFLICT (bi_province_id, bi_regency_id) DO UPDATE SET name = EXCLUDED.name;
  `);

  console.log("[2] Menyiapkan Komoditas Bank Indonesia...");
  for (const c of COMMODITIES) {
    await client.query(
      `INSERT INTO commodities (id, name, unit)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit;`,
      [c.id, c.name, c.unit]
    );
  }

  console.log("[3] Menyiapkan Warung Bu Sri...");
  await client.query(`
    INSERT INTO businesses (id, name, region_id, packaging_mode)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Warung Bu Sri', 1, 'mixed')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id;
  `);

  console.log("[4] Menyiapkan Menu Items & Resep Batch...");
  for (const m of MENUS) {
    await client.query(`
      INSERT INTO menu_items (id, business_id, name, sell_price, batch_yield, weekly_volume, active)
      VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sell_price = EXCLUDED.sell_price,
        batch_yield = EXCLUDED.batch_yield,
        weekly_volume = EXCLUDED.weekly_volume;
    `, [m.id, m.name, m.sell_price, m.batch_yield, m.weekly_volume]);

    // Resep
    for (const r of m.recipe) {
      const perPortionQty = r.batch_qty / m.batch_yield;
      await client.query(`
        INSERT INTO recipe_items (menu_item_id, commodity_id, batch_qty, qty, note)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (menu_item_id, commodity_id) DO UPDATE SET
          batch_qty = EXCLUDED.batch_qty,
          qty = EXCLUDED.qty,
          note = EXCLUDED.note;
      `, [m.id, r.commodity_id, r.batch_qty, perPortionQty, r.note]);
    }

    // Fixed costs
    await client.query(`DELETE FROM fixed_costs WHERE menu_item_id = $1`, [m.id]);
    for (const f of m.fixed_costs) {
      await client.query(`
        INSERT INTO fixed_costs (menu_item_id, label, amount, is_estimated)
        VALUES ($1, $2, $3, $4);
      `, [m.id, f.label, f.amount, f.is_estimated]);
    }
  }

  console.log("[5] Menarik Data Bank Indonesia (90 Hari)...");
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 90);

  const mmStart = String(start.getMonth() + 1).padStart(2, "0");
  const ddStart = String(start.getDate()).padStart(2, "0");
  const yyyyStart = start.getFullYear();

  const mmEnd = String(today.getMonth() + 1).padStart(2, "0");
  const ddEnd = String(today.getDate()).padStart(2, "0");
  const yyyyEnd = today.getFullYear();

  const params = new URLSearchParams({
    price_type_id: "1",
    comcat_id: "",
    province_id: "13",
    regency_id: "1",
    market_id: "",
    tipe_laporan: "1",
    start_date: `${mmStart}/${ddStart}/${yyyyStart}`,
    end_date: `${mmEnd}/${ddEnd}/${yyyyEnd}`,
  });

  const biUrl = `https://www.bi.go.id/hargapangan/WebSite/TabelHarga/GetGridDataDaerah?${params.toString()}`;
  const biRes = await fetch(biUrl, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "takar-seed/1.0",
    },
  });

  const pricePoints: Array<{ commodity: string; date: string; price: number }> = [];

  if (biRes.ok) {
    const json = await biRes.json();
    const rows = json.data || [];

    for (const row of rows) {
      const name = (row.name || "").trim();
      if (!name) continue;

      for (const [key, val] of Object.entries(row)) {
        if (typeof key === "string" && key.includes("/")) {
          const parts = key.split("/");
          if (parts.length === 3) {
            const iso = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            const cleanVal = String(val).trim().replace(/,/g, "");
            const num = parseFloat(cleanVal);
            if (!isNaN(num) && num > 0) {
              pricePoints.push({ commodity: name, date: iso, price: num });
            }
          }
        }
      }
    }
  }

  console.log(`Ditemukan ${pricePoints.length} titik harga. Melakukan Batch Insert ke Supabase...`);

  // Bulk insert in chunks of 150
  const CHUNK_SIZE = 150;
  for (let i = 0; i < pricePoints.length; i += CHUNK_SIZE) {
    const chunk = pricePoints.slice(i, i + CHUNK_SIZE);
    const valueClauses: string[] = [];
    const values: Array<string | number> = [];
    let pIdx = 1;

    for (const item of chunk) {
      valueClauses.push(`($${pIdx}, 1, $${pIdx + 1}, $${pIdx + 2}, 'bi_hargapangan', false)`);
      values.push(item.commodity, item.date, item.price);
      pIdx += 3;
    }

    const sql = `
      INSERT INTO prices (commodity_id, region_id, date, price, source, is_filled)
      VALUES ${valueClauses.join(", ")}
      ON CONFLICT (commodity_id, region_id, date) WHERE business_id IS NULL
      DO UPDATE SET price = EXCLUDED.price;
    `;
    await client.query(sql, values);
  }
  console.log(`Berhasil batch insert ${pricePoints.length} baris harga BI.`);

  // [6] Snapshot 30 hari untuk riwayat untung (ProfitHistory)
  console.log("[6] Menghitung & Menyimpan Snapshot Margin 30 Hari Terakhir...");
  const dateRes = await client.query(`
    SELECT DISTINCT date::text as date FROM prices
    WHERE region_id = 1 AND business_id IS NULL ORDER BY date DESC LIMIT 30;
  `);
  const dates = dateRes.rows.map((r) => String(r.date));

  for (const targetDate of dates) {
    // Ambil harga pada targetDate
    const pRes = await client.query(`
      SELECT commodity_id, price FROM prices
      WHERE region_id = 1 AND business_id IS NULL AND date = $1
    `, [targetDate]);
    const priceMap = new Map<string, number>();
    for (const row of pRes.rows) {
      priceMap.set(row.commodity_id, parseFloat(row.price));
    }

    for (const m of MENUS) {
      let hpp = 0;
      for (const r of m.recipe) {
        const p = priceMap.get(r.commodity_id) || 30000;
        hpp += (r.batch_qty / m.batch_yield) * p;
      }
      for (const f of m.fixed_costs) {
        hpp += f.amount;
      }
      hpp = Math.round(hpp);
      const marginPct = Math.round(((m.sell_price - hpp) / m.sell_price) * 1000) / 10;

      await client.query(`
        INSERT INTO margin_snapshots (menu_item_id, date, hpp, sell_price, margin_pct, from_data, missing_count)
        VALUES ($1, $2, $3, $4, $5, $6, 0)
        ON CONFLICT (menu_item_id, date) DO UPDATE SET
          hpp = EXCLUDED.hpp,
          sell_price = EXCLUDED.sell_price,
          margin_pct = EXCLUDED.margin_pct;
      `, [m.id, targetDate, hpp, m.sell_price, marginPct, m.recipe.length]);
    }
  }

  // [7] Catat di ingest_runs
  console.log("[7] Mencatat Log Audit Ingest...");
  await client.query(`
    INSERT INTO ingest_runs (target_date, region_count, rows_upserted, status, message)
    VALUES ($1, 1, $2, 'ok', 'Seed awal 90 hari harga BI Kota Semarang berhasil');
  `, [dates[0] || '2026-09-11', pricePoints.length]);

  console.log("✅ SELESAI SEED DATABASE SUPABASE DENGAN SEMPURNA!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
