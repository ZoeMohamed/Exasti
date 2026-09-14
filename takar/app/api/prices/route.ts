import { NextResponse } from "next/server";
import { hariIniJakarta } from "@/lib/tanggal";
import {
  getCurrentBusinessId,
  queryAppDb,
  withAppTransaction,
} from "@/lib/auth/context";
import { apiError } from "@/lib/auth/api";
import { hitungHargaPerDasar, type HargaBelanja } from "@/lib/bahan/takaran";
import { normalisasiNama } from "@/lib/bahan/cari";
import type { RefBahan } from "@/lib/bahan/validasi";
import { keluargaSatuan, type SatuanDasar } from "@/lib/units";

export const dynamic = "force-dynamic";

/**
 * [GET] Mengambil riwayat harga nota belanja warung sendiri
 */
export async function GET() {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `SELECT p.commodity_id,
              coalesce(c.name, ci.name, p.commodity_id) as name,
              coalesce(c.unit, ci.unit, 'kg') as unit,
              p.price,
              p.date,
              p.source,
              p.fetched_at
       FROM prices p
       LEFT JOIN commodities c ON c.id = p.commodity_id
       LEFT JOIN catalog_items ci ON ci.id = p.commodity_id AND ci.business_id = p.business_id
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
    const rawItems = parsed.items;

    const targetDate = typeof parsed.date === "string" ? parsed.date : hariIniJakarta();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`))) {
      return NextResponse.json(
        { status: "error", message: "Tanggal belanja tidak valid." },
        { status: 400 },
      );
    }

    const savedCount = await withAppTransaction(async (query) => {
      const bRes = await query<{ region_id: number }>(
        "select region_id from businesses where id = $1 limit 1",
        [businessId],
      );
      const regionId = bRes.rows[0]?.region_id;
      if (!regionId) throw new Error("Wilayah warung belum dikonfigurasi.");

      let count = 0;
      for (let indeks = 0; indeks < rawItems.length; indeks++) {
        const raw = rawItems[indeks];
        if (typeof raw !== "object" || raw === null) throw new HargaInputError(`Baris ${indeks + 1} tidak valid.`);
        const value = raw as { commodity_id?: unknown; price?: unknown; bahan?: RefBahan; harga?: HargaBelanja; sumber?: unknown };
        let commodityId = "";
        let price = 0;
        const source: "manual" | "nota_ocr" = value.sumber === "manual" ? "manual" : "nota_ocr";

        if (typeof value.commodity_id === "string") {
          commodityId = value.commodity_id.trim();
          price = typeof value.price === "number" ? value.price : Number(value.price);
          if (!commodityId || !Number.isFinite(price) || price <= 0) throw new HargaInputError(`Harga baris ${indeks + 1} tidak valid.`);
          const ada = await query(
            `select id from commodities where id = $1
             union all
             select id from catalog_items where id = $1 and business_id = $2
             limit 1`,
            [commodityId, businessId],
          );
          if (!ada.rows[0]) throw new HargaInputError(`Bahan pada baris ${indeks + 1} tidak dikenal.`);
        } else {
          if (!value.bahan || !value.harga) throw new HargaInputError(`Lengkapi bahan dan harga pada baris ${indeks + 1}.`);
          let dasar: SatuanDasar;
          if (value.bahan.jenis === "pasar") {
            const ada = await query<{ id: string; unit: SatuanDasar }>("select id, unit from commodities where id = $1", [value.bahan.id]);
            if (!ada.rows[0]) throw new HargaInputError(`Bahan pasar pada baris ${indeks + 1} tidak dikenal.`);
            commodityId = ada.rows[0].id;
            dasar = ada.rows[0].unit;
          } else if (value.bahan.jenis === "warung") {
            const ada = await query<{ id: string; unit: SatuanDasar }>("select id, unit from catalog_items where id = $1 and business_id = $2", [value.bahan.id, businessId]);
            if (!ada.rows[0]) throw new HargaInputError(`Bahan warung pada baris ${indeks + 1} tidak tersedia.`);
            commodityId = ada.rows[0].id;
            dasar = ada.rows[0].unit;
          } else {
            const nama = value.bahan.nama?.trim().replace(/\s+/g, " ");
            if (!nama) throw new HargaInputError(`Nama bahan pada baris ${indeks + 1} wajib diisi.`);
            dasar = value.bahan.satuanDasar ?? keluargaSatuan(value.harga.satuan);
            const dibuat = await query<{ id: string; unit: SatuanDasar }>(
              `insert into catalog_items (id, business_id, name, nama_normal, unit, approved)
               values ('w_' || gen_random_uuid()::text, $1, $2, $3, $4, true)
               on conflict (business_id, nama_normal) where business_id is not null
               do update set name = excluded.name returning id, unit`,
              [businessId, nama, normalisasiNama(nama), dasar],
            );
            commodityId = dibuat.rows[0].id;
            if (dibuat.rows[0].unit !== dasar) throw new HargaInputError(`${nama} sudah tercatat dengan satuan ${dibuat.rows[0].unit}.`);
          }
          const hasilHarga = hitungHargaPerDasar(value.harga, dasar);
          if ("galat" in hasilHarga) throw new HargaInputError(`${hasilHarga.galat} Baris ${indeks + 1}.`);
          price = hasilHarga.hargaPerDasar;
        }

        await query(
          `insert into prices (commodity_id, region_id, business_id, date, price, source)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (commodity_id, region_id, date, business_id)
             where business_id is not null
           do update set price = excluded.price, source = excluded.source, fetched_at = now()`,
          [commodityId, regionId, businessId, targetDate, price, source],
        );
        count++;
      }
      return count;
    });

    return NextResponse.json({
      status: "ok",
      message: `${savedCount} harga bahan dari nota berhasil disimpan.`,
      savedCount,
    });
  } catch (err: unknown) {
    if (err instanceof HargaInputError) {
      return NextResponse.json({ status: "error", message: err.message }, { status: 422 });
    }
    return apiError(err, "Gagal menyimpan harga nota");
  }
}

class HargaInputError extends Error {}
