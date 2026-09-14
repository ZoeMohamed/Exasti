import { createHash } from "crypto";
import { queryDb } from "../db/client";

// Rantai fallback model sesuai docs/02-ARCHITECTURE.md & docs/10-AI-VALIDATION.md
// Jika model sibuk (503), kuota habis (429), atau pensiun (404), lanjut ke model berikutnya.
export const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// In-memory cache fallback untuk Mode Pesawat / tanpa Postgres
const memoryAiCache = new Map<string, { output: unknown; timestamp: number }>();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_MEMORY_CACHE_ENTRIES = 200;
const OVERALL_DEADLINE_MS = 28_000;
const ATTEMPT_TIMEOUT_MS = 12_000;

interface GeminiApiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
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
  if (inMem && Date.now() - inMem.timestamp < CACHE_TTL_MS) {
    return inMem.output as T;
  }
  if (inMem) memoryAiCache.delete(memoryKey);

  // 2. Cek database tabel ai_cache jika DB aktif
  try {
    const res = await queryDb(
      "SELECT output FROM ai_cache WHERE kind = $1 AND input_hash = $2 AND created_at >= now() - interval '30 days' LIMIT 1",
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
  if (memoryAiCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldest = memoryAiCache.keys().next().value;
    if (oldest) memoryAiCache.delete(oldest);
  }

  try {
    await queryDb(
      `with pruned as (
         delete from ai_cache where created_at < now() - interval '30 days'
       ), saved as (
         insert into ai_cache (kind, input_hash, output)
         values ($1, $2, $3)
         on conflict (kind, input_hash)
         do update set output = excluded.output, created_at = now()
         returning 1
       )
       select 1 from saved`,
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
  validateResponse?: (data: unknown) => boolean;
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
  // GEMINI_API_KEY_NEXT hanya untuk pergantian key tanpa downtime. Satu request
  // memakai satu key; rate limit Gemini berlaku per project, bukan per key.
  const apiKey = process.env.GEMINI_API_KEY_NEXT?.trim() || process.env.GEMINI_API_KEY?.trim();
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

  const transientStatuses = new Set([408, 429, 500, 502, 503, 504]);

  // Rantai fallback model stabil dengan deadline total, bukan 20 detik × N model.
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= OVERALL_DEADLINE_MS) {
        lastError = "Waktu membaca nota sudah habis. Coba foto yang lebih jelas atau ulangi sebentar lagi.";
        break;
      }
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
          maxOutputTokens: number;
          responseSchema?: Record<string, unknown>;
        };
      } = {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
        },
      };

      if (params.responseSchema) {
        body.generationConfig.responseSchema = params.responseSchema;
      }

      const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
      const controller = new AbortController();
      const remaining = OVERALL_DEADLINE_MS - (Date.now() - startTime);
      const timeoutId = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        lastError = `[${model}] HTTP ${status}: ${errorText.slice(0, 150)}`;

        if (transientStatuses.has(status)) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const baseDelay = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 4_000)
            : 500 * (2 ** attempt);
          const delay = baseDelay + Math.floor(Math.random() * 250);
          if (Date.now() - startTime + delay < OVERALL_DEADLINE_MS && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          console.warn(`Model ${model} gagal (${status}), mencoba model cadangan...`);
          continue;
        }
        // Error otentikasi (400, 403) langsung kembalikan
        break;
      }

      const resJson = await response.json() as GeminiApiResponse;
      const firstCandidate = resJson.candidates?.[0];
      const candidate = firstCandidate?.content?.parts?.[0]?.text;
      if (!candidate) {
        lastError = `[${model}] Respons tidak dapat dipakai (${firstCandidate?.finishReason || resJson.promptFeedback?.blockReason || "kosong"}).`;
        continue;
      }

      const parsedData = JSON.parse(candidate);

      if (params.validateResponse && !params.validateResponse(parsedData)) {
        lastError = `[${model}] Bentuk atau nilai hasil bacaan tidak valid.`;
        continue;
      }

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
        if (attempt === 0 && Date.now() - startTime < OVERALL_DEADLINE_MS - 750) {
          await new Promise((resolve) => setTimeout(resolve, 500 + Math.floor(Math.random() * 250)));
          continue;
        }
      }
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
