import { NextResponse } from "next/server";
import { getMenuById, getCommodityPrices, saveMenu } from "@/lib/db/store";
import { evaluateMenu } from "@/lib/engine/margin";
import { MenuItem } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const menu = getMenuById(id);

  if (!menu) {
    return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
  }

  const { series, latestDate } = await getCommodityPrices();
  const calc = evaluateMenu(menu, series, latestDate);

  return NextResponse.json({
    menu,
    calc,
    latest_date: latestDate,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const menu = getMenuById(id);

  if (!menu) {
    return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
  }

  try {
    const body: Partial<MenuItem> = await req.json();
    const updated: MenuItem = {
      ...menu,
      ...body,
      id,
    };
    saveMenu(updated);
    return NextResponse.json({ status: "ok", menu: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui menu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
