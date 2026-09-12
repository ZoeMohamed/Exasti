"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { simulatePrice } from "@/lib/calculations/simulator";
import { formatRupiah } from "@/lib/formatRupiah";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const initialPrice = Number(searchParams.get("price")) || 18000;

  const [ayam, setAyam] = useState(20);
  const [cabai, setCabai] = useState(30);
  const [jual, setJual] = useState(initialPrice);

  const baseAyam = 40500;
  const baseCabai = 48000;
  const baselineProfit = 18000 - (0.25 * baseAyam + 0.015 * baseCabai + 4308); // Real baseline

  useEffect(() => {
    const qPrice = Number(searchParams.get("price"));
    if (qPrice && !isNaN(qPrice)) {
      setJual(qPrice);
    }
  }, [searchParams]);

  const result = simulatePrice({
    ayamPercent: ayam,
    cabaiPercent: cabai,
    sellingPrice: jual,
    baseAyamPrice: baseAyam,
    baseCabaiPrice: baseCabai,
  });

  const healthy = result.status === "sehat";
  const loss = result.status === "rugi";
  const profitDiff = Math.round(result.profit - baselineProfit);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
        >
          ⬅ Kembali ke Beranda
        </Link>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold brutal-border-2">
          Simulator Dinamis · Mengacu Data BI Kota Semarang
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
          Geser tuas untuk melihat dampak kenaikan harga pasar terhadap margin Ayam Geprek Sambal Korek (resep batch: 2 kg ayam & 0,12 kg cabai jadi 8 porsi).
        </p>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 bg-white p-6 sm:p-8 brutal-card lg:col-span-7">
          <Slider
            label="1. SIMULASI HARGA AYAM POTONG"
            subtext={`Dasar BI: ${formatRupiah(baseAyam)}/kg ➔ Simulasi: ${formatRupiah(result.simAyamPrice)}/kg`}
            value={ayam}
            min={-20}
            max={50}
            onChange={setAyam}
          />
          <Slider
            label="2. SIMULASI HARGA CABAI RAWIT"
            subtext={`Dasar BI: ${formatRupiah(baseCabai)}/kg ➔ Simulasi: ${formatRupiah(result.simCabaiPrice)}/kg`}
            value={cabai}
            min={-30}
            max={100}
            onChange={setCabai}
          />
          <Slider
            label="3. UBAH HARGA JUAL SENDIRI"
            subtext="Tentukan target harga jual per porsi di warungmu"
            value={jual}
            min={14000}
            max={25000}
            step={500}
            onChange={setJual}
            money
          />

          <div className="bg-cream p-4 font-mono text-xs border border-ink space-y-1">
            <div className="font-bold text-ink uppercase">Rincian Komposisi Resep Per Porsi:</div>
            <div>🍗 Ayam: 0.25 kg × {formatRupiah(result.simAyamPrice)} = <b>{formatRupiah(result.ayamCost)}</b></div>
            <div>🌶️ Cabai: 0.015 kg × {formatRupiah(result.simCabaiPrice)} = <b>{formatRupiah(result.cabaiCost)}</b></div>
            <div>📦 Beras, Minyak, Bumbu & Kemasan: <b>Rp 4.308</b></div>
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
              STATUS: {result.status.toUpperCase()}
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
              {formatRupiah(result.profit)}
            </div>
            <span className="font-mono text-xs text-cream/70">
              per porsi ({result.margin.toFixed(1)}% margin)
            </span>
          </div>

          <div className="space-y-3 bg-white/10 p-4 font-mono text-xs brutal-border-2">
            <Row label="Harga Jualmu" value={formatRupiah(jual)} />
            <Row label="Total Modal Baru" value={formatRupiah(result.modal)} />
            <Row
              label="Selisih vs Kondisi Sekarang"
              value={`${profitDiff >= 0 ? "+" : ""}${formatRupiah(profitDiff)} / porsi`}
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
              ? "🚨 RUGI: Harga jual tidak menutup modal. Segera naikkan harga atau kurangi gramatur potong ayam."
              : healthy
                ? `✅ AMAN & SEHAT (${result.margin.toFixed(1)}%): Margin di atas 15%, bisnis stabil dari gejolak pasar.`
                : `⚠️ UNTUNG TIPIS (${result.margin.toFixed(1)}%): Sangat rentan jika harga ayam naik lagi. Disarankan jual di ${formatRupiah(Math.ceil((result.modal / 0.85) / 500) * 500)}.`}
          </div>

          <Link
            href={`/dashboard/menu/ayam-geprek`}
            className="brutal-btn block w-full bg-white text-center py-2.5 text-xs font-heading font-extrabold text-ink"
          >
            Lihat Rincian Detail Ayam Geprek ➔
          </Link>
        </div>
      </div>
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
