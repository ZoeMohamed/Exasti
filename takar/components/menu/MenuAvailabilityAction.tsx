"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MenuAvailabilityAction({
  menuId,
  active,
}: {
  menuId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/menus/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!response.ok) throw new Error("Perubahan belum tersimpan.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Perubahan belum tersimpan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className="brutal-btn min-h-11 bg-white px-3 py-1.5 font-mono text-xs font-bold disabled:opacity-60"
      >
        {pending
          ? "Menyimpan…"
          : active
            ? "Istirahatkan Menu"
            : "Jual Menu Lagi"}
      </button>
      {error ? <span role="alert" className="text-xs font-bold text-critical-red">{error}</span> : null}
    </div>
  );
}
