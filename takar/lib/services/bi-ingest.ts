import { queryDb } from "../db/client";

const BASE_URL = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga";
export const JATENG_PROVINCE_ID = 13;
export const SEMARANG_REGENCY_ID = 1;

export function formatBiRequestDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function parseRupiah(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (cleaned === "-" || cleaned === "") return null;
  const num = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

export async function fetchBiDataRaw(startDate: Date, endDate: Date): Promise<Record<string, Record<string, number>>> {
  const params = new URLSearchParams({
    price_type_id: "1",
    comcat_id: "",
    province_id: String(JATENG_PROVINCE_ID),
    regency_id: String(SEMARANG_REGENCY_ID),
    market_id: "",
    tipe_laporan: "1",
    start_date: formatBiRequestDate(startDate),
    end_date: formatBiRequestDate(endDate),
  });

  const url = `${BASE_URL}/GetGridDataDaerah?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "takar-app/1.0",
      Accept: "application/json, text/javascript, */*; q=0.01",
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal fetch BI: HTTP ${res.status}`);
  }

  const json = await res.json();
  const data: Array<Record<string, string>> = json.data || [];
  const series: Record<string, Record<string, number>> = {};

  for (const row of data) {
    const name = (row.name || "").trim();
    if (!name) continue;

    const points: Record<string, number> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!key.includes("/")) continue;
      const parts = key.split("/");
      if (parts.length === 3) {
        const dd = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        const yyyy = parts[2];
        const iso = `${yyyy}-${mm}-${dd}`;
        const p = parseRupiah(val);
        if (p !== null) points[iso] = p;
      }
    }
    if (Object.keys(points).length > 0) {
      series[name] = points;
    }
  }

  return series;
}

export async function syncBiPricesToDatabase(daysBack = 90): Promise<{ count: number; latestDate: string }> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - daysBack);

  const series = await fetchBiDataRaw(start, today);
  let totalUpserted = 0;
  let latestDate = "2026-09-11";

  // Simpan ke Supabase. Dikirim per-bongkah, bukan satu baris satu kueri —
  // versi satu-per-satu memakan 65 detik untuk 14 hari dan melewati batas
  // waktu fungsi serverless, sehingga cron harian mati di tengah jalan.
  const baris: Array<[string, number, string, number]> = [];
  for (const [commodityName, dates] of Object.entries(series)) {
    for (const [dateStr, price] of Object.entries(dates)) {
      if (dateStr > latestDate) latestDate = dateStr;
      baris.push([commodityName, 1, dateStr, price]);
    }
  }

  const UKURAN = 200;
  for (let i = 0; i < baris.length; i += UKURAN) {
    const bongkah = baris.slice(i, i + UKURAN);
    const nilai: string[] = [];
    const params: unknown[] = [];
    bongkah.forEach((b, j) => {
      const n = j * 4;
      nilai.push(`($${n + 1}, $${n + 2}, $${n + 3}::date, $${n + 4}, 'bi_hargapangan', false)`);
      params.push(b[0], b[1], b[2], b[3]);
    });

    await queryDb(
      `insert into prices (commodity_id, region_id, date, price, source, is_filled)
       values ${nilai.join(", ")}
       on conflict (commodity_id, region_id, date) where business_id is null
       do update set price = excluded.price, fetched_at = now()`,
      params,
    );
    totalUpserted += bongkah.length;
  }

  // Catat ke ingest_runs
  await queryDb(
    `INSERT INTO ingest_runs (target_date, region_count, rows_upserted, status, message)
     VALUES ($1, 1, $2, 'ok', $3)`,
    [latestDate, totalUpserted, `Sukses tarik ${Object.keys(series).length} komoditas Kota Semarang`]
  );

  return { count: totalUpserted, latestDate };
}
