"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BahanCombobox } from "./BahanCombobox";
import { KartuBahan } from "./KartuBahan";
import { RupiahInput } from "@/components/ui/RupiahInput";
import {
  BiayaTambahanForm,
  barisDariBiayaAwal,
  payloadBiaya,
  type BarisBiayaForm,
} from "./BiayaTambahanForm";
import { rowDariBahan, type IngredientRow } from "./bahan-form-types";
import { hitungHargaPerDasar, hitungTakaran } from "@/lib/bahan/takaran";
import { siapkanBiayaTetap, type BiayaTetapTersimpan } from "@/lib/biaya";
import type { BahanTersedia, HasilCari } from "@/lib/bahan/cari";
import type { SaranUmum } from "@/lib/bahan/katalog-pasar";
import type { Satuan, SatuanDasar } from "@/lib/units";
import { formatRupiah } from "@/lib/formatRupiah";
import { simpanTahapPanduan } from "@/lib/onboarding-client";

interface InitialIngredientRow {
  bahan: IngredientRow["bahan"];
  pemakaian: IngredientRow["pemakaian"];
  name: string;
  satuanDasar: SatuanDasar;
  harga: number | null;
  sumberHarga: string;
  tanggalHarga: string | null;
  catatan?: string;
}

interface MenuFormProps {
  edit?: boolean;
  menuId?: string;
  initialName?: string;
  initialPrice?: number;
  initialYield?: number;
  initialVolume?: number;
  initialRows?: InitialIngredientRow[];
  initialFixedCosts?: BiayaTetapTersimpan[];
  turAktif?: boolean;
}

function unitKecil(dasar: SatuanDasar): Satuan {
  if (dasar === "kg") return "gram";
  if (dasar === "liter") return "ml";
  return "pcs";
}

export function MenuForm({
  edit = false,
  menuId,
  initialName = "",
  initialPrice,
  initialYield,
  initialVolume = 0,
  initialRows = [],
  initialFixedCosts = [],
  turAktif = false,
}: MenuFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [sellPrice, setSellPrice] = useState<number | "">(initialPrice ?? "");
  const [batchYield, setBatchYield] = useState<number | "">(initialYield ?? "");
  const [weeklyVolume, setWeeklyVolume] = useState<number | "">(initialVolume || "");
  const [bahan, setBahan] = useState<BahanTersedia[]>([]);
  const [saranUmum, setSaranUmum] = useState<SaranUmum[]>([]);
  const [rows, setRows] = useState<IngredientRow[]>(
    initialRows.map((row, index) => ({ ...row, key: `awal-${index}-${row.bahan.jenis}` })),
  );
  const [costRows, setCostRows] = useState<BarisBiayaForm[]>(
    initialFixedCosts.map(barisDariBiayaAwal),
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [costErrors, setCostErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    let aktif = true;
    fetch("/api/bahan")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Daftar bahan belum bisa dibuka.");
        if (aktif) {
          setBahan(data.bahan || []);
          setSaranUmum(data.saranUmum || []);
        }
      })
      .catch((error: unknown) => {
        if (aktif) setFormError(error instanceof Error ? error.message : "Daftar bahan belum bisa dibuka.");
      });
    return () => { aktif = false; };
  }, []);

  const sudahDipakai = useMemo(
    () => new Set(rows.flatMap((row) => row.bahan.jenis === "baru" ? [] : [row.bahan.id])),
    [rows],
  );

  const modalBahan = rows.reduce((total, row) => {
    const takaran = hitungTakaran(row.pemakaian, row.satuanDasar, batchYield === "" ? 1 : batchYield);
    if ("galat" in takaran) return total;
    const manual = row.hargaBelanja ? hitungHargaPerDasar(row.hargaBelanja, row.satuanDasar) : null;
    const harga = manual && !("galat" in manual) ? manual.hargaPerDasar : row.harga;
    return harga === null ? total : total + takaran.qty * harga;
  }, 0);
  const biayaPayload = payloadBiaya(costRows);
  const biayaTerhitung = siapkanBiayaTetap(biayaPayload).biaya;
  const totalBiaya = biayaTerhitung.reduce((total, item) => total + item.amount, 0);

  function pilihBahan(hasil: HasilCari) {
    if (hasil.tipe === "tersedia") {
      setRows((current) => [...current, rowDariBahan(hasil.bahan)]);
      return;
    }
    const nama = hasil.tipe === "saran" ? hasil.saran.nama : hasil.nama;
    const dasar = hasil.tipe === "saran" ? hasil.saran.satuanDasar : "kg";
    const cara = hasil.tipe === "saran" ? hasil.saran.caraPakai : "per_masak";
    const unit = unitKecil(dasar);
    setRows((current) => [...current, {
      key: `baru-${Date.now()}-${current.length}`,
      bahan: { jenis: "baru", nama, satuanDasar: dasar },
      name: nama,
      satuanDasar: dasar,
      pemakaian: cara === "per_kemasan"
        ? { cara, isi: 1, satuan: unit, porsi: 1 }
        : { cara, jumlah: 1, satuan: dasar },
      harga: null,
      sumberHarga: "belum ada harga",
      tanggalHarga: null,
      hargaBelanja: { hargaKemasan: 0, isi: 1, satuan: unit },
    }]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setRowErrors({});
    setCostErrors({});
    if (!name.trim()) return setFormError("Nama menu wajib diisi.");
    if (rows.length === 0) return setFormError("Tambahkan minimal satu bahan.");

    const hargaBelumLengkap = Object.fromEntries(rows.flatMap((row, index) => {
      const hargaManualValid = Boolean(
        row.hargaBelanja &&
        row.hargaBelanja.hargaKemasan > 0 &&
        row.hargaBelanja.isi > 0,
      );
      if (row.harga === null && !hargaManualValid) {
        return [[index, `Isi harga belanja ${row.name} agar modal tidak dianggap nol.`]];
      }
      return [];
    }));
    if (Object.keys(hargaBelumLengkap).length > 0) {
      setRowErrors(hargaBelumLengkap);
      return setFormError("Ada bahan yang belum memiliki harga belanja.");
    }

    const hasilBiaya = siapkanBiayaTetap(biayaPayload);
    if (hasilBiaya.galat.length > 0) {
      setCostErrors(Object.fromEntries(hasilBiaya.galat.map((item) => [item.indeks, item.pesan])));
      return setFormError("Periksa lagi kemasan atau biaya yang belum lengkap.");
    }

    try {
      setLoading(true);
      const response = await fetch(edit && menuId ? `/api/menus/${menuId}` : "/api/menus", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sellPrice: Number(sellPrice),
          batchYield: Number(batchYield),
          weeklyVolume: weeklyVolume === "" ? null : Number(weeklyVolume),
          recipe: rows.map((row) => ({ bahan: row.bahan, pemakaian: row.pemakaian, harga: row.hargaBelanja, catatan: row.catatan })),
          fixedCosts: biayaPayload,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errors: Record<number, string> = {};
        const biayaErrors: Record<number, string> = {};
        for (const item of data.keberatan || []) {
          if (item.bagian === "biaya") biayaErrors[item.indeks] = item.pesan;
          else errors[item.indeks] = item.pesan;
        }
        setRowErrors(errors);
        setCostErrors(biayaErrors);
        setFormError(data.pesan || data.error || "Menu belum tersimpan.");
        return;
      }
      setSaved(true);
      if (turAktif) await simpanTahapPanduan(3);
      router.push(turAktif ? "/dashboard/belanja?tur=3" : "/dashboard/menu");
      router.refresh();
    } catch {
      setFormError("Menu belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="mb-2 inline-block bg-accent-green px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-white">Catatan Resep</span>
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">{edit ? "Ubah resep menu" : "Sekali masak, kamu memakai bahan apa saja?"}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-ink/80 sm:text-lg">Ketik nama bahan seperti biasa. Kalau belum ada, kamu bisa langsung menambahkannya dan mengisi harga belanja.</p>
      </section>

      <form onSubmit={handleSubmit} className="relative space-y-6 bg-cream-surface p-6 sm:p-8 brutal-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <label data-tour="menu-name" className="font-heading text-sm font-bold">Nama menu<input required placeholder="Contoh: Soto Ayam Semarang" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none" /></label>
          <label data-tour="menu-price" className="font-heading text-sm font-bold">
            Harga jual ke pembeli
            <RupiahInput
              required
              min={1000}
              value={sellPrice}
              onValueChange={setSellPrice}
              wrapperClassName="mt-1"
              className="bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
            />
          </label>
          <label data-tour="menu-yield" className="font-heading text-sm font-bold">Sekali masak jadi berapa porsi?<input required name="batchYield" type="number" inputMode="numeric" min="1" step="1" value={batchYield} onChange={(event) => setBatchYield(event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none" /></label>
          <label className="font-heading text-sm font-bold">Kira-kira laku berapa porsi per minggu? (boleh kosong)<input type="number" min="0" value={weeklyVolume} onChange={(event) => setWeeklyVolume(event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none" /><span className="mt-1 block text-xs font-normal text-ink/60">Angka ini hanya perkiraan dari ingatanmu.</span></label>
        </div>

        <section className="space-y-4 bg-cream p-5 brutal-border-2">
          <div><h2 className="font-heading text-xl font-extrabold">Bahan yang dipakai</h2><p className="text-xs text-ink/70">Cari bahan pasar atau tulis bahan khas warungmu.</p></div>
          <div data-tour="menu-ingredient-search">
            <BahanCombobox daftar={bahan} saranUmum={saranUmum} sudahDipakai={sudahDipakai} onPilih={pilihBahan} />
          </div>
          {rows.map((row, index) => (
            <div key={row.key} data-tour="menu-ingredient-card">
              <KartuBahan row={row} index={index} batchYield={batchYield === "" ? 1 : batchYield} error={rowErrors[index]} onChange={(next) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} onRemove={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
            </div>
          ))}
        </section>

        <div data-tour="menu-costs">
          <BiayaTambahanForm rows={costRows} errors={costErrors} onChange={setCostRows} />
        </div>

        <div className="flex justify-between gap-3 bg-ink p-4 font-mono text-sm text-white brutal-card"><span>Modal sementara per porsi</span><strong className="text-lg text-bright-green">{formatRupiah(Math.round(modalBahan + totalBiaya))}</strong></div>
        {formError && <div role="alert" className="bg-critical-red/10 p-3 text-sm font-bold text-critical-red brutal-border-2">{formError}</div>}
        {saved && <div className="bg-bright-green p-3 text-center text-sm font-bold brutal-border-2">Menu dan resep sudah tersimpan.</div>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button data-tour="menu-save" type="submit" disabled={loading || saved} className="brutal-btn flex-1 bg-critical-red px-6 py-3.5 font-heading font-extrabold text-white disabled:opacity-50">
            {loading
              ? "Menyimpan..."
              : saved
                ? "Sudah tersimpan"
                : edit
                  ? "Simpan perubahan"
                  : turAktif
                    ? "Simpan menu dan lanjut catat belanja"
                    : "Simpan menu baru"}
          </button>
          <Link href="/dashboard" className="brutal-btn bg-white px-6 py-3.5 text-center font-heading font-bold">
            {turAktif ? "Isi nanti" : "Batal"}
          </Link>
        </div>
      </form>
    </div>
  );
}
