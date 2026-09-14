"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PANDUAN_PROGRESS_EVENT,
  selesaikanPanduan,
  simpanTahapPanduan,
} from "@/lib/onboarding-client";

type PosisiTarget = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type LangkahLayar = {
  target: string;
  judul: string;
  isi: string;
  labelLanjut?: string;
  harusKlikTarget?: boolean;
  validasi?: "nama-warung" | "wilayah" | "nama-menu" | "harga-menu" | "porsi" | "bahan" | "bahan-lengkap";
};

const TOTAL_TAHAP = 4;
const RUANG_TARGET = 8;
const LEBAR_POPOVER = 380;
const TINGGI_POPOVER_PERKIRAAN = 245;

const subscribeClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const LANGKAH_PENGATURAN: LangkahLayar[] = [
  {
    target: "settings-name",
    judul: "Tulis nama warungmu",
    isi: "Isi nama yang biasa dikenal pembeli. Data ini akan tampil sebagai identitas warungmu.",
    labelLanjut: "Nama sudah benar",
    validasi: "nama-warung",
  },
  {
    target: "settings-region",
    judul: "Pilih lokasi belanja",
    isi: "Pilih kota atau kabupaten tempat kamu biasa belanja. Takar memakai lokasi ini untuk harga pasar pembanding.",
    labelLanjut: "Lokasi sudah benar",
    validasi: "wilayah",
  },
  {
    target: "settings-save",
    judul: "Simpan pengaturan warung",
    isi: "Sekarang klik tombol yang disorot. Tutorial baru maju setelah data warung benar-benar berhasil disimpan.",
    harusKlikTarget: true,
  },
];

const LANGKAH_MENU: LangkahLayar[] = [
  {
    target: "menu-name",
    judul: "Masukkan nama menu",
    isi: "Gunakan nama menu yang benar-benar kamu jual, misalnya Ayam Geprek.",
    labelLanjut: "Nama menu sudah diisi",
    validasi: "nama-menu",
  },
  {
    target: "menu-price",
    judul: "Isi harga jual per porsi",
    isi: "Masukkan harga yang dibayar pembeli. Awalan Rp dan pemisah ribuan akan muncul otomatis.",
    labelLanjut: "Harga jual sudah diisi",
    validasi: "harga-menu",
  },
  {
    target: "menu-yield",
    judul: "Isi hasil sekali masak",
    isi: "Tulis berapa porsi yang biasanya dihasilkan dari satu kali memasak resep ini.",
    labelLanjut: "Jumlah porsi sudah diisi",
    validasi: "porsi",
  },
  {
    target: "menu-ingredient-search",
    judul: "Tambahkan bahan pertama",
    isi: "Cari bahan yang dipakai. Pilih saran yang ada, atau tambahkan bahan khas warungmu lalu isi cara pakai dan harga belanjanya.",
    labelLanjut: "Bahan sudah ditambahkan",
    validasi: "bahan",
  },
  {
    target: "menu-ingredient-card",
    judul: "Lengkapi jumlah dan harga bahan",
    isi: "Periksa cara pakai, jumlah, satuan, dan harga yang kamu bayar. Untuk bahan pasar, harga belanjamu sendiri boleh ditambahkan bila berbeda.",
    labelLanjut: "Data bahan sudah lengkap",
    validasi: "bahan-lengkap",
  },
  {
    target: "menu-costs",
    judul: "Catat kemasan dan biaya kecil",
    isi: "Kalau ada kemasan, gas, atau biaya lain, isi harga grosir dan pemakaiannya di sini. Boleh dilewati bila memang tidak ada.",
    labelLanjut: "Lanjut ke penyimpanan",
  },
  {
    target: "menu-save",
    judul: "Simpan menu pertamamu",
    isi: "Periksa isian bahan, lalu klik tombol yang disorot. Takar akan menghitung modal dari data nyata yang kamu masukkan.",
    harusKlikTarget: true,
  },
];

const LANGKAH_NOTA: LangkahLayar[] = [
  {
    target: "receipt-upload",
    judul: "Unggah nota belanja",
    isi: "Klik tombol yang disorot lalu pilih foto nota asli. Takar tidak menyimpan harga sebelum kamu memeriksa hasil bacaannya.",
    harusKlikTarget: true,
  },
  {
    target: "receipt-review",
    judul: "Periksa hasil bacaan",
    isi: "Cocokkan nama barang, jumlah, satuan, total bayar, dan bahan tujuan. Ubah baris yang keliru sebelum melanjutkan.",
    labelLanjut: "Semua baris sudah saya periksa",
  },
  {
    target: "receipt-save",
    judul: "Simpan harga belanja",
    isi: "Klik tombol yang disorot. Harga ini baru akan dipakai untuk menghitung modal setelah penyimpanan berhasil.",
    harusKlikTarget: true,
  },
];

const LANGKAH_HASIL: LangkahLayar[] = [
  {
    target: "dashboard-summary",
    judul: "Baca ringkasan warung",
    isi: "Lihat jumlah menu aktif, untung rata-rata per porsi, dan kondisi genting. Angka ini berasal dari data warungmu.",
    labelLanjut: "Saya paham ringkasannya",
  },
  {
    target: "dashboard-alerts",
    judul: "Dahulukan yang perlu perhatian",
    isi: "Bagian ini menaruh masalah paling mendesak di atas. Jika kosong, belum ada hal yang perlu kamu kejar hari ini.",
    labelLanjut: "Lanjut lihat kondisi menu",
  },
  {
    target: "dashboard-menus",
    judul: "Baca kondisi setiap menu",
    isi: "Di sini kamu bisa melihat menu sehat, tipis, atau rugi. Buka sebuah menu untuk melihat bahan penyebab dan tindakan yang disarankan.",
    labelLanjut: "Selesai, buka beranda",
  },
];

function elemenTerlihat(nama: string): HTMLElement | null {
  const kandidat = document.querySelectorAll<HTMLElement>(`[data-tour="${nama}"]`);
  for (const elemen of kandidat) {
    const rect = elemen.getBoundingClientRect();
    const style = window.getComputedStyle(elemen);
    if (rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden") {
      return elemen;
    }
  }
  return null;
}

function angkaInput(elemen: HTMLElement | null) {
  const input = elemen?.matches("input")
    ? elemen as HTMLInputElement
    : elemen?.querySelector<HTMLInputElement>("input");
  return Number((input?.value || "").replace(/[^0-9]/g, ""));
}

function pesanValidasi(langkah: LangkahLayar): string | null {
  const target = elemenTerlihat(langkah.target);
  if (langkah.validasi === "nama-warung" || langkah.validasi === "nama-menu") {
    const input = target?.matches("input")
      ? target as HTMLInputElement
      : target?.querySelector<HTMLInputElement>("input");
    return input?.value.trim() ? null : "Isi dulu kolom yang disorot.";
  }
  if (langkah.validasi === "wilayah") {
    const select = target?.matches("select")
      ? target as HTMLSelectElement
      : target?.querySelector<HTMLSelectElement>("select");
    return select?.value ? null : "Pilih dulu lokasi belanja warungmu.";
  }
  if (langkah.validasi === "harga-menu") {
    return angkaInput(target) >= 1_000 ? null : "Isi harga jual minimal Rp 1.000.";
  }
  if (langkah.validasi === "porsi") {
    return angkaInput(target) >= 1 ? null : "Isi hasil masak minimal 1 porsi.";
  }
  if (langkah.validasi === "bahan") {
    return document.querySelector('[data-tour="menu-ingredient-card"]')
      ? null
      : "Tambahkan minimal satu bahan terlebih dahulu.";
  }
  if (langkah.validasi === "bahan-lengkap") {
    const card = target;
    const invalid = card?.querySelector<HTMLInputElement | HTMLSelectElement>("input:invalid, select:invalid");
    if (invalid) return "Lengkapi dulu kolom bahan yang masih kosong atau tidak valid.";
    const harga = [...(card?.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]') ?? [])];
    if (harga.some((input) => angkaInput(input) < 1)) {
      return "Isi harga belanja bahan sebelum melanjutkan.";
    }
  }
  return null;
}

function ruteUntukTahap(tahap: number) {
  if (tahap === 1) return "/dashboard/pengaturan?tur=1";
  if (tahap === 2) return "/dashboard/menu/tambah?tur=2";
  if (tahap === 3) return "/dashboard/belanja?tur=3";
  return "/dashboard?tur=4";
}

function ruteSesuaiTahap(tahap: number, pathname: string) {
  if (tahap === 1) return pathname === "/dashboard" || pathname === "/dashboard/pengaturan";
  if (tahap === 2) return pathname === "/dashboard/menu/tambah";
  if (tahap === 3) return pathname === "/dashboard/belanja";
  return tahap === 4 && pathname === "/dashboard";
}

function langkahUntuk(tahap: number, pathname: string, mulai: boolean): LangkahLayar[] {
  if (tahap === 1 && pathname === "/dashboard" && mulai) {
    return [{
      target: "nav-settings",
      judul: "Buka Pengaturan Warung",
      isi: "Klik menu yang disorot. Di sana kamu akan mengisi nama warung dan lokasi belanja pada form yang sebenarnya.",
      harusKlikTarget: true,
    }];
  }
  if (tahap === 1 && pathname === "/dashboard/pengaturan") return LANGKAH_PENGATURAN;
  if (tahap === 2) return LANGKAH_MENU;
  if (tahap === 3) return LANGKAH_NOTA;
  if (tahap === 4) return LANGKAH_HASIL;
  return [];
}

function ModalDasar({
  children,
  labelId,
}: {
  children: React.ReactNode;
  labelId: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/75 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="w-full max-w-lg bg-white p-6 shadow-[8px_8px_0_#ffc107] brutal-border sm:p-8"
      >
        {children}
      </section>
    </div>
  );
}

export function TurInteraktif({
  businessId,
  initialStep,
  completed,
}: {
  businessId: string;
  initialStep: number;
  completed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const clientReady = useSyncExternalStore(
    subscribeClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [tahapLokal, setTahapLokal] = useState(initialStep);
  const [mulai, setMulai] = useState(false);
  const [ditunda, setDitunda] = useState(false);
  const [target, setTarget] = useState<PosisiTarget | null>(null);
  const [posisi, setPosisi] = useState({ layar: "", indeks: 0 });
  const [kesalahan, setKesalahan] = useState<{ layar: string; pesan: string | null }>({
    layar: "",
    pesan: null,
  });
  const [menyimpan, setMenyimpan] = useState(false);
  const tombolUtamaRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const kunciTunda = `takar:panduan-ditunda:v2:${businessId}`;
  const tahap = Math.max(initialStep, tahapLokal);
  const layar = `${tahap}:${pathname}`;
  const indeks = posisi.layar === layar ? posisi.indeks : 0;
  const error = kesalahan.layar === layar ? kesalahan.pesan : null;
  const disembunyikan = !clientReady || ditunda || sessionStorage.getItem(kunciTunda) === "1";

  const setIndeks = useCallback((next: number | ((current: number) => number)) => {
    setPosisi((current) => {
      const nilaiSekarang = current.layar === layar ? current.indeks : 0;
      return {
        layar,
        indeks: typeof next === "function" ? next(nilaiSekarang) : next,
      };
    });
  }, [layar]);

  const setError = useCallback((pesan: string | null) => {
    setKesalahan({ layar, pesan });
  }, [layar]);

  const tunda = useCallback(() => {
    sessionStorage.setItem(kunciTunda, "1");
    setDitunda(true);
  }, [kunciTunda]);

  useEffect(() => {
    function terimaProgres(event: Event) {
      const detail = (event as CustomEvent<{ tahap?: number }>).detail;
      if (detail?.tahap) setTahapLokal(detail.tahap);
    }
    window.addEventListener(PANDUAN_PROGRESS_EVENT, terimaProgres);
    return () => window.removeEventListener(PANDUAN_PROGRESS_EVENT, terimaProgres);
  }, []);

  useEffect(() => {
    if (tahap !== 1 || pathname !== "/dashboard" || !mulai || disembunyikan) return;
    function bukaPengaturan(event: MouseEvent) {
      const asal = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-tour="nav-settings"]')
        : null;
      if (!asal) return;
      event.preventDefault();
      router.push("/dashboard/pengaturan?tur=1");
    }
    document.addEventListener("click", bukaPengaturan, true);
    return () => document.removeEventListener("click", bukaPengaturan, true);
  }, [disembunyikan, mulai, pathname, router, tahap]);

  useEffect(() => {
    if (disembunyikan || tahap > 3) return;
    const halamanFormBenar =
      (tahap === 1 && pathname === "/dashboard/pengaturan") ||
      (tahap === 2 && pathname === "/dashboard/menu/tambah") ||
      (tahap === 3 && pathname === "/dashboard/belanja");
    if (!halamanFormBenar) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tur") === String(tahap)) return;
    params.set("tur", String(tahap));
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }, [disembunyikan, pathname, tahap]);

  const langkah = useMemo(
    () => langkahUntuk(tahap, pathname, mulai),
    [tahap, pathname, mulai],
  );
  const langkahAktif = langkah[Math.min(indeks, Math.max(0, langkah.length - 1))];
  const perluSambutan = tahap === 1 && pathname === "/dashboard" && !mulai;
  const salahHalaman = !ruteSesuaiTahap(tahap, pathname);

  const perbaruiTarget = useCallback(() => {
    if (!langkahAktif || disembunyikan || perluSambutan || salahHalaman) {
      setTarget(null);
      return;
    }
    const elemen = elemenTerlihat(langkahAktif.target);
    if (!elemen) {
      setTarget(null);
      return;
    }
    const rect = elemen.getBoundingClientRect();
    const top = Math.max(0, rect.top - RUANG_TARGET);
    const left = Math.max(0, rect.left - RUANG_TARGET);
    const right = Math.min(window.innerWidth, rect.right + RUANG_TARGET);
    const bottom = Math.min(window.innerHeight, rect.bottom + RUANG_TARGET);
    const next = {
      top,
      left,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
    setTarget((current) => current &&
      current.top === next.top &&
      current.left === next.left &&
      current.right === next.right &&
      current.bottom === next.bottom
      ? current
      : next);
  }, [disembunyikan, langkahAktif, perluSambutan, salahHalaman]);

  useLayoutEffect(() => {
    if (!langkahAktif || disembunyikan || perluSambutan || salahHalaman) return;
    let frame = requestAnimationFrame(() => {
      const elemen = elemenTerlihat(langkahAktif.target);
      if (elemen) {
        const rect = elemen.getBoundingClientRect();
        if (rect.top < 72 || rect.bottom > window.innerHeight - 88) {
          elemen.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (elemen.matches("input, select")) elemen.focus({ preventScroll: true });
      }
      perbaruiTarget();
    });
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(perbaruiTarget);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", perbaruiTarget);
    window.addEventListener("scroll", perbaruiTarget, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", perbaruiTarget);
      window.removeEventListener("scroll", perbaruiTarget);
    };
  }, [disembunyikan, langkahAktif, perbaruiTarget, perluSambutan, salahHalaman]);

  useEffect(() => {
    if (tahap !== 3 || indeks !== 0 || pathname !== "/dashboard/belanja") return;
    const observer = new MutationObserver(() => {
      if (elemenTerlihat("receipt-review")) setIndeks(1);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [indeks, pathname, setIndeks, tahap]);

  useEffect(() => {
    if (disembunyikan) return;
    function tekanEscape(event: KeyboardEvent) {
      if (event.key === "Escape") tunda();
    }
    window.addEventListener("keydown", tekanEscape);
    return () => window.removeEventListener("keydown", tekanEscape);
  }, [disembunyikan, tunda]);

  useEffect(() => {
    if (!disembunyikan && (perluSambutan || salahHalaman)) tombolUtamaRef.current?.focus();
  }, [disembunyikan, perluSambutan, salahHalaman]);

  function mulaiSekarang() {
    sessionStorage.removeItem(kunciTunda);
    setDitunda(false);
    setMulai(true);
  }

  function lanjut() {
    if (!langkahAktif) return;
    const pesan = pesanValidasi(langkahAktif);
    if (pesan) {
      setError(pesan);
      elemenTerlihat(langkahAktif.target)?.focus({ preventScroll: true });
      return;
    }
    setError(null);
    if (tahap === 4 && indeks === langkah.length - 1) {
      void selesai();
      return;
    }
    setIndeks((current) => Math.min(current + 1, langkah.length - 1));
  }

  async function lewatiNota() {
    setMenyimpan(true);
    setError(null);
    try {
      await simpanTahapPanduan(4);
      router.push("/dashboard?tur=4");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Belum bisa melanjutkan.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function selesai() {
    setMenyimpan(true);
    setError(null);
    try {
      await selesaikanPanduan();
      sessionStorage.removeItem(kunciTunda);
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Belum bisa menyelesaikan panduan.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (completed || tahap >= 5 || disembunyikan) return null;

  if (perluSambutan) {
    return (
      <ModalDasar labelId="judul-sambutan-takar">
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink/60">
          Pertama kali di Takar
        </p>
        <h2 id="judul-sambutan-takar" className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl">
          Mari siapkan warungmu
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-ink/75 sm:text-base">
          Kamu akan mengisi langsung di halaman asli. Data yang disimpan menjadi data warungmu,
          bukan latihan atau contoh.
        </p>
        <ol className="mt-5 grid gap-2 font-heading text-sm font-bold sm:grid-cols-2">
          <li className="bg-cream p-3 brutal-border-2">1. Nama dan lokasi warung</li>
          <li className="bg-cream p-3 brutal-border-2">2. Menu, bahan, dan kemasan</li>
          <li className="bg-cream p-3 brutal-border-2">3. Harga dari nota belanja</li>
          <li className="bg-cream p-3 brutal-border-2">4. Cara membaca hasil</li>
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={tombolUtamaRef}
            type="button"
            onClick={mulaiSekarang}
            className="brutal-btn min-h-11 flex-1 bg-warning-yellow px-5 py-3 font-heading font-extrabold"
          >
            Mulai siapkan warung
          </button>
          <button type="button" onClick={tunda} className="min-h-11 px-4 py-2 text-sm font-bold underline underline-offset-4">
            Nanti saja
          </button>
        </div>
      </ModalDasar>
    );
  }

  if (salahHalaman) {
    return (
      <ModalDasar labelId="judul-lanjut-panduan">
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink/60">
          Tahap {tahap} dari {TOTAL_TAHAP}
        </p>
        <h2 id="judul-lanjut-panduan" className="mt-2 font-heading text-3xl font-extrabold">
          Lanjutkan penyiapan warung
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/75">
          Data sebelumnya sudah aman. Lanjutkan dari halaman kerja terakhir agar tidak perlu mengulang.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={tombolUtamaRef}
            type="button"
            onClick={() => router.push(ruteUntukTahap(tahap))}
            className="brutal-btn min-h-11 flex-1 bg-warning-yellow px-5 py-3 font-heading font-extrabold"
          >
            Lanjutkan sekarang
          </button>
          <button type="button" onClick={tunda} className="min-h-11 px-4 py-2 text-sm font-bold underline underline-offset-4">
            Nanti saja
          </button>
        </div>
      </ModalDasar>
    );
  }

  if (!langkahAktif) return null;

  if (!target) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-4">
        <div role="status" className="bg-white p-5 font-mono text-sm font-bold shadow-[6px_6px_0_#ffc107] brutal-border">
          Menyiapkan bagian yang akan diisi…
        </div>
      </div>
    );
  }

  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const mobile = viewportWidth < 768;
  const lebarPopover = Math.min(LEBAR_POPOVER, viewportWidth - 24);
  let popoverStyle: CSSProperties;
  if (mobile) {
    popoverStyle = target.top > viewportHeight * 0.55
      ? { left: 12, right: 12, bottom: Math.max(76, viewportHeight - target.top + 14) }
      : { left: 12, right: 12, bottom: 76 };
  } else if (target.right + 18 + lebarPopover <= viewportWidth - 12) {
    popoverStyle = {
      left: target.right + 18,
      top: Math.max(12, Math.min(target.top, viewportHeight - TINGGI_POPOVER_PERKIRAAN - 12)),
      width: lebarPopover,
    };
  } else if (target.left - 18 - lebarPopover >= 12) {
    popoverStyle = {
      left: target.left - 18 - lebarPopover,
      top: Math.max(12, Math.min(target.top, viewportHeight - TINGGI_POPOVER_PERKIRAAN - 12)),
      width: lebarPopover,
    };
  } else {
    popoverStyle = {
      left: Math.max(12, Math.min(target.left, viewportWidth - lebarPopover - 12)),
      top: target.bottom + TINGGI_POPOVER_PERKIRAAN + 24 <= viewportHeight
        ? target.bottom + 14
        : Math.max(12, target.top - TINGGI_POPOVER_PERKIRAAN - 14),
      width: lebarPopover,
    };
  }

  const masker: CSSProperties[] = [
    { left: 0, top: 0, right: 0, height: target.top },
    { left: 0, top: target.top, width: target.left, height: target.height },
    { left: target.right, top: target.top, right: 0, height: target.height },
    { left: 0, top: target.bottom, right: 0, bottom: 0 },
  ];

  return (
    <>
      {masker.map((style, itemIndex) => (
        <div key={itemIndex} aria-hidden="true" className="fixed z-[70] bg-ink/75" style={style} />
      ))}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[80] border-4 border-warning-yellow shadow-[0_0_0_3px_#111,6px_6px_0_#111]"
        style={{ left: target.left, top: target.top, width: target.width, height: target.height }}
      />
      <section
        ref={popoverRef}
        role="dialog"
        aria-labelledby="judul-langkah-tour"
        className="fixed z-[90] max-h-[calc(100vh-100px)] overflow-y-auto bg-white p-5 shadow-[7px_7px_0_#ffc107] brutal-border"
        style={popoverStyle}
      >
        <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60">
          Tahap {tahap} dari {TOTAL_TAHAP} · petunjuk {indeks + 1} dari {langkah.length}
        </p>
        <h2 id="judul-langkah-tour" className="mt-1 font-heading text-2xl font-extrabold">
          {langkahAktif.judul}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink/75">
          {langkahAktif.isi}
        </p>
        {error ? <p role="alert" className="mt-3 bg-critical-red/10 p-2 text-xs font-bold text-critical-red brutal-border-2">{error}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {indeks > 0 ? (
            <button type="button" onClick={() => setIndeks((current) => current - 1)} className="min-h-11 px-2 text-sm font-bold underline underline-offset-4">
              Kembali
            </button>
          ) : null}
          {!langkahAktif.harusKlikTarget ? (
            <button
              type="button"
              onClick={lanjut}
              disabled={menyimpan}
              className="brutal-btn ml-auto min-h-11 bg-warning-yellow px-4 py-2.5 font-heading text-sm font-extrabold disabled:opacity-50"
            >
              {menyimpan ? "Menyimpan…" : langkahAktif.labelLanjut || "Lanjut"}
            </button>
          ) : (
            <p className="ml-auto font-mono text-[11px] font-bold text-ink/60">Klik bagian yang disorot</p>
          )}
        </div>
        {tahap === 3 && indeks === 0 ? (
          <button
            type="button"
            onClick={lewatiNota}
            disabled={menyimpan}
            className="mt-3 min-h-11 w-full text-sm font-bold underline underline-offset-4 disabled:opacity-50"
          >
            {menyimpan ? "Menyimpan…" : "Belum punya nota, lewati dulu"}
          </button>
        ) : null}
        <button type="button" onClick={tunda} className="mt-2 min-h-10 w-full text-xs font-semibold text-ink/60 underline underline-offset-4">
          Nanti saja
        </button>
      </section>
    </>
  );
}
