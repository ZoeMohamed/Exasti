// lib/tanggal.ts
// Postgres mengembalikan kolom `date` sebagai Date tengah malam WAKTU LOKAL.
// Memanggil toISOString() menggesernya ke UTC dan bisa memundurkan satu hari —
// tanggal 11 Sep tersimpan tampil jadi 10 Sep. Selalu pakai komponen lokal.

export function keIsoTanggal(nilai: Date | string | null | undefined): string | null {
  if (!nilai) return null;
  if (typeof nilai === "string") return nilai.slice(0, 10);
  const t = nilai.getFullYear();
  const b = String(nilai.getMonth() + 1).padStart(2, "0");
  const h = String(nilai.getDate()).padStart(2, "0");
  return `${t}-${b}-${h}`;
}

const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export function tanggalIndonesia(nilai: Date | string | null | undefined): string {
  const iso = keIsoTanggal(nilai);
  if (!iso) return "—";
  const [t, b, h] = iso.split("-");
  return `${Number(h)} ${BULAN[Number(b) - 1]} ${t}`;
}
