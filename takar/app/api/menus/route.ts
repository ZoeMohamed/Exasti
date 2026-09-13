import { NextResponse } from "next/server";
import { getDbMenus, createDbMenu, periksaResepSebelumSimpan } from "@/lib/services/menu-engine";
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

    // FR-57 — tolak sebelum menyentuh database
    const keberatan = await periksaResepSebelumSimpan(
      body.recipe || [],
      Number(body.batchYield),
      Number(body.sellPrice),
    );
    if (keberatan.length > 0) {
      return NextResponse.json(
        {
          error: "Sepertinya ada takaran yang keliru",
          keberatan,
          pesan: keberatan[0].pesan,
        },
        { status: 422 },
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
        message: `Menu "${body.name}" berhasil disimpan`,
        menuId,
      });
    }

    return NextResponse.json({ error: "Menu belum berhasil disimpan" }, { status: 500 });
  } catch (err: unknown) {
    return apiError(err, "Gagal menyimpan menu");
  }
}
