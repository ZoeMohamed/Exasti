// lib/services/alerts.ts — pembacaan alert untuk UI.

import { getCurrentBusinessId, queryAppDb } from "../auth/context";
import { keIsoTanggal } from "../tanggal";

export interface AlertTampil {
  id: string;
  menuItemId: string | null;
  namaMenu: string | null;
  slugMenu: string | null;
  tanggal: string;
  keparahan: "info" | "warning" | "critical";
  headline: string;
  detail: string | null;
  pendorong: string | null;
  saran: { tipe: string; harga_sekarang: number; harga_saran: number } | null;
  sudahDibaca: boolean;
  /** Berapa hari berturut-turut masalah ini sudah muncul. 1 = baru hari ini. */
  sudahBerapaHari: number;
  tanggalMulai: string;
}

/** FR-33: kotak masuk hanya berisi yang belum dibaca. */
export async function ambilAlert(opsi?: { semua?: boolean }): Promise<AlertTampil[]> {
  const businessId = await getCurrentBusinessId();
  // Satu baris per menu, yang terbaru. Masalah yang belum diselesaikan akan
  // menghasilkan alert lagi setiap hari; menampilkan semuanya membuat kotak
  // masuk berisi keluhan yang sama berulang-ulang. Yang berguna bagi pemilik
  // bukan "sudah dikeluhkan lima kali", tapi "ini sudah berjalan lima hari".
  const res = await queryAppDb(
    `with terpilih as (
       select distinct on (a.menu_item_id)
              a.id, a.menu_item_id, a.date, a.severity, a.headline, a.detail,
              a.driver_commodity_id, a.suggestion, a.read_at
       from alerts a
       where a.business_id = $1
         ${opsi?.semua ? "" : "and a.read_at is null"}
       order by a.menu_item_id, a.date desc
     )
     select t.*, m.name as nama_menu,
            (select count(*) from alerts b
             where b.business_id = $1
               and b.menu_item_id = t.menu_item_id
               and b.severity = t.severity) as jumlah_hari,
            (select min(b.date) from alerts b
             where b.business_id = $1
               and b.menu_item_id = t.menu_item_id
               and b.severity = t.severity) as tanggal_mulai
     from terpilih t
     left join menu_items m on m.id = t.menu_item_id
     order by case t.severity when 'critical' then 0 when 'warning' then 1 else 2 end,
              t.date desc
     limit 20`,
    [businessId],
  );

  return (res?.rows ?? []).map((r) => ({
    id: r.id,
    menuItemId: r.menu_item_id,
    namaMenu: r.nama_menu,
    slugMenu: r.menu_item_id,
    tanggal: keIsoTanggal(r.date) as string,
    keparahan: r.severity,
    headline: r.headline,
    detail: r.detail,
    pendorong: r.driver_commodity_id,
    saran: r.suggestion ?? null,
    sudahDibaca: Boolean(r.read_at),
    sudahBerapaHari: Number(r.jumlah_hari ?? 1),
    tanggalMulai: keIsoTanggal(r.tanggal_mulai) ?? (keIsoTanggal(r.date) as string),
  }));
}

/** FR-33: tandai sudah dibaca. */
export async function tandaiDibaca(id: string): Promise<boolean> {
  const businessId = await getCurrentBusinessId();
  // Menandai satu alert sekaligus menutup alert lama untuk menu yang sama.
  // Kalau tidak, keluhan kemarin akan muncul kembali besok pagi seolah baru.
  const res = await queryAppDb(
    `update alerts set read_at = now()
     where business_id = $1
       and read_at is null
       and (id = $2
            or menu_item_id = (
              select menu_item_id from alerts where id = $2 and business_id = $1
            ))`,
    [businessId, id],
  );
  return Boolean(res?.rowCount);
}
