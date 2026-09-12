import Link from "next/link";
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b-[3px] border-ink bg-warning-yellow p-3.5 shadow-[2px_2px_0_#111] md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center bg-ink text-xl font-heading font-black text-warning-yellow border-2 border-ink">
          T
        </span>
        <span>
          <strong className="block font-heading text-2xl leading-none">
            TAKAR
          </strong>
          <small className="font-mono text-[10px] font-bold">
            Semarang · Harga Hari Ini
          </small>
        </span>
      </Link>
      <Link
        href="/dashboard/belanja"
        className="brutal-btn bg-bright-green px-3 py-1.5 text-xs font-heading font-extrabold"
      >
        📷 Scan Nota
      </Link>
    </header>
  );
}
