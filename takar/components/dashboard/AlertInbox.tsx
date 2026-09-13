"use client";

// components/dashboard/AlertInbox.tsx
// FR-30…33 — kotak masuk alert harian.
//
// Aturan yang mengikat tampilan ini:
//   BR-06  maksimal 3, diurutkan critical → warning → info
//   FR-22  keadaan terbaca tanpa warna: ada label teks + angka rupiah
//   FR-29  seluruh istilah memakai bahasa sehari-hari pemilik warung
//   Takar hanya bersuara kalau ada masalah — tidak ada masalah, tidak ada kartu.

import { useState } from "react";
import Link from "next/link";
import type { AlertTampil } from "@/lib/services/alerts";

const LABEL: Record<AlertTampil["keparahan"], string> = {
  critical: "PERLU SEKARANG",
  warning: "PERLU DICEK",
  info: "SEKADAR TAHU",
};

export function AlertInbox({ alerts }: { alerts: AlertTampil[] }) {
  const [dibaca, setDibaca] = useState<Set<string>>(new Set());
  const [sibuk, setSibuk] = useState<string | null>(null);

  const tampil = alerts.filter((a) => !dibaca.has(a.id));

  async function tandai(id: string) {
    setSibuk(id);
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setDibaca((s) => new Set(s).add(id));
    } finally {
      setSibuk(null);
    }
  }

  // Menu yang sehat seharusnya diam. Tidak ada alert = kabar baik, bukan layar kosong.
  if (tampil.length === 0) {
    return (
      <div className="brutal-border-2 bg-cream p-6">
        <p className="font-heading text-lg font-bold">Tidak ada yang perlu kamu kejar hari ini.</p>
        <p className="mt-1 text-sm text-ink/70">
          Semua menu masih di jalurnya. Takar hanya memanggilmu kalau ada yang bergerak.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tampil.map((a) => (
        <article key={a.id} className="brutal-card bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            {/* FR-22: label teks, bukan hanya warna */}
            <span className="bg-ink px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cream">
              {LABEL[a.keparahan]}
            </span>
            <span className="font-mono text-xs text-ink/60">
              {a.sudahBerapaHari > 1
                ? `sudah ${a.sudahBerapaHari} hari begini`
                : "baru hari ini"}
            </span>
          </div>

          <h3 className="mt-3 font-heading text-xl font-extrabold leading-snug">{a.headline}</h3>
          {a.detail && <p className="mt-1.5 text-sm text-ink/80">{a.detail}</p>}

          {a.saran && (
            <p className="mt-3 border-l-4 border-ink pl-3 text-sm">
              Kalau mau untungnya kembali, harga jualnya perlu{" "}
              <strong className="font-heading">
                Rp {a.saran.harga_saran.toLocaleString("id-ID")}
              </strong>{" "}
              <span className="text-ink/60">
                (sekarang Rp {a.saran.harga_sekarang.toLocaleString("id-ID")})
              </span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {a.menuItemId && (
              <Link
                href={`/dashboard/menu/${a.menuItemId}`}
                className="brutal-btn bg-warning-yellow px-4 py-2 text-xs font-heading font-bold"
              >
                Lihat kenapa
              </Link>
            )}
            <button
              onClick={() => tandai(a.id)}
              disabled={sibuk === a.id}
              className="brutal-btn bg-cream px-4 py-2 text-xs font-heading font-bold disabled:opacity-50"
            >
              {sibuk === a.id ? "Menyimpan…" : "Sudah saya baca"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
