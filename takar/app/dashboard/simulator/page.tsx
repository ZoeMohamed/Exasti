"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatRupiah } from "@/lib/formatRupiah";

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  modal: number;
  profit: number;
  margin: number;
  status: "sehat" | "tipis" | "rugi";
}

function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialPrice = Number(searchParams.get("price")) || 18000;

  const [menus, setMenus] = useState<MenuItemOption[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState("ayam-geprek");
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Ingredient 1 & 2 definitions for the selected menu
  const [ing1, setIng1] = useState({ name: "Daging Ayam Ras Segar", basePrice: 40500, portionQty: 0.25, unit: "kg" });
  const [ing2, setIng2] = useState({ name: "Cabai Rawit Hijau", basePrice: 63750, portionQty: 0.015, unit: "kg" });
  const [otherCost, setOtherCost] = useState(4308);

  const [slider1Pct, setSlider1Pct] = useState(20);
  const [slider2Pct, setSlider2Pct] = useState(30);
  const [jual, setJual] = useState(initialPrice);

  // 1. Ambil daftar menu dari database
  useEffect(() => {
    fetch("/api/menus")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.menus) {
          setMenus(data.menus);
        }
      })
      .catch(console.error);
  }, []);

  // 2. Ambil komposisi resep menu yang dipilih dari database
  useEffect(() => {
    setLoadingMenu(true);
    fetch(`/api/menus/${selectedMenuId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.ingredients) {
          const mainIngs = data.ingredients.filter((i: any) => i.source === "DATA PASAR");
          if (mainIngs.length > 0) {
            const first = mainIngs[0];
            const q1 = parseFloat(first.quantity.split(" ")[0]) || 0.25;
            setIng1({
              name: first.name,
              basePrice: first.unitPrice || 40500,
              portionQty: q1,
              unit: "kg",
            });
          }
          if (mainIngs.length > 1) {
            const second = mainIngs[1];
            const q2 = parseFloat(second.quantity.split(" ")[0]) || 0.015;
            setIng2({
              name: second.name,
              basePrice: second.unitPrice || 63750,
              portionQty: q2,
              unit: "kg",
            });
          }

          const fixedTotal = data.ingredients
            .filter((i: any) => i.source === "PERKIRAAN")
            .reduce((acc: number, curr: any) => acc + curr.cost, 0);
          setOtherCost(fixedTotal || 1500);

          if (data.menu?.sellPrice) {
            setJual(data.menu.sellPrice);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMenu(false));
  }, [selectedMenuId]);

  // Kalkulasi Simulasi
  const simPrice1 = Math.round(ing1.basePrice * (1 + slider1Pct / 100));
  const simPrice2 = Math.round(ing2.basePrice * (1 + slider2Pct / 100));

  const cost1 = Math.round(ing1.portionQty * simPrice1);
  const cost2 = Math.round(ing2.portionQty * simPrice2);

  const totalModal = cost1 + cost2 + otherCost;
  const profit = jual - totalModal;
  const margin = jual > 0 ? (profit / jual) * 100 : 0;

  const healthy = margin >= 15;
  const loss = profit < 0;
  const status = loss ? "rugi" : healthy ? "sehat" : "tipis";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dashboard"
          className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
        >
          ⬅ Kembali ke Beranda
        </Link>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold brutal-border-2">
          Simulator Dinamis · Terhubung Penuh ke Database Supabase
        </span>
      </div>

      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="bg-critical-red px-2.5 py-0.5 font-mono text-xs font-bold text-white">
          EKSPERIMEN TANPA TAKUT RUGI
        </span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          “Kalau harga bahan naik, untungmu jadi berapa?”
        </h1>
        <p className="mt-2 max-w-3xl text-ink/80 text-sm sm:text-base">
          Pilih menu apa saja dari warungmu, lalu geser tuas harga bahan untuk menguji ketahanan margin keuntunganmu.
        </p>

        {/* Menu Selector */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-ink/20 pt-4">
          <span className="font-heading font-bold text-sm">PILIH MENU DARI DATABASE:</span>
          <select
            value={selectedMenuId}
            onChange={(e) => setSelectedMenuId(e.target.value)}
            className="bg-cream font-heading font-extrabold text-sm p-2.5 brutal-border-2 max-w-md"
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({formatRupiah(m.price)})
              </option>
            ))}
          </select>
        </div>
      </section>

      {loadingMenu ? (
        <div className="p-12 font-mono text-center bg-white brutal-card">
          Memuat resep menu dari database Supabase...
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-8 bg-white p-6 sm:p-8 brutal-card lg:col-span-7">
            <Slider
              label={`1. SIMULASI ${ing1.name.toUpperCase()}`}
              subtext={`Dasar BI: ${formatRupiah(ing1.basePrice)}/${ing1.unit} ➔ Simulasi: ${formatRupiah(simPrice1)}/${ing1.unit}`}
              value={slider1Pct}
              min={-20}
              max={50}
              onChange={setSlider1Pct}
            />

            <Slider
              label={`2. SIMULASI ${ing2.name.toUpperCase()}`}
              subtext={`Dasar BI: ${formatRupiah(ing2.basePrice)}/${ing2.unit} ➔ Simulasi: ${formatRupiah(simPrice2)}/${ing2.unit}`}
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
              <div className="font-bold text-ink uppercase">Komposisi Takaran Resep Per Porsi:</div>
              <div>• {ing1.name}: {ing1.portionQty.toFixed(3)} {ing1.unit} × {formatRupiah(simPrice1)} = <b>{formatRupiah(cost1)}</b></div>
              <div>• {ing2.name}: {ing2.portionQty.toFixed(3)} {ing2.unit} × {formatRupiah(simPrice2)} = <b>{formatRupiah(cost2)}</b></div>
              <div>• Biaya bahan pelengkap & kemasan: <b>{formatRupiah(otherCost)}</b></div>
            </div>
          </div>

          <div className="space-y-6 bg-ink p-6 text-cream brutal-card lg:col-span-5">
            <div className="flex justify-between border-b border-white/20 pb-3 font-mono text-xs">
              <span>HASIL DAMPAK NYATA:</span>
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
                PERKIRAAN UNTUNG BERSIH:
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
                per porsi ({margin.toFixed(1)}% margin)
              </span>
            </div>

            <div className="space-y-3 bg-white/10 p-4 font-mono text-xs brutal-border-2">
              <Row label="Harga Jualmu" value={formatRupiah(jual)} />
              <Row label="Total Modal Baru" value={formatRupiah(totalModal)} />
              <Row
                label="Untung Bersih"
                value={`${profit >= 0 ? "+" : ""}${formatRupiah(profit)} / porsi`}
              />
            </div>

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
                ? "🚨 RUGI: Harga jual tidak menutup modal porsi. Segera naikkan harga jual atau kurangi takaran bahan."
                : healthy
                  ? `AMAN. Untungnya ${margin.toFixed(1)} dari tiap seratus rupiah penjualan — masih kuat menahan harga naik.`
                  : `⚠️ UNTUNG TIPIS (${margin.toFixed(1)}%): Sangat rentan tergerus jika harga bahan naik lagi. Disarankan jual di ${formatRupiah(Math.ceil((totalModal / 0.85) / 500) * 500)}.`}
            </div>

            <Link
              href={`/dashboard/menu/${selectedMenuId}`}
              className="brutal-btn block w-full bg-white text-center py-2.5 text-xs font-heading font-extrabold text-ink"
            >
              Lihat Rincian Lengkap Menu Ini ➔
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
