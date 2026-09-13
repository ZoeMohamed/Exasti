import { NextResponse } from "next/server";
import { getCurrentBusinessId, queryAppDb } from "@/lib/auth/context";
import { apiError } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businessId = await getCurrentBusinessId();
    // Satu baris per komoditas. Versi sebelumnya menjoin latest_prices tanpa
    // menyaring business_id, padahal view itu mengembalikan satu baris untuk
    // harga BI DAN satu lagi untuk harga nota warung — komoditas yang pernah
    // discan nota jadi muncul dua kali dan menabrak key React.
    //
    // Harga nota warung didahulukan bila ada, karena itu yang benar-benar
    // dibayar. Kalau tidak ada harga sama sekali, kolomnya null — tidak
    // diisi angka karangan.
    const res = await queryAppDb(`
      select c.id,
             c.name,
             c.unit,
             coalesce(nota.price, bi.price) as current_price,
             case
               when nota.price is not null then 'harga notamu'
               when bi.price   is not null then 'harga pasar'
               else 'belum ada harga'
             end as sumber_harga
      from commodities c
      join businesses b on b.id = $1
      left join lateral (
        select p.price from prices p
        where p.commodity_id = c.id and p.region_id = b.region_id
          and p.business_id = b.id
        order by p.date desc limit 1
      ) nota on true
      left join lateral (
        select p.price from prices p
        where p.commodity_id = c.id and p.region_id = b.region_id
          and p.business_id is null
        order by p.date desc limit 1
      ) bi on true
      order by c.sort_order asc, c.name asc;
    `, [businessId]);

    return NextResponse.json({
      status: "ok",
      commodities: res?.rows || [],
    });
  } catch (err: unknown) {
    return apiError(err, "Gagal mengambil daftar bahan");
  }
}
