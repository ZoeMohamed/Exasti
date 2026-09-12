import { NextResponse } from "next/server";
import { getCommodityPrices } from "@/lib/db/store";

export async function GET() {
  try {
    const { series, source, latestDate } = await getCommodityPrices();
    const commodityCount = Object.keys(series).length;
    const totalPoints = Object.values(series).reduce((acc, dates) => acc + Object.keys(dates).length, 0);

    return NextResponse.json({
      status: "ok",
      source,
      latest_date: latestDate,
      commodity_count: commodityCount,
      total_price_points: totalPoints,
      message: `Harga pangan Kota Semarang terhubung (${commodityCount} bahan, ${totalPoints} titik harga)`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat sinkronisasi";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
