// components/ui/Skeleton.tsx
// Rangka halaman selagi data dimuat.
//
// Tanpa berkas loading.tsx, berpindah menu di App Router menahan seluruh
// layar sampai server menjawab — sekitar satu detik tanpa tanda apa pun,
// sehingga terasa macet, bukan lambat. Rangka ini juga yang di-prefetch
// Next.js untuk rute dinamis, jadi perpindahannya terasa seketika.

export function Baris({ tinggi = "h-4", lebar = "w-full" }: { tinggi?: string; lebar?: string }) {
  return <div className={`${tinggi} ${lebar} animate-pulse rounded bg-ink/10`} />;
}

export function KartuRangka() {
  return (
    <div className="space-y-3 bg-white p-5 brutal-card">
      <Baris tinggi="h-5" lebar="w-24" />
      <Baris tinggi="h-6" lebar="w-3/4" />
      <Baris tinggi="h-2" />
      <div className="space-y-2 bg-cream p-3 brutal-border-2">
        <Baris tinggi="h-3" lebar="w-28" />
        <Baris tinggi="h-8" lebar="w-36" />
      </div>
    </div>
  );
}

export function RangkaHalaman({ kartu = 6 }: { kartu?: number }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Memuat">
      <div className="space-y-4 bg-white p-6 brutal-card sm:p-8">
        <Baris tinggi="h-5" lebar="w-48" />
        <Baris tinggi="h-10" lebar="w-2/3" />
        <Baris lebar="w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: kartu }).map((_, i) => (
          <KartuRangka key={i} />
        ))}
      </div>
    </div>
  );
}
