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

export async function syncBiPricesToDatabase(daysBack = 90): Promise<{ count: number; latestDate: string }> {
  // BI menerbitkan menurut hari Indonesia. Memakai jam server (UTC di Vercel)
  // membuat permintaan meleset sehari saat dijalankan dini hari WIB.
  const today = new Date(hariIniJakarta() + "T12:00:00+07:00");
  const start = new Date(today);
  start.setDate(start.getDate() - daysBack);

  await assertBiSemarangMapping();
  const series = await fetchBiDataRaw(start, today);
  const region = await queryDb<{ id: number; name: string }>(
    `select id, name from regions
     where bi_province_id = $1 and bi_regency_id = $2
     limit 1`,
    [JATENG_PROVINCE_ID, SEMARANG_REGENCY_ID],
  );
  const regionId = region.rows[0]?.id;
  if (!regionId || region.rows[0]?.name !== "Kota Semarang") {
    throw new Error("Mapping Kota Semarang belum diperbarui di database.");
  }
  let totalUpserted = 0;
  let latestDate: string | null = null;

  // Simpan ke Supabase. Dikirim per-bongkah, bukan satu baris satu kueri —
  // versi satu-per-satu memakan 65 detik untuk 14 hari dan melewati batas
  // waktu fungsi serverless, sehingga cron harian mati di tengah jalan.
  const baris: Array<[string, number, string, number]> = [];
  for (const [commodityName, dates] of Object.entries(series)) {
    for (const [dateStr, price] of Object.entries(dates)) {
      if (!latestDate || dateStr > latestDate) latestDate = dateStr;
      baris.push([commodityName, regionId, dateStr, price]);
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
                     -- Hari yang sempat diisi mundur lalu BI-nya terbit menyusul
                     -- harus kehilangan tandanya. Tanpa baris ini, harga asli
                     -- tetap dilabeli "memakai harga tanggal lama" selamanya.
                     is_filled  = false,
                     filled_from_date = null,
                     source     = excluded.source`,
      params,
    );
    totalUpserted += bongkah.length;
  }

  if (!latestDate) {
    throw new Error("BI tidak mengembalikan satu pun harga untuk rentang yang diminta.");
  }

  // Catat ke ingest_runs
  await queryDb(
    `INSERT INTO ingest_runs (target_date, region_count, rows_upserted, status, message)
     VALUES ($1, 1, $2, 'ok', $3)`,
    [latestDate, totalUpserted, `Sukses tarik ${Object.keys(series).length} komoditas Kota Semarang (BI ${JATENG_PROVINCE_ID}/${SEMARANG_REGENCY_ID})`]
  );

  return { count: totalUpserted, latestDate };
}
