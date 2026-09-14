import "server-only";

import { queryDb } from "@/lib/db/client";

const LIMITS = {
  minute: 5,
  day: 50,
} as const;

const memoryUsage = new Map<string, number>();

export class OcrRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Terlalu banyak foto diproses. Tunggu sebentar lalu coba lagi.");
    this.name = "OcrRateLimitError";
  }
}

function checkMemoryLimit(businessId: string) {
  const now = new Date();
  const minuteKey = `${businessId}:minute:${now.toISOString().slice(0, 16)}`;
  const dayKey = `${businessId}:day:${now.toISOString().slice(0, 10)}`;
  const minute = (memoryUsage.get(minuteKey) ?? 0) + 1;
  const day = (memoryUsage.get(dayKey) ?? 0) + 1;
  memoryUsage.set(minuteKey, minute);
  memoryUsage.set(dayKey, day);
  if (memoryUsage.size > 500) {
    for (const key of memoryUsage.keys()) {
      if (!key.includes(now.toISOString().slice(0, 10))) memoryUsage.delete(key);
    }
  }
  if (minute > LIMITS.minute) throw new OcrRateLimitError(60);
  if (day > LIMITS.day) throw new OcrRateLimitError(3600);
}

/** Pembatas lintas-instance Vercel; memory dipakai sebagai pertahanan tambahan. */
export async function enforceOcrRateLimit(businessId: string): Promise<void> {
  checkMemoryLimit(businessId);
  try {
    const result = await queryDb<{ window_kind: "minute" | "day"; request_count: number }>(
      `with pruned as (
         delete from ai_request_limits
         where window_start < now() - interval '2 days'
       ), windows(window_kind, window_start) as (
         values
           ('minute'::text, date_trunc('minute', now())),
           ('day'::text, date_trunc('day', now()))
       ), counted as (
         insert into ai_request_limits (business_id, window_kind, window_start, request_count)
         select $1::uuid, window_kind, window_start, 1 from windows
         on conflict (business_id, window_kind, window_start)
         do update set request_count = ai_request_limits.request_count + 1
         returning window_kind, request_count
       )
       select window_kind, request_count from counted`,
      [businessId],
    );
    const minute = result.rows.find((row) => row.window_kind === "minute")?.request_count ?? 0;
    const day = result.rows.find((row) => row.window_kind === "day")?.request_count ?? 0;
    if (minute > LIMITS.minute) throw new OcrRateLimitError(60);
    if (day > LIMITS.day) throw new OcrRateLimitError(3600);
  } catch (error) {
    if (error instanceof OcrRateLimitError) throw error;
    // Selama migrasi belum masuk, pembatas memory tetap mencegah spam dari
    // instance yang sama. Error dicatat agar operasi tahu proteksi DB melemah.
    console.error("Pembatas OCR database belum tersedia:", error instanceof Error ? error.message : error);
  }
}
