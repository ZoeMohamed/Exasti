"use client";

import type { InputHTMLAttributes, InvalidEvent } from "react";
import {
  bacaAngkaRupiah,
  formatAngkaRupiah,
  formatRupiah,
} from "@/lib/formatRupiah";

interface RupiahInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max" | "step" | "inputMode"
> {
  value: number | "" | null | undefined;
  onValueChange: (value: number | "") => void;
  min?: number;
  max?: number;
  wrapperClassName?: string;
  compact?: boolean;
}

export function RupiahInput({
  value,
  onValueChange,
  min,
  max,
  wrapperClassName = "",
  className = "",
  compact = false,
  onInvalid,
  ...inputProps
}: RupiahInputProps) {
  function pesanRentang(angka: number | ""): string {
    if (angka !== "" && min !== undefined && angka < min) {
      return `Nilai minimal ${formatRupiah(min)}.`;
    }
    if (angka !== "" && max !== undefined && angka > max) {
      return `Nilai maksimal ${formatRupiah(max)}.`;
    }
    return "";
  }

  function handleInvalid(event: InvalidEvent<HTMLInputElement>) {
    const angka = typeof value === "number" ? value : null;
    if (angka !== null && min !== undefined && angka < min) {
      event.currentTarget.setCustomValidity(`Nilai minimal ${formatRupiah(min)}.`);
    } else if (angka !== null && max !== undefined && angka > max) {
      event.currentTarget.setCustomValidity(`Nilai maksimal ${formatRupiah(max)}.`);
    }
    onInvalid?.(event);
  }

  return (
    <span className={`relative block ${wrapperClassName}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono font-bold text-ink/60 ${compact ? "left-2 text-xs" : "left-3 text-sm"}`}
      >
        Rp
      </span>
      <input
        {...inputProps}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={formatAngkaRupiah(value)}
        onChange={(event) => {
          const angka = bacaAngkaRupiah(event.currentTarget.value);
          event.currentTarget.setCustomValidity(pesanRentang(angka));
          onValueChange(angka);
        }}
        onInvalid={handleInvalid}
        className={`w-full ${compact ? "pl-8" : "pl-11"} ${className}`}
      />
    </span>
  );
}
