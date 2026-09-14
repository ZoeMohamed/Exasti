import { queryDb } from "../db/client";
import { hariIniJakarta } from "../tanggal";

const BASE_URL = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga";
export const JATENG_PROVINCE_ID = 14;
export const SEMARANG_REGENCY_ID = 35;
const BI_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "takar-app/1.0",
  Accept: "application/json, text/javascript, */*; q=0.01",
};

interface BiReferenceRow {
  id: number;
  name: string;
}

async function fetchBiJson(url: string): Promise<{ data?: BiReferenceRow[] | Array<Record<string, string>> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { headers: BI_HEADERS, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Gagal aman bila BI mengubah kode wilayah; jangan pernah menyimpan kota lain. */
export async function assertBiSemarangMapping(): Promise<void> {
  const [provinceResponse, regencyResponse] = await Promise.all([
    fetchBiJson(`${BASE_URL}/GetRefProvince`),
    fetchBiJson(`${BASE_URL}/GetRefRegency?price_type_id=1&ref_prov_id=${JATENG_PROVINCE_ID}`),
  ]);
  const province = (provinceResponse.data as BiReferenceRow[] | undefined)?.find((item) => item.id === JATENG_PROVINCE_ID);
  const regency = (regencyResponse.data as BiReferenceRow[] | undefined)?.find((item) => item.id === SEMARANG_REGENCY_ID);
  if (province?.name.trim() !== "Jawa Tengah" || regency?.name.trim() !== "Kota Semarang") {
    throw new Error(`Mapping wilayah BI berubah: ${province?.name ?? "provinsi tidak ditemukan"} / ${regency?.name ?? "kota tidak ditemukan"}.`);
  }
}

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

export async function fetchBiDataRaw(
  startDate: Date,
  endDate: Date,
  provinceId: number = JATENG_PROVINCE_ID,
  regencyId: number = SEMARANG_REGENCY_ID,
): Promise<Record<string, Record<string, number>>> {
  const params = new URLSearchParams({
    price_type_id: "1",
    comcat_id: "",
    province_id: String(provinceId),
    regency_id: String(regencyId),
    market_id: "",
    tipe_laporan: "1",
    start_date: formatBiRequestDate(startDate),
    end_date: formatBiRequestDate(endDate),
  });

  const url = `${BASE_URL}/GetGridDataDaerah?${params.toString()}`;
  let json: { data?: Array<Record<string, string>> };
  try {
    json = await fetchBiJson(url) as { data?: Array<Record<string, string>> };
  } catch (error) {
    throw new Error(`Gagal fetch BI: ${error instanceof Error ? error.message : String(error)}`);
  }
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

/** Tarik dan perbarui harga komoditas pasar BI untuk satu wilayah tertentu. */
export async function syncBiPricesForRegion(
  regionId: number,
  daysBack = 90,
): Promise<{ count: number; latestDate: string; regionName: string }> {
  const today = new Date(hariIniJakarta() + "T12:00:00+07:00");
  const start = new Date(today);
  start.setDate(start.getDate() - daysBack);

  const regionRes = await queryDb<{ id: number; name: string; bi_province_id: number; bi_regency_id: number }>(
    `select id, name, bi_province_id, bi_regency_id from regions where id = $1 limit 1`,
    [regionId],
  );
  const region = regionRes.rows[0];
  if (!region) {
    throw new Error(`Wilayah dengan ID ${regionId} tidak ditemukan di database.`);
  }

  if (region.id === 1) {
    await assertBiSemarangMapping();
  }

  const series = await fetchBiDataRaw(start, today, region.bi_province_id, region.bi_regency_id);
  let totalUpserted = 0;
  let latestDate: string | null = null;

  const baris: Array<[string, number, string, number]> = [];
  for (const [commodityName, dates] of Object.entries(series)) {
    for (const [dateStr, price] of Object.entries(dates)) {
      if (!latestDate || dateStr > latestDate) latestDate = dateStr;
      baris.push([commodityName, region.id, dateStr, price]);
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
       do update set price      = excluded.price,
                     fetched_at = now(),
                     is_filled  = false,
                     filled_from_date = null,
                     source     = excluded.source`,
      params,
    );
    totalUpserted += bongkah.length;
  }

  if (!latestDate) {
    throw new Error(`BI tidak mengembalikan satu pun harga untuk ${region.name} pada rentang yang diminta.`);
  }

  await queryDb(
    `INSERT INTO ingest_runs (target_date, region_count, rows_upserted, status, message)
     VALUES ($1, 1, $2, 'ok', $3)`,
    [
      latestDate,
      totalUpserted,
      `Sukses tarik ${Object.keys(series).length} komoditas ${region.name} (BI ${region.bi_province_id}/${region.bi_regency_id})`,
    ],
  );

  return { count: totalUpserted, latestDate, regionName: region.name };
}

export async function syncBiPricesToDatabase(
  daysBack = 90,
  targetRegionId?: number,
): Promise<{ count: number; latestDate: string }> {
  if (targetRegionId) {
    const res = await syncBiPricesForRegion(targetRegionId, daysBack);
    return { count: res.count, latestDate: res.latestDate };
  }

  // Sinkronisasi untuk seluruh wilayah yang aktif dipakai oleh bisnis + wilayah default (Semarang)
  const activeRegions = await queryDb<{ id: number }>(
    `select distinct r.id from regions r
     where r.id in (select distinct region_id from businesses where region_id is not null)
        or r.id = 1
     order by r.id asc`,
  );

  let totalUpserted = 0;
  let latestDate: string | null = null;

  for (let i = 0; i < activeRegions.rows.length; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    try {
      const res = await syncBiPricesForRegion(activeRegions.rows[i].id, daysBack);
      totalUpserted += res.count;
      if (!latestDate || res.latestDate > latestDate) {
        latestDate = res.latestDate;
      }
    } catch (err) {
      console.error(`Gagal sinkronisasi wilayah ID ${activeRegions.rows[i].id}:`, err);
    }
  }

  return {
    count: totalUpserted,
    latestDate: latestDate || hariIniJakarta(),
  };
}

