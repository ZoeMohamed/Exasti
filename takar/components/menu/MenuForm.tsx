"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/formatRupiah";

export interface IngredientRow {
  commodityId: string;
  name: string;
  price: number;
  batchQty: number;
  unit: string;
  note?: string;
}

interface CommodityOption {
  id: string;
  name: string;
  unit: string;
  /** null bila bahan ini belum punya harga sama sekali — jangan diisi tebakan. */
  current_price: string | null;
  sumber_harga?: string;
}

interface MenuFormProps {
  edit?: boolean;
  menuId?: string;
  initialName?: string;
  initialPrice?: number;
  initialYield?: number;
  initialVolume?: number;
  initialRows?: IngredientRow[];
}

export function MenuForm({
  edit = false,
  menuId,
  initialName = "",
  initialPrice = 18000,
  initialYield = 8,
  initialVolume = 100,
  initialRows,
}: MenuFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [sellPrice, setSellPrice] = useState(initialPrice);
  const [batchYield, setBatchYield] = useState(initialYield);
  const [weeklyVolume, setWeeklyVolume] = useState(initialVolume);

  const [availableCommodities, setAvailableCommodities] = useState<CommodityOption[]>([]);
  const [rows, setRows] = useState<IngredientRow[]>(
    initialRows || [
      {
        commodityId: "Daging Ayam Ras Segar",
        name: "Daging Ayam Ras Segar",
        price: 40500,
        batchQty: 2,
        unit: "kg",
      },
      {
        commodityId: "Cabai Rawit Hijau",
        name: "Cabai Rawit Hijau",
        price: 63750,
        batchQty: 0.12,
        unit: "kg",
      },
    ]
  );

  const [smallCosts, setSmallCosts] = useState({
    kemasan: true,
    gas: true,
    bumbu: true,
    plastik: false,
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ambil daftar bahan langsung dari database Supabase
  useEffect(() => {
    fetch("/api/commodities")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.commodities) {
          setAvailableCommodities(data.commodities);
        }
      })
      .catch(console.error);
  }, []);

  function handleCommodityChange(index: number, commodityId: string) {
    const found = availableCommodities.find((c) => c.id === commodityId);
    if (!found) return;

    setRows((current) =>
      current.map((r, i) =>
        i === index
          ? {
              ...r,
              commodityId: found.id,
              name: found.name,
              // Tanpa harga, biarkan 0 dan katakan apa adanya di layar.
              // Menyuntik angka karangan membuat modal terlihat pasti padahal bukan.
              price: found.current_price === null ? 0 : Number(found.current_price),
              unit: found.unit,
            }
          : r
      )
    );
  }

  function updateRowQty(index: number, batchQty: number) {
    setRows((current) =>
      current.map((r, i) => (i === index ? { ...r, batchQty } : r))
    );
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function addIngredient() {
    const defaultItem = availableCommodities[0];
    if (!defaultItem) return; // daftar bahan belum termuat

    setRows((current) => [
      ...current,
      {
        commodityId: defaultItem.id,
        name: defaultItem.name,
        price: defaultItem.current_price === null ? 0 : Number(defaultItem.current_price),
        batchQty: 1,
        unit: defaultItem.unit,
      },
    ]);
  }

  // Hitung perkiraan modal per porsi
  const ingredientsCostPerPortion = rows.reduce((acc, r) => {
    const portionQty = r.batchQty / (batchYield || 1);
    return acc + portionQty * r.price;
  }, 0);

  const fixedCostTotal =
    (smallCosts.kemasan ? 350 : 0) +
    (smallCosts.gas ? 450 : 0) +
    (smallCosts.bumbu ? 300 : 0) +
    (smallCosts.plastik ? 250 : 0);

  const totalModalPerPortion = Math.round(ingredientsCostPerPortion + fixedCostTotal);
  const estimatedProfit = sellPrice - totalModalPerPortion;
  const estimatedMargin = sellPrice > 0 ? ((estimatedProfit / sellPrice) * 100).toFixed(1) : "0";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama menu tidak boleh kosong!");
      return;
    }

    try {
      setLoading(true);

      const fixedCostsList: Array<{ label: string; amount: number }> = [];
      if (smallCosts.kemasan) fixedCostsList.push({ label: "Kemasan / Kertas Bungkus", amount: 350 });
      if (smallCosts.gas) fixedCostsList.push({ label: "Gas Elpiji Kompor", amount: 450 });
      if (smallCosts.bumbu) fixedCostsList.push({ label: "Bumbu Dapur", amount: 300 });
      if (smallCosts.plastik) fixedCostsList.push({ label: "Plastik & Sendok", amount: 250 });

      const payload = {
        name,
        sellPrice: Number(sellPrice),
        batchYield: Number(batchYield),
        weeklyVolume: Number(weeklyVolume),
        recipe: rows.map((r) => ({
          commodityId: r.commodityId,
          batchQty: Number(r.batchQty),
          note: r.note,
        })),
        fixedCosts: fixedCostsList,
      };

      const url = edit && menuId ? `/api/menus/${menuId}` : "/api/menus";
      const method = edit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          router.push("/dashboard/menu");
          router.refresh();
        }, 1200);
      } else {
        alert(data.error || "Gagal menyimpan menu");
      }
    } catch (err) {
      console.error(err);
      alert("Menu belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="mb-2 inline-block bg-accent-green px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-white">
          Perhitungan Otomatis
        </span>
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
          {edit ? "Edit Catatan Resep Menu" : "“Sekali masak, kamu belanja berapa banyak?”"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-ink/80 sm:text-lg">
          Isi jumlah bahan untuk sekali masak. Takar akan menghitung modal setiap porsi memakai harga bahan terbaru yang tersedia.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="relative space-y-6 bg-cream-surface p-6 sm:p-8 brutal-card">
        <span className="absolute -top-3 left-6 bg-ink px-3 py-1 font-mono text-xs font-bold text-cream">
          CATATAN MASAK WARUNG
        </span>

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <label className="font-heading text-sm font-bold">
            Nama Menu Makanan / Minuman
            <input
              required
              placeholder="Contoh: Soto Ayam Semarang"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
            />
          </label>

          <label className="font-heading text-sm font-bold">
            Rencana Harga Jual ke Pembeli (Rp)
            <input
              required
              type="number"
              min="1000"
              step="500"
              value={sellPrice}
              onChange={(e) => setSellPrice(Number(e.target.value))}
              className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="font-heading text-sm font-bold">
            Hasil Sekali Masak (Berapa Porsi?)
            <input
              required
              type="number"
              min="1"
              value={batchYield}
              onChange={(e) => setBatchYield(Number(e.target.value))}
              className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
            />
            <span className="font-mono text-xs text-ink/60 mt-1 block">
              Contoh: 2 kg ayam dipotong jadi 8 porsi piring
            </span>
          </label>

          <label className="font-heading text-sm font-bold">
            Perkiraan Laku Mingguan (Porsi / Minggu)
            <input
              type="number"
              min="0"
              value={weeklyVolume}
              onChange={(e) => setWeeklyVolume(Number(e.target.value))}
              className="mt-1 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
            />
            <span className="font-mono text-xs text-ink/60 mt-1 block">
              Membantu Takar mendahulukan menu yang paling sering terjual
            </span>
          </label>
        </div>

        {/* Dynamic Ingredients Section */}
        <div className="space-y-4 bg-cream p-5 brutal-border-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-extrabold">
              Bahan Pokok Sekali Masak:
            </h2>
            <span className="font-mono text-xs text-ink/70">
              Harga bahan terbaru sudah disiapkan Takar
            </span>
          </div>

          {rows.map((row, index) => {
            const portionQty = row.batchQty / (batchYield || 1);
            const cost = Math.round(portionQty * row.price);

            return (
              <div key={index} className="space-y-3 bg-white p-4 brutal-border-2">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="font-heading font-bold text-sm">Bahan {index + 1}:</span>
                    <select
                      value={row.commodityId}
                      onChange={(e) => handleCommodityChange(index, e.target.value)}
                      className="w-full min-w-0 flex-1 bg-cream p-2 font-heading text-xs font-bold brutal-border-2 sm:max-w-sm"
                    >
                      {availableCommodities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.unit})
                          {c.current_price === null ? " — belum ada harga" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-fit bg-bright-green/30 px-2 py-1 font-mono text-xs border border-ink">
                      Harga Pasar: {formatRupiah(row.price)}/{row.unit}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-critical-red hover:underline font-heading text-xs font-bold"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold">
                    “Sekali masak kamu beli berapa {row.unit}?”
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.batchQty}
                      onChange={(e) => updateRowQty(index, Number(e.target.value))}
                      className="mt-1 w-full bg-white p-2 text-center font-mono text-lg brutal-border-2"
                    />
                  </label>

                  <div className="flex flex-col justify-center bg-cream p-3 font-mono text-xs brutal-border-2">
                    <div className="text-ink/70">Perkiraan Takaran Per Porsi:</div>
                    <strong className="text-sm">
                      {portionQty.toFixed(3)} {row.unit} / porsi
                    </strong>
                    <div className="text-critical-red font-bold mt-1">
                      Modal: {formatRupiah(cost)} / porsi
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addIngredient}
            className="brutal-btn bg-white px-4 py-2 text-xs font-heading font-bold"
          >
            Tambah Bahan Lain
          </button>
        </div>

        {/* Small costs */}
        <section className="space-y-3 bg-white p-5 brutal-border-2">
          <h2 className="font-heading text-lg font-extrabold">
            Biaya Kecil & Kemasan Per Porsi:
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["kemasan", "Kemasan / Kertas Bungkus (Rp 350)"],
              ["gas", "Gas Elpiji Kompor (Rp 450)"],
              ["bumbu", "Bumbu Dapur & Garam (Rp 300)"],
              ["plastik", "Plastik & Sendok Bebek (Rp 250)"],
            ].map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center justify-between gap-2 p-2.5 brutal-border-2 ${
                  smallCosts[key as keyof typeof smallCosts] ? "bg-cream" : "bg-white"
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={smallCosts[key as keyof typeof smallCosts]}
                    onChange={() =>
                      setSmallCosts((c) => ({
                        ...c,
                        [key]: !c[key as keyof typeof smallCosts],
                      }))
                    }
                  />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Dynamic Summary Live Box */}
        <div className="bg-ink p-4 text-cream brutal-card space-y-2 font-mono text-xs sm:text-sm">
          <div className="flex justify-between border-b border-white/20 pb-2">
            <span>PERKIRAAN MODAL PER PORSI:</span>
            <strong className="text-critical-red text-base">{formatRupiah(totalModalPerPortion)}</strong>
          </div>
          <div className="flex justify-between border-b border-white/20 pb-2">
            <span>HARGA JUALMU:</span>
            <strong>{formatRupiah(sellPrice)}</strong>
          </div>
          <div className="flex justify-between pt-1">
            <span>SISA SETELAH MODAL PER PORSI:</span>
            <strong className={estimatedProfit > 0 ? "text-bright-green text-base" : "text-critical-red text-base"}>
              {formatRupiah(estimatedProfit)} ({estimatedMargin}%)
            </strong>
          </div>
        </div>

        {saved && (
          <div className="bg-bright-green p-3 font-mono text-sm font-bold text-ink brutal-border-2 text-center">
            Menu dan resep berhasil disimpan. Membuka daftar menu...
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="submit"
            disabled={loading || saved}
            className="brutal-btn flex-1 bg-critical-red px-6 py-3.5 font-heading font-extrabold text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : saved ? "Sudah Tersimpan" : edit ? "Simpan Perubahan" : "Simpan Menu Baru"}
          </button>
          <Link
            href="/dashboard/menu"
            className="brutal-btn bg-white px-6 py-3.5 text-center font-heading font-bold"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
