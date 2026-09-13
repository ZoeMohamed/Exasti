import { NextResponse } from "next/server";
import { hariIniJakarta } from "@/lib/tanggal";
import {
  getCurrentBusinessId,
  queryAppDb,
  withAppTransaction,
} from "@/lib/auth/context";
import { apiError } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

/**
 * [GET] Mengambil riwayat harga nota belanja warung sendiri
 */
export async function GET() {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
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
      [businessId],
    );

    return NextResponse.json({
      status: "ok",
      prices: res?.rows || [],
    });
  } catch (err: unknown) {
    return apiError(err, "Gagal mengambil riwayat nota");
  }
}

/**
 * [POST] Menyimpan harga hasil nota belanja ke tabel prices (Q9)
 */
export async function POST(req: Request) {
  try {
    const businessId = await getCurrentBusinessId();
    const body: unknown = await req.json();
    const parsed = typeof body === "object" && body !== null
      ? body as { items?: unknown; date?: unknown }
      : {};

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Data belanja kosong atau tidak valid" },
        { status: 400 }
      );
    }

    const targetDate = typeof parsed.date === "string" ? parsed.date : hariIniJakarta();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`))) {
      return NextResponse.json(
        { status: "error", message: "Tanggal belanja tidak valid." },
        { status: 400 },
      );
    }

    const items = parsed.items.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const value = item as { commodity_id?: unknown; price?: unknown };
      const commodityId = typeof value.commodity_id === "string" ? value.commodity_id.trim() : "";
      const price = typeof value.price === "number" ? value.price : Number(value.price);
      if (!commodityId || !Number.isFinite(price) || price <= 0) return [];
      return [{ commodityId, price }];
    });

    if (items.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Tidak ada harga valid untuk disimpan." },
        { status: 400 },
      );
    }

    // Ambil region_id warung
    const bRes = await queryAppDb<{ region_id: number }>(
      "SELECT region_id FROM businesses WHERE id = $1 LIMIT 1;",
      [businessId],
    );
    const regionId = bRes.rows[0]?.region_id;
    if (!regionId) throw new Error("Wilayah warung belum dikonfigurasi.");

    const savedCount = await withAppTransaction(async (query) => {
      for (const item of items) {
        await query(
          `insert into prices (commodity_id, region_id, business_id, date, price, source)
           values ($1, $2, $3, $4, $5, 'nota_ocr')
           on conflict (commodity_id, region_id, date, business_id)
             where business_id is not null
           do update set price = excluded.price, fetched_at = now()`,
          [item.commodityId, regionId, businessId, targetDate, item.price],
        );
      }
      return items.length;
    });

    return NextResponse.json({
      status: "ok",
      message: `${savedCount} harga bahan dari nota berhasil disimpan.`,
      savedCount,
    });
  } catch (err: unknown) {
    return apiError(err, "Gagal menyimpan harga nota");
  }
}
