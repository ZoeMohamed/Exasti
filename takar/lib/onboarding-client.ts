"use client";

export const PANDUAN_PROGRESS_EVENT = "takar:panduan-progress";

type OnboardingPayload =
  | { action: "progress"; step: number }
  | { action: "complete" };

async function ubahProgres(payload: OnboardingPayload) {
  const response = await fetch("/api/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Progres panduan belum berhasil disimpan.");
  }

  const tahap = payload.action === "complete" ? 5 : payload.step;
  window.dispatchEvent(
    new CustomEvent(PANDUAN_PROGRESS_EVENT, { detail: { tahap } }),
  );
}

export function simpanTahapPanduan(step: number) {
  return ubahProgres({ action: "progress", step });
}

export function selesaikanPanduan() {
  return ubahProgres({ action: "complete" });
}
