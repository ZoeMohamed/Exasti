import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    // 1. Tes koneksi live & ambil versi postgres
    const pingRes = await queryDb("SELECT NOW() as current_time, version();");
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

    // 2. Cek jumlah baris di setiap tabel Supabase
    const countsRes = await queryDb(`
      SELECT 
        (SELECT count(*) FROM prices) as prices_count,
        (SELECT count(*) FROM menu_items) as menu_items_count,
        (SELECT count(*) FROM recipe_items) as recipe_items_count,
        (SELECT count(*) FROM fixed_costs) as fixed_costs_count,
        (SELECT count(*) FROM margin_snapshots) as snapshots_count,
        (SELECT count(*) FROM businesses) as businesses_count,
        (SELECT count(*) FROM commodities) as commodities_count,
        (SELECT count(*) FROM regions) as regions_count,
        (SELECT MAX(date) FROM prices WHERE region_id = 1) as latest_bi_price_date;
    `);

    const counts = countsRes?.rows[0] || {};

    return NextResponse.json({
      status: "connected",
      database: "Supabase PostgreSQL (AWS Mumbai)",
      project_ref: "itbzozqigakvotvadreb",
      latency_ms: latency,
      server_time: pingRes.rows[0].current_time,
      postgres_version: pingRes.rows[0].version.split(" ")[0] + " " + pingRes.rows[0].version.split(" ")[1],
      data_tables: {
        prices: Number(counts.prices_count),
        menu_items: Number(counts.menu_items_count),
        recipe_items: Number(counts.recipe_items_count),
        fixed_costs: Number(counts.fixed_costs_count),
        margin_snapshots: Number(counts.snapshots_count),
        businesses: Number(counts.businesses_count),
        commodities: Number(counts.commodities_count),
        regions: Number(counts.regions_count),
      },
      latest_bi_price_date: counts.latest_bi_price_date,
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
