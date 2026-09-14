// app/api/cron/harian/route.ts
// FR-01 — pekerjaan harian: tarik harga BI, isi mundur, snapshot untung, buat alert.
// Dijadwalkan oleh vercel.json pukul 06:30 UTC = 13:30 WIB.

import { NextRequest, NextResponse } from "next/server";
import { jalankanHarian, jalankanHarianDenganBackfill } from "@/lib/services/harian";
import { syncBiPricesToDatabase } from "@/lib/services/bi-ingest";
import { queryDb } from "@/lib/db/client";
import { authorizeSystemRequest } from "@/lib/auth/api";

export const maxDuration = 300;

function koneksiTerputus(error: unknown): boolean {
  const kode = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  const pesan = error instanceof Error ? error.message : String(error);
  return ["ETIMEDOUT", "ECONNRESET", "EPIPE", "57P01"].includes(kode) ||
    /ETIMEDOUT|ECONNRESET|Connection terminated|read timeout/i.test(pesan);
}

async function jedaSingkat(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 350));
}

export async function GET(req: NextRequest) {
  const unauthorized = authorizeSystemRequest(req);
  if (unauthorized) return unauthorized;

  const mulai = Date.now();
  const langkah: Record<string, unknown> = {};
  const lewatiIngest = req.nextUrl.searchParams.get("ingest") === "0";
  const tanggal = req.nextUrl.searchParams.get("tanggal") || undefined;

  // 1. Tarik harga BI. FR-06: kegagalan dicatat, tidak menghentikan sisanya.
  if (!lewatiIngest) {
    try {
      const bi = await syncBiPricesToDatabase(14);
      langkah.ingest = { status: "ok", baris: bi.count, terbaru: bi.latestDate };
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
    const jalankan = () => tanggal
      ? jalankanHarian(tanggal)
      : jalankanHarianDenganBackfill();
    let hasil;
    try {
      hasil = await jalankan();
      langkah.harianPercobaan = 1;
    } catch (error) {
      if (!koneksiTerputus(error)) throw error;
      await jedaSingkat();
      hasil = await jalankan();
      langkah.harianPercobaan = 2;
    }
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
