import Link from "next/link";
import type { Menu } from "@/types/menu";
import { formatRupiah } from "@/lib/formatRupiah";
import { MenuCard } from "@/components/ui/MenuCard";
import { AlertInbox } from "@/components/dashboard/AlertInbox";
import type { AlertTampil } from "@/lib/services/alerts";
import { tanggalIndonesia } from "@/lib/tanggal";

interface DashboardHomeProps {
  menus: Menu[];
  latestDate: string;
  alerts: AlertTampil[];
  onboardingIncomplete?: boolean;
}

export function DashboardHome({ menus, latestDate, alerts, onboardingIncomplete = false }: DashboardHomeProps) {
  const activeMenus = menus.filter((menu) => menu.status !== "diistirahatkan");
  const activeCount = activeMenus.length;
  const criticalMenus = activeMenus.filter((menu) => menu.status === "tipis" || menu.status === "rugi");
  const avgProfit = Math.round(
    activeMenus.reduce((total, menu) => total + menu.profit, 0) / (activeMenus.length || 1),
  );

  const formattedDate = tanggalIndonesia(latestDate);

  return (
    <div className="space-y-8">
      {onboardingIncomplete ? (
        <section className="flex flex-col gap-4 bg-warning-yellow p-5 shadow-[4px_4px_0_#111] brutal-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-extrabold">Lanjutkan menyiapkan warungmu</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/75">
              Panduan akan membantumu mengisi menu pertama, mencatat belanja, dan membaca angka untung.
            </p>
          </div>
          <Link href="/dashboard/panduan" className="brutal-btn min-h-11 shrink-0 bg-white px-5 py-2.5 text-center font-heading text-sm font-extrabold">
            Lanjutkan Panduan
          </Link>
        </section>
      ) : null}
      <section className="relative bg-white p-6 sm:p-8 brutal-card">
        <span className="absolute right-6 -top-3 rotate-2 bg-warning-yellow px-3 py-1 font-mono text-xs font-bold brutal-border">
          Harga pasar Semarang · {formattedDate}
        </span>
        <span className="mb-3 inline-block bg-ink px-2.5 py-1 font-mono text-xs font-bold uppercase text-cream">
          Ringkasan Warung Hari Ini
        </span>
        <h1 className="max-w-3xl font-heading text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
          “Hari ini, ada{" "}
          <span className="inline-block -rotate-1 bg-critical-red px-2 py-0.5 text-white brutal-border-2">
            {criticalMenus.length} menu
          </span>{" "}
          yang perlu kamu lihat.”
        </h1>
        <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-ink/80 sm:text-lg">
          Harga ayam dan cabai di Semarang dapat berubah setiap hari.
          Jangan sampai jualan laris manis tapi pas dihitung uangnya malah habis untuk modal.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 border-t-2 border-ink/20 pt-6 sm:grid-cols-3">
          <Metric
            label="Menu Aktif Jualan"
            value={`${activeCount} Menu`}
            note="Dihitung ulang setiap hari"
          />
          <Metric
            label="Untung Rata-Rata"
            value={formatRupiah(avgProfit)}
            note="per porsi · belum dikurangi sewa dan listrik"
            tone="green"
          />
          <Metric
            label="Kondisi Genting"
            value={`${criticalMenus.length} Menu`}
            note="Untung tipis & rawan rugi"
            tone="red"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Yang Perlu Kamu Perhatikan"
          note={
            alerts.length > 0
              ? "Paling mendesak di atas · maksimal tiga sehari"
              : "Kosong berarti aman"
          }
        />
        <AlertInbox alerts={alerts} />
      </section>

      <section>
        <SectionTitle
          title="Kondisi Menu Kamu"
          note="Perkiraan dampak uang mingguan terbesar ditampilkan lebih dulu."
          action={
            <Link
              href="/dashboard/menu/tambah"
              className="brutal-btn bg-warning-yellow px-4 py-2 text-xs font-heading font-bold"
            >
              + Tambah Menu Baru
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {activeMenus.length > 0 ? activeMenus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} />
          )) : (
            <div className="col-span-full bg-white p-6 text-center brutal-card">
              <h3 className="font-heading text-xl font-extrabold">Belum ada menu yang dihitung</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-ink/70">
                Tambahkan menu pertama beserta bahan dan harga jualnya. Takar akan langsung menghitung modal dan sisa uang per porsi.
              </p>
              <Link href="/dashboard/menu/tambah" className="brutal-btn mt-4 inline-block bg-warning-yellow px-5 py-3 text-sm font-bold">
                Tambah Menu Pertama
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "green" | "red";
}) {
  return (
    <div
      className={`p-4 brutal-border-2 ${tone === "green" ? "bg-bright-green/20" : tone === "red" ? "bg-critical-red/10" : "bg-cream"}`}
    >
      <span className="font-mono text-xs font-bold uppercase text-ink/70">
        {label}
      </span>
      <div
        className={`mt-1 font-heading text-3xl font-extrabold ${tone === "green" ? "text-accent-green" : tone === "red" ? "text-critical-red" : ""}`}
      >
        {value}
      </div>
      <span className="text-xs text-ink/70">{note}</span>
    </div>
  );
}

function SectionTitle({
  title,
  note,
  action,
}: {
  title: string;
  note: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">
          {title}
        </h2>
        <p className="text-xs text-ink/70 sm:text-sm">{note}</p>
      </div>
      {action}
    </div>
  );
}
