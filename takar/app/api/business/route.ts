import { NextResponse } from "next/server";
import { getDbBusinessProfile, updateDbBusinessProfile } from "@/lib/services/menu-engine";
import { queryAppDb } from "@/lib/auth/context";
import { apiError, requireApiBusinessId } from "@/lib/auth/api";
import { keIsoTanggal } from "@/lib/tanggal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiBusinessId();
    const profile = await getDbBusinessProfile();
    const regionsRes = await queryAppDb("select id, name from regions order by id asc");

    return NextResponse.json({
      status: "ok",
      profile: {
        ...profile,
        // Kolom DATE harus dikirim sebagai tanggal, bukan diubah menjadi waktu UTC.
        latest_price_date: keIsoTanggal(profile.latest_price_date),
      },
      available_regions: regionsRes?.rows || [],
    });
  } catch (err: unknown) {
    return apiError(err, "Gagal mengambil data profil warung");
  }
}

export async function PUT(req: Request) {
  try {
    await requireApiBusinessId();
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
      return NextResponse.json({ status: "ok", message: "Pengaturan warung berhasil disimpan" });
    }
    return NextResponse.json({ error: "Pengaturan warung belum berhasil disimpan" }, { status: 500 });
  } catch (err: unknown) {
    return apiError(err, "Gagal memperbarui profil");
  }
}
