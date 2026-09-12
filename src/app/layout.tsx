import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Plus } from "lucide-react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

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
    <html lang="id" className={`h-full bg-[#FAFAF9] text-[#1C1917] antialiased ${ibmPlexSans.className}`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur border-b border-[#E7E5E4]">
          <div className="max-w-md sm:max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[#22683B] text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:bg-[#164F2B] transition">
                T
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-[#1C1917]">Takar</span>
                  <span className="text-[10px] font-semibold bg-[#DCF0E0] text-[#22683B] px-1.5 py-0.2 rounded">
                    BI Live
                  </span>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/menu/new"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#22683B] hover:bg-[#164F2B] rounded-lg transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Menu</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-md sm:max-w-xl w-full mx-auto px-4 py-5">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E7E5E4] py-4 mt-auto">
          <div className="max-w-md sm:max-w-xl mx-auto px-4 text-center text-xs text-[#78716C]">
            <p className="font-medium text-[#1C1917]">Takar — SDG 9 Sustainable Innovation & Digitalisasi UMKM</p>
            <p className="text-[11px] text-[#A8A29E] mt-0.5">
              Data resmi komoditas pangan Bank Indonesia · Kota Semarang
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
