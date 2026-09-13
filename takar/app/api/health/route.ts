import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db/client";


export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    // Tes koneksi live tanpa mengungkap mesin, host, atau versi database.
    const pingRes = await queryDb(
      `select to_char(current_timestamp, 'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM') as current_time,
              current_setting('timezone') as timezone`,
    );
    const latency = Date.now() - start;

    if (!pingRes || pingRes.rows.length === 0) {
      return NextResponse.json(
        {
          status: "disconnected",
          message: "Layanan data sedang tidak tersedia.",
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
    return NextResponse.json({
      status: "connected",
      latency_ms: latency,
      server_time: pingRes.rows[0].current_time,
      timezone: pingRes.rows[0].timezone,
      latest_bi_price_date: freshness.latest_bi_price_date,
      effective_price_date: freshness.effective_price_date,
    });
  } catch (err: unknown) {
    console.error("Pemeriksaan layanan data gagal:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        status: "error",
        error: "Layanan data sedang tidak tersedia.",
      },
      { status: 500 }
    );
  }
}
