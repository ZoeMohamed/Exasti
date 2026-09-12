import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db/client";


/**
 * Membaca host dan region dari DATABASE_URL, bukan dari teks yang dipatok.
 * Versi sebelumnya menuliskan "AWS Mumbai" dan satu project_ref secara
 * harfiah, sehingga endpoint ini tetap melaporkan Mumbai bahkan setelah
 * databasenya dipindah — laporan kesehatan yang justru menyesatkan.
 * Sandi tidak pernah ikut dibaca.
 */
function bacaTujuanDb(): { host: string; region: string | null; projectRef: string | null } {
  const url = process.env.DATABASE_URL;
  if (!url) return { host: "tidak diketahui", region: null, projectRef: null };
  try {
    const u = new URL(url);
    const host = u.hostname;

    // pooler:  aws-0-ap-southeast-3.pooler.supabase.com  → ap-southeast-3
    // langsung: db.<ref>.supabase.co
    const cocokRegion = host.match(/aws-\d+-([a-z]+-[a-z]+-\d+)\.pooler/);
    const cocokRefLangsung = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);

    // pada pooler, ref ada di nama pengguna: postgres.<ref>
    const pengguna = decodeURIComponent(u.username || "");
    const cocokRefPooler = pengguna.match(/^postgres\.([a-z0-9]+)$/);

    return {
      host,
      region: cocokRegion ? cocokRegion[1] : null,
      projectRef: cocokRefPooler?.[1] ?? cocokRefLangsung?.[1] ?? null,
    };
  } catch {
    return { host: "tidak dapat dibaca", region: null, projectRef: null };
  }
}

const NAMA_REGION: Record<string, string> = {
  "ap-south-1": "AWS Mumbai",
  "ap-southeast-1": "AWS Singapura",
  "ap-southeast-3": "AWS Jakarta",
  "ap-southeast-5": "AWS Malaysia",
  "ap-northeast-1": "AWS Tokyo",
};

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    // 1. Tes koneksi live & ambil versi postgres
    const pingRes = await queryDb("SELECT NOW() as current_time, version();");
    const latency = Date.now() - start;

    if (!pingRes || pingRes.rows.length === 0) {
      return NextResponse.json(
        {
          status: "disconnected",
          message: "Tidak dapat terhubung ke database. Periksa DATABASE_URL di .env.local",
        },
        { status: 503 }
      );
    }

    // 2. Cek jumlah baris di setiap tabel Supabase
    const countsRes = await queryDb(`
      SELECT 
        (SELECT count(*) FROM prices) as prices_count,
        (SELECT count(*) FROM menu_items) as menu_items_count,
        (SELECT count(*) FROM recipe_items) as recipe_items_count,
        (SELECT count(*) FROM fixed_costs) as fixed_costs_count,
        (SELECT count(*) FROM margin_snapshots) as snapshots_count,
        (SELECT count(*) FROM businesses) as businesses_count,
        (SELECT count(*) FROM commodities) as commodities_count,
        (SELECT count(*) FROM regions) as regions_count,
        (SELECT MAX(date) FROM prices WHERE business_id IS NULL) as latest_bi_price_date;
    `);

    const counts = countsRes?.rows[0] || {};
    const tujuan = bacaTujuanDb();

    return NextResponse.json({
      status: "connected",
      database: tujuan.region
        ? `Supabase PostgreSQL (${NAMA_REGION[tujuan.region] ?? tujuan.region})`
        : "Supabase PostgreSQL",
      host: tujuan.host,
      region: tujuan.region,
      project_ref: tujuan.projectRef,
      latency_ms: latency,
      server_time: pingRes.rows[0].current_time,
      postgres_version: pingRes.rows[0].version.split(" ")[0] + " " + pingRes.rows[0].version.split(" ")[1],
      data_tables: {
        prices: Number(counts.prices_count),
        menu_items: Number(counts.menu_items_count),
        recipe_items: Number(counts.recipe_items_count),
        fixed_costs: Number(counts.fixed_costs_count),
        margin_snapshots: Number(counts.snapshots_count),
        businesses: Number(counts.businesses_count),
        commodities: Number(counts.commodities_count),
        regions: Number(counts.regions_count),
      },
      latest_bi_price_date: counts.latest_bi_price_date,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error koneksi database";
    return NextResponse.json(
      {
        status: "error",
        error: message,
      },
      { status: 500 }
    );
  }
}
