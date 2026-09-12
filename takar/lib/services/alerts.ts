// lib/services/alerts.ts — pembacaan alert untuk UI.

import { queryDb } from "../db/client";
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
}

/** FR-33: kotak masuk hanya berisi yang belum dibaca. */
export async function ambilAlert(opsi?: { semua?: boolean }): Promise<AlertTampil[]> {
  const res = await queryDb(
    `select a.id, a.menu_item_id, m.name as nama_menu, a.date, a.severity,
            a.headline, a.detail, a.driver_commodity_id, a.suggestion, a.read_at
     from alerts a
     left join menu_items m on m.id = a.menu_item_id
     ${opsi?.semua ? "" : "where a.read_at is null"}
     order by case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end,
              a.date desc
     limit 20`,
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
  }));
}

/** FR-33: tandai sudah dibaca. */
export async function tandaiDibaca(id: string): Promise<boolean> {
  const res = await queryDb(
    `update alerts set read_at = now() where id = $1 and read_at is null`,
    [id],
  );
  return Boolean(res?.rowCount);
}
