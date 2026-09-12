import { NextResponse } from "next/server";
import { getDbBusinessProfile, updateDbBusinessProfile } from "@/lib/services/menu-engine";
import { queryDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getDbBusinessProfile();
    const regionsRes = await queryDb("SELECT id, name FROM regions ORDER BY id ASC;");

    return NextResponse.json({
      status: "ok",
      profile,
      available_regions: regionsRes?.rows || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil data profil warung";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.packagingMode) {
      return NextResponse.json({ error: "Nama warung dan cara penyajian wajib diisi" }, { status: 400 });
    }

    const ok = await updateDbBusinessProfile({
      name: body.name,
      packagingMode: body.packagingMode,
      regionId: body.regionId ? Number(body.regionId) : undefined,
    });

    if (ok) {
      return NextResponse.json({ status: "ok", message: "Profil warung berhasil disimpan di Supabase" });
    }
    return NextResponse.json({ error: "Gagal memperbarui profil di database" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui profil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
