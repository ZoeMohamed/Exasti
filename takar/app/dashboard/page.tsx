import { calculateDynamicMenus } from "@/lib/services/menu-engine";
import { ambilAlert } from "@/lib/services/alerts";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ menus, latestDate }, alerts] = await Promise.all([
    calculateDynamicMenus(),
    ambilAlert(),
  ]);
  return <DashboardHome menus={menus} latestDate={latestDate} alerts={alerts} />;
}
