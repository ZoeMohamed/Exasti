import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function check() {
  console.log("\n🔍 MEMERIKSA KONEKSI KE SUPABASE POSTGRESQL...\n");

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
    console.error("❌ GAGAL: DATABASE_URL tidak ditemukan di .env.local!");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const start = Date.now();
  try {
    await client.connect();
    const latency = Date.now() - start;

    console.log("✅ STATUS: TERHUBUNG KE SUPABASE!");
    console.log(`⏱️ Latency: ${latency} ms`);

    const versionRes = await client.query("SELECT version();");
    console.log(`🐘 Versi Database: ${versionRes.rows[0].version.split(",")[0]}`);

    console.log("\n📊 JUMLAH DATA DALAM TABEL ANDA:");
    const tables = [
      "prices",
      "menu_items",
      "recipe_items",
      "fixed_costs",
      "margin_snapshots",
      "businesses",
      "commodities",
      "regions",
    ];

    for (const tbl of tables) {
      const r = await client.query(`SELECT count(*) FROM ${tbl}`);
      console.log(`  • ${tbl.padEnd(20)} : ${r.rows[0].count} baris`);
    }

    const latestPrice = await client.query(`
      SELECT commodity_id, price, date 
      FROM prices 
      WHERE region_id = 1 
      ORDER BY date DESC 
      LIMIT 3;
    `);

    console.log("\n🏷️ CONTOH DATA HARGA BI TERBARU DI SUPABASE:");
    for (const p of latestPrice.rows) {
      console.log(`  • ${p.commodity_id.padEnd(25)} : Rp ${Number(p.price).toLocaleString("id-ID")} (Tanggal: ${new Date(p.date).toISOString().split("T")[0]})`);
    }

    const commRes = await client.query("SELECT id, name, unit FROM commodities ORDER BY name LIMIT 10");
    console.log("\n🌾 DAFTAR KOMODITAS DI DATABASE:");
    for (const c of commRes.rows) {
      console.log(`  • [${c.id}] ${c.name} (${c.unit})`);
    }

    const menuRes = await client.query("SELECT id, name, sell_price, batch_yield FROM menu_items");
    console.log("\n🍲 DAFTAR MENU DI DATABASE:");
    for (const m of menuRes.rows) {
      console.log(`  • [${m.id}] ${m.name} - Jual: Rp ${Number(m.sell_price).toLocaleString("id-ID")}, Yield: ${m.batch_yield}`);
    }

    const recRes = await client.query("SELECT r.menu_item_id, m.name as menu_name, r.commodity_id, c.name as comm_name, r.batch_qty, r.qty FROM recipe_items r JOIN menu_items m ON m.id = r.menu_item_id LEFT JOIN commodities c ON c.id = r.commodity_id LIMIT 10");
    console.log("\n📜 CONTOH RESEP DI DATABASE:");
    for (const r of recRes.rows) {
      console.log(`  • ${r.menu_name}: ${r.comm_name || r.commodity_id} (batch: ${r.batch_qty}, porsi: ${r.qty})`);
    }

    console.log("\n🎯 PROYEK ANDA RESMI TERHUBUNG KE SUPABASE CLOUD!\n");
  } catch (err: any) {
    console.error("❌ GAGAL TERHUBUNG KE SUPABASE:", err.message);
  } finally {
    await client.end();
  }
}

check();
