// app/api/cron/harian/route.ts
// FR-01 — pekerjaan harian: tarik harga BI, isi mundur, snapshot untung, buat alert.
// Dijadwalkan oleh vercel.json pukul 06:30 UTC = 13:30 WIB.

import { NextRequest, NextResponse } from "next/server";
import { jalankanHarian } from "@/lib/services/harian";
import { syncBiPricesToDatabase } from "@/lib/services/bi-ingest";
import { queryDb } from "@/lib/db/client";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel Cron mengirim header ini. Bila CRON_SECRET diisi, wajib cocok.
  const rahasia = process.env.CRON_SECRET;
  if (rahasia) {
    const kirim = req.headers.get("authorization");
    if (kirim !== `Bearer ${rahasia}`) {
      return NextResponse.json({ error: "Tidak berwenang" }, { status: 401 });
    }
  }

  const mulai = Date.now();
  const langkah: Record<string, unknown> = {};
  const lewatiIngest = req.nextUrl.searchParams.get("ingest") === "0";
  let tanggal = req.nextUrl.searchParams.get("tanggal") || undefined;

  // 1. Tarik harga BI. FR-06: kegagalan dicatat, tidak menghentikan sisanya.
  if (!lewatiIngest) {
    try {
      const bi = await syncBiPricesToDatabase(14);
      langkah.ingest = { status: "ok", baris: bi.count, terbaru: bi.latestDate };
      if (!tanggal) tanggal = bi.latestDate;
    } catch (err) {
      const pesan = err instanceof Error ? err.message : String(err);
      langkah.ingest = { status: "gagal", pesan };
      await queryDb(
        `insert into ingest_runs (target_date, region_count, rows_upserted, status, message)
         values (current_date, 0, 0, 'failed', $1)`,
        [pesan.slice(0, 400)],
      );
    }
  } else {
    langkah.ingest = { status: "dilewati" };
  }

  // 2..4 — isi mundur, snapshot, alert
  try {
    const hasil = await jalankanHarian(tanggal);
    langkah.harian = hasil;
  } catch (err) {
    return NextResponse.json(
      {
        status: "gagal",
        langkah,
        pesan: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "ok",
    durasiMs: Date.now() - mulai,
    langkah,
  });
}
