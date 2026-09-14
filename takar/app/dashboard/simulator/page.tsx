"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatRupiah } from "@/lib/formatRupiah";
import { simulatePrice } from "@/lib/calculations/simulator";

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  modal: number;
  profit: number;
  status: "sehat" | "tipis" | "rugi" | "diistirahatkan";
}

interface IngredientResponse {
  name: string;
  unitPrice: number;
  cost: number;
  unit?: "kg" | "liter" | "pcs";
  source: "DATA PASAR" | "HARGA KAMU" | "PERKIRAAN";
}

function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialPrice = Number(searchParams.get("price")) || 18000;

  const [menus, setMenus] = useState<MenuItemOption[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ing1, setIng1] = useState({ name: "Bahan pertama", basePrice: 0, portionQty: 0, unit: "kg" });
  const [ing2, setIng2] = useState({ name: "Bahan kedua", basePrice: 0, portionQty: 0, unit: "kg" });
  const [otherCost, setOtherCost] = useState(0);

  const [slider1Pct, setSlider1Pct] = useState(20);
  const [slider2Pct, setSlider2Pct] = useState(30);
  const [jual, setJual] = useState(initialPrice);

  // 1. Ambil daftar menu dari database
  useEffect(() => {
    fetch("/api/menus")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Daftar menu belum dapat dimuat.");
        return data;
      })
      .then((data) => {
        if (data.status === "ok" && data.menus) {
          setMenus(data.menus);
          if (data.menus.length > 0) {
            setSelectedMenuId(data.menus[0].id);
          } else {
            setLoadingMenu(false);
          }
        }
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Daftar menu belum dapat dimuat. Coba segarkan halaman.");
        setLoadingMenu(false);
      });
  }, []);

  // 2. Ambil komposisi resep menu yang dipilih dari database
  useEffect(() => {
    if (!selectedMenuId) return;
    fetch(`/api/menus/${selectedMenuId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.ingredients) {
          const ingredients = data.ingredients as IngredientResponse[];
          const mainIngs = ingredients.filter(
            (ingredient) => ingredient.source === "DATA PASAR" || ingredient.source === "HARGA KAMU",
          );
          if (mainIngs.length > 0) {
            const first = mainIngs[0];
            setIng1({
              name: first.name,
              basePrice: first.unitPrice,
              portionQty: first.unitPrice > 0 ? first.cost / first.unitPrice : 0,
              unit: first.unit || "kg",
            });
          }
          if (mainIngs.length > 1) {
            const second = mainIngs[1];
            setIng2({
              name: second.name,
              basePrice: second.unitPrice,
              portionQty: second.unitPrice > 0 ? second.cost / second.unitPrice : 0,
              unit: second.unit || "kg",
            });
          } else {
            setIng2({ name: "Bahan kedua belum ada", basePrice: 0, portionQty: 0, unit: "kg" });
          }

          const simulatedIngredientCost = mainIngs
            .slice(0, 2)
            .reduce((total, ingredient) => total + Number(ingredient.cost || 0), 0);
          setOtherCost(Math.max(0, Number(data.menu?.modal || 0) - simulatedIngredientCost));

          if (data.menu?.sellPrice) {
            setJual(data.menu.sellPrice);
          }
          setErrorMessage(null);
        } else {
          setErrorMessage(data.error || "Rincian menu belum dapat dimuat.");
        }
      })
      .catch(() => setErrorMessage("Rincian menu belum dapat dimuat. Coba lagi."))
      .finally(() => setLoadingMenu(false));
  }, [selectedMenuId]);

  // Kalkulasi Simulasi
  const simulation = simulatePrice({
    ayamPercent: slider1Pct,
    cabaiPercent: slider2Pct,
    sellingPrice: jual,
    baseAyamPrice: ing1.basePrice,
    baseCabaiPrice: ing2.basePrice,
    portionAyamQty: ing1.portionQty,
    portionCabaiQty: ing2.portionQty,
    otherIngredientsCost: otherCost,
  });
  const {
    simAyamPrice: simPrice1,
    simCabaiPrice: simPrice2,
    ayamCost: cost1,
    cabaiCost: cost2,
    modal: totalModal,
    profit,
    margin: profitRate,
    status,
  } = simulation;
  const healthy = status === "sehat";
  const loss = status === "rugi";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dashboard"
          className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
        >
          Kembali ke Beranda
        </Link>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold brutal-border-2">
          Perubahan di sini belum mengubah harga jual
        </span>
      </div>

      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="bg-critical-red px-2.5 py-0.5 font-mono text-xs font-bold text-white">
          COBA SEBELUM GANTI HARGA
        </span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          “Kalau harga bahan naik, untungmu jadi berapa?”
        </h1>
        <p className="mt-2 max-w-3xl text-ink/80 text-sm sm:text-base">
          Pilih menu, lalu geser harga bahan untuk melihat sisa untung setiap porsinya.
        </p>

        {/* Menu Selector */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-ink/20 pt-4">
          <span className="font-heading font-bold text-sm">PILIH MENU:</span>
          <select
            value={selectedMenuId}
            onChange={(event) => {
              setLoadingMenu(true);
              setSelectedMenuId(event.target.value);
            }}
            className="bg-cream font-heading font-extrabold text-sm p-2.5 brutal-border-2 max-w-md"
            disabled={menus.length === 0}
            aria-label="Pilih menu untuk dicoba"
          >
            {menus.length === 0 ? <option value="">Belum ada menu</option> : null}
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({formatRupiah(m.price)})
              </option>
            ))}
          </select>
        </div>
      </section>

      {errorMessage ? (
        <div role="alert" className="bg-critical-red p-5 font-heading font-bold text-white brutal-card">
          {errorMessage}
        </div>
      ) : loadingMenu ? (
        <div className="p-12 font-mono text-center bg-white brutal-card">
          Menyiapkan resep menu...
        </div>
      ) : menus.length === 0 ? (
        <section className="bg-white p-6 text-center brutal-card sm:p-8">
          <h2 className="font-heading text-2xl font-extrabold">Belum ada menu untuk dicoba</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink/70">
            Tambahkan resep dan harga jual menu pertama. Setelah tersimpan, menu itu otomatis tersedia di sini.
          </p>
          <Link
            href="/dashboard/menu/tambah"
            className="brutal-btn mt-5 inline-block bg-warning-yellow px-5 py-3 font-heading text-sm font-extrabold"
          >
            Tambah Menu Pertama
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-8 bg-white p-6 sm:p-8 brutal-card lg:col-span-7">
            <Slider
              label={`1. COBA HARGA ${ing1.name.toUpperCase()}`}
              subtext={`Harga sekarang ${formatRupiah(ing1.basePrice)}/${ing1.unit}, dicoba menjadi ${formatRupiah(simPrice1)}/${ing1.unit}`}
              value={slider1Pct}
              min={-20}
              max={50}
              onChange={setSlider1Pct}
            />

            <Slider
              label={`2. COBA HARGA ${ing2.name.toUpperCase()}`}
              subtext={`Harga sekarang ${formatRupiah(ing2.basePrice)}/${ing2.unit}, dicoba menjadi ${formatRupiah(simPrice2)}/${ing2.unit}`}
              value={slider2Pct}
              min={-30}
              max={100}
              onChange={setSlider2Pct}
            />

            <Slider
              label="3. UBAH RENCANA HARGA JUAL"
              subtext="Tentukan target harga jual per porsi di warungmu"
              value={jual}
              min={Math.max(1000, Math.round(totalModal * 0.7))}
              max={Math.round(totalModal * 2.5)}
              step={500}
              onChange={setJual}
              money
            />

            <div className="bg-cream p-4 font-mono text-xs border border-ink space-y-1.5">
              <div className="font-bold text-ink uppercase">Takaran untuk satu porsi:</div>
              <div>{ing1.name}: {ing1.portionQty.toFixed(3)} {ing1.unit} × {formatRupiah(simPrice1)} = <b>{formatRupiah(cost1)}</b></div>
              <div>{ing2.name}: {ing2.portionQty.toFixed(3)} {ing2.unit} × {formatRupiah(simPrice2)} = <b>{formatRupiah(cost2)}</b></div>
              <div>Bahan pelengkap dan kemasan: <b>{formatRupiah(otherCost)}</b></div>
            </div>
          </div>

          <div className="space-y-6 bg-ink p-6 text-cream brutal-card lg:col-span-5">
            <div className="flex justify-between border-b border-white/20 pb-3 font-mono text-xs">
              <span>HASIL PERCOBAAN:</span>
              <b
                className={`px-2 py-0.5 ${
                  healthy
                    ? "bg-bright-green text-ink"
                    : loss
                      ? "bg-critical-red text-white"
                      : "bg-warning-yellow text-ink"
                }`}
              >
                STATUS: {status.toUpperCase()}
              </b>
            </div>

            <div>
              <span className="font-mono text-xs text-cream/70">
                SISA SETELAH MODAL PER PORSI:
              </span>
              <div
                className={`font-mono text-5xl font-black ${
                  healthy
                    ? "text-bright-green"
                    : loss
                      ? "text-critical-red"
                      : "text-warning-yellow"
                }`}
              >
                {formatRupiah(profit)}
              </div>
              <span className="font-mono text-xs text-cream/70">
                {profitRate.toFixed(1)} dari tiap seratus rupiah penjualan
              </span>
            </div>

            <div className="space-y-3 bg-white/10 p-4 font-mono text-xs brutal-border-2">
              <Row label="Harga Jualmu" value={formatRupiah(jual)} />
              <Row label="Total Modal Baru" value={formatRupiah(totalModal)} />
              <Row
                label="Sisa Setelah Modal"
                value={`${profit >= 0 ? "+" : ""}${formatRupiah(profit)} / porsi`}
              />
            </div>

            <p className="font-mono text-[11px] leading-relaxed text-cream/70">
              Belum dikurangi sewa tempat, listrik bulanan, dan gaji pemilik.
            </p>

            <div
              className={`p-3 text-xs leading-relaxed border-2 ${
                loss
                  ? "bg-critical-red/30 border-critical-red text-cream"
                  : healthy
                    ? "bg-bright-green/20 border-bright-green text-bright-green"
                    : "bg-warning-yellow/20 border-warning-yellow text-warning-yellow"
              }`}
            >
              {loss
                ? "RUGI: Harga jual belum menutup modal satu porsi. Naikkan harga jual atau kurangi takaran bahan."
                : healthy
                  ? `AMAN. Untungnya ${profitRate.toFixed(1)} dari tiap seratus rupiah penjualan — masih kuat menahan harga naik.`
                  : `UNTUNG TIPIS (${profitRate.toFixed(1)}%): Untung mudah habis jika harga bahan naik lagi. Coba jual di ${formatRupiah(Math.ceil((totalModal / 0.85) / 500) * 500)}.`}
            </div>

            <Link
              href={`/dashboard/menu/${selectedMenuId}`}
              className="brutal-btn block w-full bg-white text-center py-2.5 text-xs font-heading font-extrabold text-ink"
            >
              Lihat Rincian Menu Ini
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono">Memuat simulator...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}

function Slider({
  label,
  subtext,
  value,
  min,
  max,
  step = 5,
  onChange,
  money,
}: {
  label: string;
  subtext?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  money?: boolean;
}) {
  return (
    <div className="space-y-2 bg-cream p-4 brutal-border-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="font-heading text-base sm:text-lg block">{label}</strong>
          {subtext && <span className="font-mono text-[11px] text-ink/70">{subtext}</span>}
        </div>
        <span className="bg-warning-yellow px-2 py-0.5 font-mono text-xs font-bold border border-ink">
          {money ? formatRupiah(value) : `${value >= 0 ? "+" : ""}${value}%`}
        </span>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-cream/80">{label}:</span>
      <b>{value}</b>
    </div>
  );
}
