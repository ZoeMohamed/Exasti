import { cache } from "react";
import {
  getCurrentBusinessId,
  queryAppDb,
  withAppTransaction,
} from "../auth/context";
import { hariIniJakarta, keIsoTanggal, tanggalIndonesia } from "../tanggal";
import type { Menu, Ingredient } from "@/types/menu";
import {
  hitungHpp, hitungMargin, kesehatan, cariPendorong, cariPembanding,
  saranHarga, penyumbangTerbesar, periksaSatuan, type BahanResep,
} from "../margin";
import type { DbQuery } from "@/lib/db/client";
import { normalisasiNama } from "@/lib/bahan/cari";
import { definisiPasar } from "@/lib/bahan/katalog-pasar";
import { bandingkanPrioritasMenu } from "@/lib/priority";
import { hitungHargaPerDasar, hitungTakaran, type Pemakaian } from "@/lib/bahan/takaran";
import {
  bentukLama,
  keluargaDariInput,
  validasiBahanResep,
  type BahanResepInput,
  type BahanResepLama,
  type RefBahan,
} from "@/lib/bahan/validasi";
import { keSatuanDasar, type Satuan, type SatuanDasar } from "@/lib/units";
import {
  siapkanBiayaTetap,
  type BiayaTetapInput,
  type BiayaTetapTersimpan,
} from "@/lib/biaya";

export interface ProfitHistoryPoint {
  date: string;
  label: string;
  hpp: number;
  profit: number;
  marginPct: number;
}

export interface DbMenuDetail {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  category: string;
  sellPrice: number;
  batchYield: number;
  weeklyVolume: number;
  modal: number;
  profit: number;
  profitRate: number;
  status: "sehat" | "tipis" | "rugi" | "diistirahatkan";
  driver: string;
  ingredients: Ingredient[];
  fixedCosts: BiayaTetapTersimpan[];
  driverNote: {
    driverName: string;
    driverPct: number;
    driverRp: number;
    altName: string;
    altPct: number;
    altRp: number;
  } | null;
  suggestedPrice: number;
  history: ProfitHistoryPoint[];
  recipeRows?: Array<{
    bahan: RefBahan;
    pemakaian: Pemakaian;
    name: string;
    satuanDasar: SatuanDasar;
    harga: number | null;
    sumberHarga: string;
    tanggalHarga: string | null;
    hargaBelanja?: {
      hargaKemasan: number;
      isi: number;
      satuan: Satuan;
    };
    catatan?: string;
  }>;
  /** BR-10 / FR-28 — persen modal yang berasal dari data harga otomatis. */
  cakupan?: number;
  bahanTanpaHarga?: number;
}

function getMenuIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("ayam")) return "🍗";
  if (n.includes("nasi")) return "🍳";
  if (n.includes("lele") || n.includes("ikan")) return "🐟";
  if (n.includes("mie")) return "🍜";
  if (n.includes("teh") || n.includes("es") || n.includes("kopi")) return "🧊";
  if (n.includes("sapi") || n.includes("daging")) return "🥩";
  return "🍱";
}

/**
 * [Q5a] Mengambil semua menu aktif dari Supabase terurut dari untung terkecil
 */
/**
 * Dibungkus cache() dari React: layout dan halaman sama-sama memanggil ini
 * dalam satu permintaan yang sama. Tanpa dedup, seluruh perhitungan menu
 * berjalan dua kali — enam perjalanan ke Mumbai, bukan tiga.
 */
export const getDbMenus = cache(async function (): Promise<{ menus: Menu[]; latestDate: string }> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `with bahan_per_menu as (
         select menu_item_id,
                jsonb_agg(jsonb_build_object(
                  'komoditasId', commodity_id,
                  'nama', nama,
                  'qty', qty,
                  'harga', harga,
                  'hargaLalu', harga_lalu,
                  'dariData', dari_data
                )) as daftar
         from resep_efektif
         where business_id = $1
         group by menu_item_id
       ), biaya_per_menu as (
         select fc.menu_item_id, coalesce(sum(fc.amount), 0) as total
         from fixed_costs fc
         join menu_items mi on mi.id = fc.menu_item_id
         where mi.business_id = $1
         group by fc.menu_item_id
       )
       select m.id, m.name, m.sell_price, m.batch_yield, m.weekly_volume, m.active,
              (select max(date) from prices
               where region_id = b.region_id and business_id is null and not is_filled
                ) as latest_price_date,
              coalesce(bpm.daftar, '[]'::jsonb) as bahan,
              coalesce(cpm.total, 0) as biaya_tetap
       from businesses b
       left join menu_items m on m.business_id = b.id
       left join bahan_per_menu bpm on bpm.menu_item_id = m.id
       left join biaya_per_menu cpm on cpm.menu_item_id = m.id
       where b.id = $1`,
      [businessId],
    );
    if (!res || res.rows.length === 0) return { menus: [], latestDate: "" };

    const latestDate = keIsoTanggal(res.rows[0].latest_price_date) ?? "";

    // LEFT JOIN sengaja mempertahankan satu baris bisnis meski akun baru belum
    // punya menu, supaya tanggal harga tetap tampil tanpa kueri tambahan.
    const menus: Menu[] = res.rows.filter((row) => row.id).map((row) => {
      const bahan: BahanResep[] = (Array.isArray(row.bahan) ? row.bahan : []).map((item) => ({
        komoditasId: String(item.komoditasId),
        nama: definisiPasar(String(item.komoditasId))?.namaTampil ?? String(item.nama),
        qty: Number(item.qty),
        harga: item.harga === null ? null : Number(item.harga),
        hargaLalu: item.hargaLalu === null ? null : Number(item.hargaLalu),
        dariData: Boolean(item.dariData),
      }));
      const biayaTetap = Number(row.biaya_tetap);

      // Seluruh keputusan angkanya diambil lib/margin.ts — tidak ada ambang
      // yang ditulis ulang di sini (BR-01, BR-02, BR-15).
      const { hpp } = hitungHpp(bahan, biayaTetap);
      const sellPrice = Math.round(Number(row.sell_price));
      const margin = hitungMargin(sellPrice, hpp);
      const pendorong = cariPendorong(bahan) ?? penyumbangTerbesar(bahan);

      return {
        id: row.id,
        name: row.name,
        shortName: row.name.toUpperCase(),
        icon: getMenuIcon(row.name),
        price: sellPrice,
        modal: hpp,
        profit: sellPrice - hpp,
        profitRate: margin,
        status: row.active ? kesehatan(margin) : "diistirahatkan",
        driver: pendorong ? pendorong.nama : "Harga bahan stabil",
        servingsPerWeek: row.weekly_volume ?? 0,
        category: row.name.toLowerCase().includes("teh") ? "Minuman" : "Makanan Utama",
      };
    });

    // BR-14 / FR-50 — jika volume tersedia, lihat dampak rupiah mingguan.
    menus.sort(bandingkanPrioritasMenu);

    return { menus, latestDate };
  } catch (err) {
    console.error("Error getDbMenus:", err);
    throw err;
  }
});

/**
 * Rincian satu menu. Memakai view resep_efektif (BR-09) dan lib/margin.ts,
 * sehingga angka di layar detail tidak mungkin berbeda dari angka di dashboard.
 */
export async function getDbMenuDetail(menuIdOrSlug: string): Promise<DbMenuDetail | null> {
  try {
    const businessId = await getCurrentBusinessId();
    const menuRes = await queryAppDb(
      `select m.id, m.name, m.sell_price, m.batch_yield, m.weekly_volume, m.active
       from menu_items m
       where m.business_id = $1
         and (m.id::text = $2
          or lower(m.name) = $3
          or lower(replace(m.name, ' ', '-')) = $3)
       limit 1`,
      [businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
    );
    if (!menuRes || menuRes.rows.length === 0) return null;

    const m = menuRes.rows[0];
    const sellPrice = Math.round(Number(m.sell_price));

    // Empat kueri berikut tidak saling bergantung. Dijalankan berurutan,
    // masing-masing menunggu ~180 ms ke Mumbai; dijalankan bersamaan,
    // totalnya tinggal satu kali tunggu.
    const fcPromise = queryAppDb(
      `select label, amount, pack_price, pack_qty, usage_qty, is_estimated
       from fixed_costs where menu_item_id = $1 order by updated_at, id`,
      [m.id],
    );
    const margin30Promise = queryAppDb(
      `select margin_pct from margin_snapshots
       where menu_item_id = $1 and date <= current_date - 30
       order by date desc limit 1`,
      [m.id],
    );
    const histPromise = queryAppDb(
      `select date, hpp, sell_price, margin_pct, round(sell_price - hpp) as untung
       from margin_snapshots where menu_item_id = $1
       order by date desc limit 30`,
      [m.id],
    );

    // ── bahan lewat resep_efektif ──
    const bahanRes = await queryAppDb(
      `select e.commodity_id, e.nama, e.satuan, e.qty, e.batch_qty, e.harga,
              e.harga_lalu, e.dari_data, e.alasan, e.harga_diisi_mundur,
              e.bi_tanggal, e.komoditas_bi, e.harga_nota, e.tanggal_beli,
              r.cara_pakai, r.jumlah_input, r.satuan_input, r.isi_kemasan,
              r.satuan_kemasan, r.porsi_per_kemasan, r.note
       from resep_efektif e
       join recipe_items r
         on r.menu_item_id = e.menu_item_id and r.commodity_id = e.commodity_id
       where e.menu_item_id = $1`,
      [m.id],
    );

    const bahan: BahanResep[] = [];
    const ingredients: Ingredient[] = [];
    const recipeRows: DbMenuDetail["recipeRows"] = [];
    const fixedCosts: BiayaTetapTersimpan[] = [];

    for (const r of bahanRes?.rows ?? []) {
      const harga = r.harga === null ? null : Number(r.harga);
      const namaTampil = r.komoditas_bi
        ? definisiPasar(String(r.commodity_id))?.namaTampil ?? String(r.nama)
        : String(r.nama);
      bahan.push({
        komoditasId: r.commodity_id,
        nama: namaTampil,
        qty: Number(r.qty),
        harga,
        hargaLalu: r.harga_lalu === null ? null : Number(r.harga_lalu),
        dariData: Boolean(r.dari_data),
      });

      // FR-27: harga hasil isi mundur ditandai di UI
      const tandaIsiMundur = r.harga_diisi_mundur
        ? ` · memakai harga ${tanggalIndonesia(r.bi_tanggal)}`
        : "";

      const tanggalHarga = keIsoTanggal(r.tanggal_beli ?? r.bi_tanggal);
      const hargaPemilik = r.harga_nota !== null;
      const quantity = r.cara_pakai === "per_kemasan"
        ? `${Number(r.isi_kemasan)} ${r.satuan_kemasan} · cukup ${Number(r.porsi_per_kemasan)} porsi`
        : `${Number(r.jumlah_input ?? r.batch_qty)} ${r.satuan_input ?? r.satuan} untuk ${m.batch_yield} porsi`;

      ingredients.push({
        name: namaTampil,
        quantity,
        unit: r.satuan as "kg" | "liter" | "pcs",
        unitPrice: harga === null ? 0 : Math.round(harga),
        cost: harga === null ? 0 : Math.round(Number(r.qty) * harga),
        source: hargaPemilik ? "HARGA KAMU" : r.dari_data ? "DATA PASAR" : "PERKIRAAN",
        sourceNote: String(r.alasan) + (tanggalHarga ? `, dicatat ${tanggalIndonesia(tanggalHarga)}` : "") + tandaIsiMundur,
      });

      let hargaBelanja: NonNullable<NonNullable<DbMenuDetail["recipeRows"]>[number]["hargaBelanja"]> | undefined;
      if (hargaPemilik && r.harga_nota !== null) {
        if (r.cara_pakai === "per_kemasan") {
          const isi = Number(r.isi_kemasan);
          const satuan = r.satuan_kemasan as Satuan;
          const isiDasar = keSatuanDasar(isi, satuan, r.satuan as SatuanDasar);
          hargaBelanja = {
            hargaKemasan: "galat" in isiDasar
              ? Number(r.harga_nota)
              : Math.round(Number(r.harga_nota) * isiDasar.nilai),
            isi,
            satuan,
          };
        } else {
          hargaBelanja = { hargaKemasan: Number(r.harga_nota), isi: 1, satuan: r.satuan as Satuan };
        }
      }

      recipeRows.push({
        bahan: r.komoditas_bi
          ? { jenis: "pasar", id: r.commodity_id }
          : { jenis: "warung", id: r.commodity_id },
        pemakaian: r.cara_pakai === "per_kemasan"
          ? {
              cara: "per_kemasan",
              isi: Number(r.isi_kemasan),
              satuan: r.satuan_kemasan as Satuan,
              porsi: Number(r.porsi_per_kemasan),
            }
          : {
              cara: "per_masak",
              jumlah: Number(r.jumlah_input ?? r.batch_qty),
              satuan: (r.satuan_input ?? r.satuan) as Satuan,
            },
        name: namaTampil,
        satuanDasar: r.satuan as SatuanDasar,
        harga,
        sumberHarga: String(r.alasan),
        tanggalHarga,
        hargaBelanja,
        catatan: r.note ?? undefined,
      });
    }

    // ── biaya tetap ──
    const fcRes = await fcPromise;
    let biayaTetap = 0;
    for (const fc of fcRes?.rows ?? []) {
      const amount = Number(fc.amount);
      const amt = Math.round(amount);
      biayaTetap += amount;
      fixedCosts.push({
        label: String(fc.label),
        amount,
        packPrice: fc.pack_price === null ? null : Number(fc.pack_price),
        packQty: fc.pack_qty === null ? null : Number(fc.pack_qty),
        usageQty: fc.usage_qty === null ? 1 : Number(fc.usage_qty),
        isEstimated: Boolean(fc.is_estimated),
      });
      ingredients.push({
        name: String(fc.label).toUpperCase(),
        quantity: fc.pack_price !== null && fc.pack_qty !== null
          ? `${formatAngkaBiaya(fc.pack_price)} ÷ ${formatAngkaBiaya(fc.pack_qty)} isi${Number(fc.usage_qty ?? 1) === 1 ? "" : ` × ${formatAngkaBiaya(fc.usage_qty)} dipakai`}`
          : fc.is_estimated ? "perkiraan kami · bisa diubah" : "kamu yang isi",
        unit: "pcs",
        unitPrice: amt,
        cost: amt,
        source: fc.is_estimated ? "PERKIRAAN" : "HARGA KAMU",
        sourceNote: fc.is_estimated ? "perkiraan kami, bisa kamu ubah" : "kamu yang mengisi",
      });
    }

    // ── angka, semuanya dari mesin murni ──
    const { hpp, cakupan, jumlahHilang } = hitungHpp(bahan, biayaTetap);
    const margin = hitungMargin(sellPrice, hpp);
    const pendorong = cariPendorong(bahan);
    const pembanding = pendorong ? cariPembanding(bahan, pendorong.komoditasId) : null;

    // BR-07 — saran harga memakai margin 30 hari lalu, minimum 15%
    const lamaRes = await margin30Promise;
    const margin30 = lamaRes?.rows?.[0]?.margin_pct ?? null;

    // FR-26 — riwayat 30 hari
    const histRes = await histPromise;
    const history: ProfitHistoryPoint[] = (histRes?.rows ?? [])
      .map((r) => {
        const iso = keIsoTanggal(r.date) as string;
        const [, bln, hri] = iso.split("-");
        return {
          date: iso,
          label: `${Number(hri)}/${Number(bln)}`,
          hpp: Math.round(Number(r.hpp)),
          profit: Math.round(Number(r.untung)),
          marginPct: Math.round(Number(r.margin_pct) * 10) / 10,
        };
      })
      .reverse();

    return {
      id: m.id,
      name: m.name,
      shortName: String(m.name).toUpperCase(),
      icon: getMenuIcon(m.name),
      category: String(m.name).toLowerCase().includes("teh") ? "Minuman" : "Makanan Utama",
      sellPrice,
      batchYield: m.batch_yield,
      weeklyVolume: m.weekly_volume ?? 0,
      modal: hpp,
      profit: sellPrice - hpp,
      profitRate: margin,
      status: m.active ? kesehatan(margin) : "diistirahatkan",
      driver: pendorong ? pendorong.nama : "Harga bahan stabil",
      ingredients,
      fixedCosts,
      // FR-24 — blok "gara-gara X, bukan Y"
      driverNote: pendorong
        ? {
            driverName: pendorong.nama,
            driverPct: pendorong.kenaikanPct,
            driverRp: pendorong.kontribusiRp,
            altName: pembanding ? pembanding.nama : "Bahan lainnya",
            altPct: pembanding ? pembanding.kenaikanPct : 0,
            altRp: pembanding ? pembanding.kontribusiRp : 0,
          }
        : null,
      // Saran pemulihan margin tidak boleh menyuruh pemilik menurunkan harga
      // yang saat ini sudah lebih sehat dari batas minimum.
      suggestedPrice: Math.max(
        sellPrice,
        saranHarga(hpp, margin30 === null ? null : Number(margin30)),
      ),
      history,
      recipeRows,
      // FR-28 / BR-10 — peringatan cakupan data
      cakupan: Math.round(cakupan * 100),
      bahanTanpaHarga: jumlahHilang,
    };
  } catch (err) {
    console.error("Error getDbMenuDetail:", err);
    throw err;
  }
}

/**
 * [Q8] Simpan menu baru ke Supabase dalam satu transaksi
 */
export type MenuRecipeInput = Array<BahanResepInput | BahanResepLama>;

export class MenuInputError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 422,
    public readonly keberatan: Array<{ indeks: number; nama: string; pesan: string; bagian?: "bahan" | "biaya" }> = [],
  ) {
    super(message);
    this.name = "MenuInputError";
  }
}

function formatAngkaBiaya(value: unknown): string {
  return Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function biayaAtauGalat(value: unknown): BiayaTetapTersimpan[] {
  const hasil = siapkanBiayaTetap(value);
  if (hasil.galat.length > 0) {
    throw new MenuInputError(
      "Periksa kemasan dan biaya kecil.",
      422,
      hasil.galat.map((item) => ({ ...item, bagian: "biaya" as const })),
    );
  }
  return hasil.biaya;
}

async function tulisBiayaTetap(
  query: DbQuery,
  menuId: string,
  biaya: BiayaTetapTersimpan[],
) {
  for (const item of biaya) {
    await query(
      `insert into fixed_costs (
         menu_item_id, label, amount, pack_price, pack_qty, usage_qty, is_estimated
       ) values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        menuId,
        item.label,
        item.amount,
        item.packPrice,
        item.packQty,
        item.usageQty,
        item.isEstimated,
      ],
    );
  }
}

interface ResepSiap {
  commodityId: string;
  nama: string;
  satuanDasar: SatuanDasar;
  batchQty: number;
  qty: number;
  caraPakai: "per_masak" | "per_kemasan";
  jumlahInput: number | null;
  satuanInput: Satuan | null;
  isiKemasan: number | null;
  satuanKemasan: Satuan | null;
  porsiPerKemasan: number | null;
  note: string | null;
  hargaManual: number | null;
  hargaEfektif: number | null;
  indeks: number;
}

async function siapkanResep(
  query: DbQuery,
  businessId: string,
  regionId: number,
  recipe: MenuRecipeInput,
  batchYield: number,
  sellPrice: number,
): Promise<ResepSiap[]> {
  if (!Array.isArray(recipe) || recipe.length === 0) {
    throw new MenuInputError("Tambahkan minimal satu bahan.", 400);
  }
  const bentukGalat = recipe.flatMap((row, indeks) => validasiBahanResep(row, indeks));
  if (bentukGalat.length > 0) throw new MenuInputError(bentukGalat[0], 400);

  const siap: ResepSiap[] = [];
  const ids = new Set<string>();

  for (let indeks = 0; indeks < recipe.length; indeks++) {
    const mentah = recipe[indeks];
    let input: BahanResepInput;
    let resolved: { id: string; nama: string; unit: SatuanDasar; jenis: "pasar" | "warung" } | undefined;

    if (bentukLama(mentah)) {
      const referensi = await query<{ id: string; nama: string; unit: SatuanDasar; jenis: "pasar" | "warung" }>(
        `select x.id, x.nama, x.unit, x.jenis
         from (
           select c.id, c.name nama, c.unit, 'pasar'::text jenis from commodities c
           union all
           select ci.id, ci.name nama, ci.unit, 'warung'::text jenis
           from catalog_items ci where ci.business_id = $1
         ) x where x.id = $2 limit 1`,
        [businessId, mentah.commodityId],
      );
      resolved = referensi.rows[0];
      if (!resolved) {
        throw new MenuInputError("Bahan tidak ditemukan.", 422, [{ indeks, nama: mentah.commodityId, pesan: "Bahan ini tidak tersedia untuk warungmu." }]);
      }
      input = {
        bahan: { jenis: resolved.jenis, id: resolved.id },
        pemakaian: { cara: "per_masak", jumlah: mentah.batchQty, satuan: resolved.unit },
        catatan: mentah.note,
      };
    } else {
      input = mentah;
      if (input.bahan.jenis === "pasar") {
        const hasil = await query<{ id: string; nama: string; unit: SatuanDasar }>(
          "select id, name nama, unit from commodities where id = $1 limit 1",
          [input.bahan.id],
        );
        if (hasil.rows[0]) resolved = { ...hasil.rows[0], jenis: "pasar" };
      } else if (input.bahan.jenis === "warung") {
        const hasil = await query<{ id: string; nama: string; unit: SatuanDasar }>(
          "select id, name nama, unit from catalog_items where id = $1 and business_id = $2 limit 1",
          [input.bahan.id, businessId],
        );
        if (hasil.rows[0]) resolved = { ...hasil.rows[0], jenis: "warung" };
      } else {
        const satuanDasar = keluargaDariInput(input);
        const nama = input.bahan.nama.trim().replace(/\s+/g, " ");
        const hasil = await query<{ id: string; nama: string; unit: SatuanDasar }>(
          `insert into catalog_items (id, business_id, name, nama_normal, unit, approved)
           values ('w_' || gen_random_uuid()::text, $1, $2, $3, $4, true)
           on conflict (business_id, nama_normal) where business_id is not null
           do update set name = excluded.name
           returning id, name nama, unit`,
          [businessId, nama, normalisasiNama(nama), satuanDasar],
        );
        if (hasil.rows[0]) resolved = { ...hasil.rows[0], jenis: "warung" };
        if (resolved && resolved.unit !== satuanDasar) {
          throw new MenuInputError("Satuan bahan tidak cocok.", 422, [{
            indeks,
            nama,
            pesan: `${nama} sudah tercatat dalam ${resolved.unit}. Gunakan satuan yang sejenis.`,
          }]);
        }
      }
      if (!resolved) {
        const nama = input.bahan.jenis === "baru" ? input.bahan.nama : input.bahan.id;
        throw new MenuInputError("Bahan tidak ditemukan.", 422, [{ indeks, nama, pesan: "Bahan ini tidak tersedia untuk warungmu." }]);
      }
    }

    if (ids.has(resolved.id)) {
      throw new MenuInputError("Bahan yang sama dimasukkan dua kali.", 422, [{
        indeks,
        nama: resolved.nama,
        pesan: `${resolved.nama} sudah ada di baris sebelumnya. Gabungkan jumlahnya dalam satu baris.`,
      }]);
    }
    ids.add(resolved.id);

    const angkaPemakaian = input.pemakaian.cara === "per_masak" ? input.pemakaian.jumlah : input.pemakaian.isi;
    if (resolved.unit === "kg" && input.pemakaian.satuan === "kg" && angkaPemakaian > 100) {
      throw new MenuInputError("Sepertinya satuan bahan keliru.", 422, [{
        indeks,
        nama: resolved.nama,
        pesan: `${resolved.nama} ditulis ${angkaPemakaian} kg. Kalau maksudmu gram, ganti satuannya ke gram.`,
      }]);
    }

    const takaran = hitungTakaran(input.pemakaian, resolved.unit, batchYield);
    if ("galat" in takaran) {
      throw new MenuInputError(takaran.galat, 422, [{ indeks, nama: resolved.nama, pesan: takaran.galat }]);
    }

    let hargaManual: number | null = null;
    if (input.harga) {
      const hitungHarga = hitungHargaPerDasar(input.harga, resolved.unit);
      if ("galat" in hitungHarga) {
        throw new MenuInputError(hitungHarga.galat, 422, [{ indeks, nama: resolved.nama, pesan: hitungHarga.galat }]);
      }
      hargaManual = hitungHarga.hargaPerDasar;
    }

    const hargaDb = await query<{ price: string }>(
      `select case
         when $4 = 'warung' then nota.price
         when nota.price is null then pasar_kini.price
         when pasar_beli.price is null or pasar_beli.price = 0 or pasar_kini.price is null then nota.price
         when pasar_kini.price / pasar_beli.price < 0.3 or pasar_kini.price / pasar_beli.price > 3 then pasar_kini.price
         else round((nota.price / pasar_beli.price) * pasar_kini.price, 2)
       end as price
       from (values (1)) dummy(n)
       left join lateral (
         select p.price, p.date from prices p
         where p.commodity_id = $1 and p.region_id = $2 and p.business_id = $3
         order by p.date desc, p.fetched_at desc limit 1
       ) nota on true
       left join lateral (
         select p.price from prices p
         where $4 = 'pasar' and p.commodity_id = $1 and p.region_id = $2 and p.business_id is null
         order by p.date desc limit 1
       ) pasar_kini on true
       left join lateral (
         select p.price from prices p
         where $4 = 'pasar' and p.commodity_id = $1 and p.region_id = $2
           and p.business_id is null and p.date <= nota.date
         order by p.date desc limit 1
       ) pasar_beli on true`,
      [resolved.id, regionId, businessId, resolved.jenis],
    );
    const hargaEfektif = hargaManual ?? (hargaDb.rows[0]?.price == null ? null : Number(hargaDb.rows[0].price));
    if (hargaEfektif === null) {
      throw new MenuInputError("Harga bahan belum diisi.", 422, [{ indeks, nama: resolved.nama, pesan: `Isi harga belanja ${resolved.nama} terlebih dahulu.` }]);
    }

    const keberatan = periksaSatuan([{
      komoditasId: resolved.id,
      nama: resolved.nama,
      qty: takaran.qty,
      harga: hargaEfektif,
      dariData: resolved.jenis === "pasar" && hargaManual === null,
    }], sellPrice)[0];
    if (keberatan) {
      throw new MenuInputError("Sepertinya ada takaran yang keliru.", 422, [{ indeks, nama: resolved.nama, pesan: keberatan.pesan }]);
    }

    siap.push({
      commodityId: resolved.id,
      nama: resolved.nama,
      satuanDasar: resolved.unit,
      batchQty: takaran.batchQty,
      qty: takaran.qty,
      caraPakai: input.pemakaian.cara,
      jumlahInput: input.pemakaian.cara === "per_masak" ? input.pemakaian.jumlah : null,
      satuanInput: input.pemakaian.cara === "per_masak" ? input.pemakaian.satuan : null,
      isiKemasan: input.pemakaian.cara === "per_kemasan" ? input.pemakaian.isi : null,
      satuanKemasan: input.pemakaian.cara === "per_kemasan" ? input.pemakaian.satuan : null,
      porsiPerKemasan: input.pemakaian.cara === "per_kemasan" ? input.pemakaian.porsi : null,
      note: input.catatan?.trim() || null,
      hargaManual,
      hargaEfektif,
      indeks,
    });
  }
  return siap;
}

async function tulisResep(
  query: DbQuery,
  menuId: string,
  businessId: string,
  regionId: number,
  resep: ResepSiap[],
) {
  for (const row of resep) {
    await query(
      `insert into recipe_items (
         menu_item_id, commodity_id, batch_qty, qty, note, cara_pakai,
         jumlah_input, satuan_input, isi_kemasan, satuan_kemasan, porsi_per_kemasan
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [menuId, row.commodityId, row.batchQty, row.qty, row.note, row.caraPakai,
       row.jumlahInput, row.satuanInput, row.isiKemasan, row.satuanKemasan, row.porsiPerKemasan],
    );
    if (row.hargaManual !== null) {
      await query(
        `insert into prices (commodity_id, region_id, business_id, date, price, source)
         values ($1, $2, $3, $4, $5, 'manual')
         on conflict (commodity_id, region_id, date, business_id)
           where business_id is not null
         do update set price = excluded.price, source = 'manual', fetched_at = now()`,
        [row.commodityId, regionId, businessId, hariIniJakarta(), row.hargaManual],
      );
    }
  }
}

export async function createDbMenu(data: {
  name: string;
  sellPrice: number;
  batchYield: number;
  weeklyVolume?: number;
  recipe: MenuRecipeInput;
  fixedCosts?: BiayaTetapInput[];
}): Promise<string> {
  const biaya = biayaAtauGalat(data.fixedCosts ?? []);
  const businessId = await getCurrentBusinessId();
  return withAppTransaction(async (query) => {
      const bisnis = await query<{ region_id: number }>("select region_id from businesses where id = $1", [businessId]);
      const regionId = bisnis.rows[0]?.region_id;
      if (!regionId) throw new Error("Wilayah warung belum tersedia.");
      const resep = await siapkanResep(query, businessId, regionId, data.recipe, data.batchYield, data.sellPrice);
      const mRes = await query<{ id: string }>(
        `insert into menu_items (business_id, name, sell_price, batch_yield, weekly_volume, active)
         values ($1, $2, $3, $4, $5, true)
         returning id`,
        [businessId, data.name, data.sellPrice, data.batchYield, data.weeklyVolume ?? null],
      );
      const menuId = mRes.rows[0]?.id;
      if (!menuId) throw new Error("Menu tidak berhasil dibuat.");

      await tulisResep(query, menuId, businessId, regionId, resep);

      await tulisBiayaTetap(query, menuId, biaya);

      return menuId;
  });
}

/**
 * [Q7] Update harga jual menu di Supabase
 */
export async function updateDbMenuPrice(menuIdOrSlug: string, newPrice: number): Promise<boolean> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `update menu_items
       set sell_price = $1
       where business_id = $2
         and (id::text = $3
          or lower(name) = $4
          or lower(replace(name, ' ', '-')) = $4)`,
      [newPrice, businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
    );
    return Boolean(res && res.rowCount && res.rowCount > 0);
  } catch (err) {
    console.error("Error updateDbMenuPrice:", err);
    return false;
  }
}

export async function updateDbMenuActive(menuIdOrSlug: string, active: boolean): Promise<boolean> {
  const businessId = await getCurrentBusinessId();
  const result = await queryAppDb(
    `update menu_items
     set active = $1
     where business_id = $2
       and (id::text = $3
        or lower(name) = $4
        or lower(replace(name, ' ', '-')) = $4)`,
    [active, businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
  );
  return Boolean(result.rowCount);
}

/**
 * Update lengkap menu (harga, porsi, resep, dan biaya tetap) di Supabase
 */
export async function updateDbMenuComplete(
  menuIdOrSlug: string,
  data: {
    name?: string;
    sellPrice?: number;
    batchYield?: number;
    weeklyVolume?: number | null;
    recipe?: MenuRecipeInput;
    fixedCosts?: BiayaTetapInput[];
  }
): Promise<boolean> {
  const biaya = data.fixedCosts === undefined ? null : biayaAtauGalat(data.fixedCosts);
  const businessId = await getCurrentBusinessId();
  return withAppTransaction(async (query) => {
      const mRes = await query<{ id: string; batch_yield: number; sell_price: string }>(
        `select id, batch_yield, sell_price from menu_items
         where business_id = $1
           and (id::text = $2
            or lower(name) = $3
            or lower(replace(name, ' ', '-')) = $3)
         limit 1`,
        [businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
      );
      const menu = mRes.rows[0];
      if (!menu) return false;
      const yieldCount = data.batchYield ?? menu.batch_yield;
      const bisnis = await query<{ region_id: number }>("select region_id from businesses where id = $1", [businessId]);
      const regionId = bisnis.rows[0]?.region_id;
      if (!regionId) throw new Error("Wilayah warung belum tersedia.");
      const resep = data.recipe === undefined
        ? null
        : await siapkanResep(query, businessId, regionId, data.recipe, yieldCount, data.sellPrice ?? Number(menu.sell_price));

      const volumeDikirim = data.weeklyVolume !== undefined;
      await query(
        `update menu_items
         set name = coalesce($1, name),
             sell_price = coalesce($2, sell_price),
             batch_yield = coalesce($3, batch_yield),
             weekly_volume = case when $7::boolean then $4 else weekly_volume end
         where id = $5 and business_id = $6`,
        [data.name ?? null, data.sellPrice ?? null, data.batchYield ?? null, data.weeklyVolume ?? null, menu.id, businessId, volumeDikirim],
      );

      if (data.recipe !== undefined) {
        await query("delete from recipe_items where menu_item_id = $1", [menu.id]);
        await tulisResep(query, menu.id, businessId, regionId, resep ?? []);
      }

      if (data.fixedCosts !== undefined) {
        await query("delete from fixed_costs where menu_item_id = $1", [menu.id]);
        await tulisBiayaTetap(query, menu.id, biaya ?? []);
      }
      return true;
  });
}

/**
 * Mengambil profil warung aktif dari Supabase
 */
export const getDbBusinessProfile = cache(async function () {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(`
      SELECT b.id,
             b.name,
             b.packaging_mode,
             r.id as region_id,
             r.name as region_name,
             (SELECT count(*) FROM menu_items WHERE business_id = b.id AND active) as active_menus_count,
             (SELECT ran_at FROM ingest_runs WHERE status = 'ok' ORDER BY ran_at DESC LIMIT 1) as last_ingest_time,
             (SELECT max(date) FROM prices
              WHERE region_id = b.region_id AND business_id IS NULL AND NOT is_filled) as latest_price_date
      FROM businesses b
      LEFT JOIN regions r ON r.id = b.region_id
      WHERE b.id = $1
      LIMIT 1;
    `, [businessId]);

    const profile = res.rows[0];
    if (!profile) throw new Error("Profil warung tidak ditemukan.");
    return profile;
  } catch (err) {
    console.error("Error getDbBusinessProfile:", err);
    throw err;
  }
});

/**
 * Memperbarui profil warung di Supabase
 */
export async function updateDbBusinessProfile(data: {
  name: string;
  regionId?: number;
}): Promise<boolean> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `update businesses
       set name = $1, region_id = coalesce($2, region_id)
       where id = $3`,
      [data.name, data.regionId ?? null, businessId],
    );
    return Boolean(res && res.rowCount && res.rowCount > 0);
  } catch (err) {
    console.error("Error updateDbBusinessProfile:", err);
    return false;
  }
}

// Backward compatibility alias functions
export const calculateDynamicMenus = getDbMenus;
export const getDynamicIngredients = async (slugOrId: string) => {
  const detail = await getDbMenuDetail(slugOrId);
  if (!detail) {
    throw new Error("Menu tidak ditemukan di database");
  }
  return {
    menu: {
      id: detail.id,
      uuid: detail.id,
      name: detail.name,
      shortName: detail.shortName,
      icon: detail.icon,
      category: detail.category,
      sellPrice: detail.sellPrice,
      batchYield: detail.batchYield,
      servingsPerWeek: detail.weeklyVolume,
      recipe: [],
      fixedCosts: detail.fixedCosts,
    },
    currentSellPrice: detail.sellPrice,
    ingredients: detail.ingredients,
    modalTotal: detail.modal,
    driverNote: detail.driverNote,
    suggestedPrice: detail.suggestedPrice,
    history: detail.history,
  };
};
export const updateMenuPrice = updateDbMenuPrice;

/**
 * FR-08 — hapus menu. recipe_items, fixed_costs, margin_snapshots dan alerts
 * ikut terhapus lewat on delete cascade di skema.
 */
export async function hapusDbMenu(menuIdOrSlug: string): Promise<boolean> {
  try {
    const businessId = await getCurrentBusinessId();
    const res = await queryAppDb(
      `delete from menu_items
       where business_id = $1
         and (id::text = $2
          or lower(name) = $3
          or lower(replace(name, ' ', '-')) = $3)`,
      [businessId, menuIdOrSlug, menuIdOrSlug.replace(/-/g, " ").toLowerCase()],
    );
    return Boolean(res?.rowCount);
  } catch (err) {
    console.error("Error hapusDbMenu:", err);
    return false;
  }
}
