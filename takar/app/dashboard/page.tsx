import { calculateDynamicMenus, getDbBusinessProfile } from "@/lib/services/menu-engine";
import { ambilAlert } from "@/lib/services/alerts";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ menus, latestDate }, alerts, profile] = await Promise.all([
    calculateDynamicMenus(),
    ambilAlert(),
    getDbBusinessProfile(),
  ]);
  return (
    <DashboardHome
      menus={menus}
      latestDate={latestDate}
      alerts={alerts}
      onboardingIncomplete={!profile.onboarding_completed_at}
    />
  );
}
