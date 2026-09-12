import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await queryDb(`
      SELECT c.id,
             c.name,
             c.unit,
             coalesce(lp.price, 25000) as current_price
      FROM commodities c
      LEFT JOIN latest_prices lp ON lp.commodity_id = c.id AND lp.region_id = 1
      ORDER BY c.sort_order ASC, c.name ASC;
    `);

    return NextResponse.json({
      status: "ok",
      commodities: res?.rows || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil daftar komoditas";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
