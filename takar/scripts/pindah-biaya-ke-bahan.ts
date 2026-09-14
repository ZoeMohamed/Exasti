import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
let connectionString = process.env.DATABASE_URL;
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      connectionString = trimmed.slice("DATABASE_URL=".length).trim();
    }
  }
}
if (!connectionString || connectionString === "[SENSITIVE]") {
  throw new Error("DATABASE_URL asli wajib tersedia di environment atau .env.local.");
}

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const terapkan = process.argv.includes("--terapkan");
const tanggalJakarta = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const rencana = [
  {
    menuId: "00000000-0000-0000-0000-000000000102",
    labelLama: "Arang, Gas & Bumbu Madu",
    namaBahan: "Madu dan bumbu bakar",
    namaNormal: "madu dan bumbu bakar",
    catatan: "ASUMSI: 1 paket per porsi. Ganti dengan takaran dan harga nota asli.",
  },
  {
    menuId: "00000000-0000-0000-0000-000000000104",
    labelLama: "Ikan Lele Segar (Pasar)",
    namaBahan: "Ikan lele",
    namaNormal: "ikan lele",
    catatan: "ASUMSI: 1 ekor per porsi. Ganti dengan harga nota asli.",
  },
  {
    menuId: "00000000-0000-0000-0000-000000000105",
    labelLama: "Mie Instan & Sayur Sawi",
    namaBahan: "Mie instan dan sayur sawi",
    namaNormal: "mie instan dan sayur sawi",
    catatan: "ASUMSI: 1 paket per porsi. Ganti dengan harga nota asli.",
  },
] as const;

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  await client.query("begin");
  try {
    console.log(terapkan ? "MODE TERAPKAN" : "DRY-RUN — tidak ada data yang akan disimpan");
    let ditemukan = 0;

    for (const item of rencana) {
      const hasil = await client.query<{
        name: string;
        batch_yield: number;
        amount: string | null;
      }>(
        `select m.name, m.batch_yield, f.amount
         from menu_items m
         left join fixed_costs f
           on f.menu_item_id = m.id and f.label = $3
         where m.id = $1 and m.business_id = $2`,
        [item.menuId, BUSINESS_ID, item.labelLama],
      );
      const menu = hasil.rows[0];
      if (!menu) {
        console.log(`LEWATI: menu ${item.menuId} tidak ada di warung demo.`);
        continue;
      }
      if (menu.amount === null) {
        console.log(`LEWATI: ${menu.name} sudah dipindahkan atau biaya lama tidak ada.`);
        continue;
      }
      ditemukan++;

      const biayaLama = Number(menu.amount);
      const hargaSatuan = biayaLama;
      const jumlahSekaliMasak = menu.batch_yield;
      const biayaBaru = (jumlahSekaliMasak / menu.batch_yield) * hargaSatuan;
      const selisih = Math.abs(biayaBaru - biayaLama);
      console.log(`${menu.name}: Rp${biayaLama} → Rp${biayaBaru} per porsi (selisih Rp${selisih})`);
      if (selisih > 1) {
        throw new Error(`Pemindahan ${menu.name} mengubah modal lebih dari Rp1.`);
      }

      const katalog = await client.query<{ id: string }>(
        `insert into catalog_items (id, business_id, name, nama_normal, unit, approved)
         values ('w_' || gen_random_uuid()::text, $1, $2, $3, 'pcs', true)
         on conflict (business_id, nama_normal) where business_id is not null
         do update set name = excluded.name
         returning id`,
        [BUSINESS_ID, item.namaBahan, item.namaNormal],
      );
      const bahanId = katalog.rows[0].id;

      await client.query(
        `insert into prices (commodity_id, region_id, business_id, date, price, source)
         select $1, b.region_id, b.id, $3, $4, 'seed_asumsi'
         from businesses b where b.id = $2
         on conflict (commodity_id, region_id, date, business_id) where business_id is not null
         do update set price = excluded.price, source = excluded.source`,
        [bahanId, BUSINESS_ID, tanggalJakarta, hargaSatuan],
      );
      await client.query(
        `insert into recipe_items (
           menu_item_id, commodity_id, batch_qty, qty, note,
           cara_pakai, jumlah_input, satuan_input
         ) values ($1, $2, $3, 1, $4, 'per_masak', $3, 'pcs')
         on conflict (menu_item_id, commodity_id) do update set
           batch_qty = excluded.batch_qty,
           qty = excluded.qty,
           note = excluded.note,
           cara_pakai = excluded.cara_pakai,
           jumlah_input = excluded.jumlah_input,
           satuan_input = excluded.satuan_input`,
        [item.menuId, bahanId, jumlahSekaliMasak, item.catatan],
      );
      await client.query(
        "delete from fixed_costs where menu_item_id = $1 and label = $2",
        [item.menuId, item.labelLama],
      );
    }

    if (ditemukan === 0) console.log("Tidak ada biaya demo yang perlu dipindahkan.");
    if (terapkan) {
      await client.query("commit");
      console.log("Perubahan disimpan.");
    } else {
      await client.query("rollback");
      console.log("Dry-run selesai; seluruh perubahan dibatalkan.");
    }
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
