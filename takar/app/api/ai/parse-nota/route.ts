// app/api/ai/parse-nota/route.ts
// Kontrak API Cincin 1 sesuai docs/02-ARCHITECTURE.md:
// POST /api/ai/parse-nota -> menerima foto nota, mengembalikan daftar item + harga.

import { NextRequest, NextResponse } from "next/server";
import { DEMO_SAMPLE_RECEIPTS, parseReceipt } from "@/lib/ai/ocr";
import { apiError, requireApiBusinessId } from "@/lib/auth/api";
import { enforceOcrRateLimit, OcrRateLimitError } from "@/lib/ai/rate-limit";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    const brand = buffer.length >= 12 ? buffer.toString("ascii", 4, 12) : "";
    return brand.startsWith("ftyp") && /hei[cf]|mif1|msf1/.test(buffer.toString("ascii", 8, 16));
  }
  return false;
}

function validateImage(buffer: Buffer, mimeType: string): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) return "Gunakan foto PNG, JPG, WEBP, HEIC, atau HEIF.";
  if (buffer.length === 0) return "Berkas foto kosong.";
  if (buffer.length > MAX_IMAGE_BYTES) return "Ukuran foto maksimal 8 MB.";
  if (!hasValidImageSignature(buffer, mimeType)) return "Berkas ini bukan gambar yang valid.";
  return null;
}

function decodeBase64(value: unknown): Buffer | null {
  if (typeof value !== "string" || value.length === 0 || value.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) return null;
  const clean = value.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) return null;
  return Buffer.from(clean, "base64");
}

function resultResponse(result: Awaited<ReturnType<typeof parseReceipt>>) {
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}

export async function POST(req: NextRequest) {
  try {
    const businessId = await requireApiBusinessId();
    const contentType = req.headers.get("content-type") || "";
    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran unggahan terlalu besar. Maksimal 8 MB." }, { status: 413 });
    }

    // 1. Format Multipart Form Data (Upload File Gambar)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const sampleId = formData.get("sampleId") as string | null;

      if (sampleId) {
        if (!(sampleId in DEMO_SAMPLE_RECEIPTS)) return NextResponse.json({ error: "Contoh nota tidak ditemukan." }, { status: 400 });
        const result = await parseReceipt({ sampleId });
        return resultResponse(result);
      }

      if (!file) {
        return NextResponse.json(
          { error: "File gambar nota (field 'image') wajib disertakan." },
          { status: 400 },
        );
      }

      const buffer = await file.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);
      const mimeType = file.type;
      const imageError = validateImage(imageBuffer, mimeType);
      if (imageError) return NextResponse.json({ error: imageError }, { status: imageBuffer.length > MAX_IMAGE_BYTES ? 413 : 415 });
      await enforceOcrRateLimit(businessId);
      const imageBase64 = imageBuffer.toString("base64");

      const result = await parseReceipt({ imageBase64, mimeType });
      return resultResponse(result);
    }

    // 2. Format JSON (Base64 atau Sample ID)
    const body = await req.json();
    const { imageBase64, mimeType, sampleId } = body || {};

    if (!imageBase64 && !sampleId) {
      return NextResponse.json(
        { error: "Parameter 'imageBase64' atau 'sampleId' wajib disertakan." },
        { status: 400 },
      );
    }

    if (sampleId) {
      if (typeof sampleId !== "string" || !(sampleId in DEMO_SAMPLE_RECEIPTS)) return NextResponse.json({ error: "Contoh nota tidak ditemukan." }, { status: 400 });
      return resultResponse(await parseReceipt({ sampleId }));
    }
    const imageBuffer = decodeBase64(imageBase64);
    if (!imageBuffer) return NextResponse.json({ error: "Isi gambar tidak valid atau terlalu besar." }, { status: 400 });
    const imageType = typeof mimeType === "string" ? mimeType : "";
    const imageError = validateImage(imageBuffer, imageType);
    if (imageError) return NextResponse.json({ error: imageError }, { status: imageBuffer.length > MAX_IMAGE_BYTES ? 413 : 415 });
    await enforceOcrRateLimit(businessId);
    return resultResponse(await parseReceipt({ imageBase64: imageBuffer.toString("base64"), mimeType: imageType }));
  } catch (err: unknown) {
    if (err instanceof OcrRateLimitError) {
      return NextResponse.json(
        { error: err.message },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } },
      );
    }
    console.error("API /api/ai/parse-nota error:", err);
    return apiError(err, "Gagal memproses pembacaan nota belanja.");
  }
}
