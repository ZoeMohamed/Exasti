import { redirect } from "next/navigation";
import { tujuanPanduan } from "@/lib/onboarding";
import { getDbBusinessProfile } from "@/lib/services/menu-engine";

export const dynamic = "force-dynamic";

/** Tautan lama tidak lagi menampilkan halaman terpisah. */
export default async function PanduanPage() {
  const profile = await getDbBusinessProfile();
  redirect(tujuanPanduan({
    tersimpan: profile.onboarding_step,
    jumlahMenu: Number(profile.active_menus_count) || 0,
    sudahSelesai: Boolean(profile.onboarding_completed_at),
  }));
}
