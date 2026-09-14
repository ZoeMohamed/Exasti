import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-5">
      <section className="w-full max-w-xl bg-white p-8 text-center brutal-card">
        <span className="inline-block bg-warning-yellow px-3 py-1 font-mono text-xs font-bold brutal-border-2">HALAMAN TIDAK DITEMUKAN</span>
        <h1 className="mt-4 font-heading text-4xl font-extrabold">Halaman ini tidak tersedia</h1>
        <p className="mt-3 text-sm text-ink/70">Alamatnya mungkin berubah atau data yang kamu cari sudah dihapus.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="brutal-btn bg-warning-yellow px-5 py-3 font-bold">Kembali ke Beranda</Link>
          <Link href="/dashboard/menu" className="brutal-btn bg-white px-5 py-3 font-bold">Lihat Daftar Menu</Link>
        </div>
      </section>
    </main>
  );
}
