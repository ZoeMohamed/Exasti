"use client";
import { useState } from "react";
import { simulatePrice } from "@/lib/calculations/simulator";
import { formatRupiah } from "@/lib/formatRupiah";
export default function SimulatorPage() {
  const [ayam, setAyam] = useState(20);
  const [cabai, setCabai] = useState(30);
  const [jual, setJual] = useState(18000);
  const result = simulatePrice({
    ayamPercent: ayam,
    cabaiPercent: cabai,
    sellingPrice: jual,
  });
  const healthy = result.status === "sehat";
  const loss = result.status === "rugi";
  return (
    <div className="space-y-8">
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="bg-critical-red px-2.5 py-0.5 font-mono text-xs font-bold text-white">
          EKSPERIMEN TANPA TAKUT RUGI
        </span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          “Kalau harga bahan naik, untungmu jadi berapa?”
        </h1>
        <p className="mt-2 max-w-3xl text-ink/80">
          Geser tuas untuk melihat secara langsung apa yang terjadi pada
          kantongmu.
        </p>
      </section>
      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 bg-white p-6 sm:p-8 brutal-card lg:col-span-7">
          <Slider
            label="1. HARGA AYAM POTONG"
            value={ayam}
            min={-20}
            max={50}
            onChange={setAyam}
          />
          <Slider
            label="2. HARGA CABAI RAWIT"
            value={cabai}
            min={-30}
            max={100}
            onChange={setCabai}
          />
          <Slider
            label="3. UBAH HARGA JUAL SENDIRI"
            value={jual}
            min={15000}
            max={24000}
            step={1000}
            onChange={setJual}
            money
          />
        </div>
        <div className="space-y-6 bg-ink p-6 text-cream brutal-card lg:col-span-5">
          <div className="flex justify-between border-b border-white/20 pb-3 font-mono text-xs">
            <span>HASIL DAMPAK NYATA:</span>
            <b
              className={
                healthy
                  ? "bg-bright-green text-ink"
                  : loss
                    ? "bg-critical-red"
                    : "bg-warning-yellow text-ink"
              }
            >
              {" "}
              STATUS: {result.status.toUpperCase()}{" "}
            </b>
          </div>
          <div>
            <span className="font-mono text-xs text-cream/70">
              PERKIRAAN UNTUNG BERSIH:
            </span>
            <div
              className={`font-mono text-5xl font-black ${healthy ? "text-bright-green" : loss ? "text-critical-red" : "text-warning-yellow"}`}
            >
              {formatRupiah(result.profit)}
            </div>
            <span className="font-mono text-xs text-cream/70">per porsi</span>
          </div>
          <div className="space-y-3 bg-white/10 p-4 font-mono text-xs brutal-border-2">
            <Row label="Harga Jualmu" value={formatRupiah(jual)} />
            <Row label="Modal Baru Total" value={formatRupiah(result.modal)} />
            <Row
              label="Dampak Per Porsi"
              value={`${result.profit - 1260 >= 0 ? "+" : ""}${formatRupiah(result.profit - 1260)}`}
            />
          </div>
          <div className="bg-critical-red/30 p-3 text-xs leading-relaxed border-2 border-critical-red">
            {loss
              ? "🚨 RUGI BESAR: Segera naikkan harga jual atau ganti ukuran porsi ayam."
              : healthy
                ? `✅ SEHAT & AMAN (${result.margin.toFixed(1)}%): Margin siap menampung fluktuasi harga.`
                : `⚠️ UNTUNG TIPIS (${result.margin.toFixed(1)}%): Disarankan jual di ${formatRupiah(result.modal + 3000)}.`}
          </div>
        </div>
      </div>
    </div>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step = 5,
  onChange,
  money,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  money?: boolean;
}) {
  return (
    <div className="space-y-3 bg-cream p-4 brutal-border-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="font-heading text-lg">{label}</strong>
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
        className="w-full"
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
