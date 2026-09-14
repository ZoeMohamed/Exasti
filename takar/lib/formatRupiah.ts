const FORMAT_ANGKA_RUPIAH = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatAngkaRupiah(value: number | "" | null | undefined): string {
  if (value === "" || value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return FORMAT_ANGKA_RUPIAH.format(Math.round(value));
}

export function bacaAngkaRupiah(value: string): number | "" {
  const digit = value.replace(/\D/g, "");
  if (!digit) return "";
  const angka = Number(digit);
  return Number.isSafeInteger(angka) ? angka : "";
}

export function formatRupiah(value: number | string) {
  const angka = typeof value === "number" ? value : Number(value);
  return `Rp ${Number.isFinite(angka) ? Math.round(angka).toLocaleString("id-ID") : "0"}`;
}
