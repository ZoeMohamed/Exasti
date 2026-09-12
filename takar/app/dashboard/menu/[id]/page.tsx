import Link from "next/link";
import { getMenu } from "@/lib/data/menus";
import { ayamGeprekIngredients } from "@/lib/data/ingredients";
import { formatRupiah } from "@/lib/formatRupiah";
import { MenuPriceActions } from "@/components/menu/MenuPriceActions";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const menu = getMenu((await params).id);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
        >
          ⬅ Kembali ke Beranda
        </Link>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold brutal-border-2">
          ID: MENU-001 · Dipantau sejak 12 Okt 2024
        </span>
      </div>
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="bg-critical-red px-2.5 py-0.5 text-xs font-heading font-extrabold text-white brutal-border-2">
                STATUS: {menu.status.toUpperCase()} (
                {menu.margin.toLocaleString("id-ID")}%)
              </span>
              <span className="font-mono text-xs font-bold text-ink/70">
                Kategori: {menu.category}
              </span>
            </div>
            <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
              {menu.shortName}
            </h1>
            <p className="mt-1 text-sm text-ink/80">
              Porsi standar: Nasi putih + Ayam goreng krispi + Sambal korek
              bawang + Lalapan timun
            </p>
          </div>
          <div className="min-w-[280px] bg-cream p-5 shadow-[4px_4px_0_#111] brutal-border-2">
            <span className="block font-mono text-xs font-bold uppercase text-ink/70">
              Untung Bersih Saat Ini:
            </span>
            <strong className="my-1 block font-mono text-4xl text-critical-red sm:text-5xl">
              {formatRupiah(menu.profit)}
            </strong>
            <div className="flex justify-between border-t border-ink/20 pt-2 font-mono text-xs font-bold">
              <span>Harga Jual: {formatRupiah(menu.price)}</span>
              <span>Modal: {formatRupiah(menu.modal)}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-3 border-2 border-dashed border-ink bg-warning-yellow/30 p-3 font-mono text-xs font-bold sm:text-sm">
          ⚠️{" "}
          <span>
            PENTING: Modal di atas{" "}
            <u className="decoration-critical-red decoration-2">
              belum dikurangi sewa dan listrik bulanan.
            </u>{" "}
            Untung riil yang kamu bawa pulang lebih tipis lagi!
          </span>
        </div>
      </section>
      <section className="border-t-8 border-t-critical-red bg-cream-surface p-6 sm:p-8 brutal-card">
        <div className="mb-6 max-w-2xl">
          <span className="inline-block bg-critical-red px-2 py-0.5 font-mono text-xs font-bold uppercase text-white">
            Penyelidikan Takar
          </span>
          <h2 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl">
            Kenapa untungnya turun?
          </h2>
          <p className="mt-1 font-medium text-ink/80">
            Jangan terkecoh oleh persentase berita. Takar menghitung kenaikan
            dalam satuan <b className="underline">Rupiah per Porsi</b>.
          </p>
        </div>
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
          <div className="relative bg-critical-red p-6 text-white shadow-[4px_4px_0_#111] brutal-border md:col-span-6">
            <span className="absolute right-3 -top-3 bg-warning-yellow px-2 py-0.5 text-xs font-heading font-extrabold text-ink brutal-border-2">
              BIANG KEROK UTAMA
            </span>
            <h3 className="font-heading text-2xl font-extrabold">
              AYAM POTONG
            </h3>
            <strong className="my-2 block font-mono text-5xl text-warning-yellow sm:text-6xl">
              +Rp 1.800
            </strong>
            <span className="inline-block bg-ink/30 p-2 font-mono text-sm font-bold uppercase">
              Penyebab Terbesar Kenaikan Modal
            </span>
            <p className="mt-3 text-xs leading-relaxed sm:text-sm">
              Harga ayam naik dari Rp 36.000 ke Rp 43.200/kg. Karena kamu pakai
              250g per porsi, dampaknya langsung terasa Rp 1.800 per porsi.
            </p>
          </div>
          <div className="flex justify-center md:col-span-1">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-heading font-bold shadow-[2px_2px_0_#111] brutal-border-2">
              VS
            </span>
          </div>
          <div className="relative bg-warning-yellow p-5 text-ink shadow-[4px_4px_0_#111] brutal-border md:col-span-5">
            <h3 className="font-heading text-xl font-extrabold">
              CABAI RAWIT MERAH
            </h3>
            <strong className="my-1 block font-mono text-3xl text-critical-red sm:text-4xl">
              +Rp 480
            </strong>
            <span className="inline-block bg-white p-1.5 font-mono text-xs font-bold uppercase border border-ink">
              Naik tinggi, tapi dampaknya kecil
            </span>
            <p className="mt-3 text-xs leading-relaxed">
              Cabai melonjak 58%, tetapi satu porsi hanya membutuhkan 15 gram
              sambal. Kenaikan modalnya cuma Rp 480.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-4 bg-ink p-4 text-cream brutal-border sm:flex-row">
          <div>
            <strong className="font-heading text-lg text-warning-yellow sm:text-xl">
              “Ayam yang bikin modal naik — bukan cabai.”
            </strong>
            <p className="text-xs text-cream/80">
              Fokus cari supplier ayam karkas lebih murah atau sesuaikan ukuran
              potong.
            </p>
          </div>
          <Link
            href="/dashboard/simulator"
            className="brutal-btn whitespace-nowrap bg-bright-green px-4 py-2 text-xs font-heading font-extrabold text-ink"
          >
            Coba di Simulator ➔
          </Link>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="bg-white p-6 brutal-card lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-ink pb-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase text-ink/70">
                Rincian Resep & Modal
              </span>
              <h2 className="font-heading text-2xl font-extrabold">
                Modal Menu Ini
              </h2>
            </div>
            <span className="bg-cream p-1.5 font-mono text-xs font-bold border border-ink">
              Total: {formatRupiah(menu.modal)}
            </span>
          </div>
          <div className="space-y-3">
            {ayamGeprekIngredients.map((item, index) => (
              <div
                key={item.name}
                className={`flex flex-col justify-between gap-2 p-3 brutal-border-2 sm:flex-row ${index === 0 ? "bg-critical-red/10" : index === 4 ? "bg-cream" : "bg-white"}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-heading text-base">
                      {item.name}
                    </strong>
                    <span
                      className={`px-1.5 text-[10px] font-mono font-bold border border-ink ${item.source === "DATA PASAR" ? "bg-accent-green text-white" : "bg-cream"}`}
                    >
                      {item.source}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-ink/70">
                    {item.quantity}
                  </div>
                </div>
                <div className="text-right">
                  <strong className="font-mono">
                    {formatRupiah(item.cost)}
                  </strong>
                  <span className="block text-[11px] font-bold">
                    {((item.cost / menu.modal) * 100).toFixed(1)}% dari modal
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t-2 border-ink pt-3 font-mono font-bold">
            <span>TOTAL MODAL SEKARANG:</span>
            <span className="text-critical-red">
              {formatRupiah(menu.modal)}
            </span>
          </div>
        </section>
        <aside className="space-y-6 lg:col-span-5">
          <div className="bg-warning-yellow p-5 brutal-card">
            <h3 className="font-heading text-xl font-extrabold">
              “Angka ini masih perkiraan.”
            </h3>
            <p className="mt-1 text-xs leading-relaxed">
              Sebagian modal berasal dari bahan yang belum punya harga pasar
              otomatis, seperti bumbu racik dan minyak goreng.
            </p>
            <Link
              href="/dashboard/belanja"
              className="brutal-btn mt-3 inline-flex bg-white px-3 py-1.5 text-xs font-heading font-bold"
            >
              Lengkapi harga bahan ➔
            </Link>
          </div>
          <div className="border-t-8 border-t-bright-green bg-ink p-6 text-cream brutal-card">
            <span className="font-mono text-xs font-bold uppercase text-warning-yellow">
              Rekomendasi Cerdas Takar
            </span>
            <h3 className="mt-1 font-heading text-2xl font-extrabold text-white">
              “Kalau mau untungmu kembali seperti dulu…”
            </h3>
            <div className="my-5 border-2 border-white bg-white/10 p-4">
              <span className="font-mono text-xs text-cream/70">
                SARAN HARGA JUAL BARU:
              </span>
              <strong className="my-1 block font-mono text-4xl text-bright-green sm:text-5xl">
                Rp 20.000
              </strong>
              <div className="flex justify-between border-t border-white/20 pt-2 font-mono text-xs">
                <span>Harga Sekarang: {formatRupiah(menu.price)}</span>
                <span className="font-bold text-warning-yellow">
                  +Rp 2.000 penyesuaian
                </span>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-cream/80">
              Dengan harga Rp 20.000, untungmu kembali ke{" "}
              <b className="font-mono text-bright-green">
                Rp 3.260 / porsi (16,3%)
              </b>
              .
            </p>
            <MenuPriceActions />
          </div>
        </aside>
      </div>
      <ProfitHistory />
    </div>
  );
}

function ProfitHistory() {
  return (
    <section className="bg-white p-6 sm:p-8 brutal-card">
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">
            Untung 30 Hari Terakhir
          </h2>
          <p className="text-xs font-medium text-ink/70">
            Tren rupiah untung per porsi Ayam Geprek (10 September – Hari ini).
          </p>
        </div>
        <span className="w-fit bg-cream p-1.5 font-mono text-xs border border-ink">
          Puncak: Rp 3.200 ➔ Hari Ini:{" "}
          <b className="text-critical-red">Rp 1.260</b>
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative h-64 min-w-[600px] bg-cream p-4 brutal-border-2">
          <svg
            className="relative h-full w-full"
            viewBox="0 0 600 200"
            preserveAspectRatio="none"
            aria-label="Grafik untung 30 hari"
          >
            <rect width="600" height="90" fill="#66BB6A" fillOpacity=".1" />
            <rect
              y="140"
              width="600"
              height="60"
              fill="#D62828"
              fillOpacity=".1"
            />
            <polyline
              fill="none"
              stroke="#111"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="20,50 80,55 150,45 220,60 290,110 360,115 430,155 500,165 570,172"
            />
            <circle
              cx="20"
              cy="50"
              r="5"
              fill="#2E7D32"
              stroke="#111"
              strokeWidth="2"
            />
            <circle
              cx="150"
              cy="45"
              r="5"
              fill="#2E7D32"
              stroke="#111"
              strokeWidth="2"
            />
            <circle
              cx="290"
              cy="110"
              r="6"
              fill="#FFC107"
              stroke="#111"
              strokeWidth="2"
            />
            <circle
              cx="430"
              cy="155"
              r="6"
              fill="#D62828"
              stroke="#111"
              strokeWidth="2"
            />
            <circle
              cx="570"
              cy="172"
              r="8"
              fill="#D62828"
              stroke="#111"
              strokeWidth="3"
            />
          </svg>
          <span className="absolute left-[43%] top-20 bg-warning-yellow px-2 py-1 text-[11px] font-bold shadow-[2px_2px_0_#111] brutal-border-2">
            🍗 Ayam naik Rp 3.000/kg ➔
          </span>
          <span className="absolute right-2 top-32 bg-critical-red px-2 py-1 text-xs font-mono font-bold text-white brutal-border-2">
            Hari Ini: Rp 1.260!
          </span>
        </div>
        <div className="flex min-w-[600px] justify-between px-4 pt-2 font-mono text-[11px] text-ink/70">
          <span>10 Sep (Rp 3.100)</span>
          <span>17 Sep</span>
          <span>24 Sep (Ayam naik)</span>
          <span>01 Okt</span>
          <span>Hari Ini (Rp 1.260)</span>
        </div>
      </div>
    </section>
  );
}
