// lib/services/harian.ts
// Pekerjaan harian Takar. Berkas ini yang menyentuh database;
// seluruh keputusan angkanya diambil oleh lib/margin.ts yang murni.

import { queryDb } from "../db/client";
import { hariIniJakarta } from "../tanggal";
import {
  AMBANG, hitungHpp, hitungMargin, cariPendorong,
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

export interface HasilBackfillHarian {
  tanggalAcuan: string;
  diproses: HasilHarian[];
}

/**
 * BR-03 / FR-04 — forward-fill.
 * Bila sebuah komoditas tidak punya harga pada tanggal d, pakai harga terakhir
 * dalam 7 hari terakhir dan tandai is_filled = true. Lebih dari 7 hari:
 * harga dianggap tidak tersedia, bukan ditebak.
 */
export async function isiMundurHarga(tanggal: string): Promise<number> {
  const res = await queryDb(
    `insert into prices
       (commodity_id, region_id, business_id, date, price, source, is_filled, filled_from_date)
     select k.commodity_id, k.region_id, null, $1::date,
            t.price, t.source, true, t.date
     from (
       select distinct commodity_id, region_id from prices where business_id is null
     ) k
     cross join lateral (
       select p.price, p.source, coalesce(p.filled_from_date, p.date) as date from prices p
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

/**
 * Memuat harga efektif tepat pada tanggal snapshot. View resep_efektif sengaja
 * dipakai untuk layar "sekarang"; pekerjaan historis tidak boleh memakai harga
 * terbaru untuk menghitung hari yang terlewat.
 */
async function muatBahan(menuItemId: string, tanggal: string): Promise<BahanResep[]> {
  const res = await queryDb(
    `with sumber as (
       select r.commodity_id, r.qty,
              coalesce(c.name, ci.name, r.commodity_id) as nama,
              (c.id is not null) as komoditas_bi,
              nota.price as harga_nota,
              nota_lalu.price as harga_nota_lalu,
              bi_kini.price as bi_kini,
              bi_beli.price as bi_saat_beli,
              bi_lalu.price as bi_lalu
       from recipe_items r
       join menu_items m on m.id = r.menu_item_id
       join businesses b on b.id = m.business_id
       left join commodities c on c.id = r.commodity_id
       left join catalog_items ci on ci.id = r.commodity_id
       left join lateral (
         select p.price, p.date from prices p
         where p.business_id = b.id and p.commodity_id = r.commodity_id
           and p.region_id = b.region_id and p.date <= $2::date
         order by p.date desc, p.fetched_at desc limit 1
       ) nota on true
       left join lateral (
         select p.price from prices p
         where p.business_id = b.id and p.commodity_id = r.commodity_id
           and p.region_id = b.region_id and p.date <= nota.date - 7
         order by p.date desc, p.fetched_at desc limit 1
       ) nota_lalu on true
       left join lateral (
         select p.price, p.date from prices p
         where p.business_id is null and p.commodity_id = r.commodity_id
           and p.region_id = b.region_id and p.date <= $2::date
         order by p.date desc limit 1
       ) bi_kini on true
       left join lateral (
         select p.price from prices p
         where p.business_id is null and p.commodity_id = r.commodity_id
           and p.region_id = b.region_id and p.date <= nota.date
         order by p.date desc limit 1
       ) bi_beli on true
       left join lateral (
         select p.price from prices p
         where p.business_id is null and p.commodity_id = r.commodity_id
           and p.region_id = b.region_id and p.date <= bi_kini.date - 7
         order by p.date desc limit 1
       ) bi_lalu on true
       where r.menu_item_id = $1
     ), berfaktor as (
       select sumber.*,
         case
           when harga_nota is null then 1.0
           when bi_saat_beli is null or bi_saat_beli = 0 or bi_kini is null then null
           when (bi_kini / bi_saat_beli) < 0.3 or (bi_kini / bi_saat_beli) > 3.0 then 1.0
           else harga_nota / bi_saat_beli
         end as faktor
       from sumber
     )
     select commodity_id, nama, qty,
       case
         when not komoditas_bi then harga_nota
         when faktor is null or bi_kini is null then harga_nota
         else round(faktor * bi_kini, 2)
       end as harga,
       case
         when not komoditas_bi then harga_nota_lalu
         when faktor is null then harga_nota
         when bi_lalu is null then null
         else round(faktor * bi_lalu, 2)
       end as harga_lalu,
       (bi_kini is not null) as dari_data
     from berfaktor`,
    [menuItemId, tanggal],
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

  // Dua menu sekaligus cukup menghilangkan waterfall, tetapi tidak membuka
  // lima koneksi lintas-region serentak yang terbukti membuat pooler timeout.
  let ditulis = 0;
  const UKURAN_KELOMPOK = 2;
  for (let i = 0; i < menus.rows.length; i += UKURAN_KELOMPOK) {
    const hasil = await Promise.all(menus.rows.slice(i, i + UKURAN_KELOMPOK).map(async (m) => {
      const bahan = await muatBahan(m.id, tanggal);
      if (bahan.length === 0) return 0;

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
      return res?.rowCount ? 1 : 0;
    }));
    ditulis += hasil.reduce<number>((jumlah, item) => jumlah + item, 0);
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
      `select m.id, m.name, m.sell_price, m.active,
              kini.hpp, kini.margin_pct as margin_kini,
              sebelum.margin_pct as margin_sebelum,
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
         where menu_item_id = m.id and date < $2::date
         order by date desc limit 1
       ) sebelum on true
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
       where m.business_id = $1`,
      [b.id, tanggal],
    );
    if (!menus) continue;

    const calon: CalonAlert[] = [];

    for (const m of menus.rows) {
      if (m.margin_kini === null || m.margin_kini === undefined) continue;

      const marginKini = Number(m.margin_kini);
      const marginLalu = m.margin_lalu === null ? null : Number(m.margin_lalu);

      if (!m.active) {
        const marginSebelum = m.margin_sebelum === null ? null : Number(m.margin_sebelum);
        if (
          marginKini >= AMBANG.sehatMin &&
          marginSebelum !== null &&
          marginSebelum < AMBANG.sehatMin
        ) {
          const bahan = await muatBahan(m.id, tanggal);
          calon.push({
            menuItemId: m.id,
            namaMenu: m.name,
            marginSekarang: marginKini,
            marginLalu: marginSebelum,
            penurunanPoin: 0,
            keparahan: "info",
            pendorong: penyumbangTerbesar(bahan),
            hpp: Number(m.hpp ?? 0),
            hargaJual: Number(m.sell_price),
            jenis: "pulih",
          });
        }
        continue;
      }

      const nilai = nilaiKeparahan(marginKini, marginLalu);
      if (!nilai) continue; // BR-06: sehat, atau rendah tapi stabil → diam

      const bahan = await muatBahan(m.id, tanggal);
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
    // Status baca dipertahankan: retry/backfill tidak boleh membuat peringatan
    // yang sudah ditutup pengguna muncul kembali sebagai peringatan baru.
    const statusBaca = await queryDb<{ menu_item_id: string; read_at: Date }>(
      `select menu_item_id, max(read_at) as read_at
       from alerts
       where business_id = $1 and date = $2::date and read_at is not null
       group by menu_item_id`,
      [b.id, tanggal],
    );
    const dibacaPada = new Map(
      statusBaca.rows.map((row) => [row.menu_item_id, row.read_at]),
    );
    await queryDb(`delete from alerts where business_id = $1 and date = $2::date`, [b.id, tanggal]);

    for (const a of terpilih) {
      const { headline, detail } = susunKalimat(a);

      // BR-07 — saran harga hanya untuk warning dan critical (FR-32)
      const saran =
        a.keparahan === "info"
          ? null
          : (() => {
              const menu = menus.rows.find((row) => row.id === a.menuItemId);
              const margin30Hari = menu?.margin_30hari == null
                ? null
                : Number(menu.margin_30hari);
              return {
              tipe: "reprice",
              harga_sekarang: a.hargaJual,
              harga_saran: saranHarga(a.hpp, margin30Hari),
              };
            })();

      const res = await queryDb(
        `insert into alerts
           (business_id, menu_item_id, date, severity, headline, detail,
            driver_commodity_id, suggestion, read_at)
         values ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)`,
        [
          b.id, a.menuItemId, tanggal, a.keparahan, headline, detail,
          a.pendorong?.komoditasId ?? null,       // FR-31: selalu terisi bila ada pendorong
          saran ? JSON.stringify(saran) : null,
          dibacaPada.get(a.menuItemId) ?? null,
        ],
      );
      if (res?.rowCount) total++;
    }
  }

  return total;
}

/** Satu pekerjaan harian utuh. Dipanggil cron, atau manual dari pengaturan. */
export async function jalankanHarian(tanggal?: string): Promise<HasilHarian> {
  const hari = tanggal ?? hariIniJakarta();
  const pesan: string[] = [];

  const diisiMundur = await isiMundurHarga(hari);
  pesan.push(`${diisiMundur} harga diisi mundur (BR-03)`);

  const snapshot = await buatSnapshot(hari);
  pesan.push(`${snapshot} snapshot untung ditulis (FR-17)`);

  const alert = await buatAlert(hari);
  pesan.push(`${alert} alert dibuat (BR-06 maks 3/warung)`);

  return { tanggal: hari, diisiMundur, snapshot, alert, pesan };
}

/**
 * Menemukan tanggal yang benar-benar bolong dalam jendela pendek. Hari ini dan
 * kemarin selalu ikut agar kegagalan parsial pada run terakhir pulih otomatis.
 * Tanggal lain hanya ikut bila harga publiknya bolong, sehingga cron normal
 * tidak mengulang seluruh sejarah.
 */
export async function tanggalYangPerluDiproses(
  tanggalAcuan = hariIniJakarta(),
  hariKeBelakang = 14,
): Promise<string[]> {
  const batas = Math.max(1, Math.min(Math.trunc(hariKeBelakang), 31));
  const res = await queryDb<{ tanggal: string }>(
    `with tanggal as (
       select generate_series(
         $1::date - ($2::int - 1), $1::date, interval '1 day'
       )::date as d
     ), pasangan as (
       select distinct commodity_id, region_id
       from prices where business_id is null
     )
     select to_char(t.d, 'YYYY-MM-DD') as tanggal
     from tanggal t
     where t.d >= $1::date - 1
        or exists (
          select 1 from pasangan k
          where exists (
            select 1 from prices sebelum
            where sebelum.business_id is null
              and sebelum.commodity_id = k.commodity_id
              and sebelum.region_id = k.region_id
              and sebelum.date < t.d
              and sebelum.date >= t.d - 7
          )
          and not exists (
            select 1 from prices tepat
            where tepat.business_id is null
              and tepat.commodity_id = k.commodity_id
              and tepat.region_id = k.region_id
              and tepat.date = t.d
          )
        )
        or exists (
          select 1 from menu_items m
          where (m.created_at at time zone 'Asia/Jakarta')::date <= t.d
            and exists (select 1 from recipe_items r where r.menu_item_id = m.id)
            and not exists (
              select 1 from margin_snapshots s
              where s.menu_item_id = m.id and s.date = t.d
            )
        )
     order by t.d`,
    [tanggalAcuan, batas],
  );
  return res.rows.map((row) => row.tanggal);
}

/** Jalankan tanggal bolong dari yang terlama agar riwayat alert tetap runtut. */
export async function jalankanHarianDenganBackfill(
  tanggalAcuan?: string,
  hariKeBelakang = 14,
): Promise<HasilBackfillHarian> {
  const hari = tanggalAcuan ?? hariIniJakarta();
  const tanggal = await tanggalYangPerluDiproses(hari, hariKeBelakang);
  const diproses: HasilHarian[] = [];
  for (const item of tanggal) diproses.push(await jalankanHarian(item));
  return { tanggalAcuan: hari, diproses };
}
