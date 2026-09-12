import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Store, TrendingDown, RefreshCw, PlusCircle } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Takar — Tahu Untungmu Sebelum Habis",
  description: "Aplikasi penjaga keuntungan warung makan berbasis harga komoditas harian Bank Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full bg-slate-50 text-slate-900 antialiased">
      <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-sm group-hover:bg-amber-600 transition">
                T
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900">Takar</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                    BI Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Tahu untungmu sebelum habis</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/menu/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Menu</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Subheader Warung Info */}
        <div className="bg-amber-50/80 border-b border-amber-100/80 py-2">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-medium">
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Warung Bu Sri · Kota Semarang</span>
            </div>
            <div className="flex items-center gap-1 text-amber-700 text-[11px]">
              <RefreshCw className="w-3 h-3 text-amber-600" />
              <span>Harga pangan BI harian aktif</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-500">
            <p className="font-medium text-slate-600">Takar — SDG 9 Sustainable Innovation & Digitalisasi UMKM</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Data resmi 21 varian komoditas pangan Bank Indonesia (PIHPS) · Kota Semarang
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
