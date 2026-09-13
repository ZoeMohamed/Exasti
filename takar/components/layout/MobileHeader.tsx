import Link from "next/link";

interface MobileHeaderProps {
  /** Nama kabupaten warung, bukan teks yang dipatok. */
  regionName?: string | null;
  /** Tanggal harga terakhir, sudah dalam bentuk "13 Sep 2026". */
  hargaTanggal?: string | null;
  /** true bila sinkronisasi yang seharusnya sudah berjalan belum berhasil. */
  hargaBasi?: boolean;
}

export function MobileHeader({ regionName, hargaTanggal, hargaBasi }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b-[3px] border-ink bg-warning-yellow p-3.5 shadow-[2px_2px_0_#111] md:hidden">
      <Link href="/dashboard" prefetch={false} className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center bg-ink text-xl font-heading font-black text-warning-yellow border-2 border-ink">
          T
        </span>
        <span>
          <strong className="block font-heading text-2xl leading-none">
            TAKAR
          </strong>
          {/* Jangan mengaku "hari ini" tanpa memeriksa tanggalnya. */}
          <small className="font-mono text-[10px] font-bold">
            {regionName ?? "Warungmu"} ·{" "}
            {hargaTanggal ? `Harga ${hargaTanggal}${hargaBasi ? " · perlu diperbarui" : ""}` : "Harga belum masuk"}
          </small>
        </span>
      </Link>
      <Link
        href="/dashboard/belanja"
        prefetch={false}
        className="brutal-btn bg-bright-green px-3 py-1.5 text-xs font-heading font-extrabold"
      >
        Catat Nota
      </Link>
    </header>
  );
}
