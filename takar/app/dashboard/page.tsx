import { calculateDynamicMenus } from "@/lib/services/menu-engine";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { menus, latestDate } = await calculateDynamicMenus();
  return <DashboardHome menus={menus} latestDate={latestDate} />;
}
