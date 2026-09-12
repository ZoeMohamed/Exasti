import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL tidak ditemukan di environment. Menjalankan mode fallback lokal.");
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
}

export async function queryDb(text: string, params?: any[]) {
  const p = getDbPool();
  if (!p) return null;
  try {
    const res = await p.query(text, params);
    return res;
  } catch (err) {
    console.error("Database query error:", err);
    return null;
  }
}
