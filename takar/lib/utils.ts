import type { MenuStatus } from "@/types/menu";
export function statusLabel(status: MenuStatus) {
  return status === "sehat"
    ? "SEHAT"
    : status === "tipis"
      ? "TIPIS"
      : status === "rugi"
        ? "RUGI"
        : "DIISTIRAHATKAN";
}
export function statusClass(status: MenuStatus) {
  if (status === "diistirahatkan") return "bg-ink/15 text-ink";
  return status === "sehat"
    ? "bg-bright-green text-ink"
    : status === "tipis"
      ? "bg-warning-yellow text-ink"
      : "bg-critical-red text-white";
}
