/**
 * Ingestion Data Harga Pangan Bank Indonesia (PIHPS)
 * Menangani jebakan format tanggal, header wajib, dan normalisasi format rupiah.
 */

const BASE_URL = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga";
export const JATENG_PROVINCE_ID = 13;
export const SEMARANG_REGENCY_ID = 1;

/**
 * Format tanggal untuk Request BI: MM/DD/YYYY (Jebakan #1)
 */
export function formatBiRequestDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Parsing angka rupiah: '16,350' -> 16350. '-' atau '' -> null (Jebakan #3)
 */
export function parseRupiah(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (cleaned === "-" || cleaned === "") return null;
  const num = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

/**
 * Tarik data harga Kota Semarang dari API Bank Indonesia
 * Kembalikan record: commodity_name -> (YYYY-MM-DD -> price)
 */
export async function fetchBiPrices(
  startDate: Date,
  endDate: Date,
  provinceId = JATENG_PROVINCE_ID,
  regencyId = SEMARANG_REGENCY_ID
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

  // Jebakan #2: Header X-Requested-With wajib agar BI mengembalikan JSON
  const res = await fetch(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "takar-web/1.0",
      Accept: "application/json, text/javascript, */*; q=0.01",
    },
    next: { revalidate: 3600 }, // cache 1 jam di Next.js
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil data BI: HTTP ${res.status}`);
  }

  const json = await res.json();
  const data: Array<Record<string, string>> = json.data || [];

  const series: Record<string, Record<string, number>> = {};

  for (const row of data) {
    // Jebakan #4: nama komoditas sering memiliki spasi di akhir (misal "Cabai Merah Keriting ")
    const name = (row.name || "").trim();
    if (!name) continue;

    const points: Record<string, number> = {};

    for (const [key, val] of Object.entries(row)) {
      // Tanggal di kolom respons berformat DD/MM/YYYY
      if (!key.includes("/")) continue;

      const parts = key.split("/");
      if (parts.length === 3) {
        const dd = parts[0].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        const yyyy = parts[2];
        const isoDate = `${yyyy}-${mm}-${dd}`;

        const price = parseRupiah(val);
        if (price !== null) {
          points[isoDate] = price;
        }
      }
    }

    if (Object.keys(points).length > 0) {
      series[name] = points;
    }
  }

  return series;
}
