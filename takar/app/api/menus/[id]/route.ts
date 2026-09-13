import { NextResponse } from "next/server";
import { hapusDbMenu, getDbMenuDetail, MenuInputError, updateDbMenuActive, updateDbMenuPrice, updateDbMenuComplete } from "@/lib/services/menu-engine";
import { apiError, requireApiBusinessId } from "@/lib/auth/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiBusinessId();
    const { id } = await params;
    const data = await getDbMenuDetail(id);

    if (!data) {
      return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      status: "ok",
      menu: {
        id: data.id,
        name: data.name,
        shortName: data.shortName,
        icon: data.icon,
        category: data.category,
        sellPrice: data.sellPrice,
        batchYield: data.batchYield,
        servingsPerWeek: data.weeklyVolume,
        modal: data.modal,
        profit: data.profit,
        profitRate: data.profitRate,
        status: data.status,
      },
      ingredients: data.ingredients,
      driverNote: data.driverNote,
      suggestedPrice: data.suggestedPrice,
      history: data.history,
      cakupan: data.cakupan,
      bahanTanpaHarga: data.bahanTanpaHarga,
      recipeRows: data.recipeRows,
      fixedCosts: data.fixedCosts,
    });
  } catch (error) {
    return apiError(error, "Gagal mengambil rincian menu");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await requireApiBusinessId();
    const body = await req.json();

    if (typeof body.active === "boolean") {
      const ok = await updateDbMenuActive(id, body.active);
      return NextResponse.json(
        ok
          ? { status: "ok", active: body.active }
          : { error: "Menu tidak ditemukan." },
        { status: ok ? 200 : 404 },
      );
    }

    // 1. Jika hanya update harga jual cepat (quick action)
    if (body.price && typeof body.price === "number" && !body.name && !body.recipe) {
      const ok = await updateDbMenuPrice(id, body.price);
      if (ok) {
        return NextResponse.json({
          status: "ok",
          message: `Harga jual berhasil diperbarui menjadi ${body.price}`,
        });
      }
      return NextResponse.json({ error: "Harga belum berhasil diperbarui" }, { status: 500 });
    }

    // 2. Jika update lengkap menu dari formulir edit
    if (!body.name || !body.sellPrice || !body.batchYield || !Array.isArray(body.recipe)) {
      return NextResponse.json(
        { error: "Nama menu, harga jual, takaran porsi, dan bahan wajib diisi." },
        { status: 400 },
      );
    }
    const ok = await updateDbMenuComplete(id, {
      name: body.name,
      sellPrice: body.sellPrice,
      batchYield: body.batchYield,
      weeklyVolume: body.weeklyVolume,
      recipe: body.recipe,
      fixedCosts: body.fixedCosts,
    });

    if (ok) {
      return NextResponse.json({
        status: "ok",
        message: "Menu dan resep berhasil diperbarui.",
      });
    }

    return NextResponse.json({ error: "Menu belum berhasil diperbarui" }, { status: 500 });
  } catch (err: unknown) {
    if (err instanceof MenuInputError) {
      return NextResponse.json(
        { error: err.message, pesan: err.keberatan[0]?.pesan ?? err.message, keberatan: err.keberatan },
        { status: err.status },
      );
    }
    return apiError(err, "Gagal memperbarui menu");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiBusinessId();
    const { id } = await params;
    const ok = await hapusDbMenu(id);
    return NextResponse.json(
      ok ? { status: "ok", pesan: "Menu dihapus." } : { error: "Menu tidak ditemukan." },
      { status: ok ? 200 : 404 },
    );
  } catch (error) {
    return apiError(error, "Gagal menghapus menu");
  }
}
