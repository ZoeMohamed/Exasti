import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { BI_REGIONS } from "../lib/data/bi-regions";

const envPath = path.resolve(__dirname, "../.env.local");
let connectionString = process.env.DATABASE_URL;
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      connectionString = trimmed.slice("DATABASE_URL=".length).trim();
    }
  }
}
if (!connectionString || connectionString === "[SENSITIVE]") {
  throw new Error("DATABASE_URL asli wajib tersedia di environment atau .env.local.");
}

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Menghubungkan ke Supabase PostgreSQL...");
  await client.connect();

  try {
    console.log("1. Memastikan kolom province_name ada di tabel regions...");
    await client.query("ALTER TABLE regions ADD COLUMN IF NOT EXISTS province_name text;");

    console.log("2. Memperbarui Kota Semarang (id=1)...");
    await client.query(`
      UPDATE regions
      SET province_name = 'Jawa Tengah', name = 'Kota Semarang', bi_province_id = 14, bi_regency_id = 35
      WHERE id = 1;
    `);

    console.log(`3. Memasukkan ${BI_REGIONS.length} wilayah Bank Indonesia...`);
    let inserted = 0;
    for (const r of BI_REGIONS) {
      await client.query(
        `INSERT INTO regions (bi_province_id, bi_regency_id, name, province_name, level)
         VALUES ($1, $2, $3, $4, 'regency')
         ON CONFLICT (bi_province_id, bi_regency_id)
         DO UPDATE SET name = EXCLUDED.name, province_name = EXCLUDED.province_name, level = 'regency';`,
        [r.provinceId, r.regencyId, r.regencyName, r.provinceName],
      );
      inserted++;
    }

    const res = await client.query("SELECT count(*) as total, count(distinct province_name) as prov_count FROM regions;");
    console.log(`✅ Berhasil menyelaraskan ${inserted} wilayah: total ${res.rows[0].total} kota/kabupaten di ${res.rows[0].prov_count} provinsi.`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Gagal menyelaraskan wilayah:", err);
  process.exit(1);
});
