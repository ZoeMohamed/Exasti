import type { ReactNode } from "react";
import { JUMLAH_LANGKAH_PANDUAN } from "@/lib/onboarding";

export function PanduanKontekstual({
  langkah,
  judul,
  children,
  action,
}: {
  langkah: number;
  judul: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const judulId = `judul-panduan-${langkah}`;

  return (
    <section
      aria-labelledby={judulId}
      className="border-l-8 border-l-ink bg-warning-yellow p-5 shadow-[4px_4px_0_#111] brutal-border sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-wide">
            Langkah {langkah} dari {JUMLAH_LANGKAH_PANDUAN} · isi langsung di halaman ini
          </p>
          <h2 id={judulId} className="mt-1 font-heading text-2xl font-extrabold sm:text-3xl">
            {judul}
          </h2>
          <div className="mt-2 text-sm font-medium leading-relaxed text-ink/75 sm:text-base">
            {children}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
