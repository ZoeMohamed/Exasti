import { Suspense } from "react";
import { getDbBusinessProfile, getDbMenus } from "@/lib/services/menu-engine";
import { hargaPasarPerluDiperbarui, labelWaktuRelatif, keIsoTanggal, tanggalIndonesia } from "@/lib/tanggal";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

export const dynamic = "force-dynamic";

async function DashboardNavigation() {
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
  const hargaBasi = hargaPasarPerluDiperbarui(hargaIso, profile.last_ingest_time);

  return (
    <>
      <DashboardSidebar
        businessName={profile.name}
        regionName={profile.region_name}
        criticalCount={criticalCount}
        menuCount={menuCount}
        lastSyncText={sinkron.teks}
        priceDateText={hargaIso ? tanggalIndonesia(hargaIso) : null}
        priceStale={hargaBasi}
        guidePending={!profile.onboarding_completed_at}
      />
      <MobileHeader
        regionName={profile.region_name}
        hargaTanggal={hargaIso ? tanggalIndonesia(hargaIso) : null}
        hargaBasi={hargaBasi}
      />
    </>
  );
}

function DashboardNavigationFallback() {
  return (
    <>
      <DashboardSidebar
        businessName="Warungmu"
        regionName="Menyiapkan lokasi"
        criticalCount={0}
        menuCount={0}
        lastSyncText="Menyiapkan data"
        priceDateText={null}
        priceStale={false}
        guidePending={false}
      />
      <MobileHeader regionName="Warungmu" hargaTanggal={null} hargaBasi={false} />
    </>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-cream pb-16 md:flex-row md:pb-0">
      {/* Data navigasi tidak boleh menahan kerangka halaman utama. Tanpa
          boundary ini, loading.tsx baru terlihat sesudah kueri layout selesai. */}
      <Suspense fallback={<DashboardNavigationFallback />}>
        <DashboardNavigation />
      </Suspense>
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
