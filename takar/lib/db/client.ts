import {
  Pool,
  type PoolClient,
  type QueryConfigValues,
  type QueryResult,
  type QueryResultRow,
} from "pg";

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
      // Batasi koneksi per instance serverless agar lonjakan request tidak
      // menghabiskan slot transaction pooler Supabase lintas-region.
      max: 5,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
    });
    pool.on("error", (error) => {
      // Tanpa listener, pg mengubah putusnya koneksi idle menjadi exception
      // proses. Pool akan membuang client rusak dan membuat pengganti saat perlu.
      console.error("Koneksi database idle terputus:", error.message);
    });
  }

  return pool;
}

export type DbQuery = <Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryConfigValues<unknown[]>,
) => Promise<QueryResult<Row>>;

/**
 * Kueri sistem untuk cron, health-check, dan cache AI.
 *
 * Kegagalan sengaja dilempar ke pemanggil. Implementasi lama mengubah setiap
 * error menjadi `null`, sehingga ingestion dapat melaporkan sukses walau tidak
 * satu pun baris benar-benar tersimpan.
 */
export async function queryDb<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryConfigValues<unknown[]>,
): Promise<QueryResult<Row>> {
  const p = getDbPool();
  if (!p) throw new Error("DATABASE_URL belum dikonfigurasi.");
  return p.query<Row>(text, params);
}

async function runInTransaction<T>(
  client: PoolClient,
  operation: (query: DbQuery) => Promise<T>,
): Promise<T> {
  const query: DbQuery = (text, params) => client.query(text, params);
  await client.query("begin");
  try {
    const value = await operation(query);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

/** Menjamin operasi majemuk tersimpan utuh atau dibatalkan utuh. */
export async function withTransaction<T>(operation: (query: DbQuery) => Promise<T>): Promise<T> {
  const p = getDbPool();
  if (!p) throw new Error("DATABASE_URL belum dikonfigurasi.");
  const client = await p.connect();
  try {
    return await runInTransaction(client, operation);
  } finally {
    client.release();
  }
}

/**
 * Menjalankan transaksi sebagai role `authenticated` dengan klaim user.
 * Dengan begitu request web benar-benar melewati RLS, meskipun koneksi awal
 * memakai kredensial server untuk mencapai pooler Supabase.
 */
export async function withAuthenticatedTransaction<T>(
  userId: string,
  operation: (query: DbQuery) => Promise<T>,
): Promise<T> {
  const p = getDbPool();
  if (!p) throw new Error("DATABASE_URL belum dikonfigurasi.");
  const client = await p.connect();
  try {
    return await runInTransaction(client, async (query) => {
      await query(
        `select set_config('request.jwt.claim.sub', $1, true),
                set_config('request.jwt.claim.role', 'authenticated', true)`,
        [userId],
      );
      await query("set local role authenticated");
      return operation(query);
    });
  } finally {
    client.release();
  }
}
