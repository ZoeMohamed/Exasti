import { NextResponse } from "next/server";
import { hapusDbMenu, getDbMenuDetail, updateDbMenuPrice, updateDbMenuComplete } from "@/lib/services/menu-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getDbMenuDetail(id);

  if (!data) {
    return NextResponse.json({ error: "Menu tidak ditemukan di database" }, { status: 404 });
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
      margin: data.margin,
      status: data.status,
    },
    ingredients: data.ingredients,
    driverNote: data.driverNote,
    suggestedPrice: data.suggestedPrice,
    history: data.history,
    // FR-28 / BR-10 — seberapa besar modal ini berdiri di atas data harga nyata
    cakupan: data.cakupan,
    bahanTanpaHarga: data.bahanTanpaHarga,
    recipeRows: data.recipeRows,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();

    // 1. Jika hanya update harga jual cepat (quick action)
    if (body.price && typeof body.price === "number" && !body.name && !body.recipe) {
      const ok = await updateDbMenuPrice(id, body.price);
      if (ok) {
        return NextResponse.json({
          status: "ok",
          message: `Harga jual berhasil diperbarui ke ${body.price} di database`,
        });
      }
      return NextResponse.json({ error: "Gagal memperbarui harga di database" }, { status: 500 });
    }

    // 2. Jika update lengkap menu dari formulir edit
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
        message: "Data menu dan resep berhasil diperbarui di database Supabase!",
      });
    }

    return NextResponse.json({ error: "Gagal memperbarui menu di database" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui menu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await hapusDbMenu(id);
  return NextResponse.json(
    ok ? { status: "ok", pesan: "Menu dihapus." } : { error: "Menu tidak ditemukan." },
    { status: ok ? 200 : 404 },
  );
}
