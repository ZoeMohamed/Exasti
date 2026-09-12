import { NextResponse } from "next/server";
import { getAllMenus, getCommodityPrices, saveMenu } from "@/lib/db/store";
import { evaluateMenu } from "@/lib/engine/margin";
import { MenuItem } from "@/lib/types";

export async function GET() {
  const menus = getAllMenus();
  const { series, latestDate } = await getCommodityPrices();

  // Evaluasi setiap menu dan urutkan dari yang untung terkecil ke terbesar (S6 Dashboard)
  const evaluated = menus.map((menu) => {
    const calc = evaluateMenu(menu, series, latestDate);
    return {
      menu,
      calc,
    };
  });

  // Urutkan dari untung terkecil (persentase margin terendah)
  evaluated.sort((a, b) => a.calc.margin_pct - b.calc.margin_pct);

  return NextResponse.json({
    latest_date: latestDate,
    menus: evaluated,
  });
}

export async function POST(req: Request) {
  try {
    const body: MenuItem = await req.json();

    if (!body.name || !body.sell_price || !body.batch_yield || !body.recipe) {
      return NextResponse.json(
        { error: "Nama menu, harga jual, porsi masak, dan resep wajib diisi." },
        { status: 400 }
      );
    }

    const newMenu: MenuItem = {
      ...body,
      id: body.id || `menu-${Date.now()}`,
      fixed_costs: body.fixed_costs || [{ label: "Perkiraan Gas & Kemasan", amount: 1000 }],
    };

    saveMenu(newMenu);
    return NextResponse.json({ status: "ok", menu: newMenu });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan menu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
