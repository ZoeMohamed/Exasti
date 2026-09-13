"use client";

import { useState } from "react";

export function MenuDeleteAction({ menuId, menuName }: { menuId: string; menuName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 px-3 py-2 font-heading text-xs font-bold text-critical-red underline underline-offset-4"
      >
        Hapus menu
      </button>
    );
  }

  return (
    <div className="w-full bg-critical-red/10 p-3 brutal-border-2 sm:w-auto" role="group" aria-label={`Konfirmasi hapus ${menuName}`}>
      <p className="text-xs font-bold">Hapus {menuName} beserta resep dan riwayatnya secara permanen?</p>
      {error ? <p role="alert" className="mt-1 text-xs font-bold text-critical-red">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            setError(null);
            try {
              const response = await fetch(`/api/menus/${menuId}`, { method: "DELETE" });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || "Menu belum berhasil dihapus.");
              // Pastikan daftar menu dibaca ulang setelah penghapusan. Pada
              // navigasi client, payload RSC yang sempat disiapkan sebelum
              // DELETE dapat menampilkan kartu lama walau baris DB sudah hilang.
              window.location.replace("/dashboard/menu");
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Menu belum berhasil dihapus.");
              setDeleting(false);
            }
          }}
          className="brutal-btn min-h-11 bg-critical-red px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {deleting ? "Menghapus..." : "Ya, hapus permanen"}
        </button>
        <button type="button" disabled={deleting} onClick={() => setConfirming(false)} className="min-h-11 px-3 py-2 text-xs font-bold underline">
          Batal
        </button>
      </div>
    </div>
  );
}
