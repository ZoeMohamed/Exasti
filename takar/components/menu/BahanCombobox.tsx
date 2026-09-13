"use client";

import { useId, useMemo, useState } from "react";
import { cariBahan, type BahanTersedia, type HasilCari } from "@/lib/bahan/cari";
import type { SaranUmum } from "@/lib/bahan/katalog-pasar";

interface Props {
  daftar: BahanTersedia[];
  saranUmum: SaranUmum[];
  sudahDipakai?: Set<string>;
  onPilih: (hasil: HasilCari) => void;
  label?: string;
  placeholder?: string;
}

export function BahanCombobox({
  daftar,
  saranUmum,
  sudahDipakai = new Set(),
  onPilih,
  label = "Cari atau tulis nama bahan",
  placeholder = "Contoh: ayam, cabe, atau saus sambal",
}: Props) {
  const id = useId();
  const [kueri, setKueri] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const hasil = useMemo(
    () => cariBahan(daftar, saranUmum, kueri, sudahDipakai),
    [daftar, kueri, saranUmum, sudahDipakai],
  );

  function pilih(item: HasilCari) {
    onPilih(item);
    setKueri("");
    setTerbuka(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="block font-heading text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        value={kueri}
        onChange={(event) => { setKueri(event.target.value); setTerbuka(true); }}
        onFocus={() => setTerbuka(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setTerbuka(false);
          if (event.key === "Enter" && terbuka && hasil[0]) {
            event.preventDefault();
            pilih(hasil[0]);
          }
        }}
        role="combobox"
        aria-expanded={terbuka && hasil.length > 0}
        aria-controls={`${id}-hasil`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        className="mt-1 w-full bg-white p-3 font-heading text-sm brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
      />
      {terbuka && kueri.trim() && hasil.length > 0 && (
        <div
          id={`${id}-hasil`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto bg-white p-1 shadow-[4px_4px_0_#111] brutal-border-2"
        >
          {hasil.map((item, index) => {
            const key = item.tipe === "tersedia" ? item.bahan.id : item.tipe === "saran" ? `saran-${item.saran.nama}` : `baru-${item.nama}`;
            const judul = item.tipe === "tersedia" ? item.bahan.namaTampil : item.tipe === "saran" ? item.saran.nama : `Tambah “${item.nama}” sebagai bahan baru`;
            const keterangan = item.tipe === "tersedia"
              ? item.bahan.jenis === "pasar" ? "Harga pasar tersedia" : "Bahan warungmu"
              : item.tipe === "saran" ? "Bahan yang umum dipakai warung" : "Kamu akan mengisi harga belanjanya";
            return (
              <button
                key={`${key}-${index}`}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pilih(item)}
                className="block w-full border-b border-ink/15 px-3 py-2 text-left last:border-b-0 hover:bg-warning-yellow/25 focus:bg-warning-yellow/25 focus:outline-none"
              >
                <strong className="block font-heading text-sm">{judul}</strong>
                <span className="block text-xs text-ink/65">{keterangan}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
