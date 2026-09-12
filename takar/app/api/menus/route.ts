import { NextResponse } from "next/server";
import { calculateDynamicMenus } from "@/lib/services/menu-engine";

export async function GET() {
  try {
    const { menus, latestDate } = await calculateDynamicMenus();
    return NextResponse.json({
      status: "ok",
      latest_date: latestDate,
      menus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil data menu";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
