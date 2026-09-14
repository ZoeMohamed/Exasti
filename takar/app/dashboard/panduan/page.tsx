import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";
import { queryAppDb } from "@/lib/auth/context";
import { langkahAwalPanduan } from "@/lib/onboarding";
import { getDbBusinessProfile } from "@/lib/services/menu-engine";

export const dynamic = "force-dynamic";

export default async function PanduanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStep = Array.isArray(params.langkah) ? params.langkah[0] : params.langkah;
  const [profile, regionsResult] = await Promise.all([
    getDbBusinessProfile(),
    queryAppDb<{ id: number; name: string }>("select id, name from regions order by name"),
  ]);
  const menuCount = Number(profile.active_menus_count || 0);
  const completed = Boolean(profile.onboarding_completed_at);
  const initialStep = langkahAwalPanduan({
    tersimpan: profile.onboarding_step,
    jumlahMenu: menuCount,
    sudahSelesai: completed,
    diminta: requestedStep,
  });

  return (
    <OnboardingGuide
      initialStep={initialStep}
      initialCompleted={completed}
      initialName={String(profile.name || "Warungku")}
      initialRegionId={Number(profile.region_id)}
      regions={regionsResult.rows}
      menuCount={menuCount}
    />
  );
}
