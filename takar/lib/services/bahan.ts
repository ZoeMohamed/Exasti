import "server-only";

import { getCurrentBusinessId, queryAppDb } from "@/lib/auth/context";
import { definisiPasar, KATALOG_PASAR, SARAN_UMUM } from "@/lib/bahan/katalog-pasar";
import type { BahanTersedia } from "@/lib/bahan/cari";
import type { SatuanDasar } from "@/lib/units";
import { keIsoTanggal } from "@/lib/tanggal";

export async function ambilBahan(): Promise<{ bahan: BahanTersedia[]; saranUmum: typeof SARAN_UMUM }> {
  const businessId = await getCurrentBusinessId();
  const hasil = await queryAppDb(
    `select sumber.id, sumber.jenis, sumber.nama, sumber.unit,
            case
              when sumber.jenis = 'warung' then nota.price
              when nota.price is null then pasar_kini.price
              when pasar_beli.price is null or pasar_beli.price = 0 or pasar_kini.price is null then nota.price
              when pasar_kini.price / pasar_beli.price < 0.3 or pasar_kini.price / pasar_beli.price > 3 then pasar_kini.price
              else round((nota.price / pasar_beli.price) * pasar_kini.price, 2)
            end as price,
            nota.price is not null as harga_pemilik,
            coalesce(nota.date, pasar_kini.date) as date
     from (
       select c.id, 'pasar'::text jenis, c.name nama, c.unit
       from public.commodities c
       union all
       select ci.id, 'warung'::text jenis, ci.name nama, ci.unit
       from public.catalog_items ci
       where ci.business_id = $1
     ) sumber
     join public.businesses b on b.id = $1
     left join lateral (
       select p.price, p.date
       from public.prices p
       where p.commodity_id = sumber.id
         and p.region_id = b.region_id
         and p.business_id = b.id
       order by p.date desc, p.fetched_at desc
       limit 1
     ) nota on true
     left join lateral (
       select p.price, p.date
       from public.prices p
       where sumber.jenis = 'pasar'
         and p.commodity_id = sumber.id
         and p.region_id = b.region_id
         and p.business_id is null
       order by p.date desc
       limit 1
     ) pasar_kini on true
     left join lateral (
       select p.price
       from public.prices p
       where sumber.jenis = 'pasar'
         and p.commodity_id = sumber.id
         and p.region_id = b.region_id
         and p.business_id is null
         and p.date <= nota.date
       order by p.date desc
       limit 1
     ) pasar_beli on true
     order by (sumber.jenis = 'warung') desc, sumber.nama`,
    [businessId],
  );

  const bahan: BahanTersedia[] = [];
  for (const row of hasil.rows) {
    const definisi = row.jenis === "pasar" ? definisiPasar(String(row.id)) : undefined;
    if (row.jenis === "pasar" && (definisi?.sembunyikan || !KATALOG_PASAR[String(row.id)])) continue;
    bahan.push({
      id: String(row.id),
      jenis: row.jenis === "warung" ? "warung" : "pasar",
      namaTampil: definisi?.namaTampil ?? String(row.nama),
      alias: definisi?.alias ?? [],
      satuanDasar: String(row.unit) as SatuanDasar,
      harga: row.price === null ? null : Number(row.price),
      sumberHarga: row.price === null
        ? "belum ada harga"
        : row.harga_pemilik
          ? row.jenis === "pasar" ? "harga belanjamu, mengikuti pasar" : "harga belanjamu"
          : "harga pasar",
      tanggalHarga: keIsoTanggal(row.date),
    });
  }
  return { bahan, saranUmum: SARAN_UMUM };
}
