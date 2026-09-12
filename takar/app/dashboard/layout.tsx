import { getDbBusinessProfile, getDbMenus } from "@/lib/services/menu-engine";
import { jamJakarta } from "@/lib/tanggal";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Berurutan berarti dua perjalanan ke Mumbai yang saling menunggu.
  // Keduanya tidak saling bergantung, jadi jalankan bersamaan.
  const [profile, { menus }] = await Promise.all([
    getDbBusinessProfile(),
    getDbMenus(),
  ]);

  const criticalCount = menus.filter((m) => m.status === "tipis" || m.status === "rugi").length;
  const menuCount = menus.length;

  let lastSyncText = "Hari ini";
  if (profile.last_ingest_time) {
    try {
      // Jam harus WIB, bukan jam server. Di Vercel server berjalan di UTC,
      // sehingga "13:30 WIB" akan tertulis 06:30.
      lastSyncText = `Hari ini, ${jamJakarta(new Date(profile.last_ingest_time))} WIB`;
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
