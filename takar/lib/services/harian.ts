// lib/services/harian.ts
// Pekerjaan harian Takar. Berkas ini yang menyentuh database;
// seluruh keputusan angkanya diambil oleh lib/margin.ts yang murni.

import { queryDb } from "../db/client";
import { keIsoTanggal } from "../tanggal";
import {
  hitungHpp, hitungMargin, cariPendorong, cariPembanding,
  nilaiKeparahan, batasiAlert, saranHarga, susunKalimat, penyumbangTerbesar,
  type BahanResep, type CalonAlert,
} from "../margin";

export interface HasilHarian {
  tanggal: string;
  diisiMundur: number;
  snapshot: number;
  alert: number;
  pesan: string[];
}

/**
 * BR-03 / FR-04 — forward-fill.
 * Bila sebuah komoditas tidak punya harga pada tanggal d, pakai harga terakhir
 * dalam 7 hari terakhir dan tandai is_filled = true. Lebih dari 7 hari:
 * harga dianggap tidak tersedia, bukan ditebak.
 */
export async function isiMundurHarga(tanggal: string): Promise<number> {
  const res = await queryDb(
    `insert into prices (commodity_id, region_id, business_id, date, price, source, is_filled)
     select k.commodity_id, k.region_id, null, $1::date, t.price, t.source, true
     from (
       select distinct commodity_id, region_id from prices where business_id is null
     ) k
     cross join lateral (
       select p.price, p.source from prices p
       where p.business_id is null
         and p.commodity_id = k.commodity_id
         and p.region_id   = k.region_id
         and p.date <  $1::date
         and p.date >= $1::date - 7          -- BR-03: lebih dari 7 hari = tidak tersedia
       order by p.date desc limit 1
     ) t
     where not exists (
       select 1 from prices ada
       where ada.business_id is null
         and ada.commodity_id = k.commodity_id
         and ada.region_id    = k.region_id
         and ada.date         = $1::date
     )
     on conflict do nothing`,
    [tanggal],
  );
  return res?.rowCount ?? 0;
}

/** Memuat bahan satu menu lewat view resep_efektif (BR-09 + BR-04). */
async function muatBahan(menuItemId: string): Promise<BahanResep[]> {
  const res = await queryDb(
    `select commodity_id, nama, qty, harga, harga_lalu, dari_data
     from resep_efektif where menu_item_id = $1`,
    [menuItemId],
  );
  return (res?.rows ?? []).map((r) => ({
    komoditasId: r.commodity_id,
    nama: r.nama,
    qty: Number(r.qty),
    harga: r.harga === null ? null : Number(r.harga),
    hargaLalu: r.harga_lalu === null ? null : Number(r.harga_lalu),
    dariData: Boolean(r.dari_data),
  }));
}

async function muatBiayaTetap(menuItemId: string): Promise<number> {
  const res = await queryDb(
    `select coalesce(sum(amount), 0) total from fixed_costs where menu_item_id = $1`,
    [menuItemId],
  );
  return Number(res?.rows?.[0]?.total ?? 0);
}

/**
 * FR-17 — satu baris margin_snapshots per menu per hari.
 * BR-15: menu yang diistirahatkan (active = false) TETAP dihitung,
 * supaya sistem bisa memanggil balik saat sudah sehat lagi.
 */
export async function buatSnapshot(tanggal: string): Promise<number> {
  const menus = await queryDb(`select id, name, sell_price from menu_items`);
  if (!menus) return 0;

  let ditulis = 0;
  for (const m of menus.rows) {
    const bahan = await muatBahan(m.id);
    if (bahan.length === 0) continue;

    const biayaTetap = await muatBiayaTetap(m.id);
    const { hpp, dariData, jumlahHilang } = hitungHpp(bahan, biayaTetap);
    const hargaJual = Number(m.sell_price);
    const margin = hitungMargin(hargaJual, hpp);

    const res = await queryDb(
      `insert into margin_snapshots
         (menu_item_id, date, hpp, sell_price, margin_pct, from_data, missing_count)
       values ($1, $2::date, $3, $4, $5, $6, $7)
       on conflict (menu_item_id, date) do update set
         hpp = excluded.hpp, sell_price = excluded.sell_price,
         margin_pct = excluded.margin_pct, from_data = excluded.from_data,
         missing_count = excluded.missing_count`,
      [m.id, tanggal, hpp, hargaJual, margin, dariData, jumlahHilang],
    );
    if (res?.rowCount) ditulis++;
  }
  return ditulis;
}

/**
 * FR-30…33 — alert harian.
 * BR-05 keparahan, BR-06 maksimal 3 dan menu stabil tidak bersuara,
 * BR-07 saran harga disertakan untuk warning dan critical.
 */
export async function buatAlert(tanggal: string): Promise<number> {
  const biz = await queryDb(`select id from businesses`);
  if (!biz) return 0;

  let total = 0;

  for (const b of biz.rows) {
    // Hanya menu yang sedang dijual yang menghasilkan alert.
    const menus = await queryDb(
      `select m.id, m.name, m.sell_price,
              kini.hpp, kini.margin_pct as margin_kini,
              lalu.margin_pct as margin_lalu,
              bulan.margin_pct as margin_30hari
       from menu_items m
       left join lateral (
         select hpp, margin_pct from margin_snapshots
         where menu_item_id = m.id and date <= $2::date
         order by date desc limit 1
       ) kini on true
       left join lateral (
         select margin_pct from margin_snapshots
         where menu_item_id = m.id and date <= $2::date - 7
         order by date desc limit 1
       ) lalu on true
       left join lateral (
         select margin_pct from margin_snapshots
         where menu_item_id = m.id and date <= $2::date - 30
         order by date desc limit 1
       ) bulan on true
       where m.business_id = $1 and m.active`,
      [b.id, tanggal],
    );
    if (!menus) continue;

    const calon: CalonAlert[] = [];

    for (const m of menus.rows) {
      if (m.margin_kini === null || m.margin_kini === undefined) continue;

      const marginKini = Number(m.margin_kini);
      const marginLalu = m.margin_lalu === null ? null : Number(m.margin_lalu);

      const nilai = nilaiKeparahan(marginKini, marginLalu);
      if (!nilai) continue; // BR-06: sehat, atau rendah tapi stabil → diam

      const bahan = await muatBahan(m.id);
      calon.push({
        menuItemId: m.id,
        namaMenu: m.name,
        marginSekarang: marginKini,
        marginLalu,
        penurunanPoin: nilai.penurunanPoin,
        keparahan: nilai.keparahan,
        // FR-31: selalu ada bahan yang disebut. Kalau tidak ada yang naik harga,
        // yang jujur disebut adalah penyumbang modal terbesar.
        pendorong: cariPendorong(bahan) ?? penyumbangTerbesar(bahan),
        hpp: Number(m.hpp ?? 0),
        hargaJual: Number(m.sell_price),
      });
    }

    const terpilih = batasiAlert(calon); // BR-06: maksimal 3

    // Alert hari itu disusun ulang, supaya menjalankan dua kali tidak menumpuk.
    await queryDb(`delete from alerts where business_id = $1 and date = $2::date`, [b.id, tanggal]);

    for (const a of terpilih) {
      const { headline, detail } = susunKalimat(a);

      // BR-07 — saran harga hanya untuk warning dan critical (FR-32)
      const saran =
        a.keparahan === "info"
          ? null
          : {
              tipe: "reprice",
              harga_sekarang: a.hargaJual,
              harga_saran: saranHarga(a.hpp, (menus.rows.find((r) => r.id === a.menuItemId) as any)?.margin_30hari),
            };

      const res = await queryDb(
        `insert into alerts
           (business_id, menu_item_id, date, severity, headline, detail, driver_commodity_id, suggestion)
         values ($1, $2, $3::date, $4, $5, $6, $7, $8)`,
        [
          b.id, a.menuItemId, tanggal, a.keparahan, headline, detail,
          a.pendorong?.komoditasId ?? null,       // FR-31: selalu terisi bila ada pendorong
          saran ? JSON.stringify(saran) : null,
        ],
      );
      if (res?.rowCount) total++;
    }
  }

  return total;
}

/** Satu pekerjaan harian utuh. Dipanggil cron, atau manual dari pengaturan. */
export async function jalankanHarian(tanggal?: string): Promise<HasilHarian> {
  const hari = tanggal ?? (keIsoTanggal(new Date()) as string);
  const pesan: string[] = [];

  const diisiMundur = await isiMundurHarga(hari);
  pesan.push(`${diisiMundur} harga diisi mundur (BR-03)`);

  const snapshot = await buatSnapshot(hari);
  pesan.push(`${snapshot} snapshot untung ditulis (FR-17)`);

  const alert = await buatAlert(hari);
  pesan.push(`${alert} alert dibuat (BR-06 maks 3/warung)`);

  return { tanggal: hari, diisiMundur, snapshot, alert, pesan };
}
