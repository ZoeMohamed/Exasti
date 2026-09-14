import { NextResponse } from "next/server";
import { apiError, requireApiBusinessId } from "@/lib/auth/api";
import { queryAppDb } from "@/lib/auth/context";
import { JUMLAH_LANGKAH_PANDUAN, langkahPanduanValid } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const businessId = await requireApiBusinessId();
    const body = await req.json();

    if (body.action === "complete") {
      const result = await queryAppDb<{ onboarding_step: number; onboarding_completed_at: string }>(
        `update businesses
         set onboarding_step = $1,
             onboarding_completed_at = coalesce(onboarding_completed_at, now())
         where id = $2
         returning onboarding_step, onboarding_completed_at`,
        [JUMLAH_LANGKAH_PANDUAN, businessId],
      );
      return NextResponse.json({ status: "ok", onboarding: result.rows[0] });
    }

    const step = langkahPanduanValid(body.step);
    if (body.action !== "progress" || step === null) {
      return NextResponse.json({ error: "Tahap panduan tidak valid." }, { status: 400 });
    }

    const result = await queryAppDb<{ onboarding_step: number; onboarding_completed_at: string | null }>(
      `update businesses
       set onboarding_step = greatest(onboarding_step, $1)
       where id = $2
       returning onboarding_step, onboarding_completed_at`,
      [step, businessId],
    );
    return NextResponse.json({ status: "ok", onboarding: result.rows[0] });
  } catch (error) {
    return apiError(error, "Progres panduan belum berhasil disimpan.");
  }
}
