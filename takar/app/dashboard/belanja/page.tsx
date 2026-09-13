"use client";

import { useState, useRef, useEffect } from "react";
import { keIsoTanggal } from "@/lib/tanggal";
import Link from "next/link";
import Image from "next/image";
import { formatRupiah } from "@/lib/formatRupiah";
import type { ParsedItem, OcrResponsePayload } from "@/lib/ai/ocr";
import { BahanCombobox } from "@/components/menu/BahanCombobox";
import { RupiahInput } from "@/components/ui/RupiahInput";
import type { BahanTersedia, HasilCari } from "@/lib/bahan/cari";
import { normalisasiNama } from "@/lib/bahan/cari";
import type { SaranUmum } from "@/lib/bahan/katalog-pasar";
import type { RefBahan } from "@/lib/bahan/validasi";
import type { Satuan, SatuanDasar } from "@/lib/units";

interface PilihanBahan {
  bahan: RefBahan;
  nama: string;
  satuanDasar: SatuanDasar;
}

interface UserPriceHistory {
  commodity_id: string;
  name: string;
  unit: string;
  price: number;
  date: string;
  source: string;
}

export default function BelanjaPage() {
  const [bahan, setBahan] = useState<BahanTersedia[]>([]);
  const [saranUmum, setSaranUmum] = useState<SaranUmum[]>([]);
  const [pilihan, setPilihan] = useState<Record<string, PilihanBahan>>({});
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResponsePayload | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [receiptHistory, setReceiptHistory] = useState<UserPriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Ambil bahan & riwayat harga nota warung
  useEffect(() => {
    fetch("/api/bahan")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok") {
          setBahan(data.bahan || []);
          setSaranUmum(data.saranUmum || []);
        }
      })
      .catch(() => setErrorMsg("Daftar bahan belum bisa dibuka."));

    fetchHistory();
  }, []);

  function fetchHistory() {
    setHistoryLoading(true);
    fetch("/api/prices")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.prices) {
          setReceiptHistory(data.prices);
        }
      })
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }

  // 2. Memanggil AI OCR /api/ai/parse-nota (Gemini Flash Vision + Komoditas BI)
  async function processReceipt(payload: {
    imageBase64?: string;
    sampleId?: string;
    mimeType?: string;
  }) {
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccess(null);
    setStatusStep("Menyiapkan foto nota...");

    try {
      setTimeout(() => setStatusStep("Membaca nama barang dan harga..."), 500);
      setTimeout(() => setStatusStep("Mencocokkan dengan bahan warungmu..."), 1200);

      const res = await fetch("/api/ai/parse-nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: OcrResponsePayload = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses pembacaan nota.");
      }

      setOcrResult(data);
      setItems(data.items);
      const cocok: Record<string, PilihanBahan> = {};
      for (const item of data.items) {
        const found = bahan.find((candidate) =>
          candidate.id === item.match.matchedName ||
          (candidate.jenis === "warung" && normalisasiNama(candidate.namaTampil) === normalisasiNama(item.match.matchedName)),
        );
        if (found) cocok[item.id] = { bahan: { jenis: found.jenis, id: found.id }, nama: found.namaTampil, satuanDasar: found.satuanDasar };
      }
      setPilihan(cocok);
    } catch (err: unknown) {
      console.error("Gagal scan:", err);
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses nota.");
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
  function updateItem(
    id: string,
    field: "nameRaw" | "qty" | "unit" | "totalPrice",
    value: string,
  ) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const normalizedValue =
          field === "qty" || field === "totalPrice"
            ? value === "" ? null : Number(value)
            : value;
        const updated: ParsedItem = {
          ...it,
          [field]: normalizedValue,
          match: { ...it.match },
        };
        // Hitung ulang harga per satuan
        if (field === "totalPrice" || field === "qty") {
          const q = field === "qty" ? Number(normalizedValue) : it.qty || 1;
          const p = field === "totalPrice" ? Number(normalizedValue) : it.totalPrice || 0;
          updated.match.pricePerUnit = q > 0 ? Math.round(p / q) : p;
        }
        return updated;
      }),
    );
  }

  function pilihUntukItem(id: string, hasil: HasilCari) {
    if (hasil.tipe === "tersedia") {
      const item = hasil.bahan;
      setPilihan((current) => ({ ...current, [id]: { bahan: { jenis: item.jenis, id: item.id }, nama: item.namaTampil, satuanDasar: item.satuanDasar } }));
      return;
    }
    const nama = hasil.tipe === "saran" ? hasil.saran.nama : hasil.nama;
    const satuanDasar = hasil.tipe === "saran" ? hasil.saran.satuanDasar : "kg";
    setPilihan((current) => ({ ...current, [id]: { bahan: { jenis: "baru", nama, satuanDasar }, nama, satuanDasar } }));
  }

  // Hapus baris item
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setPilihan((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  // Tambah baris manual jika ada yang terlewat di nota
  function addNewItem() {
    const newItem: ParsedItem = {
      id: `item-${Date.now()}`,
      nameRaw: "",
      qty: null,
      unit: "kg",
      totalPrice: null,
      match: {
        matchedName: "",
        isBiCommodity: false,
        standardUnit: "kg",
        normalizedQty: 0,
        pricePerUnit: 0,
      },
      isConfirmed: true,
    };
    setItems((prev) => [...prev, newItem]);
  }

  // Simpan harga hasil konfirmasi ke tabel prices di Supabase
  async function handleSavePrices() {
    if (items.length === 0) return;
    setSaving(true);
    setSaveSuccess(null);
    setErrorMsg(null);

    try {
      const belumDipilih = items.find((item) => !pilihan[item.id]);
      if (belumDipilih) throw new Error(`Hubungkan “${belumDipilih.nameRaw || "barang tanpa nama"}” ke bahan terlebih dahulu.`);
      const payloadItems = items.map((item) => {
        const selected = pilihan[item.id];
        return {
          bahan: selected.bahan,
          harga: {
            hargaKemasan: Number(item.totalPrice),
            isi: Number(item.qty),
            satuan: satuanNota(item.unit, selected.satuanDasar),
          },
          sumber: "nota_ocr",
        };
      });

      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });

      const data = await res.json();
      if (data.status === "ok") {
        setSaveSuccess(data.message || "Harga belanja berhasil disimpan.");
        fetchHistory();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(data.message || "Harga belanja belum tersimpan. Coba lagi.");
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Harga belanja belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const totalRupiah = items.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER NAV & DATABASE BADGE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="brutal-btn bg-white px-3 py-1.5 font-mono text-xs font-bold"
        >
          Kembali ke Beranda
        </Link>
        <span className="bg-warning-yellow px-2.5 py-1 font-mono text-xs font-bold brutal-border-2">
          {bahan.length} bahan siap dipakai
        </span>
      </div>

      {/* BANNER UTAMA */}
      <section className="relative bg-white p-6 sm:p-8 brutal-card">
        <span className="inline-block bg-bright-green px-3 py-1 font-mono text-xs font-bold brutal-border-2 text-ink">
          CATAT BELANJA DARI FOTO
        </span>
        <h1 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          “Foto nota, biar Takar bantu mencatat.”
        </h1>
        <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-ink/80 sm:text-lg">
          Unggah foto nota dari pasar atau toko langganan. Takar akan membaca nama barang,
          jumlah, dan harganya, lalu mencocokkannya dengan bahan yang dipakai warungmu.
        </p>

        {/* Banner Sukses Simpan */}
        {saveSuccess && (
          <div className="mt-6 bg-bright-green/20 border-3 border-ink p-5 brutal-border shadow-[4px_4px_0_#111]">
            <div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {saveSuccess}
                </h3>
                <p className="text-sm text-ink/80 mt-1">
                  Modal menu warung dan angka untung otomatis diperbarui menggunakan harga belanja terbaru ini.
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    href="/dashboard"
                    className="brutal-btn bg-bright-green px-3 py-1.5 text-xs font-heading font-bold"
                  >
                    Lihat Beranda
                  </Link>
                </div>
            </div>
          </div>
        )}

        {/* Notice Ketahanan & Privasi */}
        <div className="mt-6 border-t-2 border-ink/20 pt-4 text-xs font-mono text-ink/70">
          Hasil bacaan selalu menunggu persetujuanmu. Tidak ada harga yang disimpan sebelum kamu memeriksanya.
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
                  <Image
                    src={receiptImage}
                    alt="Preview Nota"
                    width={480}
                    height={320}
                    unoptimized
                    className="max-h-56 rounded border-2 border-ink object-contain shadow-[2px_2px_0_#111]"
                  />
                  <p className="font-mono text-xs text-accent-green font-bold">Foto nota sudah dipilih</p>
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
                {loading ? "Sedang Membaca Nota..." : "Ambil Foto atau Unggah Nota"}
              </button>
            </div>

            {/* UJI CEPAT / DEMO SAMPLES */}
            <div className="mt-6 border-t-2 border-ink/10 pt-4">
              <span className="font-mono text-xs font-bold text-ink/80">
                Belum punya foto? Gunakan contoh nota:
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
                PERIKSA HASIL BACAAN
              </span>
              {ocrResult && (
                <span className="font-mono text-[11px] bg-white px-2 py-0.5 brutal-border-2">
                  {ocrResult.source === "offline_sample"
                    ? "Contoh nota siap diperiksa"
                    : `Nota selesai dibaca dalam ${Math.max(1, Math.round(ocrResult.latencyMs / 1000))} detik`}
                </span>
              )}
            </div>

            <h2 className="mt-1 font-heading text-2xl font-extrabold">
              “Periksa dulu sebelum disimpan.”
            </h2>
            <p className="mt-1 text-xs text-ink/70">
              Pastikan jumlah barang dan angka rupiahnya sudah benar. Kamu dapat mengubah setiap baris sebelum menyimpan.
            </p>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 bg-critical-red/10 border-2 border-critical-red p-3 text-xs text-critical-red font-medium">
                {errorMsg}
              </div>
            )}

            {/* Info Pesan Hasil OCR */}
            {ocrResult?.message && (
              <div className="mt-4 bg-white p-3 brutal-border-2 text-xs font-mono text-ink/80">
                Nama barang dan harga sudah dibaca. Periksa hasilnya sebelum menyimpan.
              </div>
            )}

            {/* LOADING STATE INDICATOR */}
            {loading ? (
              <div className="my-12 flex flex-col items-center justify-center space-y-4 py-8 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink border-t-critical-red"></div>
                <div className="space-y-1">
                  <p className="font-heading text-lg font-bold text-ink">{statusStep}</p>
                  <p className="text-xs text-ink/60 font-mono">
                    Mohon tunggu sebentar. Tulisan pada nota sedang dibaca.
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

                          <div className="pt-2 text-xs">
                            {pilihan[item.id] && (
                              <div className="mb-2 bg-bright-green/20 px-2 py-1 font-bold border border-ink">
                                Dicatat sebagai: {pilihan[item.id].nama}
                              </div>
                            )}
                            <BahanCombobox
                              daftar={bahan}
                              saranUmum={saranUmum}
                              onPilih={(hasil) => pilihUntukItem(item.id, hasil)}
                              label={pilihan[item.id] ? "Ganti bahan" : "Hubungkan ke bahan"}
                              placeholder="Ketik nama bahan"
                            />
                          </div>
                        </div>

                        {/* Tombol Hapus Baris */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="min-h-9 px-2 text-xs font-bold text-ink/60 underline hover:text-critical-red"
                          title="Hapus baris ini"
                        >
                          Hapus
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
                            Total Bayar
                          </label>
                          <RupiahInput
                            value={item.totalPrice ?? ""}
                            onValueChange={(value) => updateItem(
                              item.id,
                              "totalPrice",
                              value === "" ? "" : String(value),
                            )}
                            placeholder="0"
                            wrapperClassName="mt-0.5"
                            compact
                            className="p-1 text-sm font-mono font-bold border border-ink bg-cream-surface"
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
                  Tambah Barang yang Belum Terbaca
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
                  disabled={saving}
                  className="brutal-btn mt-2 w-full bg-bright-green px-4 py-3.5 font-heading text-base font-extrabold text-ink shadow-[4px_4px_0_#111] disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : "Simpan Harga Belanja"}
                </button>
              </div>
            ) : (
              /* EMPTY STATE */
              <div className="my-8 bg-warning-yellow/20 p-8 text-center brutal-border-2 space-y-3">
                <p className="font-heading text-base font-bold">Belum ada nota yang dibaca.</p>
                <p className="text-xs text-ink/70 max-w-sm mx-auto">
                  Ambil foto nota belanjamu di kolom kiri atau pilih salah satu <b>contoh nota</b>{" "}
                  untuk melihat bagaimana Takar membantu mencatat bahan masakan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat belanja warung */}
      <section className="bg-white p-6 sm:p-8 brutal-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-ink pb-4">
          <div>
            <h2 className="font-heading text-2xl font-extrabold">
              Riwayat Harga Nota Warungmu
            </h2>
            <p className="text-xs text-ink/70">
              Harga dari nota terakhir akan dipakai lebih dulu agar hitungan modal sesuai belanja warungmu.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="brutal-btn bg-cream px-3 py-1.5 font-mono text-xs font-bold"
          >
            Muat Ulang
          </button>
        </div>

        {historyLoading ? (
          <div className="py-8 text-center font-mono text-xs">Menyiapkan riwayat belanja...</div>
        ) : receiptHistory.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {receiptHistory.map((rec, i) => (
              <div key={i} className="bg-cream p-3 brutal-border-2 flex justify-between items-center">
                <div>
                  <strong className="font-heading text-sm block">{rec.name}</strong>
                  <span className="font-mono text-[11px] text-ink/70">
                    {keIsoTanggal(rec.date)}
                  </span>
                </div>
                <div className="text-right">
                  <strong className="font-mono text-base text-critical-red">
                    {formatRupiah(rec.price)}
                  </strong>
                  <span className="block font-mono text-[10px] text-ink/60">/{rec.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 bg-cream p-6 text-center font-mono text-xs text-ink/70 brutal-border-2">
            Belum ada riwayat nota yang tersimpan. Setiap kali kamu mencatat nota, harga belanjamu akan muncul di sini.
          </div>
        )}
      </section>
    </div>
  );
}

function satuanNota(unit: string | null, dasar: SatuanDasar): Satuan {
  const bersih = (unit || "").toLowerCase().trim();
  if (bersih === "g" || bersih === "gr" || bersih.includes("gram")) return "gram";
  if (bersih === "ons" || bersih === "hg") return "ons";
  if (bersih === "kg" || bersih.includes("kilo")) return "kg";
  if (bersih === "ml" || bersih === "cc") return "ml";
  if (bersih === "l" || bersih.includes("liter")) return "liter";
  if (bersih === "butir") return "butir";
  if (bersih === "ekor") return "ekor";
  if (bersih === "pcs" || bersih === "buah" || bersih === "lembar") return "pcs";
  return dasar;
}
