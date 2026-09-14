import type { Menu } from "@/types/menu";
import { getDbMenus } from "../services/menu-engine";

export const menus: Menu[] = [];

export async function getMenu(id: string): Promise<Menu | undefined> {
  const data = await getDbMenus();
  return data.menus.find((m) => m.id === id) || data.menus[0];
}
