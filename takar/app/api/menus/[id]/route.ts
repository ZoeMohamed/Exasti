import { NextResponse } from "next/server";
import { getDynamicIngredients, updateMenuPrice, MENU_RECIPES } from "@/lib/services/menu-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const def = MENU_RECIPES.find((m) => m.id === id || m.uuid === id);

  if (!def) {
    return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
  }

  const data = await getDynamicIngredients(id);
  const profit = data.currentSellPrice - data.modalTotal;
  const margin = Math.round((profit / data.currentSellPrice) * 100 * 10) / 10;

  return NextResponse.json({
    status: "ok",
    menu: {
      ...def,
      sellPrice: data.currentSellPrice,
      modal: data.modalTotal,
      profit,
      margin,
    },
    ingredients: data.ingredients,
    driverNote: data.driverNote,
    suggestedPrice: data.suggestedPrice,
    history: data.history,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const def = MENU_RECIPES.find((m) => m.id === id || m.uuid === id);

  if (!def) {
    return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });
  }

  try {
    const body = await req.json();
    if (body.price && typeof body.price === "number") {
      await updateMenuPrice(id, body.price);
      return NextResponse.json({
        status: "ok",
        message: `Harga ${def.name} berhasil diperbarui ke ${body.price} di database`,
      });
    }
    return NextResponse.json({ error: "Format harga tidak valid" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui harga";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
