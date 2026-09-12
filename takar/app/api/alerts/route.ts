// app/api/alerts/route.ts — FR-30…33

import { NextRequest, NextResponse } from "next/server";
import { ambilAlert, tandaiDibaca } from "@/lib/services/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const semua = req.nextUrl.searchParams.get("semua") === "1";
  const alerts = await ambilAlert({ semua });
  return NextResponse.json({ status: "ok", jumlah: alerts.length, alerts });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "Parameter 'id' wajib diisi." }, { status: 400 });
  }
  const ok = await tandaiDibaca(id);
  return NextResponse.json(
    ok
      ? { status: "ok", pesan: "Ditandai sudah dibaca." }
      : { status: "tidak_berubah", pesan: "Alert tidak ditemukan atau sudah dibaca." },
    { status: ok ? 200 : 404 },
  );
}
