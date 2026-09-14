// app/api/alerts/route.ts — FR-30…33

import { NextRequest, NextResponse } from "next/server";
import { ambilAlert, tandaiDibaca } from "@/lib/services/alerts";
import { apiError, requireApiBusinessId } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireApiBusinessId();
    const semua = req.nextUrl.searchParams.get("semua") === "1";
    const alerts = await ambilAlert({ semua });
    return NextResponse.json({ status: "ok", jumlah: alerts.length, alerts });
  } catch (error) {
    return apiError(error, "Gagal mengambil peringatan");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireApiBusinessId();
    const body: unknown = await req.json().catch(() => null);
    const id = typeof body === "object" && body !== null && "id" in body
      ? (body as { id?: unknown }).id
      : null;
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "Parameter 'id' wajib diisi." }, { status: 400 });
    }
    const ok = await tandaiDibaca(id);
    return NextResponse.json(
      ok
        ? { status: "ok", pesan: "Ditandai sudah dibaca." }
        : { status: "tidak_berubah", pesan: "Alert tidak ditemukan atau sudah dibaca." },
      { status: ok ? 200 : 404 },
    );
  } catch (error) {
    return apiError(error, "Gagal memperbarui peringatan");
  }
}
