"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRupiah } from "@/lib/formatRupiah";

type IngredientRow = {
  name: string;
  icon: string;
  price: number;
  amount: string;
  portions: string;
  question: string;
  unit: string;
};
type CostKey = "kemasan" | "gas" | "bumbu" | "plastik";

const templates: IngredientRow[][] = [
  [
    {
      name: "Daging Ayam Karkas",
      icon: "🍗",
      price: 43200,
      amount: "2",
      portions: "8",
      question: "Sekali masak, kamu beli berapa?",
      unit: "Kilogram (kg)",
    },
    {
      name: "Cabai Rawit Merah",
      icon: "🌶️",
      price: 87000,
      amount: "0.3",
      portions: "20",
      question: "Sekali racik sambal, beli berapa?",
      unit: "Kilogram (3 ons)",
    },
  ],
  [
    {
      name: "Telur Ayam",
      icon: "🥚",
      price: 30000,
      amount: "1",
      portions: "10",
      question: "Sekali masak, kamu beli berapa?",
      unit: "Kilogram (kg)",
    },
    {
      name: "Minyak Goreng",
      icon: "🫗",
      price: 17500,
      amount: "0.5",
      portions: "10",
      question: "Sekali masak, kamu beli berapa?",
      unit: "Liter",
    },
  ],
];

export function MenuForm({ edit = false }: { edit?: boolean }) {
  const [template, setTemplate] = useState(0);
  const [rows, setRows] = useState(templates[0]);
  const [smallCosts, setSmallCosts] = useState({
    kemasan: true,
    gas: true,
    bumbu: true,
    plastik: false,
  });
  const [saved, setSaved] = useState(false);

  function chooseTemplate(index: number) {
    setTemplate(index);
    setRows(templates[index]);
  }
  function updateRow(
    index: number,
    field: "amount" | "portions",
    value: string,
  ) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }
  function addIngredient() {
    setRows((current) => [
      ...current,
      {
        name: "Bahan Baku Lainnya",
        icon: "🥬",
        price: 10000,
        amount: "1",
        portions: "8",
        question: "Sekali masak, kamu beli berapa?",
        unit: "Kilogram (kg)",
      },
    ]);
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="mb-2 inline-block bg-accent-green px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-white">
          Cara Isi Gaya Buku Kas Warung
        </span>
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
          {edit
            ? "Edit catatan menu kamu"
            : "“Kamu biasanya masak berapa banyak?”"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-ink/80 sm:text-lg">
          Takar tidak menyuruhmu menghitung gram cabai per piring. Isi berapa
          kilo belanjaan sekali masak, biar kami yang hitung per porsinya.
        </p>
        {!edit && (
          <div className="mt-6 border-t-2 border-ink pt-6">
            <span className="mb-3 block font-mono text-xs font-bold uppercase text-ink/70">
              Pilih Template Cepat (otomatis terisi bahan standar):
            </span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["🍗", "AYAM GEPREK", "8 porsi/batch"],
                ["🍳", "NASI GORENG", "10 porsi/batch"],
                ["🍜", "MIE AYAM", "15 mangkok"],
                ["🐟", "PECEL LELE", "10 ekor"],
                ["🍱", "WARTEG / SAYUR", "Wajan besar"],
              ].map(([icon, name, note], index) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => chooseTemplate(index === 0 ? 0 : 1)}
                  className={`brutal-btn p-3 text-left ${template === (index === 0 ? 0 : 1) ? "bg-warning-yellow" : "bg-white"}`}
                >
                  <span className="block text-xl">{icon}</span>
                  <span className="block font-heading text-xs font-extrabold">
                    {name}
                  </span>
                  <span className="font-mono text-[10px] text-ink/70">
                    {note}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
        className="relative space-y-6 bg-cream-surface p-6 sm:p-8 brutal-card"
      >
        <span className="absolute -top-3 left-6 bg-ink px-3 py-1 font-mono text-xs font-bold text-cream">
          CATATAN MASAK WARUNG
        </span>
        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <Field label="Nama Menu" defaultValue="Ayam Geprek Sambal Bawang" />
          <Field
            label="Rencana Harga Jual ke Pembeli"
            defaultValue="18000"
            type="number"
          />
        </div>
        <div className="space-y-4 bg-cream p-5 brutal-border-2">
          <h2 className="font-heading text-lg font-extrabold">
            Pertanyaan Sekali Masak:
          </h2>
          {rows.map((row, index) => (
            <IngredientInput
              key={`${row.name}-${index}`}
              row={row}
              index={index}
              onChange={updateRow}
            />
          ))}
          <button
            type="button"
            onClick={addIngredient}
            className="brutal-btn bg-white px-3 py-2 text-xs font-heading font-bold"
          >
            + Tambah Bahan Baku Lainnya
          </button>
        </div>
        <SmallCosts
          values={smallCosts}
          onChange={(key) =>
            setSmallCosts((current) => ({ ...current, [key]: !current[key] }))
          }
        />
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <button
            type="submit"
            className="brutal-btn flex-1 bg-critical-red px-6 py-3.5 font-heading font-extrabold text-white"
          >
            {saved
              ? "Menu Berhasil Disimpan ✓"
              : edit
                ? "Simpan Perubahan ➔"
                : "Simpan & Lihat Hitungan Untung ➔"}
          </button>
          <Link
            href="/dashboard"
            className="brutal-btn bg-white px-6 py-3.5 text-center font-heading font-bold"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="font-heading text-sm font-bold">
      {label}
      <input
        required
        defaultValue={defaultValue}
        type={type}
        className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
      />
    </label>
  );
}
function IngredientInput({
  row,
  index,
  onChange,
}: {
  row: IngredientRow;
  index: number;
  onChange: (
    index: number,
    field: "amount" | "portions",
    value: string,
  ) => void;
}) {
  const amount = Number(row.amount) || 0;
  const portions = Number(row.portions) || 1;
  const cost = Math.round((amount * row.price) / portions);
  return (
    <div className="space-y-3 bg-white p-4 brutal-border-2">
      <div className="flex flex-col justify-between gap-2 sm:flex-row">
        <strong className="font-heading text-base">
          Bahan {index + 1}: {row.name}
        </strong>
        <span className="w-fit bg-bright-green/30 px-2 py-0.5 font-mono text-xs border border-ink">
          Harga Pasar: {formatRupiah(row.price)}/kg
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold">
          “{row.question}”
          <input
            aria-label={`${row.name} jumlah`}
            value={row.amount}
            onChange={(event) => onChange(index, "amount", event.target.value)}
            type="number"
            min="0"
            step="0.1"
            className="mt-1 w-full bg-white p-2 text-center font-mono text-lg brutal-border-2"
          />
          <span className="font-mono text-xs">{row.unit}</span>
        </label>
        <label className="text-xs font-bold">
          “Biasanya jadi berapa porsi?”
          <input
            aria-label={`${row.name} porsi`}
            value={row.portions}
            onChange={(event) =>
              onChange(index, "portions", event.target.value)
            }
            type="number"
            min="1"
            className="mt-1 w-full bg-white p-2 text-center font-mono text-lg brutal-border-2"
          />
          <span className="font-mono text-xs">Porsi</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-warning-yellow/40 p-2 font-mono text-xs font-bold brutal-border-2">
        <span>🔄 Konversi Otomatis:</span>
        <span>
          {amount} kg ➔ {portions} porsi = ≈{" "}
          {Math.round((amount * 1000) / portions)} gram / porsi
        </span>
        <span className="text-critical-red">
          Modal: {formatRupiah(cost)} / porsi
        </span>
      </div>
    </div>
  );
}
function SmallCosts({
  values,
  onChange,
}: {
  values: Record<CostKey, boolean>;
  onChange: (key: CostKey) => void;
}) {
  const costs: readonly [CostKey, string, number][] = [
    ["kemasan", "Kemasan / Kertas Bungkus", 350],
    ["gas", "Gas Elpiji (Kompor)", 450],
    ["bumbu", "Bumbu Dapur (Garam, Micin)", 300],
    ["plastik", "Plastik & Sendok Bebek", 250],
  ];
  return (
    <section className="space-y-3 bg-white p-5 brutal-border-2">
      <h2 className="font-heading text-lg font-extrabold">
        “Ada biaya kecil yang ikut setiap porsi?”
      </h2>
      <p className="text-xs text-ink/70">
        Centang perlengkapan kecil yang ikut terpakai saat menyajikan menu ini.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {costs.map(([key, label, cost]) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center justify-between gap-2 p-2.5 brutal-border-2 ${values[key] ? "bg-cream" : "bg-white"}`}
          >
            <span className="flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={values[key]}
                onChange={() => onChange(key)}
              />
              {label}
            </span>
            <span className="font-mono text-xs text-ink/70">
              Perkiraan {formatRupiah(cost)}
            </span>
          </label>
        ))}
      </div>
      <p className="font-mono text-[11px] text-ink/70">
        * Nilai perkiraan bisa diubah kapan saja di Pengaturan.
      </p>
    </section>
  );
}
