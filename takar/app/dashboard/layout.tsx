import { getDbBusinessProfile, getDbMenus } from "@/lib/services/menu-engine";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getDbBusinessProfile();
  const { menus } = await getDbMenus();

  const criticalCount = menus.filter((m) => m.status === "tipis" || m.status === "rugi").length;
  const menuCount = menus.length;

  let lastSyncText = "Hari ini";
  if (profile.last_ingest_time) {
    try {
      const d = new Date(profile.last_ingest_time);
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      lastSyncText = `Hari ini, ${hours}:${mins} WIB`;
    } catch {
      // fallback
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream pb-16 md:flex-row md:pb-0">
      <DashboardSidebar
        businessName={profile.name}
        regionName={profile.region_name}
        criticalCount={criticalCount}
        menuCount={menuCount}
        lastSyncText={lastSyncText}
      />
      <MobileHeader />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
