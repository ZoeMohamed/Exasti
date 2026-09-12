"use client";
import { useState } from "react";
import { formatRupiah } from "@/lib/formatRupiah";
export default function BelanjaPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  function scan() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 900);
  }
  return (
    <div className="space-y-8">
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <span className="bg-bright-green px-2.5 py-0.5 font-mono text-xs font-bold brutal-border-2">
          OTOMATIS MASUK BUKU KAS
        </span>
        <h1 className="mt-2 font-heading text-3xl font-extrabold sm:text-4xl">
          “Foto nota, biar Takar yang baca.”
        </h1>
        <p className="mt-2 max-w-2xl text-ink/80">
          Foto nota dari pasar Johar atau toko kelontong. Pastikan hasilnya
          benar sebelum disimpan.
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="flex min-h-80 flex-col items-center justify-center bg-cream p-6 text-center border-2 border-dashed border-ink">
            <div className="mb-5 w-48 rotate-[-3deg] bg-white p-4 brutal-border-2 shadow-[2px_2px_0_#111]">
              <div className="font-mono text-[10px] leading-relaxed">
                PASAR PEDURUNGAN
                <br />
                AYAM KARKAS 2KG ........ 86.400
                <br />
                CABAI RAWIT 1KG ....... 87.000
                <br />
                MINYAK KITA 2L ........ 34.000
                <br />
                <b>TOTAL ................ 207.400</b>
              </div>
            </div>
            <button
              onClick={scan}
              disabled={loading}
              className="brutal-btn w-full max-w-xs bg-critical-red px-4 py-3 font-heading font-extrabold text-white"
            >
              {loading ? "“Lagi baca notamu…”" : "📷 Foto Nota Belanja"}
            </button>
            <button
              onClick={scan}
              className="brutal-btn mt-3 w-full max-w-xs bg-white px-4 py-2.5 text-xs font-heading font-bold"
            >
              Pilih Dari Galeri HP
            </button>
          </div>
          <div className="border-t-8 border-t-warning-yellow bg-cream-surface p-6 brutal-card">
            <span className="font-mono text-xs font-bold uppercase text-critical-red">
              Penting!
            </span>
            <h2 className="font-heading text-xl font-extrabold">
              “Cek dulu sebelum disimpan.”
            </h2>
            <p className="my-3 text-xs text-ink/70">
              Takar tidak pernah langsung menyimpan hasil scan tanpa
              persetujuanmu.
            </p>
            {done ? (
              <>
                {[
                  ["Daging Ayam Potong", 43200, "98%"],
                  ["Cabai Rawit Merah", 87000, "94%"],
                  ["Minyak Goreng Sawit", 17000, "Perlu dicek"],
                ].map(([name, price, accuracy]) => (
                  <div key={name} className="mb-3 bg-white p-3 brutal-border-2">
                    <div className="flex items-baseline justify-between">
                      <strong className="font-mono text-2xl text-critical-red">
                        {formatRupiah(price as number)}
                      </strong>
                      <span className="bg-bright-green/30 px-1.5 text-[10px] font-mono border border-ink">
                        Akurasi {accuracy}
                      </span>
                    </div>
                    <div className="text-xs font-bold">{name} (1 kg)</div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    alert(
                      "Harga bahan berhasil disimpan dan untung menu diperbarui!",
                    )
                  }
                  className="brutal-btn w-full bg-bright-green px-4 py-3 font-heading font-extrabold"
                >
                  Simpan Harga Ini
                </button>
              </>
            ) : (
              <div className="bg-warning-yellow/20 p-5 text-center font-heading font-bold brutal-border-2">
                Belum ada nota yang dipindai.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
