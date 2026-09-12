import { NextResponse } from "next/server";
import { syncBiPricesToDatabase } from "@/lib/services/bi-ingest";

export async function GET() {
  try {
    const result = await syncBiPricesToDatabase(90);
    return NextResponse.json({
      status: "ok",
      count: result.count,
      latest_date: result.latestDate,
      message: `Berhasil sinkronisasi ${result.count} data harga Bank Indonesia Kota Semarang.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal sinkronisasi data BI";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
