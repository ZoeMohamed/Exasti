import { notFound } from "next/navigation";
import { getDbMenuDetail } from "@/lib/services/menu-engine";
import { MenuForm } from "@/components/menu/MenuForm";

export const dynamic = "force-dynamic";

export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menu = await getDbMenuDetail(id);

  if (!menu) {
    notFound();
  }

  return (
    <MenuForm
      edit
      menuId={id}
      initialName={menu.name}
      initialPrice={menu.sellPrice}
      initialYield={menu.batchYield}
      initialVolume={menu.weeklyVolume}
      initialRows={menu.recipeRows}
    />
  );
}
