import { NextResponse } from "next/server";
import { hariIniJakarta } from "@/lib/tanggal";
import { queryDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

async function getActiveBusiness() {
  try {
    const res = await queryDb("SELECT id, region_id FROM businesses ORDER BY created_at LIMIT 1;");
    if (res && res.rows && res.rows.length > 0) {
      return {
        businessId: res.rows[0].id,
        regionId: res.rows[0].region_id || 1,
      };
    }
  } catch {
    // fallback default
  }
  return {
    businessId: "00000000-0000-0000-0000-000000000001",
    regionId: 1,
  };
}

/**
 * [GET] Mengambil riwayat harga nota belanja warung sendiri
 */
export async function GET() {
  try {
    const { businessId } = await getActiveBusiness();
    const res = await queryDb(
      `SELECT p.commodity_id,
              coalesce(c.name, p.commodity_id) as name,
              coalesce(c.unit, 'kg') as unit,
              p.price,
              p.date,
              p.source,
              p.fetched_at
       FROM prices p
       LEFT JOIN commodities c ON c.id = p.commodity_id
       WHERE p.business_id = $1
       ORDER BY p.date DESC, p.fetched_at DESC
       LIMIT 20;`,
      [businessId]
    );

    return NextResponse.json({
      status: "ok",
      prices: res?.rows || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil riwayat nota";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

/**
 * [POST] Menyimpan harga hasil nota belanja ke tabel prices (Q9)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, date } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Data belanja kosong atau tidak valid" },
        { status: 400 }
      );
    }

    const targetDate = date || hariIniJakarta();
    const { businessId, regionId } = await getActiveBusiness();

    let savedCount = 0;
    for (const item of items) {
      if (!item.commodity_id || !item.price || item.price <= 0) continue;

      // Q9: Simpan harga nota sendiri
      await queryDb(
        `INSERT INTO prices (commodity_id, region_id, business_id, date, price, source)
         VALUES ($1, $2, $3, $4, $5, 'nota_ocr')
         ON CONFLICT (commodity_id, region_id, date, business_id) WHERE business_id IS NOT NULL
         DO UPDATE SET price = EXCLUDED.price, fetched_at = now();`,
        [item.commodity_id, regionId, businessId, targetDate, item.price]
      );
      savedCount++;
    }

    return NextResponse.json({
      status: "ok",
      message: `${savedCount} bahan dari nota berhasil dicatat ke database Supabase!`,
      savedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan harga nota";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
