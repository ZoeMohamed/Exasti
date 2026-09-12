// app/api/ai/parse-nota/route.ts
// Kontrak API Cincin 1 sesuai docs/02-ARCHITECTURE.md:
// POST /api/ai/parse-nota -> menerima foto nota, mengembalikan daftar item + harga.

import { NextRequest, NextResponse } from "next/server";
import { parseReceipt } from "@/lib/ai/ocr";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Format Multipart Form Data (Upload File Gambar)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const sampleId = formData.get("sampleId") as string | null;

      if (sampleId) {
        const result = await parseReceipt({ sampleId });
        return NextResponse.json(result);
      }

      if (!file) {
        return NextResponse.json(
          { error: "File gambar nota (field 'image') wajib disertakan." },
          { status: 400 },
        );
      }

      const buffer = await file.arrayBuffer();
      const imageBase64 = Buffer.from(buffer).toString("base64");
      const mimeType = file.type || "image/jpeg";

      const result = await parseReceipt({ imageBase64, mimeType });
      return NextResponse.json(result);
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

    const result = await parseReceipt({ imageBase64, mimeType, sampleId });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API /api/ai/parse-nota error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Gagal memproses pembacaan nota belanja.",
      },
      { status: 500 },
    );
  }
}
