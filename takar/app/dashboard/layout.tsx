import { getDbBusinessProfile, getDbMenus } from "@/lib/services/menu-engine";
import { labelWaktuRelatif, hariIniJakarta, keIsoTanggal, tanggalIndonesia } from "@/lib/tanggal";
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

  const activeMenus = menus.filter((menu) => menu.status !== "diistirahatkan");
  const criticalCount = activeMenus.filter((menu) => menu.status === "tipis" || menu.status === "rugi").length;
  const menuCount = activeMenus.length;

  // Jangan pernah mengaku "hari ini" tanpa memeriksanya.
  const sinkron = labelWaktuRelatif(profile.last_ingest_time);

  const hargaIso = keIsoTanggal(profile.latest_price_date);
  const hargaBasi = hargaIso !== hariIniJakarta();

  return (
    <div className="flex min-h-screen flex-col bg-cream pb-16 md:flex-row md:pb-0">
      <DashboardSidebar
        businessName={profile.name}
        regionName={profile.region_name}
        criticalCount={criticalCount}
        menuCount={menuCount}
        lastSyncText={sinkron.teks}
        priceDateText={hargaIso ? tanggalIndonesia(hargaIso) : null}
        priceStale={hargaBasi}
      />
      <MobileHeader
        regionName={profile.region_name}
        hargaTanggal={hargaIso ? tanggalIndonesia(hargaIso) : null}
        hargaBasi={hargaBasi}
      />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
