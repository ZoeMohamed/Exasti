import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db/client";


/**
 * Membaca region dari DATABASE_URL, bukan dari teks yang dipatok.
 * Versi sebelumnya menuliskan "AWS Mumbai" dan satu project_ref secara
 * harfiah, sehingga endpoint ini tetap melaporkan Mumbai bahkan setelah
 * databasenya dipindah — laporan kesehatan yang justru menyesatkan. Host dan
 * project ref tidak ikut dikirim oleh endpoint publik ini.
 */
function bacaRegionDb(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    const match = u.hostname.match(/aws-\d+-([a-z]+-[a-z]+-\d+)\.pooler/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const NAMA_REGION: Record<string, string> = {
  "ap-south-1": "AWS Mumbai",
  "ap-southeast-1": "AWS Singapura",
  "ap-southeast-3": "AWS Jakarta",
  "ap-southeast-5": "AWS Malaysia",
  "ap-northeast-1": "AWS Tokyo",
};

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    // 1. Tes koneksi live & ambil versi postgres
    const pingRes = await queryDb(
      `select to_char(current_timestamp, 'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM') as current_time,
              current_setting('timezone') as timezone,
              version()`,
    );
    const latency = Date.now() - start;

    if (!pingRes || pingRes.rows.length === 0) {
      return NextResponse.json(
        {
          status: "disconnected",
          message: "Tidak dapat terhubung ke database. Periksa DATABASE_URL di .env.local",
        },
        { status: 503 }
      );
    }

    // Endpoint publik hanya mengungkap kesegaran data, bukan jumlah data warung.
    const freshnessRes = await queryDb(`
      SELECT
        (SELECT MAX(date)::text FROM prices WHERE business_id IS NULL) as effective_price_date,
        (SELECT MAX(date)::text FROM prices WHERE business_id IS NULL AND NOT is_filled) as latest_bi_price_date;
    `);

    const freshness = freshnessRes.rows[0] || {};
    const region = bacaRegionDb();

    return NextResponse.json({
      status: "connected",
      database: region
        ? `Supabase PostgreSQL (${NAMA_REGION[region] ?? region})`
        : "Supabase PostgreSQL",
      region,
      latency_ms: latency,
      server_time: pingRes.rows[0].current_time,
      timezone: pingRes.rows[0].timezone,
      postgres_version: pingRes.rows[0].version.split(" ")[0] + " " + pingRes.rows[0].version.split(" ")[1],
      latest_bi_price_date: freshness.latest_bi_price_date,
      effective_price_date: freshness.effective_price_date,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error koneksi database";
    return NextResponse.json(
      {
        status: "error",
        error: message,
      },
      { status: 500 }
    );
  }
}
