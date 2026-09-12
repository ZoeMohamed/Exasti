import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbMenuDetail } from "@/lib/services/menu-engine";
import { formatRupiah } from "@/lib/formatRupiah";
import { MenuPriceActions } from "@/components/menu/MenuPriceActions";

export const dynamic = "force-dynamic";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const menu = await getDbMenuDetail(id);

  if (!menu) {
    notFound();
  }

  const sellPrice = menu.sellPrice;
  const modal = menu.modal;
  const profit = menu.profit;
  const margin = menu.margin;
  const status = menu.status;

  const suggestedProfit = menu.suggestedPrice - modal;
  const suggestedMargin = Math.round((suggestedProfit / menu.suggestedPrice) * 100 * 10) / 10;
  const priceAdjustment = menu.suggestedPrice - sellPrice;

  const driver = menu.driverNote;

  return (
    <div className="space-y-8">
      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
          >
            ⬅ Kembali ke Beranda
          </Link>
          <Link
            href={`/dashboard/menu/${id}/edit`}
            className="brutal-btn bg-warning-yellow px-3 py-1.5 font-mono text-xs font-bold"
          >
            ✏️ Edit Resep & Porsi
          </Link>
        </div>
        <span className="bg-warning-yellow px-2 py-1 font-mono text-xs font-bold brutal-border-2">
          KODE: {menu.shortName} · Pantauan Harga Live Bank Indonesia
        </span>
      </div>

      {/* Main Header Card */}
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 text-xs font-heading font-extrabold text-white brutal-border-2 ${
                  status === "rugi"
                    ? "bg-critical-red"
                    : status === "tipis"
                      ? "bg-warning-yellow text-ink"
                      : "bg-bright-green text-ink"
                }`}
              >
                STATUS: {status.toUpperCase()} ({margin.toLocaleString("id-ID")}%)
              </span>
              <span className="font-mono text-xs font-bold text-ink/70">
                Kategori: {menu.category} · {menu.batchYield} Porsi Sekali Masak
              </span>
            </div>
            <h1 className="font-heading text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
              {menu.name}
            </h1>
            <p className="mt-1 text-sm text-ink/80">
              Perhitungan modal porsi dihitung otomatis dari resep batch ({menu.batchYield} porsi) dikalikan harga komoditas pasar Kota Semarang hari ini.
            </p>
          </div>
          <div className="min-w-[280px] bg-cream p-5 shadow-[4px_4px_0_#111] brutal-border-2">
            <span className="block font-mono text-xs font-bold uppercase text-ink/70">
              Untung Bersih Saat Ini:
            </span>
            <strong
              className={`my-1 block font-mono text-4xl sm:text-5xl ${
                status === "rugi"
                  ? "text-critical-red"
                  : status === "tipis"
                    ? "text-critical-red"
                    : "text-bright-green"
              }`}
            >
              {formatRupiah(profit)}
            </strong>
            <div className="flex justify-between border-t border-ink/20 pt-2 font-mono text-xs font-bold">
              <span>Harga Jual: {formatRupiah(sellPrice)}</span>
              <span>Modal: {formatRupiah(modal)}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-3 border-2 border-dashed border-ink bg-warning-yellow/30 p-3 font-mono text-xs font-bold sm:text-sm">
          ⚠️{" "}
          <span>
            PENTING: Modal di atas{" "}
            <u className="decoration-critical-red decoration-2">
              belum dikurangi sewa tempat dan listrik bulanan.
            </u>{" "}
            Untung riil yang kamu bawa pulang lebih tipis lagi!
          </span>
        </div>
      </section>

      {/* Driver Investigation Section (BR-04) */}
      <section className="border-t-8 border-t-critical-red bg-cream-surface p-6 sm:p-8 brutal-card">
        <div className="mb-6 max-w-2xl">
          <span className="inline-block bg-critical-red px-2 py-0.5 font-mono text-xs font-bold uppercase text-white">
            Penyelidikan Takar (Atribusi BR-04)
          </span>
          <h2 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl">
            Kenapa untungnya turun?
          </h2>
          <p className="mt-1 font-medium text-ink/80">
            Jangan terkecoh oleh persentase berita di media. Takar menghitung kenaikan
            dalam satuan <b className="underline">Rupiah per Porsi</b> berdasarkan gramatur resep aslimu.
          </p>
        </div>

        {driver ? (
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
            <div className="relative bg-critical-red p-6 text-white shadow-[4px_4px_0_#111] brutal-border md:col-span-6">
              <span className="absolute right-3 -top-3 bg-warning-yellow px-2 py-0.5 text-xs font-heading font-extrabold text-ink brutal-border-2">
                BIANG KEROK UTAMA
              </span>
              <h3 className="font-heading text-2xl font-extrabold">
                {driver.driverName.toUpperCase()}
              </h3>
              <strong className="my-2 block font-mono text-5xl text-warning-yellow sm:text-6xl">
                +{formatRupiah(driver.driverRp)}
              </strong>
              <span className="inline-block bg-ink/30 p-2 font-mono text-sm font-bold uppercase">
                Penyebab Terbesar Kenaikan Modal (+{driver.driverPct}%)
              </span>
              <p className="mt-3 text-xs leading-relaxed sm:text-sm">
                Karena resepmu memakai porsi komoditas ini dalam takaran dominan, kenaikan harga per kilogramnya langsung menguras kantong sebesar {formatRupiah(driver.driverRp)} per porsi!
              </p>
            </div>

            <div className="flex justify-center md:col-span-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-heading font-bold shadow-[2px_2px_0_#111] brutal-border-2">
                VS
              </span>
            </div>

            <div className="relative bg-warning-yellow p-5 text-ink shadow-[4px_4px_0_#111] brutal-border md:col-span-5">
              <h3 className="font-heading text-xl font-extrabold">
                {driver.altName.toUpperCase()}
              </h3>
              <strong className="my-1 block font-mono text-3xl text-critical-red sm:text-4xl">
                +{formatRupiah(driver.altRp)}
              </strong>
              <span className="inline-block bg-white p-1.5 font-mono text-xs font-bold uppercase border border-ink">
                Persentase {driver.altPct}%, tapi dampaknya kecil
              </span>
              <p className="mt-3 text-xs leading-relaxed">
                Meskipun berita menghebohkan lonjakan persentase komoditas ini, porsi yang dipakai per porsi sedikit, sehingga kontribusi kenaikannya hanya {formatRupiah(driver.altRp)}.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 font-mono text-sm brutal-border-2">
            ✅ Biaya bahan baku untuk menu ini terpantau stabil dalam 7 hari terakhir. Tidak ada lonjakan bahan yang signifikan.
          </div>
        )}

        <div className="mt-6 flex flex-col items-center justify-between gap-4 bg-ink p-4 text-cream brutal-border sm:flex-row">
          <div>
            <strong className="font-heading text-lg text-warning-yellow sm:text-xl">
              {driver
                ? `“${driver.driverName} yang bikin modal naik — bukan ${driver.altName}.”`
                : "“Biaya bahan baku saat ini berada di batas wajar.”"}
            </strong>
            <p className="text-xs text-cream/80">
              Fokus bernegosiasi dengan pemasok bahan utama atau sesuaikan harga jual di simulator.
            </p>
          </div>
          <Link
            href={`/dashboard/simulator?price=${sellPrice}`}
            className="brutal-btn whitespace-nowrap bg-bright-green px-4 py-2 text-xs font-heading font-extrabold text-ink"
          >
            Coba di Simulator ➔
          </Link>
        </div>
      </section>

      {/* Ingredient Breakdown & Recommendation */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Ingredients Table */}
        <section className="bg-white p-6 brutal-card lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-ink pb-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase text-ink/70">
                Rincian Resep & Modal Dinamis
              </span>
              <h2 className="font-heading text-2xl font-extrabold">
                Komposisi Modal Menu
              </h2>
            </div>
            <span className="bg-cream p-1.5 font-mono text-xs font-bold border border-ink">
              Total: {formatRupiah(modal)}
            </span>
          </div>

          {/* FR-28 / BR-10 — peringatan cakupan data.
              Kalau sebagian besar modal berasal dari perkiraan, angka di atas
              harus dibaca sebagai perkiraan juga. Diam soal ini = menyesatkan. */}
          {typeof menu.cakupan === "number" && menu.cakupan < 70 && (
            <div className="mb-4 bg-warning-yellow p-3 brutal-border-2">
              <p className="font-heading text-sm font-bold">
                Angka ini masih banyak tebakannya
              </p>
              <p className="mt-1 text-xs">
                Baru {menu.cakupan} dari tiap 100 rupiah modal menu ini yang punya harga
                pasar harian
                {menu.bahanTanpaHarga && menu.bahanTanpaHarga > 0
                  ? `, dan ${menu.bahanTanpaHarga} bahan belum ada harganya`
                  : ""}
                . Isi harga belanjamu lewat Scan Nota supaya lebih tepat.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {menu.ingredients.map((item, index) => {
              const pct = modal > 0 ? ((item.cost / modal) * 100).toFixed(1) : "0";
              return (
                <div
                  key={item.name}
                  className={`flex flex-col justify-between gap-2 p-3 brutal-border-2 sm:flex-row ${
                    index === 0 ? "bg-critical-red/10" : item.source === "PERKIRAAN" ? "bg-cream" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-heading text-base">
                        {item.name}
                      </strong>
                      <span
                        className={`px-1.5 text-[10px] font-mono font-bold border border-ink ${
                          item.source === "DATA PASAR"
                            ? "bg-accent-green text-white"
                            : "bg-cream text-ink"
                        }`}
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
                    <span className="block text-[11px] font-bold text-ink/80">
                      {pct}% dari total modal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between border-t-2 border-ink pt-3 font-mono font-bold">
            <span>TOTAL MODAL SEKARANG:</span>
            <span className="text-critical-red text-lg">
              {formatRupiah(modal)}
            </span>
          </div>
        </section>

        {/* Aside: Smart Recommendation & Price Action */}
        <aside className="space-y-6 lg:col-span-5">
          <div className="bg-warning-yellow p-5 brutal-card">
            <h3 className="font-heading text-xl font-extrabold">
              “Hitungan Berdasarkan Resep Asli”
            </h3>
            <p className="mt-1 text-xs leading-relaxed">
              Resep menu ini dihitung dari takaran sekali masak (batch yield: {menu.batchYield} porsi). Data harga bahan segar diperbarui otomatis setiap hari kerja dari Bank Indonesia.
            </p>
          </div>

          <div className="border-t-8 border-t-bright-green bg-ink p-6 text-cream brutal-card">
            <span className="font-mono text-xs font-bold uppercase text-warning-yellow">
              Rekomendasi Cerdas Takar (BR-07)
            </span>
            <h3 className="mt-1 font-heading text-2xl font-extrabold text-white">
              “Kalau mau untungmu kembali sehat…”
            </h3>
            <div className="my-5 border-2 border-white bg-white/10 p-4">
              <span className="font-mono text-xs text-cream/70">
                SARAN HARGA JUAL BARU:
              </span>
              <strong className="my-1 block font-mono text-4xl text-bright-green sm:text-5xl">
                {formatRupiah(menu.suggestedPrice)}
              </strong>
              <div className="flex justify-between border-t border-white/20 pt-2 font-mono text-xs">
                <span>Harga Sekarang: {formatRupiah(sellPrice)}</span>
                <span className="font-bold text-warning-yellow">
                  {priceAdjustment > 0 ? `+${formatRupiah(priceAdjustment)} penyesuaian` : "Harga sudah ideal"}
                </span>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-cream/80">
              Dengan harga {formatRupiah(menu.suggestedPrice)}, untungmu kembali ke{" "}
              <b className="font-mono text-bright-green">
                {formatRupiah(suggestedProfit)} / porsi ({suggestedMargin}%)
              </b>
              .
            </p>
            <MenuPriceActions
              menuId={id}
              menuName={menu.name}
              currentPrice={sellPrice}
              suggestedPrice={menu.suggestedPrice}
            />
          </div>
        </aside>
      </div>

      {/* Dynamic Profit History Chart */}
      <DynamicProfitHistory
        menuName={menu.name}
        history={menu.history}
        currentProfit={profit}
      />
    </div>
  );
}

function DynamicProfitHistory({
  menuName,
  history,
  currentProfit,
}: {
  menuName: string;
  history: Array<{ date: string; label: string; hpp: number; profit: number; marginPct: number }>;
  currentProfit: number;
}) {
  if (!history || history.length === 0) {
    return null;
  }

  const profits = history.map((h) => h.profit);
  const minProfit = Math.min(...profits, 0);
  const maxProfit = Math.max(...profits, 4000);
  const range = maxProfit - minProfit || 1;

  // Build SVG points: X from 30 to 570, Y from 170 (min) to 30 (max)
  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 30;

  const points = history.map((h, i) => {
    const x = paddingX + (i / (history.length - 1 || 1)) * (width - 2 * paddingX);
    const normalizedY = (h.profit - minProfit) / range;
    const y = height - paddingY - normalizedY * (height - 2 * paddingY);
    return { x: Math.round(x), y: Math.round(y), profit: h.profit, label: h.label };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  const peak = Math.max(...profits);
  const firstLabel = history[0]?.label || "";
  const lastLabel = history[history.length - 1]?.label || "Hari Ini";

  return (
    <section className="bg-white p-6 sm:p-8 brutal-card">
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row">
        <div>
          <h2 className="font-heading text-2xl font-extrabold">
            Riwayat Untung 30 Hari Terakhir
          </h2>
          <p className="text-xs font-medium text-ink/70">
            Tren rupiah untung per porsi {menuName} berdasarkan data historis harian Bank Indonesia.
          </p>
        </div>
        <span className="w-fit bg-cream p-1.5 font-mono text-xs border border-ink">
          Puncak: {formatRupiah(peak)} ➔ Hari Ini:{" "}
          <b className={currentProfit < 1500 ? "text-critical-red" : "text-bright-green"}>
            {formatRupiah(currentProfit)}
          </b>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="relative h-64 min-w-[600px] bg-cream p-4 brutal-border-2">
          <svg
            className="relative h-full w-full"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-label={`Grafik untung 30 hari ${menuName}`}
          >
            {/* Green safe area (top) */}
            <rect width={width} height="80" fill="#66BB6A" fillOpacity=".12" />
            {/* Red alert area (bottom) */}
            <rect y="130" width={width} height="70" fill="#D62828" fillOpacity=".12" />

            {/* Connecting Polyline */}
            <polyline
              fill="none"
              stroke="#111"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />

            {/* Individual Data Points */}
            {points.map((p, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === points.length - 1;
              const isKeyPoint = isFirst || isLast || idx % 7 === 0;

              if (!isKeyPoint) return null;

              const dotColor = p.profit < 1500 ? "#D62828" : p.profit < 2500 ? "#FFC107" : "#2E7D32";

              return (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 7 : 5}
                  fill={dotColor}
                  stroke="#111"
                  strokeWidth={isLast ? 3 : 2}
                />
              );
            })}
          </svg>

          <span className="absolute right-4 top-2 bg-critical-red px-2 py-1 text-xs font-mono font-bold text-white brutal-border-2">
            Hari Ini: {formatRupiah(currentProfit)}
          </span>
        </div>

        <div className="flex min-w-[600px] justify-between px-4 pt-2 font-mono text-[11px] text-ink/70">
          <span>{firstLabel}</span>
          <span>{history[Math.floor(history.length / 2)]?.label}</span>
          <span>{lastLabel} (Hari Ini: {formatRupiah(currentProfit)})</span>
        </div>
      </div>
    </section>
  );
}
