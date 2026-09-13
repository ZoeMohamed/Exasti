import { createHash } from "crypto";
import { queryDb } from "../db/client";

// Rantai fallback model sesuai docs/02-ARCHITECTURE.md & docs/10-AI-VALIDATION.md
// Jika model sibuk (503), kuota habis (429), atau pensiun (404), lanjut ke model berikutnya.
export const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
] as const;

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// In-memory cache fallback untuk Mode Pesawat / tanpa Postgres
const memoryAiCache = new Map<string, { output: unknown; timestamp: number }>();

interface GeminiApiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export function hashInput(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function getCachedAiResult<T = unknown>(
  kind: string,
  inputHash: string,
): Promise<T | null> {
  // 1. Cek memory cache lokal
  const memoryKey = `${kind}:${inputHash}`;
  const inMem = memoryAiCache.get(memoryKey);
  if (inMem) {
    return inMem.output as T;
  }

  // 2. Cek database tabel ai_cache jika DB aktif
  try {
    const res = await queryDb(
      "SELECT output FROM ai_cache WHERE kind = $1 AND input_hash = $2 LIMIT 1",
      [kind, inputHash],
    );
    if (res && res.rows && res.rows.length > 0) {
      const output = res.rows[0].output;
      memoryAiCache.set(memoryKey, { output, timestamp: Date.now() });
      return output as T;
    }
  } catch {
    // Graceful fallback jika DB belum di-setup
  }

  return null;
}

export async function setCachedAiResult(
  kind: string,
  inputHash: string,
  output: unknown,
): Promise<void> {
  const memoryKey = `${kind}:${inputHash}`;
  memoryAiCache.set(memoryKey, { output, timestamp: Date.now() });

  try {
    await queryDb(
      `INSERT INTO ai_cache (kind, input_hash, output)
       VALUES ($1, $2, $3)
       ON CONFLICT (kind, input_hash) DO UPDATE SET output = $3`,
      [kind, inputHash, JSON.stringify(output)],
    );
  } catch {
    // Database belum tersambung, simpan di memory cache
  }
}

export interface GeminiCallParams {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  responseSchema?: Record<string, unknown>;
}

export interface GeminiCallResult {
  success: boolean;
  data: unknown;
  modelUsed?: string;
  cached: boolean;
  latencyMs: number;
  error?: string;
}

export async function callGeminiVisionWithFallback(
  params: GeminiCallParams,
): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const startTime = Date.now();

  // Hitung hash input untuk ai_cache
  const inputToHash = `${params.prompt}:${params.imageBase64 || ""}`;
  const inputHash = hashInput(inputToHash);

  // 1. Cek cache (NFR-19 & FR-40: demo tidak boleh bergantung API live)
  const cachedData = await getCachedAiResult("nota_ocr", inputHash);
  if (cachedData) {
    return {
      success: true,
      data: cachedData,
      cached: true,
      latencyMs: Date.now() - startTime,
    };
  }

  if (!apiKey) {
    return {
      success: false,
      data: null,
      cached: false,
      latencyMs: Date.now() - startTime,
      error: "GEMINI_API_KEY tidak ditemukan di environment.",
    };
  }

  let lastError = "Gagal memanggil model Gemini.";

  // Rantai fallback model
  for (const model of GEMINI_MODELS) {
    try {
      const parts: Array<
        { text: string } | {
          inline_data: { mime_type: string; data: string };
        }
      > = [{ text: params.prompt }];
      if (params.imageBase64) {
        parts.push({
          inline_data: {
            mime_type: params.mimeType || "image/jpeg",
            data: params.imageBase64,
          },
        });
      }

      const body: {
        contents: Array<{ parts: typeof parts }>;
        generationConfig: {
          responseMimeType: string;
          temperature: number;
          responseSchema?: Record<string, unknown>;
        };
      } = {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      };

      if (params.responseSchema) {
        body.generationConfig.responseSchema = params.responseSchema;
      }

      const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 detik timeout

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        lastError = `[${model}] HTTP ${status}: ${errorText.slice(0, 150)}`;

        // Sesuai docs/08-AI-USECASE.md: perlakukan 404, 503, dan 429 sama -> coba model berikutnya
        if (status === 404 || status === 503 || status === 429 || status === 500) {
          console.warn(`Model ${model} gagal (${status}), mencoba model berikutnya...`);
          continue;
        }
        // Error otentikasi (400, 403) langsung kembalikan
        break;
      }

      const resJson = await response.json() as GeminiApiResponse;
      const candidate = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) {
        lastError = `[${model}] Respons kosong dari Gemini.`;
        continue;
      }

      const parsedData = JSON.parse(candidate);

      // Simpan ke cache
      await setCachedAiResult("nota_ocr", inputHash, parsedData);

      return {
        success: true,
        data: parsedData,
        modelUsed: model,
        cached: false,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      lastError = `[${model}] ${isTimeout ? "Timeout" : message}`;
      console.warn(`Error saat memanggil ${model}:`, message);
    }
  }

  return {
    success: false,
    data: null,
    cached: false,
    latencyMs: Date.now() - startTime,
    error: lastError,
  };
}
