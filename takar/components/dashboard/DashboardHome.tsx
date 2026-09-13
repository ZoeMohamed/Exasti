import Link from "next/link";
import type { Menu } from "@/types/menu";
import { formatRupiah } from "@/lib/formatRupiah";
import { MenuCard } from "@/components/ui/MenuCard";
import { AlertInbox } from "@/components/dashboard/AlertInbox";
import type { AlertTampil } from "@/lib/services/alerts";

interface DashboardHomeProps {
  menus: Menu[];
  latestDate: string;
  alerts: AlertTampil[];
}

export function DashboardHome({ menus, latestDate, alerts }: DashboardHomeProps) {
  const activeCount = menus.length;
  const criticalMenus = menus.filter((m) => m.status === "tipis" || m.status === "rugi");
  const avgProfit = Math.round(menus.reduce((acc, m) => acc + m.profit, 0) / (menus.length || 1));

  // Format tanggal BI
  const formattedDate = (() => {
    try {
      const d = new Date(latestDate);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch {}
    return latestDate;
  })();

  return (
    <div className="space-y-8">
      <section className="relative bg-white p-6 sm:p-8 brutal-card">
        <span className="absolute right-6 -top-3 rotate-2 bg-warning-yellow px-3 py-1 font-mono text-xs font-bold brutal-border">
          📍 Semarang · Update Harga BI ({formattedDate})
        </span>
        <span className="mb-3 inline-block bg-ink px-2.5 py-1 font-mono text-xs font-bold uppercase text-cream">
          Analisis Keuangan Warung Hari Ini
        </span>
        <h1 className="max-w-3xl font-heading text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
          “Hari ini, ada{" "}
          <span className="inline-block -rotate-1 bg-critical-red px-2 py-0.5 text-white brutal-border-2">
            {criticalMenus.length} menu
          </span>{" "}
          yang perlu kamu lihat.”
        </h1>
        <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-ink/80 sm:text-lg">
          Harga daging ayam dan cabai di Semarang bergerak dinamis dari data Bank Indonesia.
          Jangan sampai jualan laris manis tapi pas dihitung uangnya malah habis untuk modal.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 border-t-2 border-ink/20 pt-6 sm:grid-cols-3">
          <Metric
            label="Menu Aktif Jualan"
            value={`${activeCount} Menu`}
            note="Dipantau otomatis harian"
          />
          <Metric
            label="Untung Rata-Rata"
            value={formatRupiah(avgProfit)}
            note="per porsi (semua menu)"
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
          note="Diurutkan dari untung paling tipis ke paling tebal."
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
          {menus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} />
          ))}
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
