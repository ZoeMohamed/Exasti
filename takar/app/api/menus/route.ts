import { NextResponse } from "next/server";
import { getDbMenus, createDbMenu } from "@/lib/services/menu-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { menus, latestDate } = await getDbMenus();
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name || !body.sellPrice || !body.batchYield) {
      return NextResponse.json(
        { error: "Nama menu, harga jual, dan takaran porsi sekali masak wajib diisi" },
        { status: 400 }
      );
    }

    const menuId = await createDbMenu({
      name: body.name,
      sellPrice: Number(body.sellPrice),
      batchYield: Number(body.batchYield),
      weeklyVolume: body.weeklyVolume ? Number(body.weeklyVolume) : undefined,
      recipe: body.recipe || [],
      fixedCosts: body.fixedCosts || [],
    });

    if (menuId) {
      return NextResponse.json({
        status: "ok",
        message: `Menu "${body.name}" berhasil disimpan ke Supabase`,
        menuId,
      });
    }

    return NextResponse.json({ error: "Gagal menyimpan menu ke database" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan menu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
