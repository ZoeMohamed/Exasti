import { NextResponse } from "next/server";
import { getDbMenus, createDbMenu, MenuInputError } from "@/lib/services/menu-engine";
import { apiError, requireApiBusinessId } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiBusinessId();
    const { menus, latestDate } = await getDbMenus();
    return NextResponse.json({
      status: "ok",
      latest_date: latestDate,
      menus,
    });
  } catch (err: unknown) {
    return apiError(err, "Gagal mengambil data menu");
  }
}

export async function POST(req: Request) {
  try {
    await requireApiBusinessId();
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
      weeklyVolume: body.weeklyVolume === undefined || body.weeklyVolume === null
        ? undefined
        : Number(body.weeklyVolume),
      recipe: body.recipe || [],
      fixedCosts: body.fixedCosts || [],
    });

    return NextResponse.json({
      status: "ok",
      message: `Menu "${body.name}" berhasil disimpan`,
      menuId,
    });
  } catch (err: unknown) {
    if (err instanceof MenuInputError) {
      return NextResponse.json(
        { error: err.message, pesan: err.keberatan[0]?.pesan ?? err.message, keberatan: err.keberatan },
        { status: err.status },
      );
    }
    return apiError(err, "Gagal menyimpan menu");
  }
}
