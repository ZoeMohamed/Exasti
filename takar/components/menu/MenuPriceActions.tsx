"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/formatRupiah";

interface MenuPriceActionsProps {
  menuId: string;
  menuName: string;
  currentPrice: number;
  suggestedPrice: number;
}

export function MenuPriceActions({
  menuId,
  menuName,
  currentPrice,
  suggestedPrice,
}: MenuPriceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [activePrice, setActivePrice] = useState(currentPrice);
  const [error, setError] = useState("");

  const handleApplyPrice = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/menus/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: suggestedPrice }),
      });

      if (res.ok) {
        setActivePrice(suggestedPrice);
        setUpdated(true);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Harga belum berhasil diperbarui. Coba lagi.");
      }
    } catch (err) {
      console.error(err);
      setError("Sambungan terputus. Periksa internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {updated && (
        <div className="bg-bright-green p-2.5 font-mono text-xs font-bold text-ink brutal-border-2">
          Harga {menuName} sudah diperbarui menjadi {formatRupiah(activePrice)}.
        </div>
      )}
      {error && (
        <div role="alert" className="bg-critical-red p-2.5 text-xs font-bold text-white brutal-border-2">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={loading || updated}
          onClick={handleApplyPrice}
          className="brutal-btn flex-1 bg-bright-green px-4 py-3 text-sm font-heading font-extrabold text-ink disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : updated ? `Sudah Pakai ${formatRupiah(suggestedPrice)}` : "Gunakan Harga Ini"}
        </button>
        <Link
          href={`/dashboard/simulator?menu=${menuId}&price=${suggestedPrice}`}
          className="brutal-btn flex items-center justify-center bg-warning-yellow px-4 py-3 text-xs font-heading font-bold text-ink text-center"
        >
          Coba Perubahan Harga
        </Link>
      </div>
    </div>
  );
}
