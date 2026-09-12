"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/formatRupiah";
import type { ParsedItem, OcrResponsePayload } from "@/lib/ai/ocr";

export default function BelanjaPage() {
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResponsePayload | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fungsi memanggil API OCR /api/ai/parse-nota
  async function processReceipt(payload: { imageBase64?: string; sampleId?: string; mimeType?: string }) {
    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);
    setStatusStep("Mengirim gambar nota...");

    try {
      setTimeout(() => setStatusStep("Google Gemini Flash sedang membaca baris nota..."), 500);
      setTimeout(() => setStatusStep("Mencocokkan bahan dengan 21 komoditas Bank Indonesia..."), 1200);

      const res = await fetch("/api/ai/parse-nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: OcrResponsePayload = await res.json();

      if (!res.ok || !data.success) {
        throw new Error((data as any).error || "Gagal memproses pembacaan nota.");
      }

      setOcrResult(data);
      setItems(data.items);
    } catch (err: any) {
      console.error("Gagal scan:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses nota.");
    } finally {
      setLoading(false);
      setStatusStep("");
    }
  }

  // Handle upload file dari kamera / galeri
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImage(result);
      const base64Data = result.split(",")[1];
      processReceipt({ imageBase64: base64Data, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  // Handle pemilihan nota sampel demo (Mode Pesawat / Uji Cepat)
  function handleSelectSample(sampleId: string) {
    setReceiptImage(null);
    processReceipt({ sampleId });
  }

  // Edit baris item di layar konfirmasi (FR-38)
  function updateItem(id: string, field: keyof ParsedItem, value: any) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        // Hitung ulang harga per satuan
        if (field === "totalPrice" || field === "qty") {
          const q = field === "qty" ? Number(value) : it.qty || 1;
          const p = field === "totalPrice" ? Number(value) : it.totalPrice || 0;
          updated.match.pricePerUnit = q > 0 ? Math.round(p / q) : p;
        }
        return updated;
      }),
    );
  }

  // Hapus baris item
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // Tambah baris manual jika ada yang terlewat di nota
  function addNewItem() {
    const newItem: ParsedItem = {
      id: `item-${Date.now()}`,
      nameRaw: "Bahan Baru",
      qty: 1,
      unit: "kg",
      totalPrice: 20000,
      match: {
        matchedName: "Bahan Warung",
        isBiCommodity: false,
        standardUnit: "kg",
        normalizedQty: 1,
        pricePerUnit: 20000,
      },
      isConfirmed: true,
    };
    setItems((prev) => [...prev, newItem]);
  }

  // Simpan harga hasil konfirmasi
  function handleSavePrices() {
    setSavedSuccess(true);
    // Gulir ke atas
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const totalRupiah = items.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <section className="relative bg-white p-6 sm:p-8 brutal-card">
        <span className="inline-block bg-bright-green px-3 py-1 font-mono text-xs font-bold brutal-border-2 text-ink">
          FITUR AI · CINCIN 1 (GEMINI FLASH)
        </span>
        <h1 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          “Foto nota, biar Takar yang catat.”
        </h1>
        <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-ink/80 sm:text-lg">
          Unggah foto nota dari pasar atau toko kelontong. Gemini Flash akan membaca nama barang,
          jumlah, dan harganya, lalu mencocokkannya ke 21 komoditas Bank Indonesia dan resep warungmu.
        </p>

        {/* Banner Sukses Simpan */}
        {savedSuccess && (
          <div className="mt-6 bg-bright-green/20 border-3 border-ink p-5 brutal-border shadow-[4px_4px_0_#111]">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {items.length} Harga Belanja Berhasil Disimpan ke Warungmu!
                </h3>
                <p className="text-sm text-ink/80 mt-1">
                  Modal menu Ayam Geprek dan menu lainnya otomatis diperbarui menggunakan harga belanjamu hari ini.
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    href="/dashboard/menu/ayam-geprek"
                    className="brutal-btn bg-bright-green px-3 py-1.5 text-xs font-heading font-bold"
                  >
                    Lihat Dampak di Ayam Geprek →
                  </Link>
                  <Link
                    href="/dashboard"
                    className="brutal-btn bg-white px-3 py-1.5 text-xs font-heading font-bold"
                  >
                    Kembali ke Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notice Ketahanan & Privasi */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/20 pt-4 text-xs font-mono text-ink/70">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-bright-green"></span>
            <span>Didukung: Google Gemini Flash Vision + Cache Cerdas</span>
          </div>
          <div>🛡️ Prinsip Takar: AI hanya membaca, pemilik selalu menyetujui.</div>
        </div>
      </section>

      {/* INPUT & PREVIEW GRID */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* KOLOM KIRI: AREA UPLOAD & PILIH CONTOH (5 Kolom) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="bg-white p-6 brutal-card">
            <h2 className="font-heading text-lg font-bold">1. Ambil Foto atau Unggah Nota</h2>
            <p className="mt-1 text-xs text-ink/70">
              Foto nota belanjaan pagi ini dari pasar atau toko langganan.
            </p>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Dropzone & Buttons */}
            <div className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-ink bg-cream p-6 text-center">
              {receiptImage ? (
                <div className="space-y-3">
                  <img
                    src={receiptImage}
                    alt="Preview Nota"
                    className="max-h-56 rounded border-2 border-ink object-contain shadow-[2px_2px_0_#111]"
                  />
                  <p className="font-mono text-xs text-accent-green font-bold">✓ Foto nota terpilih</p>
                </div>
              ) : (
                <div className="mb-4 rotate-[-2deg] bg-white p-4 brutal-border-2 shadow-[2px_2px_0_#111]">
                  <div className="font-mono text-[11px] leading-snug text-left text-ink/80">
                    <p className="font-bold border-b border-ink/20 pb-1">PASAR PEDURUNGAN</p>
                    <p className="mt-1">AYAM KARKAS 2KG .... 86.400</p>
                    <p>CABAI RAWIT 1KG ..... 87.000</p>
                    <p>MINYAKITA 2L ........ 34.000</p>
                    <p className="font-bold border-t border-ink/20 mt-1 pt-1">TOTAL .............. 207.400</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="brutal-btn mt-2 w-full bg-critical-red px-4 py-3 font-heading font-extrabold text-white text-sm"
              >
                {loading ? "“Sedang Membaca Nota…”" : "📷 Ambil Foto / Unggah Nota"}
              </button>
            </div>

            {/* UJI CEPAT / DEMO SAMPLES */}
            <div className="mt-6 border-t-2 border-ink/10 pt-4">
              <span className="font-mono text-xs font-bold text-ink/80">
                ⚡ Atau Gunakan Contoh Nota Demo (Siap Uji):
              </span>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => handleSelectSample("pasar-johar")}
                  disabled={loading}
                  className="w-full text-left bg-cream-surface p-3 brutal-border-2 hover:bg-warning-yellow/30 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <strong className="font-heading text-xs">Nota Pasar Johar</strong>
                    <span className="font-mono text-[10px] bg-warning-yellow px-1.5 border border-ink">Semarang</span>
                  </div>
                  <p className="text-[11px] text-ink/70 mt-0.5">Ayam Karkas 4kg, Cabai Rawit 0.5kg, Beras, Minyakita</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSample("toko-sembako")}
                  disabled={loading}
                  className="w-full text-left bg-cream-surface p-3 brutal-border-2 hover:bg-warning-yellow/30 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <strong className="font-heading text-xs">Toko Sembako Makmur</strong>
                    <span className="font-mono text-[10px] bg-cream px-1.5 border border-ink">Bumbu & Bahan</span>
                  </div>
                  <p className="text-[11px] text-ink/70 mt-0.5">Tepung Terigu, Bimoli 2L, Gula Pasir, Saus Sambal, Kertas Nasi</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSample("agen-unggas")}
                  disabled={loading}
                  className="w-full text-left bg-cream-surface p-3 brutal-border-2 hover:bg-warning-yellow/30 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <strong className="font-heading text-xs">Agen Unggas Tembalang</strong>
                    <span className="font-mono text-[10px] bg-cream px-1.5 border border-ink">Ayam & Telur</span>
                  </div>
                  <p className="text-[11px] text-ink/70 mt-0.5">Ayam Broiler 5kg, Telur Ayam 2kg, Bawang Putih, Gas 3kg</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: LAYAR KONFIRMASI OCR (S11) (7 Kolom) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="border-t-8 border-t-warning-yellow bg-cream-surface p-6 brutal-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase text-critical-red">
                LAYAR KONFIRMASI (S11)
              </span>
              {ocrResult && (
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 brutal-border-2">
                  {ocrResult.source === "live_gemini"
                    ? `🟢 Live: ${ocrResult.modelUsed || "Gemini Flash"} (${(ocrResult.latencyMs / 1000).toFixed(1)}s)`
                    : ocrResult.source === "cache"
                    ? `⚡ Dari Cache (${ocrResult.latencyMs}ms)`
                    : "💡 Mode Demo Siap Saji"}
                </span>
              )}
            </div>

            <h2 className="mt-1 font-heading text-2xl font-extrabold">
              “Cek dulu sebelum disimpan.”
            </h2>
            <p className="mt-1 text-xs text-ink/70">
              Takar tidak pernah langsung menyimpan hasil scan tanpa persetujuanmu. Pastikan angka
              rupiah dan jumlah barang sudah benar. Kamu bebas mengeditnya langsung.
            </p>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 bg-critical-red/10 border-2 border-critical-red p-3 text-xs text-critical-red font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Info Pesan Hasil OCR */}
            {ocrResult?.message && (
              <div className="mt-4 bg-white p-3 brutal-border-2 text-xs font-mono text-ink/80 flex items-center gap-2">
                <span>ℹ️</span>
                <span>{ocrResult.message}</span>
              </div>
            )}

            {/* LOADING STATE INDICATOR */}
            {loading ? (
              <div className="my-12 flex flex-col items-center justify-center space-y-4 py-8 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink border-t-critical-red"></div>
                <div className="space-y-1">
                  <p className="font-heading text-lg font-bold text-ink">{statusStep}</p>
                  <p className="text-xs text-ink/60 font-mono">
                    Memproses teks gambar dengan Google AI Studio...
                  </p>
                </div>
              </div>
            ) : items.length > 0 ? (
              /* TABEL / KARTU KONFIRMASI HASIL OCR */
              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-white p-4 brutal-border-2 transition-shadow hover:shadow-[3px_3px_0_#111]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          {/* Nama Barang Asli di Nota */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-ink/50">
                              #{index + 1}
                            </span>
                            <input
                              type="text"
                              value={item.nameRaw}
                              onChange={(e) => updateItem(item.id, "nameRaw", e.target.value)}
                              className="font-heading font-bold text-base w-full border-b border-ink/30 focus:border-ink focus:outline-none bg-transparent"
                              title="Klik untuk mengubah nama barang"
                            />
                          </div>

                          {/* Pencocokan ke 21 Komoditas BI */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            {item.match.isBiCommodity ? (
                              <span className="bg-bright-green/20 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-green border border-accent-green">
                                ✓ Komoditas BI: {item.match.matchedName}
                              </span>
                            ) : (
                              <span className="bg-warning-yellow/30 px-2 py-0.5 font-mono text-[10px] font-bold text-warung-brown border border-warung-brown">
                                📦 Katalog Warung: {item.match.matchedName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tombol Hapus Baris */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-ink/40 hover:text-critical-red p-1 font-bold text-sm"
                          title="Hapus baris ini"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Baris Input Jumlah, Satuan, dan Total Harga */}
                      <div className="mt-3 grid grid-cols-12 gap-2 border-t border-ink/10 pt-3 items-end">
                        <div className="col-span-4">
                          <label className="block font-mono text-[10px] text-ink/60 uppercase">
                            Beli Berapa
                          </label>
                          <div className="flex items-center gap-1 mt-0.5">
                            <input
                              type="number"
                              step="any"
                              value={item.qty ?? ""}
                              onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                              placeholder="1"
                              className="w-16 p-1 text-sm font-mono font-bold border border-ink bg-cream-surface text-center"
                            />
                            <input
                              type="text"
                              value={item.unit || "kg"}
                              onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                              className="w-16 p-1 text-xs font-mono border border-ink/40 bg-transparent text-center"
                            />
                          </div>
                        </div>

                        <div className="col-span-5">
                          <label className="block font-mono text-[10px] text-ink/60 uppercase">
                            Total Bayar (Rp)
                          </label>
                          <input
                            type="number"
                            value={item.totalPrice ?? ""}
                            onChange={(e) => updateItem(item.id, "totalPrice", e.target.value)}
                            placeholder="0"
                            className="mt-0.5 w-full p-1 text-sm font-mono font-bold border border-ink bg-cream-surface"
                          />
                        </div>

                        <div className="col-span-3 text-right">
                          <span className="block font-mono text-[9px] text-ink/50 uppercase">
                            Harga Satuan
                          </span>
                          <span className="font-mono text-xs font-bold text-critical-red">
                            {formatRupiah(item.match.pricePerUnit)}
                            <span className="text-[10px] text-ink/60 font-normal">
                              /{item.match.standardUnit}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tombol Tambah Baris Manual */}
                <button
                  type="button"
                  onClick={addNewItem}
                  className="w-full border-2 border-dashed border-ink p-2.5 font-heading text-xs font-bold text-ink/70 hover:bg-white hover:text-ink transition-colors"
                >
                  ＋ Tambah Baris Barang Manual
                </button>

                {/* Total Ringkasan Nota */}
                <div className="flex items-center justify-between border-t-2 border-ink pt-4 font-heading">
                  <div>
                    <span className="text-xs text-ink/60 block font-mono">TOTAL NOTA BELANJA</span>
                    <strong className="text-xl">{items.length} Macam Barang</strong>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-2xl font-black text-ink">
                      {formatRupiah(totalRupiah)}
                    </span>
                  </div>
                </div>

                {/* Tombol Final Simpan */}
                <button
                  type="button"
                  onClick={handleSavePrices}
                  className="brutal-btn mt-2 w-full bg-bright-green px-4 py-3.5 font-heading text-base font-extrabold text-ink shadow-[4px_4px_0_#111]"
                >
                  ✓ Simpan Harga Ini ke Resep Warung
                </button>
              </div>
            ) : (
              /* EMPTY STATE */
              <div className="my-8 bg-warning-yellow/20 p-8 text-center brutal-border-2 space-y-3">
                <span className="text-4xl">🧾</span>
                <p className="font-heading text-base font-bold">Belum ada nota yang dipindai.</p>
                <p className="text-xs text-ink/70 max-w-sm mx-auto">
                  Ambil foto nota belanjamu di kolom kiri atau klik salah satu <b>Contoh Nota Demo</b>{" "}
                  untuk melihat bagaimana Takar mengekstrak bahan masakan secara otomatis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
