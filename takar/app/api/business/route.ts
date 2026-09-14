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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const regionId = Number(body.regionId);
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Nama warung harus berisi 2–80 karakter." }, { status: 400 });
    }
    if (!Number.isInteger(regionId) || regionId < 1) {
      return NextResponse.json({ error: "Pilih kota atau kabupaten yang tersedia." }, { status: 400 });
    }

    const ok = await updateDbBusinessProfile({
      name,
      regionId,
    });

    if (ok) {
      return NextResponse.json({ status: "ok", message: "Pengaturan warung berhasil disimpan" });
    }
    return NextResponse.json({ error: "Pengaturan warung belum berhasil disimpan" }, { status: 500 });
  } catch (err: unknown) {
    return apiError(err, "Gagal memperbarui profil");
  }
}
