"use client";

import { formatRupiah } from "@/lib/formatRupiah";
import {
  hitungBiayaGrosir,
  type BiayaTetapInput,
  type BiayaTetapTersimpan,
  type CaraHitungBiaya,
} from "@/lib/biaya";

export interface BarisBiayaForm {
  key: string;
  label: string;
  mode: CaraHitungBiaya;
  amount: number | "";
  packPrice: number | "";
  packQty: number | "";
  usageQty: number | "";
  usageOpen: boolean;
  isEstimated: boolean;
}

function angkaInput(value: string): number | "" {
  return value === "" ? "" : Number(value);
}

export function barisBiayaBaru(mode: CaraHitungBiaya): BarisBiayaForm {
  return {
    key: `biaya-${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: mode === "grosir" ? "Kemasan / kertas bungkus" : "",
    mode,
    amount: "",
    packPrice: "",
    packQty: "",
    usageQty: 1,
    usageOpen: false,
    isEstimated: false,
  };
}

export function barisDariBiayaAwal(
  biaya: BiayaTetapTersimpan,
  index: number,
): BarisBiayaForm {
  const grosir = biaya.packPrice !== null && biaya.packQty !== null;
  return {
    key: `biaya-awal-${index}`,
    label: biaya.label,
    mode: grosir ? "grosir" : "per_porsi",
    amount: biaya.amount,
    packPrice: biaya.packPrice ?? "",
    packQty: biaya.packQty ?? "",
    usageQty: biaya.usageQty || 1,
    usageOpen: Boolean(biaya.usageQty && biaya.usageQty !== 1),
    isEstimated: biaya.isEstimated,
  };
}

export function payloadBiaya(rows: BarisBiayaForm[]): BiayaTetapInput[] {
  return rows.map((row) => row.mode === "grosir"
    ? {
        label: row.label,
        mode: "grosir",
        packPrice: typeof row.packPrice === "number" ? row.packPrice : Number.NaN,
        packQty: typeof row.packQty === "number" ? row.packQty : Number.NaN,
        usageQty: typeof row.usageQty === "number" ? row.usageQty : Number.NaN,
      }
    : {
        label: row.label,
        mode: "per_porsi",
        amount: typeof row.amount === "number" ? row.amount : Number.NaN,
      });
}

interface Props {
  rows: BarisBiayaForm[];
  errors: Record<number, string>;
  onChange: (rows: BarisBiayaForm[]) => void;
}

export function BiayaTambahanForm({ rows, errors, onChange }: Props) {
  function ubah(index: number, patch: Partial<BarisBiayaForm>) {
    onChange(rows.map((row, rowIndex) => rowIndex === index
      ? { ...row, ...patch, isEstimated: false }
      : row));
  }

  function tambah(mode: CaraHitungBiaya) {
    onChange([...rows, barisBiayaBaru(mode)]);
  }

  const total = rows.reduce((sum, row) => {
    if (row.mode === "per_porsi") {
      return sum + (typeof row.amount === "number" && row.amount > 0 ? row.amount : 0);
    }
    const amount = hitungBiayaGrosir(
      typeof row.packPrice === "number" ? row.packPrice : 0,
      typeof row.packQty === "number" ? row.packQty : 0,
      typeof row.usageQty === "number" ? row.usageQty : 1,
    );
    return sum + (amount ?? 0);
  }, 0);

  return (
    <section className="space-y-4 bg-white p-5 brutal-border-2">
      <div>
        <h2 className="font-heading text-xl font-extrabold">Kemasan dan biaya kecil</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink/70">
          Harga tiap warung berbeda. Masukkan harga belanjamu sendiri—Takar tidak memakai angka tebakan.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-cream p-4 text-sm brutal-border-2">
          <strong className="font-heading">Belanja kemasan langsung satu pak?</strong>
          <p className="mt-1 text-ink/70">
            Contoh: satu pak Rp 28.000 berisi 500 lembar berarti Rp 56 untuk satu porsi.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {rows.map((row, index) => {
          const hasilGrosir = row.mode === "grosir"
            ? hitungBiayaGrosir(
                typeof row.packPrice === "number" ? row.packPrice : 0,
                typeof row.packQty === "number" ? row.packQty : 0,
                typeof row.usageQty === "number" ? row.usageQty : 1,
              )
            : null;
          const hasil = row.mode === "grosir"
            ? hasilGrosir
            : typeof row.amount === "number" && row.amount > 0 ? row.amount : null;

          return (
            <article key={row.key} className={`space-y-4 bg-cream p-4 brutal-border-2 ${errors[index] ? "border-critical-red" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-ink/60">Biaya {index + 1}</span>
                  <p className="font-heading text-lg font-extrabold">{row.label || "Belum diberi nama"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                  className="font-heading text-xs font-bold text-critical-red underline"
                >
                  Hapus
                </button>
              </div>

              {row.isEstimated ? (
                <p className="bg-warning-yellow/30 p-2 text-xs font-bold brutal-border-2">
                  Ini angka perkiraan lama. Ubah sesuai belanja warungmu agar hasilnya lebih tepat.
                </p>
              ) : null}

              <label className="block text-xs font-bold">
                Nama kemasan atau biaya
                <input
                  required
                  maxLength={80}
                  value={row.label}
                  onChange={(event) => ubah(index, { label: event.target.value })}
                  placeholder="Contoh: kotak nasi, kresek, atau gas"
                  className="mt-1 w-full bg-white p-2.5 font-mono brutal-border-2"
                />
              </label>

              <div>
                <p className="mb-2 text-xs font-bold">Kamu tahu harganya dalam bentuk apa?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => ubah(index, { mode: "grosir" })}
                    className={`p-3 text-left text-xs brutal-border-2 ${row.mode === "grosir" ? "bg-warning-yellow" : "bg-white"}`}
                  >
                    <strong className="block font-heading text-sm">Harga satu pak / grosir</strong>
                    Takar membagi harga dengan jumlah isinya.
                  </button>
                  <button
                    type="button"
                    onClick={() => ubah(index, { mode: "per_porsi" })}
                    className={`p-3 text-left text-xs brutal-border-2 ${row.mode === "per_porsi" ? "bg-warning-yellow" : "bg-white"}`}
                  >
                    <strong className="block font-heading text-sm">Sudah tahu per porsi</strong>
                    Untuk biaya yang sudah pernah kamu hitung.
                  </button>
                </div>
              </div>

              {row.mode === "grosir" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold">
                      Total harga satu pak (Rp)
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={row.packPrice}
                        onChange={(event) => ubah(index, { packPrice: angkaInput(event.target.value) })}
                        placeholder="28000"
                        className="mt-1 w-full bg-white p-2.5 font-mono brutal-border-2"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Isi satu pak (pcs / lembar)
                      <input
                        required
                        type="number"
                        min="0.0001"
                        step="any"
                        value={row.packQty}
                        onChange={(event) => ubah(index, { packQty: angkaInput(event.target.value) })}
                        placeholder="500"
                        className="mt-1 w-full bg-white p-2.5 font-mono brutal-border-2"
                      />
                    </label>
                  </div>

                  {row.usageOpen ? (
                    <label className="block max-w-xs text-xs font-bold">
                      Dipakai berapa untuk satu porsi?
                      <input
                        required
                        type="number"
                        min="0.0001"
                        step="any"
                        value={row.usageQty}
                        onChange={(event) => ubah(index, { usageQty: angkaInput(event.target.value) })}
                        className="mt-1 w-full bg-white p-2.5 font-mono brutal-border-2"
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => ubah(index, { usageOpen: true, usageQty: 1 })}
                      className="text-xs font-bold underline underline-offset-4"
                    >
                      Satu buah per porsi · sesuaikan kalau lebih
                    </button>
                  )}
                </div>
              ) : (
                <label className="block max-w-sm text-xs font-bold">
                  Biaya untuk satu porsi (Rp)
                  <input
                    required
                    type="number"
                    min="1"
                    step="any"
                    value={row.amount}
                    onChange={(event) => ubah(index, { amount: angkaInput(event.target.value) })}
                    placeholder="Contoh: 450"
                    className="mt-1 w-full bg-white p-2.5 font-mono brutal-border-2"
                  />
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 bg-ink p-3 font-mono text-xs text-white brutal-border-2">
                <span>Biaya ini untuk satu porsi</span>
                <strong className="text-base text-bright-green">
                  {hasil === null ? "Lengkapi harga dan isi" : formatRupiah(Math.round(hasil))}
                </strong>
              </div>
              {errors[index] ? (
                <p role="alert" className="bg-critical-red/10 p-2 text-sm font-bold text-critical-red brutal-border-2">
                  {errors[index]}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => tambah("grosir")}
          className="brutal-btn bg-warning-yellow px-4 py-2.5 font-heading text-sm font-extrabold"
        >
          + Tambah kemasan grosir
        </button>
        <button
          type="button"
          onClick={() => tambah("per_porsi")}
          className="brutal-btn bg-white px-4 py-2.5 font-heading text-sm font-bold"
        >
          + Tambah biaya per porsi
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t-2 border-ink pt-3 font-mono text-sm">
        <span>Total kemasan dan biaya kecil</span>
        <strong>{formatRupiah(Math.round(total))} / porsi</strong>
      </div>
    </section>
  );
}
