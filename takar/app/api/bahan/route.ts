import { NextResponse } from "next/server";
import { requireApiBusinessId, apiError } from "@/lib/auth/api";
import { ambilBahan } from "@/lib/services/bahan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiBusinessId();
    const data = await ambilBahan();
    return NextResponse.json({ status: "ok", ...data });
  } catch (error) {
    return apiError(error, "Gagal mengambil bahan warung");
  }
}
