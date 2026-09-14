"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { JUMLAH_LANGKAH_PANDUAN } from "@/lib/onboarding";

interface RegionOption {
  id: number;
  name: string;
}

interface OnboardingGuideProps {
  initialStep: number;
  initialCompleted: boolean;
  initialName: string;
  initialRegionId: number;
  regions: RegionOption[];
  menuCount: number;
}

const LANGKAH = [
  { nomor: 1, pendek: "Warung", judul: "Kenalkan warungmu" },
  { nomor: 2, pendek: "Menu", judul: "Masukkan menu pertama" },
  { nomor: 3, pendek: "Belanja", judul: "Catat harga belanja" },
  { nomor: 4, pendek: "Angka", judul: "Baca hasil hitungan" },
  { nomor: 5, pendek: "Siap", judul: "Kenali semua halaman" },
] as const;

const PETA_HALAMAN = [
  {
    nama: "Beranda",
    href: "/dashboard",
    penjelasan: "Lihat menu yang sehat, tipis, atau rugi dan tiga hal paling mendesak hari ini.",
  },
  {
    nama: "Daftar Menu",
    href: "/dashboard/menu",
    penjelasan: "Buka rincian modal, bahan penyebab, serta ubah harga atau resep sebuah menu.",
  },
  {
    nama: "Tambah Menu",
    href: "/dashboard/menu/tambah",
    penjelasan: "Masukkan harga jual, hasil sekali masak, bahan, kemasan, dan biaya kecil.",
  },
  {
    nama: "Catat Nota Belanja",
    href: "/dashboard/belanja",
    penjelasan: "Foto nota, periksa hasil bacaannya, lalu gunakan harga belanja warungmu.",
  },
  {
    nama: "Coba Perubahan Harga",
    href: "/dashboard/simulator",
    penjelasan: "Geser harga bahan untuk melihat apa yang terjadi pada untung tanpa mengubah data asli.",
  },
  {
    nama: "Pengaturan Warung",
    href: "/dashboard/pengaturan",
    penjelasan: "Ubah nama dan kota acuan harga pasar, atau keluar dari akun.",
  },
] as const;

async function kirimProgres(step: number) {
  const response = await fetch("/api/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "progress", step }),
  });
  if (!response.ok) throw new Error("Progres panduan belum tersimpan.");
}

export function OnboardingGuide({
  initialStep,
  initialCompleted,
  initialName,
  initialRegionId,
  regions,
  menuCount,
}: OnboardingGuideProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(initialName === "Warungku" ? "" : initialName);
  const [regionId, setRegionId] = useState(initialRegionId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const langkahAktif = LANGKAH[step - 1];

  function fokusJudul() {
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function tampilkanLangkah(nextStep: number) {
    setStep(nextStep);
    window.history.replaceState(null, "", `/dashboard/panduan?langkah=${nextStep}`);
    fokusJudul();
  }

  async function pindahLangkah(nextStep: number) {
    setError(null);
    tampilkanLangkah(nextStep);
    if (!initialCompleted && nextStep > initialStep) {
      try {
        await kirimProgres(nextStep);
      } catch {
        setError("Panduan tetap bisa dilanjutkan, tetapi progresnya belum tersimpan. Periksa koneksi internetmu.");
      }
    }
  }

  async function simpanWarung(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Isi nama warung minimal 2 huruf.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, regionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Profil warung belum tersimpan.");
      await kirimProgres(2);
      tampilkanLangkah(2);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profil warung belum tersimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function selesaikanPanduan() {
    if (initialCompleted) {
      router.push("/dashboard");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (!response.ok) throw new Error("Panduan belum berhasil ditandai selesai.");
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Panduan belum berhasil ditandai selesai.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <header className="bg-white p-5 shadow-[4px_4px_0_#111] brutal-border sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink/60">
              Panduan awal Takar
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 font-heading text-3xl font-extrabold outline-none sm:text-4xl"
            >
              {langkahAktif.judul}
            </h1>
          </div>
          <div className="w-fit bg-warning-yellow px-3 py-2 font-mono text-xs font-bold brutal-border-2">
            Langkah {step} dari {JUMLAH_LANGKAH_PANDUAN}
          </div>
        </div>

        <nav className="mt-6 grid grid-cols-5 gap-1.5" aria-label="Tahapan panduan">
          {LANGKAH.map((item) => {
            const aktif = item.nomor === step;
            const lewat = item.nomor < step || initialCompleted;
            return (
              <button
                key={item.nomor}
                type="button"
                aria-current={aktif ? "step" : undefined}
                aria-label={`Langkah ${item.nomor}: ${item.judul}`}
                onClick={() => pindahLangkah(item.nomor)}
                className={`min-h-12 border-2 border-ink px-1.5 py-2 text-center font-heading text-[10px] font-bold sm:text-xs ${
                  aktif ? "bg-warning-yellow shadow-[2px_2px_0_#111]" : lewat ? "bg-bright-green/30" : "bg-cream"
                }`}
              >
                <span className="block font-mono text-xs sm:hidden">{item.nomor}</span>
                <span className="hidden sm:block">{item.nomor}. {item.pendek}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {error ? (
        <div role="alert" className="bg-critical-red/10 p-4 font-semibold text-critical-red brutal-border-2">
          {error}
        </div>
      ) : null}

      <main className="bg-cream-surface p-5 shadow-[4px_4px_0_#111] brutal-border sm:p-7">
        {step === 1 ? (
          <LangkahWarung
            name={name}
            regionId={regionId}
            regions={regions}
            saving={saving}
            onNameChange={setName}
            onRegionChange={setRegionId}
            onSubmit={simpanWarung}
          />
        ) : null}
        {step === 2 ? <LangkahMenu menuCount={menuCount} onNext={() => pindahLangkah(3)} /> : null}
        {step === 3 ? <LangkahBelanja onBack={() => pindahLangkah(2)} onNext={() => pindahLangkah(4)} /> : null}
        {step === 4 ? <LangkahAngka onBack={() => pindahLangkah(3)} onNext={() => pindahLangkah(5)} /> : null}
        {step === 5 ? (
          <LangkahSiap
            alreadyCompleted={initialCompleted}
            saving={saving}
            onBack={() => pindahLangkah(4)}
            onComplete={selesaikanPanduan}
            onRepeat={() => pindahLangkah(1)}
          />
        ) : null}
      </main>

      <p className="px-2 text-center text-xs leading-relaxed text-ink/60">
        Kamu bisa keluar dari panduan kapan saja. Progres tersimpan dan menu “Panduan Takar” selalu tersedia untuk membukanya lagi.
      </p>
    </div>
  );
}

function LangkahWarung({
  name,
  regionId,
  regions,
  saving,
  onNameChange,
  onRegionChange,
  onSubmit,
}: {
  name: string;
  regionId: number;
  regions: RegionOption[];
  saving: boolean;
  onNameChange: (value: string) => void;
  onRegionChange: (value: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section aria-labelledby="judul-warung">
      <h2 id="judul-warung" className="font-heading text-2xl font-extrabold">Mulai dari data paling dasar</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/75 sm:text-base">
        Nama dipakai untuk mengenali warungmu. Kota menentukan harga pasar ayam, beras, cabai, dan bahan lain yang dipakai Takar sebagai acuan.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <label className="block max-w-2xl font-heading text-sm font-bold">
          Nama warung
          <input
            required
            autoFocus
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Contoh: Warung Makan Bu Sari"
            className="mt-1.5 min-h-12 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
          />
          <span className="mt-1.5 block font-sans text-xs font-normal text-ink/60">
            Bisa diubah lagi dari Pengaturan Warung.
          </span>
        </label>

        <label className="block max-w-2xl font-heading text-sm font-bold">
          Kota atau kabupaten acuan harga pasar
          <select
            value={regionId}
            onChange={(event) => onRegionChange(Number(event.target.value))}
            className="mt-1.5 min-h-12 w-full bg-white p-3 font-mono brutal-border-2 focus:bg-warning-yellow/10 focus:outline-none"
          >
            {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
          <span className="mt-1.5 block font-sans text-xs font-normal text-ink/60">
            Pilihan yang tersedia mengikuti kota yang sudah memiliki data harga harian.
          </span>
        </label>

        <div className="max-w-2xl bg-warning-yellow/20 p-4 text-sm leading-relaxed brutal-border-2">
          Harga kemasan, gas, bumbu kecil, dan alat makan tidak disamaratakan. Kamu akan mengisinya sendiri untuk setiap menu karena harga grosir tiap warung berbeda.
        </div>

        <button type="submit" disabled={saving} className="brutal-btn min-h-12 bg-ink px-6 py-3 font-heading font-extrabold text-white disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan dan lanjut ke menu"}
        </button>
      </form>
    </section>
  );
}

function LangkahMenu({ menuCount, onNext }: { menuCount: number; onNext: () => void }) {
  const fields = [
    ["Nama menu", "Tulis nama yang biasa kamu pakai, misalnya Ayam Geprek."],
    ["Harga jual", "Ketik angka saja. Tanda Rp dan titik ribuan muncul otomatis."],
    ["Hasil sekali masak", "Isi jumlah porsi yang benar-benar jadi dari satu kali masak."],
    ["Perkiraan laku", "Boleh kosong. Angka ini hanya membantu mengurutkan menu yang paling berdampak."],
    ["Bahan", "Cari bahan pasar atau buat bahan khas warungmu, lalu isi jumlah yang dipakai sekali masak."],
    ["Kemasan dan biaya kecil", "Isi harga satu pak grosir, isi pak, lalu berapa yang dipakai untuk satu porsi."],
  ] as const;

  return (
    <section aria-labelledby="judul-menu">
      <h2 id="judul-menu" className="font-heading text-2xl font-extrabold">Takar menghitung dari resep nyata</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/75 sm:text-base">
        Mulai dengan satu menu yang paling sering terjual. Tidak perlu menghitung modal per porsi sendiri—cukup ceritakan satu kali masak memakai apa saja.
      </p>

      {menuCount > 0 ? (
        <div className="mt-5 bg-bright-green/25 p-4 brutal-border-2">
          <strong className="font-heading">Menu pertama sudah ada.</strong>
          <p className="mt-1 text-sm text-ink/70">Kamu sudah punya {menuCount} menu aktif dan bisa langsung melanjutkan panduan.</p>
        </div>
      ) : null}

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, description], index) => (
          <li key={label} className="flex gap-3 bg-white p-4 brutal-border-2">
            <span className="flex size-7 shrink-0 items-center justify-center bg-ink font-mono text-xs font-bold text-white">{index + 1}</span>
            <div><strong className="font-heading text-sm">{label}</strong><p className="mt-0.5 text-xs leading-relaxed text-ink/65">{description}</p></div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {menuCount === 0 ? (
          <Link href="/dashboard/menu/tambah?dari=panduan" className="brutal-btn min-h-12 bg-critical-red px-6 py-3 text-center font-heading font-extrabold text-white">
            Isi Menu Pertama
          </Link>
        ) : null}
        <button type="button" onClick={onNext} className="brutal-btn min-h-12 bg-warning-yellow px-6 py-3 font-heading font-extrabold">
          {menuCount > 0 ? "Lanjut ke harga belanja" : "Lewati dulu"}
        </button>
      </div>
    </section>
  );
}

function LangkahBelanja({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const stages = [
    ["Ambil foto", "Foto seluruh nota dengan cahaya cukup dan tulisan tidak terpotong."],
    ["Periksa bacaan", "Cocokkan nama barang, jumlah, satuan, dan total bayar. Kamu tetap boleh mengubah semuanya."],
    ["Hubungkan bahan", "Pastikan setiap barang terhubung ke bahan menu yang benar sebelum menyimpan."],
    ["Simpan setelah yakin", "Harga dari nota akan dipakai lebih dulu agar modal mengikuti harga belanja warungmu."],
  ] as const;

  return (
    <section aria-labelledby="judul-belanja">
      <h2 id="judul-belanja" className="font-heading text-2xl font-extrabold">Foto membantu, keputusan tetap milikmu</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/75 sm:text-base">
        Takar tidak langsung menyimpan hasil bacaan foto. Selalu ada layar pemeriksaan supaya salah nama, satuan, atau angka bisa dibetulkan dahulu.
      </p>
      <ol className="mt-6 space-y-3">
        {stages.map(([label, description], index) => (
          <li key={label} className="grid gap-2 bg-white p-4 brutal-border-2 sm:grid-cols-[56px_170px_1fr] sm:items-center">
            <span className="font-mono text-2xl font-black">{index + 1}</span>
            <strong className="font-heading">{label}</strong>
            <p className="text-sm leading-relaxed text-ink/65">{description}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 bg-warning-yellow/20 p-4 text-sm leading-relaxed brutal-border-2">
        Jika foto bukan nota atau tidak berisi nama barang dan harga yang jelas, Takar akan menolaknya. Tidak ada angka yang dibuat-buat dan tidak ada harga yang tersimpan tanpa persetujuanmu.
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onBack} className="min-h-12 px-5 py-3 font-heading font-bold underline underline-offset-4">Kembali</button>
        <Link href="/dashboard/belanja" className="brutal-btn min-h-12 bg-white px-6 py-3 text-center font-heading font-bold">Lihat Halaman Nota</Link>
        <button type="button" onClick={onNext} className="brutal-btn min-h-12 bg-warning-yellow px-6 py-3 font-heading font-extrabold">Saya mengerti, lanjut</button>
      </div>
    </section>
  );
}

function LangkahAngka({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <section aria-labelledby="judul-angka">
      <h2 id="judul-angka" className="font-heading text-2xl font-extrabold">Empat angka yang perlu kamu pahami</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/75 sm:text-base">
        Takar menyederhanakan resep dan harga belanja menjadi jawaban: berapa modal, berapa sisa uang, dan menu mana yang perlu dilihat dulu.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <PenjelasanAngka label="Modal per porsi" value="Rp 12.000" description="Semua bahan, kemasan, gas, dan biaya kecil untuk membuat satu porsi." />
        <PenjelasanAngka label="Untung per porsi" value="Rp 6.000" description="Harga jual Rp 18.000 dikurangi modal Rp 12.000. Belum dikurangi sewa, listrik bulanan, dan gaji pemilik." tone="green" />
        <PenjelasanAngka label="Margin" value="33,3%" description="Dari setiap Rp 100 penjualan, sekitar Rp 33 tersisa setelah modal per porsi." />
        <PenjelasanAngka label="Dampak mingguan" value="Perkiraan" description="Untung per porsi dikali perkiraan porsi terjual. Dipakai untuk mengurutkan yang paling penting." />
      </div>

      <div className="mt-6 overflow-hidden brutal-border-2">
        <div className="bg-ink p-3 font-heading font-extrabold text-white">Cara membaca kondisi menu</div>
        <div className="grid sm:grid-cols-3">
          <div className="bg-bright-green/25 p-4 sm:border-r-2 sm:border-ink"><strong className="font-heading">Sehat: 20% ke atas</strong><p className="mt-1 text-xs text-ink/65">Masih memiliki ruang untung yang cukup.</p></div>
          <div className="border-y-2 border-ink bg-warning-yellow/25 p-4 sm:border-y-0 sm:border-r-2"><strong className="font-heading">Tipis: 0–19,9%</strong><p className="mt-1 text-xs text-ink/65">Perlu diperhatikan sebelum kenaikan bahan menghabiskan untung.</p></div>
          <div className="bg-critical-red/10 p-4"><strong className="font-heading">Rugi: di bawah 0%</strong><p className="mt-1 text-xs text-ink/65">Harga jual lebih kecil daripada modal per porsi.</p></div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="bg-white p-4 brutal-border-2"><strong className="font-heading">Yang Perlu Kamu Perhatikan</strong><p className="mt-1 text-sm leading-relaxed text-ink/65">Berisi paling banyak tiga peringatan penting. “Kosong” berarti tidak ada yang perlu dikejar hari itu.</p></div>
        <div className="bg-white p-4 brutal-border-2"><strong className="font-heading">Tanggal harga pasar</strong><p className="mt-1 text-sm leading-relaxed text-ink/65">Menunjukkan tanggal harga asli diterbitkan, bukan sekadar tanggal saat kamu membuka aplikasi.</p></div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onBack} className="min-h-12 px-5 py-3 font-heading font-bold underline underline-offset-4">Kembali</button>
        <button type="button" onClick={onNext} className="brutal-btn min-h-12 bg-warning-yellow px-6 py-3 font-heading font-extrabold">Lanjut ke peta aplikasi</button>
      </div>
    </section>
  );
}

function PenjelasanAngka({ label, value, description, tone }: { label: string; value: string; description: string; tone?: "green" }) {
  return (
    <article className={`p-4 brutal-border-2 ${tone === "green" ? "bg-bright-green/25" : "bg-white"}`}>
      <p className="font-mono text-xs font-bold uppercase text-ink/60">{label}</p>
      <p className={`mt-1 font-heading text-3xl font-extrabold ${tone === "green" ? "text-accent-green" : ""}`}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-ink/65">{description}</p>
    </article>
  );
}

function LangkahSiap({
  alreadyCompleted,
  saving,
  onBack,
  onComplete,
  onRepeat,
}: {
  alreadyCompleted: boolean;
  saving: boolean;
  onBack: () => void;
  onComplete: () => void;
  onRepeat: () => void;
}) {
  return (
    <section aria-labelledby="judul-siap">
      <h2 id="judul-siap" className="font-heading text-2xl font-extrabold">
        {alreadyCompleted ? "Panduanmu sudah selesai" : "Kamu sudah siap memakai Takar"}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/75 sm:text-base">
        Tidak perlu mengerjakan semuanya sekaligus. Mulai dari satu menu, perbaiki datanya saat belanja, lalu periksa Beranda untuk melihat perubahan untung.
      </p>

      <div className="mt-6 divide-y-2 divide-ink overflow-hidden brutal-border-2">
        {PETA_HALAMAN.map((item) => (
          <div key={item.href} className="grid gap-2 bg-white p-4 sm:grid-cols-[190px_1fr_auto] sm:items-center">
            <strong className="font-heading">{item.nama}</strong>
            <p className="text-sm leading-relaxed text-ink/65">{item.penjelasan}</p>
            <Link href={item.href} className="min-h-11 px-3 py-2 text-sm font-bold underline underline-offset-4">Buka halaman</Link>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {!alreadyCompleted ? <button type="button" onClick={onBack} className="min-h-12 px-5 py-3 font-heading font-bold underline underline-offset-4">Kembali</button> : null}
        <button type="button" onClick={onComplete} disabled={saving} className="brutal-btn min-h-12 bg-bright-green px-6 py-3 font-heading font-extrabold disabled:opacity-50">
          {saving ? "Menyimpan..." : alreadyCompleted ? "Kembali ke Beranda" : "Selesai, buka Beranda"}
        </button>
        {alreadyCompleted ? <button type="button" onClick={onRepeat} className="min-h-12 px-5 py-3 font-heading font-bold underline underline-offset-4">Ulangi dari awal</button> : null}
      </div>
    </section>
  );
}
