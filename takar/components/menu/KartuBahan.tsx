"use client";

import { formatRupiah } from "@/lib/formatRupiah";
import { hitungHargaPerDasar, hitungTakaran } from "@/lib/bahan/takaran";
import { SATUAN_PER_DASAR, type Satuan, type SatuanDasar } from "@/lib/units";
import type { IngredientRow } from "./bahan-form-types";
import { RupiahInput } from "@/components/ui/RupiahInput";

interface Props {
  row: IngredientRow;
  index: number;
  batchYield: number;
  error?: string;
  onChange: (row: IngredientRow) => void;
  onRemove: () => void;
}

function UnitButtons({ value, options, onChange }: { value: Satuan; options: Satuan[]; onChange: (value: Satuan) => void }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Pilih satuan">
      {options.map((unit) => (
        <button
          key={unit}
          type="button"
          onClick={() => onChange(unit)}
          className={`px-2 py-1 font-mono text-xs brutal-border-2 ${value === unit ? "bg-ink text-white" : "bg-white"}`}
        >
          {unit}
        </button>
      ))}
    </div>
  );
}

export function KartuBahan({ row, index, batchYield, error, onChange, onRemove }: Props) {
  const namaKecil = row.name.toLocaleLowerCase("id-ID");
  const unitOptions = SATUAN_PER_DASAR[row.satuanDasar].filter((unit) => {
    if (unit === "butir") return namaKecil.includes("telur") || namaKecil.includes("telor");
    if (unit === "ekor") return namaKecil.includes("ayam") || namaKecil.includes("ikan");
    return true;
  });
  const takaran = hitungTakaran(row.pemakaian, row.satuanDasar, batchYield || 1);
  const manual = row.hargaBelanja
    ? hitungHargaPerDasar(row.hargaBelanja, row.satuanDasar)
    : null;
  const hargaPerDasar = manual && !("galat" in manual) ? manual.hargaPerDasar : row.harga;
  const modal = !("galat" in takaran) && hargaPerDasar !== null
    ? Math.round(takaran.qty * hargaPerDasar)
    : null;
  const perluHarga = row.bahan.jenis === "baru" || row.harga === null;
  const tampilkanHarga = perluHarga || Boolean(row.hargaBelanja);
  const pemakaianMasak = row.pemakaian.cara === "per_masak" ? row.pemakaian : null;
  const pemakaianKemasan = row.pemakaian.cara === "per_kemasan" ? row.pemakaian : null;

  function pilihCara(cara: "per_masak" | "per_kemasan") {
    if (cara === "per_masak") {
      onChange({ ...row, pemakaian: { cara, jumlah: 1, satuan: row.satuanDasar } });
    } else {
      const unit = row.satuanDasar === "kg" ? "gram" : row.satuanDasar === "liter" ? "ml" : "pcs";
      onChange({ ...row, pemakaian: { cara, isi: 1, satuan: unit, porsi: 1 } });
    }
  }

  function mulaiHarga() {
    const unit = row.pemakaian.satuan;
    const isi = row.pemakaian.cara === "per_kemasan" ? row.pemakaian.isi : 1;
    onChange({ ...row, hargaBelanja: { hargaKemasan: 0, isi, satuan: unit } });
  }

  function gantiSatuanDasar(satuanDasar: SatuanDasar) {
    const satuan: Satuan = satuanDasar === "kg" ? "gram" : satuanDasar === "liter" ? "ml" : "pcs";
    const bahan = row.bahan.jenis === "baru" ? { ...row.bahan, satuanDasar } : row.bahan;
    onChange({
      ...row,
      bahan,
      satuanDasar,
      pemakaian: row.pemakaian.cara === "per_kemasan"
        ? { cara: "per_kemasan", isi: row.pemakaian.isi, porsi: row.pemakaian.porsi, satuan }
        : { cara: "per_masak", jumlah: row.pemakaian.jumlah, satuan },
      hargaBelanja: row.hargaBelanja ? { ...row.hargaBelanja, satuan } : undefined,
    });
  }

  return (
    <article className={`space-y-4 bg-white p-4 brutal-border-2 ${error ? "border-critical-red" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-xs text-ink/60">Bahan {index + 1}</span>
          <h3 className="font-heading text-lg font-extrabold">{row.name}</h3>
          <span className="inline-block bg-cream px-2 py-0.5 text-xs font-bold border border-ink">
            {row.bahan.jenis === "pasar" ? "Harga pasar" : "Bahan warungmu"}
          </span>
        </div>
        <button type="button" onClick={onRemove} className="font-heading text-xs font-bold text-critical-red underline">
          Hapus
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold">Bagaimana bahan ini dipakai?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => pilihCara("per_masak")} className={`p-2 text-left text-xs brutal-border-2 ${row.pemakaian.cara === "per_masak" ? "bg-warning-yellow" : "bg-white"}`}>
            <strong className="block font-heading">Habis sekali masak</strong>
            Contoh: ayam 2 kg untuk satu panci
          </button>
          <button type="button" onClick={() => pilihCara("per_kemasan")} className={`p-2 text-left text-xs brutal-border-2 ${row.pemakaian.cara === "per_kemasan" ? "bg-warning-yellow" : "bg-white"}`}>
            <strong className="block font-heading">Satu kemasan untuk beberapa porsi</strong>
            Contoh: sebotol saus cukup 25 porsi
          </button>
        </div>
      </div>

      {row.bahan.jenis === "baru" && (
        <div>
          <p className="mb-1 text-xs font-bold">Bahan ini biasanya diukur dengan</p>
          <div className="flex flex-wrap gap-1">
            {([[
              "kg", "Berat (kg/gram)"
            ], ["liter", "Cairan (liter/ml)"], ["pcs", "Satuan buah"]] as Array<[SatuanDasar, string]>).map(([dasar, label]) => (
              <button key={dasar} type="button" onClick={() => gantiSatuanDasar(dasar)} className={`px-2 py-1 text-xs font-bold brutal-border-2 ${row.satuanDasar === dasar ? "bg-ink text-white" : "bg-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {pemakaianMasak ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <label className="text-xs font-bold">
            Jumlah sekali masak
            <input type="number" min="0.0001" step="any" value={pemakaianMasak.jumlah || ""} onChange={(event) => onChange({ ...row, pemakaian: { cara: "per_masak", satuan: pemakaianMasak.satuan, jumlah: Number(event.target.value) } })} className="mt-1 w-full bg-white p-2 font-mono brutal-border-2" />
          </label>
          <div><p className="mb-1 text-xs font-bold">Satuan</p><UnitButtons value={pemakaianMasak.satuan} options={unitOptions} onChange={(satuan) => onChange({ ...row, pemakaian: { cara: "per_masak", jumlah: pemakaianMasak.jumlah, satuan } })} /></div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold">
            Isi kemasan
            <input type="number" min="0.0001" step="any" value={pemakaianKemasan?.isi || ""} onChange={(event) => pemakaianKemasan && onChange({ ...row, pemakaian: { cara: "per_kemasan", satuan: pemakaianKemasan.satuan, porsi: pemakaianKemasan.porsi, isi: Number(event.target.value) } })} className="mt-1 w-full bg-white p-2 font-mono brutal-border-2" />
          </label>
          <div><p className="mb-1 text-xs font-bold">Satuan</p><UnitButtons value={pemakaianKemasan?.satuan ?? row.satuanDasar} options={unitOptions} onChange={(satuan) => pemakaianKemasan && onChange({ ...row, pemakaian: { cara: "per_kemasan", isi: pemakaianKemasan.isi, porsi: pemakaianKemasan.porsi, satuan } })} /></div>
          <label className="text-xs font-bold">
            Cukup untuk berapa porsi?
            <input type="number" min="0.01" step="any" value={pemakaianKemasan?.porsi || ""} onChange={(event) => pemakaianKemasan && onChange({ ...row, pemakaian: { cara: "per_kemasan", satuan: pemakaianKemasan.satuan, isi: pemakaianKemasan.isi, porsi: Number(event.target.value) } })} className="mt-1 w-full bg-white p-2 font-mono brutal-border-2" />
          </label>
        </div>
      )}

      <div className="bg-cream p-3 brutal-border-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            {row.harga === null ? "Harga belum diisi" : `${formatRupiah(row.harga)}/${row.satuanDasar} · ${row.sumberHarga}${row.tanggalHarga ? `, ${row.tanggalHarga}` : ""}`}
          </span>
          {!tampilkanHarga && (
            <button type="button" onClick={mulaiHarga} className="font-heading font-bold underline">
              {row.bahan.jenis === "pasar" ? "Harga belanjaku berbeda" : "Perbarui harga"}
            </button>
          )}
        </div>
        {tampilkanHarga && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
            <label className="text-xs font-bold">
              Harga yang dibayar
              <RupiahInput
                required
                min={1}
                value={row.hargaBelanja?.hargaKemasan || ""}
                onValueChange={(value) => onChange({
                  ...row,
                  hargaBelanja: {
                    hargaKemasan: value === "" ? 0 : value,
                    isi: row.hargaBelanja?.isi ?? 1,
                    satuan: row.hargaBelanja?.satuan ?? row.pemakaian.satuan,
                  },
                })}
                wrapperClassName="mt-1"
                className="bg-white p-2 font-mono brutal-border-2"
              />
            </label>
            <label className="text-xs font-bold">
              Untuk isi
              <input type="number" min="0.0001" step="any" value={row.hargaBelanja?.isi || ""} onChange={(event) => onChange({ ...row, hargaBelanja: { hargaKemasan: row.hargaBelanja?.hargaKemasan ?? 0, isi: Number(event.target.value), satuan: row.hargaBelanja?.satuan ?? row.pemakaian.satuan } })} className="mt-1 w-full bg-white p-2 font-mono brutal-border-2" />
            </label>
            <div><p className="mb-1 text-xs font-bold">Satuan isi</p><UnitButtons value={row.hargaBelanja?.satuan ?? row.pemakaian.satuan} options={unitOptions} onChange={(satuan) => onChange({ ...row, hargaBelanja: { hargaKemasan: row.hargaBelanja?.hargaKemasan ?? 0, isi: row.hargaBelanja?.isi ?? 1, satuan } })} /></div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2 bg-ink p-3 font-mono text-xs text-white brutal-border-2">
        <span>Modal bahan ini per porsi</span>
        <strong className="text-bright-green">{modal === null ? "Belum bisa dihitung" : formatRupiah(modal)}</strong>
      </div>
      {error && <p role="alert" className="bg-critical-red/10 p-2 text-sm font-bold text-critical-red brutal-border-2">{error}</p>}
    </article>
  );
}
